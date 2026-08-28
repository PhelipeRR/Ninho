-- Corrige a criação da primeira família após uma execução parcial da migração.
-- Execute este arquivo no SQL Editor do Supabase.

alter table public.families enable row level security;
alter table public.family_members enable row level security;

drop policy if exists "members can view families" on public.families;
drop policy if exists "owners create families" on public.families;
drop policy if exists "owners update families" on public.families;
drop policy if exists "owners delete families" on public.families;

create policy "members can view families" on public.families
  for select to authenticated
  using (public.is_family_member(id));

create policy "owners create families" on public.families
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "owners update families" on public.families
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "owners delete families" on public.families
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Garante que o criador entre automaticamente como owner.
create or replace function public.handle_new_family()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.family_members (family_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (family_id, user_id) do update set role = 'owner';
  return new;
end;
$$;

revoke all on function public.handle_new_family() from public;
