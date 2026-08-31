create table if not exists public.family_meals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  meal_date date not null,
  title text not null check (char_length(title) between 1 and 160),
  details text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.family_routines (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  schedule text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.family_birthdays (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  birthday date not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.family_meals enable row level security;
alter table public.family_routines enable row level security;
alter table public.family_birthdays enable row level security;

drop policy if exists "members manage meals" on public.family_meals;
drop policy if exists "members manage routines" on public.family_routines;
drop policy if exists "members manage birthdays" on public.family_birthdays;
create policy "members manage meals" on public.family_meals for all to authenticated using (public.is_family_member(family_id)) with check (public.is_family_member(family_id) and created_by = (select auth.uid()));
create policy "members manage routines" on public.family_routines for all to authenticated using (public.is_family_member(family_id)) with check (public.is_family_member(family_id) and created_by = (select auth.uid()));
create policy "members manage birthdays" on public.family_birthdays for all to authenticated using (public.is_family_member(family_id)) with check (public.is_family_member(family_id) and created_by = (select auth.uid()));
