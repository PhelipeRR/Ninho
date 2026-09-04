create table if not exists public.family_notes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  body text not null default '',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists family_notes_family_updated_idx
  on public.family_notes(family_id, updated_at desc);

alter table public.family_notes enable row level security;

drop policy if exists "family members manage notes" on public.family_notes;
create policy "family members manage notes" on public.family_notes
  for all to authenticated
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id) and created_by = (select auth.uid()));
