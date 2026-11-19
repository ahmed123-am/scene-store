begin;
create table if not exists public.custom_requests (
  id text primary key,
  idempotency_key text not null unique,
  request_hash text not null,
  ip_hash text not null,
  created_at timestamptz not null default now(),
  customer_name text not null check(char_length(customer_name) between 2 and 100),
  phone text not null check(char_length(phone) between 10 and 15),
  quantity integer not null check(quantity between 1 and 50),
  description text not null check(char_length(description) between 10 and 2000),
  dimensions text not null default '' check(char_length(dimensions) <= 200),
  status text not null default 'pending' check(status in ('pending','reviewing','contacted','cancelled')),
  image_path text not null,
  upload_state text not null default 'pending' check(upload_state in ('pending','ready'))
);
alter table public.custom_requests enable row level security;
revoke all on public.custom_requests from anon,authenticated;
grant select,insert on public.custom_requests to service_role;
grant update(status,upload_state) on public.custom_requests to service_role;
create index if not exists custom_requests_recent_idx on public.custom_requests(created_at desc,id desc);
create index if not exists custom_requests_ip_time_idx on public.custom_requests(ip_hash,created_at);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('scene-custom-requests','scene-custom-requests',false,1572864,array['image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Keep reference images inaccessible to regular clients even if another bucket has broad policies.
drop policy if exists scene_custom_private_objects on storage.objects;
create policy scene_custom_private_objects on storage.objects as restrictive
for all to anon,authenticated
using (bucket_id <> 'scene-custom-requests')
with check (bucket_id <> 'scene-custom-requests');

create or replace function public.reserve_scene_custom_request(p_key text,p_hash text,p_ip_hash text,p_request jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  v_row public.custom_requests%rowtype;
  v_id text;
begin
  if p_key is null or p_key !~ '^[A-Za-z0-9_-]{16,100}$' or p_hash is null or p_hash !~ '^[a-f0-9]{64}$' or p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('error','بيانات الطلب غير صحيحة.','status',400);
  end if;
  perform pg_advisory_xact_lock(hashtextextended('scene-custom:' || p_ip_hash,0));
  select * into v_row from public.custom_requests where idempotency_key=p_key;
  if found then
    if v_row.request_hash <> p_hash then
      return jsonb_build_object('error','بيانات المحاولة اتغيّرت. افتح الطلب من جديد.','status',409);
    end if;
  else
    if (select count(*) from public.custom_requests where ip_hash=p_ip_hash and created_at > now()-interval '1 hour') >= 5 then
      return jsonb_build_object('error','وصلت للحد المسموح من الطلبات المخصصة. جرّب بعد ساعة أو كلمنا على واتساب.','status',429);
    end if;
    v_id := 'SCN-C-' || pg_catalog.gen_random_uuid()::text;
    insert into public.custom_requests(id,idempotency_key,request_hash,ip_hash,customer_name,phone,quantity,description,dimensions,image_path)
    values(v_id,p_key,p_hash,p_ip_hash,p_request->>'name',p_request->>'phone',(p_request->>'quantity')::integer,p_request->>'description',coalesce(p_request->>'dimensions',''),'requests/' || v_id || '.webp')
    on conflict(idempotency_key) do nothing returning * into v_row;
    if not found then
      select * into v_row from public.custom_requests where idempotency_key=p_key;
      if v_row.request_hash <> p_hash then
        return jsonb_build_object('error','بيانات المحاولة اتغيّرت. افتح الطلب من جديد.','status',409);
      end if;
    end if;
  end if;
  return jsonb_build_object('id',v_row.id,'imagePath',v_row.image_path,'ready',v_row.upload_state='ready',
    'receipt',jsonb_build_object('id',v_row.id,'createdAt',v_row.created_at,'status',v_row.status,'quantity',v_row.quantity));
end;
$$;

create or replace function public.complete_scene_custom_request(p_key text,p_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_row public.custom_requests%rowtype; v_replayed boolean := false;
begin
  update public.custom_requests set upload_state='ready'
    where idempotency_key=p_key and request_hash=p_hash and upload_state='pending' returning * into v_row;
  if not found then
    select * into v_row from public.custom_requests where idempotency_key=p_key and request_hash=p_hash and upload_state='ready';
    if not found then return jsonb_build_object('error','تعذّر تأكيد الطلب. حاول تاني بنفس البيانات.','status',409); end if;
    v_replayed := true;
  end if;
  return jsonb_build_object('replayed',v_replayed,'receipt',jsonb_build_object('id',v_row.id,'createdAt',v_row.created_at,'status',v_row.status,'quantity',v_row.quantity));
end;
$$;
revoke all on function public.reserve_scene_custom_request(text,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.complete_scene_custom_request(text,text) from public,anon,authenticated;
grant execute on function public.reserve_scene_custom_request(text,text,text,jsonb) to service_role;
grant execute on function public.complete_scene_custom_request(text,text) to service_role;
commit;
