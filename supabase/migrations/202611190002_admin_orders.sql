-- The API authenticates the owner before using this server-only database role.
grant update (status) on public.orders to service_role;
create index if not exists scene_orders_created_id_idx on public.orders (created_at desc, id desc);
create index if not exists scene_orders_status_created_id_idx on public.orders (status, created_at desc, id desc);
