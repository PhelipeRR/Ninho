create or replace function public.accept_family_invitation(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.family_invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Você precisa estar autenticado para aceitar um convite.';
  end if;

  select * into invitation
  from public.family_invitations
  where token = p_token
    and accepted_at is null
    and expires_at > now()
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  for update;

  if not found then
    raise exception 'Convite inválido, expirado ou destinado a outro e-mail.';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (invitation.family_id, auth.uid(), 'adult')
  on conflict (family_id, user_id) do nothing;

  update public.family_invitations
  set accepted_at = now()
  where id = invitation.id;

  return invitation.family_id;
end;
$$;

revoke all on function public.accept_family_invitation(uuid) from public;
grant execute on function public.accept_family_invitation(uuid) to authenticated;
