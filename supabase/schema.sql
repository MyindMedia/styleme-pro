-- Enable Storage
insert into storage.buckets (id, name, public)
values ('user-images', 'user-images', true)
on conflict (id) do nothing;

-- Create User Profiles Table
create table if not exists public.user_profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  storage_used bigint default 0,
  storage_limit bigint default 104857600, -- 100MB
  is_pro boolean default false,
  preferences jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS for Profiles
alter table public.user_profiles enable row level security;

create policy "Users can view their own profile"
  on public.user_profiles for select
  using ( auth.uid() = id );

create policy "Users can update their own profile"
  on public.user_profiles for update
  using ( auth.uid() = id );

-- Create Clothing Items Table
create table if not exists public.clothing_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  image_uri text not null,
  category text not null,
  type text not null,
  color text not null,
  brand text,
  purchase_price numeric default 0,
  purchase_date date,
  occasions text[] default '{}',
  seasons text[] default '{}',
  wear_count integer default 0,
  last_worn timestamptz,
  notes text,
  is_favorite boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS for Clothing Items
alter table public.clothing_items enable row level security;

create policy "Users can view their own clothing items"
  on public.clothing_items for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own clothing items"
  on public.clothing_items for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own clothing items"
  on public.clothing_items for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own clothing items"
  on public.clothing_items for delete
  using ( auth.uid() = user_id );

-- Create Outfits Table
create table if not exists public.outfits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  item_ids uuid[] not null,
  mood text,
  occasions text[] default '{}',
  is_from_ai boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS for Outfits
alter table public.outfits enable row level security;

create policy "Users can view their own outfits"
  on public.outfits for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own outfits"
  on public.outfits for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own outfits"
  on public.outfits for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own outfits"
  on public.outfits for delete
  using ( auth.uid() = user_id );

-- Create Outfit Logs Table
create table if not exists public.outfit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  date date not null,
  outfit_id uuid references public.outfits(id),
  item_ids uuid[] not null,
  notes text,
  photo_uri text,
  created_at timestamptz default now()
);

-- Enable RLS for Outfit Logs
alter table public.outfit_logs enable row level security;

create policy "Users can view their own logs"
  on public.outfit_logs for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own logs"
  on public.outfit_logs for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own logs"
  on public.outfit_logs for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own logs"
  on public.outfit_logs for delete
  using ( auth.uid() = user_id );

-- Create Wishlist Items Table
create table if not exists public.wishlist_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  image_uri text not null,
  name text not null,
  brand text,
  price numeric default 0,
  link text,
  category text not null,
  type text not null,
  color text not null,
  occasions text[] default '{}',
  seasons text[] default '{}',
  notes text,
  is_priority boolean default false,
  added_at timestamptz default now()
);

-- Enable RLS for Wishlist Items
alter table public.wishlist_items enable row level security;

create policy "Users can view their own wishlist"
  on public.wishlist_items for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own wishlist"
  on public.wishlist_items for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own wishlist"
  on public.wishlist_items for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own wishlist"
  on public.wishlist_items for delete
  using ( auth.uid() = user_id );

-- Create Trips Table
create table if not exists public.trips (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  climate text not null,
  occasions text[] default '{}',
  packing_list text[] default '{}',
  is_packed boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS for Trips
alter table public.trips enable row level security;

create policy "Users can view their own trips"
  on public.trips for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own trips"
  on public.trips for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own trips"
  on public.trips for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own trips"
  on public.trips for delete
  using ( auth.uid() = user_id );

-- Storage Policies for 'user-images'
create policy "Give users access to own folder 1u532z_0" on storage.objects
  for select
  using (bucket_id = 'user-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Give users access to own folder 1u532z_1" on storage.objects
  for insert
  with check (bucket_id = 'user-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Give users access to own folder 1u532z_2" on storage.objects
  for update
  using (bucket_id = 'user-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Give users access to own folder 1u532z_3" on storage.objects
  for delete
  using (bucket_id = 'user-images' and auth.uid()::text = (storage.foldername(name))[1]);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Allow public read access to user-images (optional, for sharing)
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'user-images' );
