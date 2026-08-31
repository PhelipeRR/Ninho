revoke execute on function public.create_family(text) from anon;
revoke execute on function public.handle_new_family() from anon;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.is_family_member(uuid) from anon;
revoke execute on function public.has_family_role(uuid, public.family_role[]) from anon;

create index if not exists family_meals_family_date_idx on public.family_meals (family_id, meal_date);
create index if not exists family_routines_family_created_idx on public.family_routines (family_id, created_at);
create index if not exists family_birthdays_family_date_idx on public.family_birthdays (family_id, birthday);
