create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  primary_color text default '#2563eb',
  secondary_color text default '#111827',
  created_at timestamptz default now()
);

create table if not exists public.sellers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  email text,
  color text default '#2563eb',
  api_key text unique default encode(gen_random_bytes(24), 'hex'),
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  seller_id uuid references public.sellers(id) on delete set null,
  full_name text not null,
  email text not null,
  role text not null default 'seller' check (role in ('admin','seller','operator','viewer')),
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  seller_id uuid references public.sellers(id) on delete restrict,
  order_number text not null,
  customer_first_name text not null,
  customer_last_name text not null,
  customer_email text not null,
  customer_dni text,
  customer_address text,
  product_name text,
  logistics_operator text,
  status text not null default 'pending' check (status in ('pending','ready','in_transit','delivered','not_delivered','rescheduled','cancelled')),
  source text not null default 'manual' check (source in ('api','csv','manual')),
  tracking_token text unique not null default encode(gen_random_bytes(18), 'hex'),
  deleted_at timestamptz,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (seller_id, order_number)
);

create table if not exists public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  event_type text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  to_email text not null,
  subject text not null,
  status text default 'pending',
  provider_response text,
  created_at timestamptz default now()
);

create or replace function public.has_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists(select 1 from public.profiles where role='admin' and approval_status='approved' and active=true);
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at before update on public.orders for each row execute function public.touch_updated_at();

alter table public.companies enable row level security;
alter table public.sellers enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.tracking_events enable row level security;
alter table public.email_logs enable row level security;

create policy "setup can check companies" on public.companies for select to anon, authenticated using (true);
create policy "setup insert first company" on public.companies for insert to anon, authenticated with check (public.has_admin() = false);

create policy "profiles read own or admin" on public.profiles for select to authenticated using (
  id = auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and p.approval_status='approved')
);
create policy "first admin profile insert" on public.profiles for insert to authenticated with check (
  id = auth.uid() and public.has_admin() = false and role='admin' and approval_status='approved'
);
create policy "pending profile insert" on public.profiles for insert to authenticated with check (id = auth.uid() and role <> 'admin');
create policy "admin update profiles" on public.profiles for update to authenticated using (
  exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and p.approval_status='approved')
);

create policy "admin all sellers" on public.sellers for all to authenticated using (
  exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and p.approval_status='approved')
) with check (
  exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and p.approval_status='approved')
);
create policy "seller read own seller" on public.sellers for select to authenticated using (
  id in (select seller_id from public.profiles where id=auth.uid())
);
create policy "setup first seller" on public.sellers for insert to authenticated with check (public.has_admin() = false);

create policy "orders read scoped" on public.orders for select to authenticated using (
  deleted_at is null and (
    exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and p.approval_status='approved')
    or seller_id in (select seller_id from public.profiles where id=auth.uid() and approval_status='approved')
  )
);
create policy "orders insert scoped" on public.orders for insert to authenticated with check (
  exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and p.approval_status='approved')
  or seller_id in (select seller_id from public.profiles where id=auth.uid() and approval_status='approved')
);
create policy "orders update scoped" on public.orders for update to authenticated using (
  exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and p.approval_status='approved')
  or seller_id in (select seller_id from public.profiles where id=auth.uid() and approval_status='approved')
);

create policy "tracking public by token" on public.orders for select to anon using (deleted_at is null);
create policy "events read scoped" on public.tracking_events for select to authenticated using (true);
create policy "events insert scoped" on public.tracking_events for insert to authenticated with check (true);
create policy "email logs admin" on public.email_logs for all to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
