create or replace function public.notify_family_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_family_id uuid;
  actor_id uuid;
  activity_title text;
  activity_body text;
begin
  if tg_table_name = 'shopping_items' then
    select l.family_id into target_family_id from public.shopping_lists l where l.id = new.list_id;
    actor_id := new.created_by;
  elsif tg_table_name = 'family_messages' then
    target_family_id := new.family_id;
    actor_id := new.author_id;
  else
    target_family_id := new.family_id;
    actor_id := new.created_by;
  end if;

  if tg_table_name = 'tasks' then
    activity_title := case when tg_op = 'UPDATE' then 'Tarefa atualizada' else 'Nova tarefa' end;
    activity_body := new.title;
  elsif tg_table_name = 'family_events' then
    activity_title := 'Novo compromisso no calendário';
    activity_body := new.title;
  elsif tg_table_name = 'family_messages' then
    activity_title := 'Nova mensagem na família';
    activity_body := left(new.body, 180);
  elsif tg_table_name = 'shopping_items' then
    activity_title := case when tg_op = 'UPDATE' then 'Lista atualizada' else 'Novo item na lista' end;
    activity_body := new.label;
  elsif tg_table_name = 'finance_transactions' then
    activity_title := 'Novo lançamento financeiro';
    activity_body := new.description;
  else
    return new;
  end if;

  insert into public.family_notifications (family_id, user_id, title, body)
  select target_family_id, fm.user_id, activity_title, activity_body
  from public.family_members fm
  where fm.family_id = target_family_id
    and fm.user_id is distinct from actor_id;
  return new;
end;
$$;

drop trigger if exists tasks_notify_family on public.tasks;
drop trigger if exists tasks_notify_family_insert on public.tasks;
drop trigger if exists tasks_notify_family_update on public.tasks;
create trigger tasks_notify_family_insert after insert on public.tasks for each row execute function public.notify_family_activity();
create trigger tasks_notify_family_update after update of completed on public.tasks for each row
when (old.completed is distinct from new.completed) execute function public.notify_family_activity();

drop trigger if exists events_notify_family on public.family_events;
create trigger events_notify_family after insert on public.family_events for each row execute function public.notify_family_activity();

drop trigger if exists messages_notify_family on public.family_messages;
create trigger messages_notify_family after insert on public.family_messages for each row execute function public.notify_family_activity();

drop trigger if exists shopping_items_notify_family on public.shopping_items;
drop trigger if exists shopping_items_notify_family_insert on public.shopping_items;
drop trigger if exists shopping_items_notify_family_update on public.shopping_items;
create trigger shopping_items_notify_family_insert after insert on public.shopping_items for each row execute function public.notify_family_activity();
create trigger shopping_items_notify_family_update after update of checked on public.shopping_items for each row
when (old.checked is distinct from new.checked) execute function public.notify_family_activity();

drop trigger if exists finance_notify_family on public.finance_transactions;
create trigger finance_notify_family after insert on public.finance_transactions for each row execute function public.notify_family_activity();

alter publication supabase_realtime add table public.tasks, public.shopping_lists, public.shopping_items, public.family_events, public.family_messages, public.family_meals, public.family_routines, public.family_birthdays, public.family_notifications, public.finance_transactions, public.family_members;

revoke all on function public.notify_family_activity() from public;
