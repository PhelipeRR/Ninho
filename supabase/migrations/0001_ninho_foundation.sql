create extension if not exists pgcrypto;

do $$ begin
  create type public.family_role as enum ('owner', 'admin', 'adult', 'teen', 'child', 'caregiver', 'guest');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.document_visibility as enum ('owner', 'admins', 'adults', 'selected', 'family');
exception when duplicate_object then null;
end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.family_role not null default 'adult',
  permissions jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete restrict,
  storage_path text not null unique,
  original_name text not null check (char_length(original_name) between 1 and 150),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/heic')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  visibility public.document_visibility not null default 'owner',
  selected_user_ids uuid[] not null default '{}',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Core family data. Every record belongs to a family and is protected by RLS below.
create table public.tasks (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240), details text, due_at timestamptz,
  assigned_to uuid references auth.users(id) on delete set null, priority text not null default 'Normal' check (priority in ('Baixa','Normal','Alta')),
  completed boolean not null default false, created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120), created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(), list_id uuid not null references public.shopping_lists(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 160), checked boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.family_events (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
  title text not null, starts_at timestamptz not null, ends_at timestamptz, location text, created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.finance_transactions (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
  description text not null, amount numeric(12,2) not null check (amount >= 0), kind text not null check (kind in ('income','expense')),
  category text not null default 'Outros', occurred_on date not null default current_date, created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.family_messages (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict, body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create table public.family_notifications (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, title text not null, body text, read_at timestamptz, created_at timestamptz not null default now()
);
create index tasks_family_due_idx on public.tasks (family_id, due_at);
create index events_family_start_idx on public.family_events (family_id, starts_at);
create index messages_family_created_idx on public.family_messages (family_id, created_at);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.handle_new_family()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.family_members (family_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (family_id, user_id) do update set role = 'owner';
  return new;
end;
$$;

create trigger on_family_created
  after insert on public.families
  for each row execute procedure public.handle_new_family();

create or replace function public.is_family_member(target_family_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_id = target_family_id
      and fm.user_id = auth.uid()
      and (fm.expires_at is null or fm.expires_at > now())
  );
$$;

create or replace function public.has_family_role(target_family_id uuid, allowed_roles public.family_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_id = target_family_id
      and fm.user_id = auth.uid()
      and fm.role = any(allowed_roles)
      and (fm.expires_at is null or fm.expires_at > now())
  );
$$;

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.documents enable row level security;
alter table public.audit_logs enable row level security;
alter table public.tasks enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_items enable row level security;
alter table public.family_events enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.family_messages enable row level security;
alter table public.family_notifications enable row level security;

create policy "profiles are visible to family members" on public.profiles for select using (
  id = auth.uid() or exists (select 1 from public.family_members me join public.family_members them on them.family_id = me.family_id where me.user_id = auth.uid() and them.user_id = profiles.id)
);
create policy "users manage their profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

create policy "members can view families" on public.families for select using (public.is_family_member(id));
create policy "owners create families" on public.families for insert with check (owner_id = auth.uid());
create policy "owners update families" on public.families for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners delete families" on public.families for delete using (owner_id = auth.uid());

create policy "members view membership" on public.family_members for select using (public.is_family_member(family_id));
create policy "owners and admins manage membership" on public.family_members for all using (public.has_family_role(family_id, array['owner', 'admin']::public.family_role[])) with check (public.has_family_role(family_id, array['owner', 'admin']::public.family_role[]));

create policy "authorized members view documents" on public.documents for select using (
  public.is_family_member(family_id) and deleted_at is null and (
    owner_id = auth.uid() or visibility = 'family' or
    (visibility = 'admins' and public.has_family_role(family_id, array['owner', 'admin']::public.family_role[])) or
    (visibility = 'adults' and public.has_family_role(family_id, array['owner', 'admin', 'adult']::public.family_role[])) or
    (visibility = 'selected' and auth.uid() = any(selected_user_ids))
  )
);
create policy "members create documents" on public.documents for insert with check (public.is_family_member(family_id) and owner_id = auth.uid());
create policy "owners and admins update documents" on public.documents for update using (owner_id = auth.uid() or public.has_family_role(family_id, array['owner', 'admin']::public.family_role[]));
create policy "owners and admins delete documents" on public.documents for delete using (owner_id = auth.uid() or public.has_family_role(family_id, array['owner', 'admin']::public.family_role[]));

create policy "admins view audit logs" on public.audit_logs for select using (public.has_family_role(family_id, array['owner', 'admin']::public.family_role[]));
create policy "members create audit logs" on public.audit_logs for insert with check (public.is_family_member(family_id) and actor_id = auth.uid());

create policy "members manage tasks" on public.tasks for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id) and created_by = auth.uid());
create policy "members manage lists" on public.shopping_lists for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id) and created_by = auth.uid());
create policy "members manage list items" on public.shopping_items for all using (
  exists (select 1 from public.shopping_lists l where l.id = list_id and public.is_family_member(l.family_id))
) with check (
  exists (select 1 from public.shopping_lists l where l.id = list_id and public.is_family_member(l.family_id)) and created_by = auth.uid()
);
create policy "members manage events" on public.family_events for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id) and created_by = auth.uid());
create policy "members manage finances" on public.finance_transactions for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id) and created_by = auth.uid());
create policy "members read messages" on public.family_messages for select using (public.is_family_member(family_id));
create policy "members send messages" on public.family_messages for insert with check (public.is_family_member(family_id) and author_id = auth.uid());
create policy "members read own notifications" on public.family_notifications for select using (user_id = auth.uid() and public.is_family_member(family_id));
create policy "users update own notifications" on public.family_notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets (id, name, public) values ('family-documents', 'family-documents', false) on conflict (id) do nothing;

create policy "authorized members read document objects" on storage.objects for select using (
  bucket_id = 'family-documents' and public.is_family_member((storage.foldername(name))[1]::uuid)
);
create policy "members upload document objects" on storage.objects for insert with check (
  bucket_id = 'family-documents' and public.is_family_member((storage.foldername(name))[1]::uuid)
);
create policy "owners and admins delete document objects" on storage.objects for delete using (
  bucket_id = 'family-documents' and public.has_family_role((storage.foldername(name))[1]::uuid, array['owner', 'admin']::public.family_role[])
);
