create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  profile_name text;
begin
  profile_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(new.email, '@', 1), '')
  );

  insert into public.profiles (id, display_name, avatar_path)
  values (new.id, profile_name, new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do update set
    display_name = coalesce(nullif(trim(public.profiles.display_name), ''), excluded.display_name),
    avatar_path = coalesce(public.profiles.avatar_path, excluded.avatar_path);

  return new;
end;
$$;

update public.profiles p
set
  display_name = coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(u.email, '@', 1), ''),
    p.display_name
  ),
  avatar_path = coalesce(p.avatar_path, u.raw_user_meta_data ->> 'avatar_url')
from auth.users u
where p.id = u.id;
