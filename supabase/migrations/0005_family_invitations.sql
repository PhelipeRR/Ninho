create table if not exists public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  email text not null check (char_length(email) between 3 and 320),
  token uuid not null default gen_random_uuid() unique,
  invited_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);
create index if not exists family_invitations_token_idx on public.family_invitations(token);
alter table public.family_invitations enable row level security;

drop policy if exists "family managers create invitations" on public.family_invitations;
drop policy if exists "family managers view invitations" on public.family_invitations;
create policy "family managers create invitations" on public.family_invitations
  for insert to authenticated
  with check (public.has_family_role(family_id, array['owner','admin']::public.family_role[]) and invited_by = (select auth.uid()));
create policy "family managers view invitations" on public.family_invitations
  for select to authenticated
  using (public.has_family_role(family_id, array['owner','admin']::public.family_role[]));
