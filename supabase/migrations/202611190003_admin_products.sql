alter table public.products add column if not exists revision integer not null default 1;
grant select, insert, update, delete on public.products to service_role;
-- Images are public catalog assets. Only server credentials can upload them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scene-products', 'scene-products', true, 1572864, array['image/webp'])
on conflict (id) do nothing;
