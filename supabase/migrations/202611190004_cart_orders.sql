begin;
alter table public.orders add column if not exists items jsonb not null default '[]'::jsonb;

create or replace function public.scene_order_receipt(p_order public.orders)
returns jsonb language sql security invoker set search_path = '' as $$
  select jsonb_build_object(
    'id', p_order.id, 'createdAt', p_order.created_at, 'status', p_order.status,
    'productName', p_order.product_name, 'quantity', p_order.quantity,
    'unitPrice', p_order.unit_price_cents / 100.0,
    'subtotal', p_order.subtotal_cents / 100.0, 'currency', 'EGP',
    'items', case when jsonb_array_length(p_order.items) > 0 then p_order.items else
      jsonb_build_array(jsonb_build_object(
        'productId', p_order.product_id, 'productName', p_order.product_name,
        'quantity', p_order.quantity, 'unitPrice', p_order.unit_price_cents / 100.0,
        'subtotal', p_order.subtotal_cents / 100.0
      )) end
  );
$$;

create or replace function public.create_scene_cart_order(p_key text, p_hash text, p_order jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  v_product public.products%rowtype;
  v_line jsonb;
  v_items jsonb := '[]'::jsonb;
  v_quantity integer;
  v_count integer := 0;
  v_total bigint := 0;
  v_first_id text;
  v_first_name text;
  v_first_price bigint;
  v_id text;
begin
  if p_key is null or p_key !~ '^[A-Za-z0-9_-]{16,100}$' or
     p_hash is null or p_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('error', 'بيانات الطلب غير صحيحة.', 'status', 400);
  end if;
  select * into v_order from public.orders where idempotency_key = p_key;
  if found then
    if v_order.request_hash <> p_hash then
      return jsonb_build_object('error', 'بيانات المحاولة اتغيّرت. افتح الطلب من جديد.', 'status', 409);
    end if;
    return jsonb_build_object('order', public.scene_order_receipt(v_order), 'replayed', true);
  end if;
  if jsonb_typeof(p_order -> 'items') is distinct from 'array' then
    return jsonb_build_object('error', 'السلة غير صحيحة.', 'status', 400);
  end if;
  if jsonb_array_length(p_order -> 'items') not between 1 and 20 then
    return jsonb_build_object('error', 'راجع عدد منتجات السلة.', 'status', 400);
  end if;
  if (select count(distinct x ->> 'productId') from jsonb_array_elements(p_order -> 'items') x) <> jsonb_array_length(p_order -> 'items') then
    return jsonb_build_object('error', 'السلة فيها منتج متكرر.', 'status', 400);
  end if;

  -- Lock in a consistent order. All lines must pass before a single order is inserted.
  for v_line in select value from jsonb_array_elements(p_order -> 'items') order by value ->> 'productId' loop
    v_quantity := (v_line ->> 'quantity')::integer;
    if v_quantity is null or v_quantity not between 1 and 50 then
      return jsonb_build_object('error', 'راجع كميات السلة.', 'status', 400);
    end if;
    v_count := v_count + v_quantity;
    if v_count > 50 then
      return jsonb_build_object('error', 'الحد الأقصى للطلب ٥٠ قطعة.', 'status', 400);
    end if;
    select * into v_product from public.products where id = v_line ->> 'productId' and active for share;
    if not found then
      return jsonb_build_object('error', 'منتج في السلة مبقاش متاح. حدّث السلة وراجع المنتجات.', 'status', 409);
    end if;
    if v_product.price_cents > 9007199254740991 / v_quantity then
      return jsonb_build_object('error', 'سعر المنتج غير متاح.', 'status', 503);
    end if;
    if v_line ->> 'expectedPriceCents' is not null and (v_line ->> 'expectedPriceCents')::bigint <> v_product.price_cents then
      return jsonb_build_object('error', 'سعر منتج في السلة اتغيّر. حدّث السلة وراجع الإجمالي قبل التأكيد.', 'status', 409);
    end if;
    v_total := v_total + v_product.price_cents * v_quantity;
    if v_total > 9007199254740991 then
      return jsonb_build_object('error', 'قيمة الطلب أكبر من المسموح.', 'status', 400);
    end if;
    if v_first_id is null then
      v_first_id := v_product.id;
      v_first_name := v_product.name;
      v_first_price := v_product.price_cents;
    end if;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'productId', v_product.id, 'productName', v_product.name, 'quantity', v_quantity,
      'unitPrice', v_product.price_cents / 100.0, 'subtotal', v_product.price_cents * v_quantity / 100.0
    ));
  end loop;

  v_id := 'SCN-' || pg_catalog.gen_random_uuid()::text;
  insert into public.orders (
    id,idempotency_key,request_hash,product_id,product_name,quantity,unit_price_cents,subtotal_cents,
    customer_name,phone,address,notes,status,items
  ) values (
    v_id,p_key,p_hash,v_first_id,
    case when jsonb_array_length(v_items) = 1 then v_first_name else v_first_name || ' + ' || (jsonb_array_length(v_items) - 1)::text end,
    v_count,v_first_price,v_total,p_order ->> 'name',p_order ->> 'phone',p_order ->> 'address',coalesce(p_order ->> 'notes',''),'pending',v_items
  ) on conflict (idempotency_key) do nothing returning * into v_order;
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

revoke all on function public.create_scene_cart_order(text,text,jsonb) from public, anon, authenticated;
grant execute on function public.create_scene_cart_order(text,text,jsonb) to service_role;
revoke all on function public.scene_order_receipt(public.orders) from public, anon, authenticated;
grant execute on function public.scene_order_receipt(public.orders) to service_role;
commit;
