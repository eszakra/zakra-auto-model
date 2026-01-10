
-- 1. Create a public bucket for models if it doesn't exist
insert into storage.buckets (id, name, public)
values ('models', 'models', true)
on conflict (id) do nothing;

-- 2. Enable policy to allow public access to view images
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'models' );

-- 3. Enable policy to allow authenticated users (or anon if allowed) to upload images
-- Adjust "true" to "auth.role() = 'authenticated'" if you want to restrict uploads
create policy "Allow Uploads"
  on storage.objects for insert
  with check ( bucket_id = 'models' );
