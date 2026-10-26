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

-- How many times bundles appear on more than one active (not superseded) challan
-- of an order. Used to stop the same bundle being dispatched twice.
create or replace function public.challan_bundle_duplicates(d jsonb)
returns integer
language sql immutable
as $$
  select coalesce(sum(n - 1), 0)::int
  from (
    select count(*) as n
    from jsonb_array_elements(coalesce(d -> 'challans', '[]'::jsonb)) c,
         jsonb_array_elements_text(
           case
             when jsonb_typeof(c -> 'selectedBundleIds') = 'array' and jsonb_array_length(c -> 'selectedBundleIds') > 0
               then c -> 'selectedBundleIds'
             else coalesce(
               (select jsonb_agg(b -> 'id') from jsonb_array_elements(coalesce(c -> 'dispatchedBundles', '[]'::jsonb)) b),
               '[]'::jsonb)
           end
         ) bid
    where coalesce((c ->> 'isSuperseded')::boolean, false) = false
    group by bid
  ) x;
$$;

-- Assigns job numbers on the server (so two people can never get the same
-- number) and stops customers from submitting anything except a fresh order.
create or replace function public.jobs_before_write()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  staff boolean := public.is_staff();
  job_no text;
  po_no text;
  fresh boolean := false;
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

    -- One new order per customer at a time, so two simultaneous entries
    -- can never both claim the same PO number.
    perform pg_advisory_xact_lock(hashtext('jobs_po:' || new.customer_id));

    job_no := new.data ->> 'jobNo';
    if not staff or job_no is null or job_no = '' or job_no like 'PENDING%' then
      fresh := true;
      loop
        job_no := 'PE-JOB-' || to_char(now() at time zone 'Asia/Kolkata', 'YYYY') || '-'
          || lpad(nextval('public.job_no_seq')::text, 3, '0');
        exit when not exists (select 1 from jobs where data ->> 'jobNo' = job_no);
      end loop;
    end if;

    -- PO numbers never repeat for a customer. Left blank, the PO follows the
    -- job number (PE-JOB-2026-105 -> PE-PO-2026-105). Imported old records
    -- (fresh = false) keep whatever PO they had.
    po_no := nullif(trim(coalesce(new.data ->> 'customerPoNo', '')), '');
    if fresh then
      if po_no is null then
        po_no := replace(job_no, 'PE-JOB-', 'PE-PO-');
        while exists (
          select 1 from jobs
          where customer_id = new.customer_id and lower(trim(data ->> 'customerPoNo')) = lower(po_no)
        ) loop
          po_no := po_no || '-A';
        end loop;
      elsif exists (
        select 1 from jobs
        where customer_id = new.customer_id and lower(trim(data ->> 'customerPoNo')) = lower(po_no)
      ) then
        raise exception 'PO number % has already been used for this customer. Please use a different PO number.', po_no;
      end if;
    end if;

    new.data := new.data || jsonb_build_object('id', new.id, 'customerId', new.customer_id, 'jobNo', job_no)
      || case when po_no is not null then jsonb_build_object('customerPoNo', po_no) else '{}'::jsonb end;

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
        'title', 'New Inward (PO: ' || coalesce(po_no, '-') || '): ' || coalesce(new.data ->> 'grade', ''),
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

  -- A bundle may be on only one active challan. Compared with the old version so that
  -- cleaning up existing duplicates (deleting extra challans) is still allowed.
  if public.challan_bundle_duplicates(new.data) > public.challan_bundle_duplicates(old.data) then
    raise exception 'A bundle is already on another challan. Each bundle can only be dispatched once.';
  end if;
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

-- =====================================================================
-- 7. Factory floor: machines and floor staff (operators, helpers ...)
--    Factory logins only. Safe to run on its own and to run again.
-- =====================================================================

create table if not exists public.machines (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.floor_staff (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.floor_before_write()
returns trigger
language plpgsql
as $$
begin
  new.data := new.data || jsonb_build_object('id', new.id);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists machines_before_write on public.machines;
create trigger machines_before_write
before insert or update on public.machines
for each row execute function public.floor_before_write();

drop trigger if exists floor_staff_before_write on public.floor_staff;
create trigger floor_staff_before_write
before insert or update on public.floor_staff
for each row execute function public.floor_before_write();

alter table public.machines enable row level security;
alter table public.floor_staff enable row level security;

drop policy if exists machines_staff_all on public.machines;
create policy machines_staff_all on public.machines for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists floor_staff_staff_all on public.floor_staff;
create policy floor_staff_staff_all on public.floor_staff for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

revoke all on public.machines, public.floor_staff from anon;
grant select, insert, update, delete on public.machines, public.floor_staff to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['machines', 'floor_staff'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;

-- =====================================================================
-- 8. Factory roles and the activity log
--    Roles: manager (production manager), owner (top management),
--    developer. The activity log is written only by the database
--    triggers below, so it cannot be skipped or edited from the website.
--    Owner and developer can read it. Safe to run again.
-- =====================================================================

alter table public.staff_emails add column if not exists staff_role text not null default 'manager';
alter table public.staff_emails add column if not exists display_name text;
do $$
begin
  alter table public.staff_emails
    add constraint staff_emails_role_check check (staff_role in ('manager', 'owner', 'developer'));
exception when duplicate_object then null;
end;
$$;

-- Role of the signed-in factory login (null for customers).
create or replace function public.my_staff_role()
returns text
language sql stable security definer set search_path = public
as $$
  select s.staff_role
  from profiles p join staff_emails s on s.email = p.email
  where p.user_id = auth.uid() and p.role = 'staff';
$$;

create or replace function public.my_staff_info()
returns table (staff_role text, display_name text)
language sql stable security definer set search_path = public
as $$
  select s.staff_role, coalesce(nullif(trim(s.display_name), ''), s.email)
  from profiles p join staff_emails s on s.email = p.email
  where p.user_id = auth.uid() and p.role = 'staff';
$$;

revoke execute on function public.my_staff_info() from public, anon;
grant execute on function public.my_staff_info() to authenticated;

create table if not exists public.audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor_email text,
  actor_name text,
  actor_role text,
  action text not null,
  entity text not null,
  entity_id text,
  ref text,          -- PO / machine / customer shown in the list
  summary text not null,
  details jsonb
);
create index if not exists audit_log_at_idx on public.audit_log (at desc);

alter table public.audit_log enable row level security;
drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log for select to authenticated
  using (public.my_staff_role() in ('owner', 'developer'));
revoke all on public.audit_log from anon;
grant select on public.audit_log to authenticated;
-- No insert/update/delete for anyone: only the triggers below write here.

create or replace function public.write_audit(
  p_action text, p_entity text, p_entity_id text, p_ref text, p_summary text, p_details jsonb default null
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  em text := lower(auth.jwt() ->> 'email');
  s staff_emails%rowtype;
begin
  select * into s from staff_emails where email = em;
  insert into audit_log (actor_email, actor_name, actor_role, action, entity, entity_id, ref, summary, details)
  values (
    coalesce(em, 'system'),
    coalesce(nullif(trim(s.display_name), ''), em, 'system'),
    case when s.email is not null then s.staff_role when em is null then 'system' else 'customer' end,
    p_action, p_entity, p_entity_id, p_ref, p_summary, p_details
  );
end;
$$;
revoke execute on function public.write_audit(text, text, text, text, text, jsonb) from public, anon, authenticated;

-- Orders: who assigned machines, closed/reopened POs, made/edited/deleted
-- challans, weighed/edited/deleted bundles, changed dates or order details.
create or replace function public.jobs_audit()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  o jsonb;
  n jsonb;
  po text;
  c jsonb;
  oc jsonb;
  b jsonb;
  ob jsonb;
  mname text;
  opname text;
  changed text[];
  skip text[] := array['updatedAt', 'bundles', 'challans', 'challan', 'assignment', 'poStatus', 'status',
    'estimatedDeliveryDate', 'eddHistory', 'specChangeRequests', 'dispatchedWeightKg', 'remainingWeightKg',
    'poClosedAt', 'poClosedBy', 'poClosingNotes', 'jobNo', 'id'];
begin
  if tg_op = 'INSERT' then
    perform write_audit('order_created', 'order', new.id, new.data ->> 'customerPoNo',
      'Order created: ' || coalesce(new.data ->> 'grade', '') || ', ' || coalesce(new.data ->> 'incomingWeight', '?') || ' kg');
    return null;
  elsif tg_op = 'DELETE' then
    perform write_audit('order_deleted', 'order', old.id, old.data ->> 'customerPoNo', 'Order deleted',
      jsonb_build_object('order', old.data));
    return null;
  end if;

  o := old.data;
  n := new.data;
  po := n ->> 'customerPoNo';

  -- Machine or operator changed: one entry. Only the place in the machine's line changed: a smaller one.
  if (o #>> '{assignment,machineId}') is distinct from (n #>> '{assignment,machineId}')
     or (o #>> '{assignment,operatorId}') is distinct from (n #>> '{assignment,operatorId}') then
    select data ->> 'number' into mname from machines where id = n #>> '{assignment,machineId}';
    select data ->> 'name' into opname from floor_staff where id = n #>> '{assignment,operatorId}';
    perform write_audit('machine_assigned', 'order', new.id, po,
      case when coalesce(n #>> '{assignment,machineId}', n #>> '{assignment,operatorId}') is null
        then 'Taken off the machine plan'
        else 'Assigned to ' || coalesce(mname, 'no machine')
          || coalesce(' (no. ' || (n #>> '{assignment,queuePosition}') || ' in line)', '')
          || coalesce(', operator ' || opname, '') end,
      jsonb_build_object('before', o -> 'assignment', 'after', n -> 'assignment'));
  elsif (o #>> '{assignment,queuePosition}') is distinct from (n #>> '{assignment,queuePosition}')
        and (n #>> '{assignment,machineId}') is not null then
    select data ->> 'number' into mname from machines where id = n #>> '{assignment,machineId}';
    perform write_audit('machine_queue_changed', 'order', new.id, po,
      'Now no. ' || (n #>> '{assignment,queuePosition}') || ' in line on ' || coalesce(mname, 'its machine'),
      jsonb_build_object('before', o #> '{assignment,queuePosition}', 'after', n #> '{assignment,queuePosition}'));
  end if;

  if coalesce(o ->> 'poStatus', '') <> 'closed' and n ->> 'poStatus' = 'closed' then
    perform write_audit('po_closed', 'order', new.id, po, 'PO closed',
      jsonb_build_object('notes', n ->> 'poClosingNotes'));
  elsif o ->> 'poStatus' = 'closed' and coalesce(n ->> 'poStatus', '') <> 'closed' then
    perform write_audit('po_reopened', 'order', new.id, po, 'PO reopened');
  end if;

  if (o ->> 'estimatedDeliveryDate') is distinct from (n ->> 'estimatedDeliveryDate') then
    perform write_audit('edd_changed', 'order', new.id, po,
      'Delivery date ' || coalesce(o ->> 'estimatedDeliveryDate', 'not set') || ' → ' || coalesce(n ->> 'estimatedDeliveryDate', 'not set'));
  end if;

  if (o ->> 'status') is distinct from (n ->> 'status') then
    perform write_audit('status_changed', 'order', new.id, po,
      'Status ' || coalesce(o ->> 'status', '') || ' → ' || coalesce(n ->> 'status', ''));
  end if;

  -- Challans
  for c in select * from jsonb_array_elements(coalesce(n -> 'challans', '[]'::jsonb)) loop
    select x into oc from jsonb_array_elements(coalesce(o -> 'challans', '[]'::jsonb)) x where x ->> 'id' = c ->> 'id';
    if oc is null then
      perform write_audit('challan_created', 'challan', c ->> 'id', po,
        'Challan ' || (c ->> 'challanNo') || ' created: ' || coalesce(c ->> 'thisDispatchWeightKg', '?') || ' kg');
    elsif oc <> c then
      perform write_audit('challan_edited', 'challan', c ->> 'id', po,
        'Challan ' || (c ->> 'challanNo') || ' changed after it was generated',
        jsonb_build_object('before', oc, 'after', c));
    end if;
  end loop;
  for oc in select * from jsonb_array_elements(coalesce(o -> 'challans', '[]'::jsonb)) loop
    if not exists (select 1 from jsonb_array_elements(coalesce(n -> 'challans', '[]'::jsonb)) x where x ->> 'id' = oc ->> 'id') then
      perform write_audit('challan_deleted', 'challan', oc ->> 'id', po, 'Challan ' || (oc ->> 'challanNo') || ' deleted',
        jsonb_build_object('challan', oc));
    end if;
  end loop;

  -- Bundles (dispatch status changes are covered by the challan entries)
  for b in select * from jsonb_array_elements(coalesce(n -> 'bundles', '[]'::jsonb)) loop
    select x into ob from jsonb_array_elements(coalesce(o -> 'bundles', '[]'::jsonb)) x where x ->> 'id' = b ->> 'id';
    if ob is null then
      perform write_audit('bundle_added', 'bundle', b ->> 'id', po,
        (b ->> 'bundleTag') || ' weighed: gross ' || (b ->> 'grossWeightKg') || ' kg, net ' || (b ->> 'netWeightKg') || ' kg');
    elsif (ob - 'status' - 'dispatchedInChallanId' - 'dispatchedInChallanNo')
        <> (b - 'status' - 'dispatchedInChallanId' - 'dispatchedInChallanNo') then
      perform write_audit('bundle_edited', 'bundle', b ->> 'id', po, (b ->> 'bundleTag') || ' changed',
        jsonb_build_object('before', ob, 'after', b));
    end if;
  end loop;
  for ob in select * from jsonb_array_elements(coalesce(o -> 'bundles', '[]'::jsonb)) loop
    if not exists (select 1 from jsonb_array_elements(coalesce(n -> 'bundles', '[]'::jsonb)) x where x ->> 'id' = ob ->> 'id') then
      perform write_audit('bundle_deleted', 'bundle', ob ->> 'id', po, (ob ->> 'bundleTag') || ' deleted',
        jsonb_build_object('bundle', ob));
    end if;
  end loop;

  -- Customer change requests (PO amendments)
  for c in select * from jsonb_array_elements(coalesce(n -> 'specChangeRequests', '[]'::jsonb)) loop
    select x into oc from jsonb_array_elements(coalesce(o -> 'specChangeRequests', '[]'::jsonb)) x where x ->> 'id' = c ->> 'id';
    if oc is null then
      perform write_audit('change_requested', 'order', new.id, po, 'Customer requested a change: ' || coalesce(c ->> 'reason', ''),
        jsonb_build_object('request', c));
    elsif (oc ->> 'status') is distinct from (c ->> 'status') then
      perform write_audit(case when c ->> 'status' = 'approved' then 'change_approved' else 'change_declined' end,
        'order', new.id, po,
        case when c ->> 'status' = 'approved' then 'PO amendment approved' else 'PO amendment declined' end
          || coalesce(': ' || nullif(c ->> 'reviewNote', ''), ''),
        jsonb_build_object('request', c));
    end if;
  end loop;

  -- Anything else on the order itself
  select array_agg(k) into changed
  from (select jsonb_object_keys(o) as k union select jsonb_object_keys(n)) keys
  where not (k = any (skip)) and (o -> k) is distinct from (n -> k);
  if changed is not null then
    perform write_audit('order_edited', 'order', new.id, po, 'Order details changed: ' || array_to_string(changed, ', '),
      (select jsonb_object_agg(k, jsonb_build_object('before', o -> k, 'after', n -> k)) from unnest(changed) k));
  end if;

  return null;
end;
$$;

drop trigger if exists jobs_audit on public.jobs;
create trigger jobs_audit
after insert or update or delete on public.jobs
for each row execute function public.jobs_audit();

-- Customers, machines and floor staff: added / changed
create or replace function public.record_audit()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  label text;
  ref text;
  changed text[];
begin
  label := case tg_table_name when 'customers' then 'Customer' when 'machines' then 'Machine' else 'Staff member' end;
  if tg_op = 'DELETE' then
    perform write_audit(tg_table_name || '_deleted', tg_table_name, old.id, null, label || ' deleted',
      jsonb_build_object('record', old.data));
    return null;
  end if;
  ref := coalesce(new.data ->> 'companyName', new.data ->> 'number', new.data ->> 'name');
  if tg_op = 'INSERT' then
    perform write_audit(tg_table_name || '_added', tg_table_name, new.id, ref, label || ' added: ' || coalesce(ref, new.id));
  else
    select array_agg(k) into changed
    from (select jsonb_object_keys(old.data) as k union select jsonb_object_keys(new.data)) keys
    where (old.data -> k) is distinct from (new.data -> k);
    if changed is not null then
      perform write_audit(tg_table_name || '_edited', tg_table_name, new.id, ref,
        label || ' ' || coalesce(ref, new.id) || ' changed: ' || array_to_string(changed, ', '),
        (select jsonb_object_agg(k, jsonb_build_object('before', old.data -> k, 'after', new.data -> k)) from unnest(changed) k));
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists customers_audit on public.customers;
create trigger customers_audit after insert or update or delete on public.customers
for each row execute function public.record_audit();
drop trigger if exists machines_audit on public.machines;
create trigger machines_audit after insert or update or delete on public.machines
for each row execute function public.record_audit();
drop trigger if exists floor_staff_audit on public.floor_staff;
create trigger floor_staff_audit after insert or update or delete on public.floor_staff
for each row execute function public.record_audit();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'audit_log'
  ) then
    alter publication supabase_realtime add table public.audit_log;
  end if;
end;
$$;

-- =====================================================================
-- 9. Automatic WhatsApp updates to customers (Meta WhatsApp Cloud API)
--    Sends an approved template message when: material is received,
--    the delivery date is set/changed, a challan is made, or a change
--    request is approved/declined. Does nothing until the two secrets
--    'whatsapp_token' and 'whatsapp_phone_number_id' are saved in the
--    Supabase Vault (see WHATSAPP_SETUP.md). Every attempt is recorded
--    in the activity log. Safe to run again.
-- =====================================================================

create extension if not exists pg_net;

-- Reads a secret from Supabase Vault (null if missing).
create or replace function public.whatsapp_secret(p_name text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v text;
begin
  begin
    execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1' into v using p_name;
  exception when others then
    v := null;
  end;
  return v;
end;
$$;
revoke execute on function public.whatsapp_secret(text) from public, anon, authenticated;

-- WhatsApp template parameters may not contain line breaks, tabs or long runs of spaces.
create or replace function public.whatsapp_clean(t text)
returns text
language sql immutable
as $$
  select left(regexp_replace(regexp_replace(coalesce(nullif(trim(t), ''), '-'), '[\r\n\t]+', ' ', 'g'), ' {2,}', ' ', 'g'), 500);
$$;

-- Indian numbers: digits only, 91 added to 10-digit numbers.
create or replace function public.whatsapp_number(p text)
returns text
language sql immutable
as $$
  select case
    when length(d) = 10 then '91' || d
    when length(d) = 11 and d like '0%' then '91' || substr(d, 2)
    when length(d) >= 11 then d
    else null
  end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) x;
$$;

-- Queues one template message. Returns 'queued #<request id>', 'not_configured' or 'error: ...'.
create or replace function public.whatsapp_send(p_to text, p_template text, p_params text[], p_lang text default 'en')
returns text
language plpgsql security definer set search_path = public
as $$
declare
  token text := public.whatsapp_secret('whatsapp_token');
  phone_id text := public.whatsapp_secret('whatsapp_phone_number_id');
  payload jsonb;
  req bigint;
begin
  if token is null or phone_id is null then
    return 'not_configured';
  end if;
  payload := jsonb_build_object(
    'messaging_product', 'whatsapp',
    'to', p_to,
    'type', 'template',
    'template', jsonb_build_object(
      'name', p_template,
      'language', jsonb_build_object('code', p_lang),
      'components', case when coalesce(array_length(p_params, 1), 0) = 0 then '[]'::jsonb else jsonb_build_array(
        jsonb_build_object('type', 'body', 'parameters',
          (select jsonb_agg(jsonb_build_object('type', 'text', 'text', public.whatsapp_clean(x)) order by i)
           from unnest(p_params) with ordinality as u(x, i)))) end
    )
  );
  select net.http_post(
    url := 'https://graph.facebook.com/v21.0/' || phone_id || '/messages',
    body := payload,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || token)
  ) into req;
  return 'queued #' || req;
exception when others then
  return 'error: ' || sqlerrm;
end;
$$;
revoke execute on function public.whatsapp_send(text, text, text[], text) from public, anon, authenticated;

-- Sends one message and records the attempt in the activity log.
create or replace function public.whatsapp_notify(p_job jsonb, p_customer jsonb, p_template text, p_params text[])
returns void
language plpgsql security definer set search_path = public
as $$
declare
  phone text := public.whatsapp_number(coalesce(nullif(p_customer ->> 'phone', ''), p_job ->> 'customerPhone'));
  result text;
begin
  if coalesce((p_customer ->> 'whatsappUpdates')::boolean, true) = false then
    return;
  end if;
  result := case when phone is null then 'no valid phone number on the customer' else public.whatsapp_send(phone, p_template, p_params) end;
  perform write_audit(
    case when result like 'queued%' then 'whatsapp_sent' else 'whatsapp_not_sent' end,
    'order', p_job ->> 'id', p_job ->> 'customerPoNo',
    'WhatsApp ' || p_template || ' to ' || coalesce('+' || phone, '(no number)') || ': ' || result,
    jsonb_build_object('params', to_jsonb(p_params)));
end;
$$;
revoke execute on function public.whatsapp_notify(jsonb, jsonb, text, text[]) from public, anon, authenticated;

-- Watches orders for the four customer updates.
create or replace function public.jobs_whatsapp()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  n jsonb := new.data;
  o jsonb;
  cu jsonb;
  who text;
  po text;
  c jsonb;
  r jsonb;
  oc jsonb;
begin
  select data into cu from customers where id = new.customer_id;
  if cu is null then
    return null;
  end if;
  who := coalesce(nullif(cu ->> 'contactPerson', ''), cu ->> 'companyName', 'Customer');
  po := coalesce(n ->> 'customerPoNo', '-');

  if tg_op = 'INSERT' then
    -- Skip old records being imported
    if coalesce((n ->> 'createdAt')::timestamptz, now()) > now() - interval '1 day' then
      perform whatsapp_notify(n, cu, 'material_received',
        array[who, po, coalesce(n ->> 'incomingWeight', '-'), coalesce(n ->> 'grade', 'material')]);
    end if;
    return null;
  end if;

  o := old.data;

  if (n ->> 'estimatedDeliveryDate') is not null
     and (o ->> 'estimatedDeliveryDate') is distinct from (n ->> 'estimatedDeliveryDate') then
    perform whatsapp_notify(n, cu, 'delivery_date_set',
      array[who, po, to_char((n ->> 'estimatedDeliveryDate')::date, 'DD Mon YYYY')]);
  end if;

  for c in select * from jsonb_array_elements(coalesce(n -> 'challans', '[]'::jsonb)) loop
    if coalesce((c ->> 'isSuperseded')::boolean, false) = false
       and not exists (select 1 from jsonb_array_elements(coalesce(o -> 'challans', '[]'::jsonb)) x where x ->> 'id' = c ->> 'id') then
      perform whatsapp_notify(n, cu, 'material_dispatched', array[
        who, po, c ->> 'challanNo', c ->> 'thisDispatchWeightKg', coalesce(c ->> 'totalBundles', '0'),
        coalesce(nullif(nullif(c ->> 'vehicleNo', ''), '—'), '-'), coalesce(c ->> 'remainingBalanceWeightKg', '-')]);
    end if;
  end loop;

  for r in select * from jsonb_array_elements(coalesce(n -> 'specChangeRequests', '[]'::jsonb)) loop
    select x into oc from jsonb_array_elements(coalesce(o -> 'specChangeRequests', '[]'::jsonb)) x where x ->> 'id' = r ->> 'id';
    if oc is not null and oc ->> 'status' = 'pending_approval' and r ->> 'status' in ('approved', 'rejected') then
      perform whatsapp_notify(n, cu, 'change_request_update', array[
        who, po, case when r ->> 'status' = 'approved' then 'approved' else 'declined' end,
        coalesce(nullif(r ->> 'reviewNote', ''), '-')]);
    end if;
  end loop;

  return null;
exception when others then
  return null; -- a WhatsApp problem must never stop an order from saving
end;
$$;

drop trigger if exists jobs_whatsapp on public.jobs;
create trigger jobs_whatsapp
after insert or update on public.jobs
for each row execute function public.jobs_whatsapp();

-- Test from the SQL Editor: select public.whatsapp_test('9326737273');
-- Sends Meta's built-in "hello_world" template.
create or replace function public.whatsapp_test(p_phone text)
returns text
language sql security definer set search_path = public
as $$
  select public.whatsapp_send(public.whatsapp_number(p_phone), 'hello_world', array[]::text[], 'en_US');
$$;
revoke execute on function public.whatsapp_test(text) from public, anon, authenticated;

-- Replies from Meta for the last messages (to check delivery problems):
-- select id, status_code, content, created from net._http_response order by id desc limit 10;

-- The three factory logins. Change the emails / names, then run.
-- (Each person also needs a user in Authentication -> Users.)
-- insert into public.staff_emails (email, staff_role, display_name) values
--   ('manager@example.com',   'manager',   'Production Manager'),
--   ('owner@example.com',     'owner',     'Top Management'),
--   ('developer@example.com', 'developer', 'Developer')
-- on conflict (email) do update set staff_role = excluded.staff_role, display_name = excluded.display_name;
