-- Execute este arquivo depois que 0001_ninho_foundation.sql já tiver sido
-- executado parcialmente. Ele é seguro para objetos que já existem.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240), details text, due_at timestamptz,
  assigned_to uuid references auth.users(id) on delete set null, priority text not null default 'Normal' check (priority in ('Baixa','Normal','Alta')),
  completed boolean not null default false, created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120), created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(), list_id uuid not null references public.shopping_lists(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 160), checked boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.family_events (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
  title text not null, starts_at timestamptz not null, ends_at timestamptz, location text, created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
  description text not null, amount numeric(12,2) not null check (amount >= 0), kind text not null check (kind in ('income','expense')),
  category text not null default 'Outros', occurred_on date not null default current_date, created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.family_messages (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict, body text not null check (char_length(body) between 1 and 4000), created_at timestamptz not null default now()
);
create table if not exists public.family_notifications (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, title text not null, body text, read_at timestamptz, created_at timestamptz not null default now()
);

create index if not exists tasks_family_due_idx on public.tasks (family_id, due_at);
create index if not exists events_family_start_idx on public.family_events (family_id, starts_at);
create index if not exists messages_family_created_idx on public.family_messages (family_id, created_at);

alter table public.tasks enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_items enable row level security;
alter table public.family_events enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.family_messages enable row level security;
alter table public.family_notifications enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tasks' and policyname = 'members manage tasks') then
    create policy "members manage tasks" on public.tasks for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id) and created_by = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shopping_lists' and policyname = 'members manage lists') then
    create policy "members manage lists" on public.shopping_lists for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id) and created_by = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shopping_items' and policyname = 'members manage list items') then
    create policy "members manage list items" on public.shopping_items for all using (exists (select 1 from public.shopping_lists l where l.id = list_id and public.is_family_member(l.family_id))) with check (exists (select 1 from public.shopping_lists l where l.id = list_id and public.is_family_member(l.family_id)) and created_by = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'family_events' and policyname = 'members manage events') then
    create policy "members manage events" on public.family_events for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id) and created_by = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'finance_transactions' and policyname = 'members manage finances') then
    create policy "members manage finances" on public.finance_transactions for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id) and created_by = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'family_messages' and policyname = 'members read messages') then
    create policy "members read messages" on public.family_messages for select using (public.is_family_member(family_id));
    create policy "members send messages" on public.family_messages for insert with check (public.is_family_member(family_id) and author_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'family_notifications' and policyname = 'members read own notifications') then
    create policy "members read own notifications" on public.family_notifications for select using (user_id = auth.uid() and public.is_family_member(family_id));
    create policy "users update own notifications" on public.family_notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;
