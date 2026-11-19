create table if not exists public.products (
  id text primary key,
  name text not null check (char_length(name) between 1 and 120),
  price_cents bigint not null check (price_cents >= 0),
  image text not null,
  hero_image text,
  position integer not null default 0,
  active boolean not null default true
);

create table if not exists public.orders (
  id text primary key,
  idempotency_key text not null unique,
  request_hash text not null,
  created_at timestamptz not null default now(),
  product_id text not null,
  product_name text not null,
  quantity integer not null check (quantity between 1 and 50),
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  subtotal_cents bigint not null check (subtotal_cents >= 0),
  customer_name text not null check (char_length(customer_name) between 2 and 100),
  phone text not null check (char_length(phone) between 10 and 15),
  address text not null check (char_length(address) between 10 and 500),
  notes text not null default '' check (char_length(notes) <= 1000),
  status text not null default 'pending'
);

alter table public.products enable row level security;
alter table public.orders enable row level security;
revoke all on public.products, public.orders from anon, authenticated;
grant select, insert, update on public.products to service_role;
grant select, insert on public.orders to service_role;

create or replace function public.scene_order_receipt(p_order public.orders)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_order.id,
    'createdAt', p_order.created_at,
    'status', p_order.status,
    'productName', p_order.product_name,
    'quantity', p_order.quantity,
    'unitPrice', p_order.unit_price_cents / 100.0,
    'subtotal', p_order.subtotal_cents / 100.0,
    'currency', 'EGP'
  );
$$;

create or replace function public.create_scene_order(
  p_key text,
  p_hash text,
  p_order jsonb,
  p_expected_price_cents bigint default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_product public.products%rowtype;
  v_quantity integer := (p_order ->> 'quantity')::integer;
begin
  if p_key is null or p_key !~ '^[A-Za-z0-9_-]{16,100}$' or
     p_hash is null or p_hash !~ '^[a-f0-9]{64}$' or
     v_quantity is null or v_quantity < 1 or v_quantity > 50 then
    return jsonb_build_object('error', 'بيانات الطلب غير صحيحة.', 'status', 400);
  end if;

  select * into v_order from public.orders where idempotency_key = p_key;
  if found then
    if v_order.request_hash <> p_hash then
      return jsonb_build_object('error', 'بيانات المحاولة اتغيّرت. افتح الطلب من جديد.', 'status', 409);
    end if;
    return jsonb_build_object('order', public.scene_order_receipt(v_order), 'replayed', true);
  end if;

  select * into v_product from public.products
    where id = p_order ->> 'productId' and active = true
    for share;
  if not found then
    return jsonb_build_object('error', 'المجسم مش متاح حاليًا.', 'status', 404);
  end if;

  if v_product.price_cents > 9007199254740991 / v_quantity then
    return jsonb_build_object('error', 'سعر المجسم مش متاح حاليًا.', 'status', 503);
  end if;
  if p_expected_price_cents is not null and p_expected_price_cents <> v_product.price_cents then
    return jsonb_build_object('error', 'سعر المجسم اتغيّر. حدّث الصفحة وراجع السعر قبل تأكيد الطلب.', 'status', 409);
  end if;

  insert into public.orders (
    id, idempotency_key, request_hash, product_id, product_name, quantity,
    unit_price_cents, subtotal_cents, customer_name, phone, address, notes, status
  ) values (
    'SCN-' || pg_catalog.gen_random_uuid()::text, p_key, p_hash,
    v_product.id, v_product.name, v_quantity,
    v_product.price_cents, v_product.price_cents * v_quantity,
    p_order ->> 'name', p_order ->> 'phone', p_order ->> 'address',
    coalesce(p_order ->> 'notes', ''), 'pending'
  ) on conflict (idempotency_key) do nothing
    returning * into v_order;

  if not found then
    select * into v_order from public.orders where idempotency_key = p_key;
    if v_order.request_hash <> p_hash then
      return jsonb_build_object('error', 'بيانات المحاولة اتغيّرت. افتح الطلب من جديد.', 'status', 409);
    end if;
    return jsonb_build_object('order', public.scene_order_receipt(v_order), 'replayed', true);
  end if;

  return jsonb_build_object('order', public.scene_order_receipt(v_order), 'replayed', false);
end;
$$;

revoke all on function public.scene_order_receipt(public.orders) from public, anon, authenticated;
revoke all on function public.create_scene_order(text, text, jsonb, bigint) from public, anon, authenticated;
grant execute on function public.scene_order_receipt(public.orders) to service_role;
grant execute on function public.create_scene_order(text, text, jsonb, bigint) to service_role;
