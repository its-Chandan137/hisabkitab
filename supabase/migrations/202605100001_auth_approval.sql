create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  email text not null unique,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone not null default now()
);

create table if not exists public.user_data (
  username text,
  user_id uuid references auth.users(id) on delete cascade,
  data text not null,
  updated_at timestamp with time zone not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
on public.profiles
for all
using ((auth.jwt() ->> 'email') = 'itschandan137@gmail.com')
with check ((auth.jwt() ->> 'email') = 'itschandan137@gmail.com');

drop policy if exists "profiles_users_read_own" on public.profiles;
create policy "profiles_users_read_own"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_users_insert_own_pending" on public.profiles;
create policy "profiles_users_insert_own_pending"
on public.profiles
for insert
with check (auth.uid() = id and status = 'pending');

alter table if exists public.user_data
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

do $$
declare
  chandan_id uuid;
begin
  select id into chandan_id
  from auth.users
  where email = 'itschandan137@gmail.com'
  limit 1;

  if chandan_id is null then
    chandan_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      chandan_id,
      'authenticated',
      'authenticated',
      'itschandan137@gmail.com',
      crypt('littledemon137', gen_salt('bf')),
      now(),
      jsonb_build_object('username', 'Chandan'),
      now(),
      now()
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      chandan_id::text,
      chandan_id,
      jsonb_build_object(
        'sub', chandan_id::text,
        'email', 'itschandan137@gmail.com',
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      'itschandan137@gmail.com',
      now(),
      now(),
      now()
    )
    on conflict do nothing;
  end if;

  insert into public.profiles (id, username, email, status, created_at)
  values (chandan_id, 'Chandan', 'itschandan137@gmail.com', 'approved', now())
  on conflict (id) do update
  set username = excluded.username,
      email = excluded.email,
      status = 'approved';

  update public.user_data
  set user_id = chandan_id
  where user_id is null;
end $$;

alter table public.user_data
  alter column user_id set not null;

create unique index if not exists user_data_user_id_key
on public.user_data(user_id);

alter table if exists public.user_data enable row level security;

drop policy if exists "user_data_users_own_rows" on public.user_data;
create policy "user_data_users_own_rows"
on public.user_data
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_data_admin_all" on public.user_data;
create policy "user_data_admin_all"
on public.user_data
for all
using ((auth.jwt() ->> 'email') = 'itschandan137@gmail.com')
with check ((auth.jwt() ->> 'email') = 'itschandan137@gmail.com');
