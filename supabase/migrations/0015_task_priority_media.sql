alter table public.tasks drop constraint if exists tasks_priority_check;

alter table public.tasks add constraint tasks_priority_check
  check (priority in ('Baixa', 'Média', 'Alta', 'Normal'));

alter table public.tasks alter column priority set default 'Média';
