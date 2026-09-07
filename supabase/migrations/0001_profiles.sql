-- 0001_profiles.sql
-- profiles table linked to Supabase auth.users, plus trigger to auto-create
-- a profile row whenever a new auth.users row is created (via Supabase Auth sign-up).

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'registered' check (role in ('admin', 'registered')),
  full_name text,
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();