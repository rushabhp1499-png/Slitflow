-- =====================================================================
-- SlitFlow - Supabase database setup
-- Run this whole file once in: Supabase Dashboard -> SQL Editor -> New query
-- It is safe to run again; it only creates what is missing and replaces functions.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

-- Customer companies. `data` holds the Customer object used by the app.
create table if not exists public.customers (
  id text primary key,
  data jsonb not null,
  authorized_emails text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Emails that are allowed to sign in to the factory dashboard.
create table if not exists public.staff_emails (
  email text primary key check (email = lower(email))
);

-- Links a signed-in user to a role (factory staff or a customer company).
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('staff', 'customer')),
  customer_id text references public.customers(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (role = 'staff' or customer_id is not null)
);

-- One row per order / job (MaterialInward). Bundles, challans and spec
-- change requests live inside `data`, exactly as the app uses them.
create table if not exists public.jobs (
  id text primary key,
  customer_id text not null references public.customers(id),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists jobs_customer_id_idx on public.jobs (customer_id);

-- Activity feed. customer_id is null for factory-only notifications.
create table if not exists public.notifications (
  id text primary key,
  customer_id text,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists notifications_customer_id_idx on public.notifications (customer_id);
create index if not exists notifications_created_at_idx on public.notifications (created_at desc);

create sequence if not exists public.job_no_seq start 101;
create sequence if not exists public.customer_no_seq start 1;

-- The factory admin account. Add more staff with:
--   insert into public.staff_emails (email) values ('someone@example.com');
insert into public.staff_emails (email) values ('progressive.ent8@gmail.com')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 2. Helper functions used by the security rules
-- ---------------------------------------------------------------------

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from profiles where user_id = auth.uid() and role = 'staff');
$$;

create or replace function public.my_customer_id()
returns text
language sql stable security definer set search_path = public
as $$
  select customer_id from profiles where user_id = auth.uid() and role = 'customer';
$$;

-- ---------------------------------------------------------------------
-- 3. Triggers
-- ---------------------------------------------------------------------

-- Keeps customers.data and authorized_emails consistent, never stores passwords.
create or replace function public.customers_before_write()
returns trigger
language plpgsql
as $$
begin
  new.data := (new.data - 'password') || jsonb_build_object('id', new.id);
  new.authorized_emails := array(
    select distinct lower(trim(e))
    from (
      select jsonb_array_elements_text(
        case when jsonb_typeof(new.data -> 'authorizedEmails') = 'array'
             then new.data -> 'authorizedEmails' else '[]'::jsonb end
      ) as e
      union all
      select new.data ->> 'email'
    ) s
    where e is not null and trim(e) <> ''
  );
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists customers_before_write on public.customers;
create trigger customers_before_write
before insert or update on public.customers
for each row execute function public.customers_before_write();

-- When the factory removes an email from a customer, that login loses access.
create or replace function public.customers_after_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  delete from profiles
  where customer_id = new.id
    and role = 'customer'
    and not (email = any (new.authorized_emails));
  return null;
end;
$$;

drop trigger if exists customers_after_update on public.customers;
create trigger customers_after_update
after update on public.customers
for each row execute function public.customers_after_update();

-- Assigns job numbers on the server (so two people can never get the same
-- number) and stops customers from submitting anything except a fresh order.
create or replace function public.jobs_before_write()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  staff boolean := public.is_staff();
  job_no text;
begin
  new.updated_at := now();

  if tg_op = 'INSERT' then
    if not staff then
      new.customer_id := public.my_customer_id();
      if new.customer_id is null then
        raise exception 'Your login is not linked to a customer account';
      end if;
      new.data := (new.data - 'outputDetails' - 'challan' - 'estimatedDeliveryDate' - 'poClosedAt' - 'poClosedBy' - 'poClosingNotes')
        || jsonb_build_object(
          'status', 'received',
          'bundles', '[]'::jsonb,
          'challans', '[]'::jsonb,
          'eddHistory', '[]'::jsonb,
          'specChangeRequests', '[]'::jsonb,
          'dispatchedWeightKg', 0,
          'remainingWeightKg', coalesce(new.data -> 'incomingWeight', '0'::jsonb),
          'poStatus', 'open'
        );
    end if;

    job_no := new.data ->> 'jobNo';
    if not staff or job_no is null or job_no = '' or job_no like 'PENDING%' then
      loop
        job_no := 'PE-JOB-' || to_char(now() at time zone 'Asia/Kolkata', 'YYYY') || '-'
          || lpad(nextval('public.job_no_seq')::text, 3, '0');
        exit when not exists (select 1 from jobs where data ->> 'jobNo' = job_no);
      end loop;
    end if;

    new.data := new.data || jsonb_build_object('id', new.id, 'customerId', new.customer_id, 'jobNo', job_no);

    insert into notifications (id, customer_id, data)
    values (
      'notif-inward-' || new.id,
      new.customer_id,
      jsonb_build_object(
        'id', 'notif-inward-' || new.id,
        'jobId', new.id,
        'jobNo', job_no,
        'customerId', new.customer_id,
        'customerName', coalesce(new.data ->> 'customerName', ''),
        'type', 'new_material_inward',
        'title', 'New Inward (PO: ' || coalesce(new.data ->> 'customerPoNo', '-') || '): ' || coalesce(new.data ->> 'grade', ''),
        'message', coalesce(new.data ->> 'customerName', 'Customer') || ' registered ' || coalesce(new.data ->> 'incomingWeight', '0')
          || ' kg via ' || coalesce(new.data ->> 'vehicleNo', '-') || '. Job number ' || job_no || '.',
        'createdAt', now(),
        'read', false
      )
    )
    on conflict (id) do nothing;

    return new;
  end if;

  -- UPDATE: the id and job number can never change.
  new.data := new.data || jsonb_build_object('id', old.id, 'jobNo', old.data -> 'jobNo');
  return new;
end;
$$;

drop trigger if exists jobs_before_write on public.jobs;
create trigger jobs_before_write
before insert or update on public.jobs
for each row execute function public.jobs_before_write();

-- ---------------------------------------------------------------------
-- 4. Functions the app calls
-- ---------------------------------------------------------------------

-- Called after every sign-in. Works out whether this login is factory staff
-- or which customer company it belongs to, creating the company on first
-- sign-in after self-registration. Returns no row if the login is not linked.
create or replace function public.link_my_account()
returns table (account_role text, account_customer_id text)
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  u auth.users%rowtype;
  em text;
  cid text;
  meta jsonb;
  company text;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  -- If the app asks twice at the same moment, the second call waits here and
  -- then finds the profile the first call created (no duplicate company).
  perform pg_advisory_xact_lock(hashtext('link_my_account:' || uid::text));

  select * into u from auth.users where id = uid;
  em := lower(u.email);

  if u.email_confirmed_at is null then
    raise exception 'Please confirm your email address first';
  end if;

  return query select p.role, p.customer_id from profiles p where p.user_id = uid;
  if found then
    return;
  end if;

  if exists (select 1 from staff_emails s where s.email = em) then
    insert into profiles (user_id, email, role) values (uid, em, 'staff');
    return query select 'staff'::text, null::text;
    return;
  end if;

  -- An email the factory already added to a customer company.
  select c.id into cid from customers c where em = any (c.authorized_emails) order by c.created_at limit 1;

  if cid is null then
    -- A brand-new company that registered from the login page.
    meta := coalesce(u.raw_user_meta_data, '{}'::jsonb);
    company := nullif(trim(meta ->> 'companyName'), '');
    if company is null then
      return;
    end if;

    loop
      cid := 'CUST-' || lpad(nextval('public.customer_no_seq')::text, 3, '0');
      exit when not exists (select 1 from customers where id = cid);
    end loop;

    insert into customers (id, data)
    values (cid, jsonb_build_object(
      'id', cid,
      'name', company,
      'companyName', company,
      'contactPerson', coalesce(meta ->> 'contactPerson', ''),
      'email', em,
      'authorizedEmails', jsonb_build_array(em),
      'phone', coalesce(meta ->> 'phone', ''),
      'gstNumber', coalesce(meta ->> 'gstNumber', ''),
      'registeredAddress', coalesce(meta ->> 'registeredAddress', ''),
      'plantAddress', coalesce(meta ->> 'plantAddress', ''),
      'city', coalesce(meta ->> 'city', ''),
      'state', coalesce(meta ->> 'state', 'Maharashtra'),
      'stateCode', coalesce(meta ->> 'stateCode', '27')
    ));

    insert into notifications (id, customer_id, data)
    values (
      'notif-newcust-' || cid,
      null,
      jsonb_build_object(
        'id', 'notif-newcust-' || cid,
        'jobId', 'sys-new-cust',
        'jobNo', 'NEW-ACCOUNT',
        'customerId', cid,
        'customerName', company,
        'type', 'status_change',
        'title', 'New Customer Onboarded: ' || company,
        'message', company || ' created a new customer account. Contact: '
          || coalesce(nullif(meta ->> 'contactPerson', ''), company) || ' (' || em || ').',
        'createdAt', now(),
        'read', false
      )
    )
    on conflict (id) do nothing;
  end if;

  insert into profiles (user_id, email, role, customer_id) values (uid, em, 'customer', cid);
  return query select 'customer'::text, cid;
end;
$$;

-- Customers ask for a specification change. Runs on the server so a
-- customer can only append a pending request, never edit the order itself.
create or replace function public.request_spec_change(p_job_id text, p_request jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  j jobs%rowtype;
  req jsonb;
  result jsonb;
begin
  select * into j from jobs where id = p_job_id for update;
  if not found or (not public.is_staff() and j.customer_id is distinct from public.my_customer_id()) then
    raise exception 'Order not found';
  end if;

  req := p_request || jsonb_build_object(
    'id', coalesce(nullif(p_request ->> 'id', ''), 'req-' || replace(gen_random_uuid()::text, '-', '')),
    'jobId', j.id,
    'jobNo', j.data -> 'jobNo',
    'customerId', j.customer_id,
    'status', 'pending_approval',
    'requestedAt', now(),
    'requestedByEmail', lower(auth.jwt() ->> 'email')
  ) - 'reviewedAt' - 'reviewedBy' - 'reviewNote';

  update jobs
  set data = jsonb_set(
    data,
    '{specChangeRequests}',
    coalesce(data -> 'specChangeRequests', '[]'::jsonb) || jsonb_build_array(req)
  ) || jsonb_build_object('updatedAt', now())
  where id = j.id
  returning data into result;

  insert into notifications (id, customer_id, data)
  values (
    'notif-spec-' || (req ->> 'id'),
    j.customer_id,
    jsonb_build_object(
      'id', 'notif-spec-' || (req ->> 'id'),
      'jobId', j.id,
      'jobNo', j.data ->> 'jobNo',
      'customerId', j.customer_id,
      'customerName', j.data ->> 'customerName',
      'type', 'spec_change_requested',
      'title', 'Spec Change Requested: PO ' || coalesce(j.data ->> 'customerPoNo', '-'),
      'message', 'Customer requested spec amendment (' || coalesce(req ->> 'reason', '') || '). Awaiting factory review.',
      'createdAt', now(),
      'read', false
    )
  )
  on conflict (id) do nothing;

  return result;
end;
$$;

-- After importing old records, moves the number counters past the
-- highest job / customer number already in use.
create or replace function public.sync_number_sequences()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  max_job bigint;
  max_cust bigint;
begin
  if not public.is_staff() then
    raise exception 'Only factory staff can do this';
  end if;

  select max((regexp_match(data ->> 'jobNo', '(\d+)$'))[1]::bigint) into max_job from jobs;
  select max((regexp_match(id, '(\d+)$'))[1]::bigint) into max_cust from customers;

  if max_job is not null then
    perform setval('public.job_no_seq', greatest(max_job, 100));
  end if;
  if max_cust is not null then
    perform setval('public.customer_no_seq', max_cust);
  end if;
end;
$$;

-- Only signed-in users may call these (functions are callable by everyone by default).
revoke execute on function public.link_my_account() from public, anon;
revoke execute on function public.request_spec_change(text, jsonb) from public, anon;
revoke execute on function public.sync_number_sequences() from public, anon;
grant execute on function public.link_my_account() to authenticated;
grant execute on function public.request_spec_change(text, jsonb) to authenticated;
grant execute on function public.sync_number_sequences() to authenticated;

-- Table access for signed-in users (the row rules below decide which rows).
-- Logged-out visitors get nothing.
revoke all on public.customers, public.staff_emails, public.profiles, public.jobs, public.notifications from anon;
grant select, insert, update, delete on public.customers, public.jobs, public.notifications to authenticated;
grant select on public.profiles, public.staff_emails to authenticated;

-- ---------------------------------------------------------------------
-- 5. Security rules (Row Level Security)
--    Factory staff see everything. A customer only sees their own company.
-- ---------------------------------------------------------------------

alter table public.customers enable row level security;
alter table public.staff_emails enable row level security;
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.notifications enable row level security;

drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers for select to authenticated
  using (public.is_staff() or id = public.my_customer_id());
drop policy if exists customers_staff_insert on public.customers;
create policy customers_staff_insert on public.customers for insert to authenticated
  with check (public.is_staff());
drop policy if exists customers_staff_update on public.customers;
create policy customers_staff_update on public.customers for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists customers_staff_delete on public.customers;
create policy customers_staff_delete on public.customers for delete to authenticated
  using (public.is_staff());

drop policy if exists staff_emails_select on public.staff_emails;
create policy staff_emails_select on public.staff_emails for select to authenticated
  using (public.is_staff());

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

drop policy if exists jobs_select on public.jobs;
create policy jobs_select on public.jobs for select to authenticated
  using (public.is_staff() or customer_id = public.my_customer_id());
drop policy if exists jobs_insert on public.jobs;
create policy jobs_insert on public.jobs for insert to authenticated
  with check (public.is_staff() or customer_id = public.my_customer_id());
drop policy if exists jobs_staff_update on public.jobs;
create policy jobs_staff_update on public.jobs for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists jobs_staff_delete on public.jobs;
create policy jobs_staff_delete on public.jobs for delete to authenticated
  using (public.is_staff());

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using (public.is_staff() or customer_id = public.my_customer_id());
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert to authenticated
  with check (public.is_staff() or customer_id = public.my_customer_id());
drop policy if exists notifications_staff_update on public.notifications;
create policy notifications_staff_update on public.notifications for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists notifications_staff_delete on public.notifications;
create policy notifications_staff_delete on public.notifications for delete to authenticated
  using (public.is_staff());

-- ---------------------------------------------------------------------
-- 6. Live updates (Realtime)
-- ---------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['jobs', 'customers', 'notifications'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
