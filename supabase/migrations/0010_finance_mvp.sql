alter table public.finance_transactions drop constraint if exists finance_transactions_kind_check;
alter table public.finance_transactions add constraint finance_transactions_kind_check check (kind in ('income','expense','transfer'));
alter table public.finance_transactions add column if not exists purchase_date date not null default current_date;
alter table public.finance_transactions add column if not exists due_date date;
alter table public.finance_transactions add column if not exists status text not null default 'paid' check (status in ('paid','pending'));
alter table public.finance_transactions add column if not exists payment_method text;
alter table public.finance_transactions add column if not exists paid_by uuid references auth.users(id) on delete set null;
alter table public.finance_transactions add column if not exists recurrence text;
alter table public.finance_transactions add column if not exists notes text;
alter table public.finance_transactions add column if not exists receipt_path text;
alter table public.finance_transactions add column if not exists recurring_id uuid;
alter table public.finance_transactions add column if not exists installment_number integer;
alter table public.finance_transactions add column if not exists installment_total integer;

create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80), created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(), unique (family_id, name)
);
create table if not exists public.finance_recurring (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict, name text not null, kind text not null check (kind in ('income','expense')),
  amount numeric(12,2) not null check (amount > 0), category_id uuid references public.finance_categories(id) on delete set null,
  day_of_month integer not null check (day_of_month between 1 and 31), next_due date not null, recurrence text not null default 'monthly',
  payment_method text, payer_id uuid references auth.users(id) on delete set null, active boolean not null default true, notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.finance_splits (
  id uuid primary key default gen_random_uuid(), transaction_id uuid not null references public.finance_transactions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, split_type text not null check (split_type in ('individual','equal','percentage','fixed','selected')),
  percentage numeric(5,2), amount numeric(12,2) not null check (amount >= 0), created_at timestamptz not null default now()
);
create table if not exists public.finance_budgets (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
  category_id uuid not null references public.finance_categories(id) on delete cascade, month_start date not null,
  limit_amount numeric(12,2) not null check (limit_amount > 0), created_by uuid not null references auth.users(id) on delete restrict,
  unique (family_id, category_id, month_start)
);
create table if not exists public.finance_access (
  family_id uuid not null references public.families(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict, created_at timestamptz not null default now(), primary key (family_id, user_id)
);
create table if not exists public.finance_settlements (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
  from_user uuid not null references auth.users(id) on delete restrict, to_user uuid not null references auth.users(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0), settled_at date not null default current_date, notes text,
  created_by uuid not null references auth.users(id) on delete restrict, created_at timestamptz not null default now()
);

create index if not exists finance_transactions_month_idx on public.finance_transactions(family_id, purchase_date);
create index if not exists finance_transactions_due_idx on public.finance_transactions(family_id, due_date) where status = 'pending';
create index if not exists finance_recurring_due_idx on public.finance_recurring(family_id, next_due) where active;

alter table public.finance_categories enable row level security;
alter table public.finance_recurring enable row level security;
alter table public.finance_splits enable row level security;
alter table public.finance_budgets enable row level security;
alter table public.finance_access enable row level security;
alter table public.finance_settlements enable row level security;

drop policy if exists "members manage finances" on public.finance_transactions;
create policy "authorized members view finances" on public.finance_transactions for select to authenticated using (
  public.is_family_member(family_id) and (
    public.has_family_role(family_id, array['owner','admin','adult']::public.family_role[]) or
    exists (select 1 from public.finance_access fa where fa.family_id = finance_transactions.family_id and fa.user_id = (select auth.uid()))
  )
);
create policy "authorized members create finances" on public.finance_transactions for insert to authenticated with check (
  public.is_family_member(family_id) and created_by = (select auth.uid()) and
  (public.has_family_role(family_id, array['owner','admin','adult']::public.family_role[]) or exists (select 1 from public.finance_access fa where fa.family_id = finance_transactions.family_id and fa.user_id = (select auth.uid())))
);
create policy "authorized members update finances" on public.finance_transactions for update to authenticated using (created_by = (select auth.uid()) or public.has_family_role(family_id, array['owner','admin']::public.family_role[])) with check (public.is_family_member(family_id));
create policy "authorized members delete finances" on public.finance_transactions for delete to authenticated using (created_by = (select auth.uid()) or public.has_family_role(family_id, array['owner','admin']::public.family_role[]));

create policy "family members manage finance categories" on public.finance_categories for all to authenticated using (public.is_family_member(family_id)) with check (public.is_family_member(family_id) and created_by = (select auth.uid()));
create policy "family members manage recurring finances" on public.finance_recurring for all to authenticated using (public.is_family_member(family_id)) with check (public.is_family_member(family_id) and created_by = (select auth.uid()));
create policy "family members manage finance budgets" on public.finance_budgets for all to authenticated using (public.is_family_member(family_id)) with check (public.is_family_member(family_id) and created_by = (select auth.uid()));
create policy "family managers manage finance access" on public.finance_access for all to authenticated using (public.has_family_role(family_id, array['owner','admin']::public.family_role[])) with check (public.has_family_role(family_id, array['owner','admin']::public.family_role[]) and created_by = (select auth.uid()));
create policy "family members manage finance settlements" on public.finance_settlements for all to authenticated using (public.is_family_member(family_id)) with check (public.is_family_member(family_id) and created_by = (select auth.uid()));
create policy "family members manage finance splits" on public.finance_splits for all to authenticated using (exists (select 1 from public.finance_transactions tx where tx.id = transaction_id and public.is_family_member(tx.family_id))) with check (exists (select 1 from public.finance_transactions tx where tx.id = transaction_id and public.is_family_member(tx.family_id)));

create or replace function public.audit_finance_change() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs(family_id, actor_id, action, entity_type, entity_id, metadata)
  values (coalesce(new.family_id, old.family_id), (select auth.uid()), lower(tg_op), 'finance_transaction', coalesce(new.id, old.id), jsonb_build_object('description', coalesce(new.description, old.description)));
  return coalesce(new, old);
end;
$$;
drop trigger if exists finance_transactions_audit on public.finance_transactions;
create trigger finance_transactions_audit after insert or update or delete on public.finance_transactions for each row execute function public.audit_finance_change();
