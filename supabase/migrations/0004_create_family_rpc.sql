-- Criação de família pelo app, com validação do usuário autenticado no banco.
create or replace function public.create_family(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family_id uuid;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;
  if p_name is null or char_length(trim(p_name)) = 0 then
    raise exception 'family name is required';
  end if;

  insert into public.families (name, owner_id)
  values (left(trim(p_name), 120), current_user_id)
  returning id into new_family_id;
  return new_family_id;
end;
$$;

revoke all on function public.create_family(text) from public;
grant execute on function public.create_family(text) to authenticated;
