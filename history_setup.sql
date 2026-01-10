-- 1. Create a public bucket for generated images
insert into storage.buckets (id, name, public)
values ('generations', 'generations', true)
on conflict (id) do nothing;

-- 2. Allow public access to view generated images
create policy "Public Access Generations"
  on storage.objects for select
  using ( bucket_id = 'generations' );

-- 3. Allow authenticated users (or anon) to upload generated images
create policy "Allow Uploads Generations"
  on storage.objects for insert
  with check ( bucket_id = 'generations' );

-- 4. Create the history table
create table if not exists public.generation_history (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  model_name text not null,
  image_url text not null,
  prompt text,           -- Stores the main prompt or JSON payload
  aspect_ratio text,     -- e.g., "16:9"
  resolution text        -- e.g., "4K"
);

-- 5. Enable RLS (Row Level Security) - Optional but recommended
alter table public.generation_history enable row level security;

-- 6. Create policy to allow anyone (anon) to insert and select
-- Note: In a real app with auth, you'd restrict this to auth.uid()
create policy "Enable read access for all users"
  on public.generation_history for select
  using (true);

create policy "Enable insert access for all users"
  on public.generation_history for insert
  with check (true);
