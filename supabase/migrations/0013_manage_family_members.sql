create or replace function public.update_family_member_role(
  p_family_id uuid,
  p_user_id uuid,
  p_role public.family_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_role public.family_role;
begin
  if auth.uid() is null or not public.has_family_role(p_family_id, array['owner','admin']::public.family_role[]) then
    raise exception 'Sem permissão para alterar membros.';
  end if;

  select role into current_role
  from public.family_members
  where family_id = p_family_id and user_id = p_user_id
  for update;

  if current_role is null then raise exception 'Membro não encontrado.'; end if;
  if current_role = 'owner' or p_role = 'owner' then raise exception 'O proprietário não pode ser alterado.'; end if;
  if p_role not in ('admin','adult','teen','child','caregiver','guest') then raise exception 'Permissão inválida.'; end if;

  update public.family_members set role = p_role, updated_at = now()
  where family_id = p_family_id and user_id = p_user_id;

  insert into public.audit_logs (family_id, actor_id, action, entity_type, entity_id, metadata)
  values (p_family_id, auth.uid(), 'member_role_updated', 'family_member', p_user_id, jsonb_build_object('from', current_role, 'to', p_role));
end;
$$;

create or replace function public.remove_family_member(p_family_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  member_role public.family_role;
begin
  if auth.uid() is null or not public.has_family_role(p_family_id, array['owner','admin']::public.family_role[]) then
    raise exception 'Sem permissão para remover membros.';
  end if;

  select role into member_role
  from public.family_members
  where family_id = p_family_id and user_id = p_user_id
  for update;

  if member_role is null then raise exception 'Membro não encontrado.'; end if;
  if member_role = 'owner' then raise exception 'O proprietário não pode ser removido.'; end if;

  delete from public.family_members where family_id = p_family_id and user_id = p_user_id;
  insert into public.audit_logs (family_id, actor_id, action, entity_type, entity_id, metadata)
  values (p_family_id, auth.uid(), 'member_removed', 'family_member', p_user_id, jsonb_build_object('role', member_role));
end;
$$;

revoke all on function public.update_family_member_role(uuid, uuid, public.family_role) from public;
revoke all on function public.remove_family_member(uuid, uuid) from public;
grant execute on function public.update_family_member_role(uuid, uuid, public.family_role) to authenticated;
grant execute on function public.remove_family_member(uuid, uuid) to authenticated;
