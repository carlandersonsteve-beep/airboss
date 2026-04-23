export const schemaSql = `
create table if not exists customers (
  id text primary key,
  created_at timestamptz not null default now(),
  tail_number text not null,
  aircraft_type text,
  owner_name text,
  pilot_name text,
  phone text,
  email text,
  company text,
  home_base text,
  notes text,
  source text
);

create table if not exists orders (
  id text primary key,
  customer_id text not null references customers(id),
  created_at timestamptz not null default now(),
  status text not null,
  status_updated_at timestamptz,
  fuel_type text,
  fuel_requested_gallons numeric,
  fuel_actual_gallons numeric,
  hangar_overnight text,
  services jsonb not null default '[]'::jsonb,
  notes text,
  completion_notes text,
  completed_at timestamptz,
  arrival_at timestamptz,
  departure_date date,
  departure_time text,
  purpose text,
  source text,
  pre_departure_sent boolean not null default false,
  pre_departure_sent_at timestamptz
);

create table if not exists order_messages (
  id text primary key,
  order_id text references orders(id) on delete cascade,
  text text not null,
  sender_role text not null,
  created_at timestamptz not null default now()
);

alter table order_messages alter column order_id drop not null;
alter table orders alter column fuel_requested_gallons type numeric using fuel_requested_gallons::numeric;
alter table orders alter column fuel_actual_gallons type numeric using fuel_actual_gallons::numeric;

create index if not exists idx_order_messages_order_id_created_at
  on order_messages(order_id, created_at);

create table if not exists alerts (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  type text not null,
  message text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  submitted_by text
);

create index if not exists idx_alerts_status_created_at
  on alerts(status, created_at);

create table if not exists thread_reads (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  role text not null,
  last_read_at timestamptz not null default now(),
  unique(order_id, role)
);

create table if not exists app_users (
  id text primary key,
  username text not null unique,
  password text,
  password_hash text,
  role text not null,
  display_name text,
  active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists app_sessions (
  id text primary key,
  username text not null,
  role text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz,
  user_agent text,
  ip_address text
);

create index if not exists idx_app_sessions_username_expires_at
  on app_sessions(username, expires_at);

alter table app_users alter column password drop not null;
alter table app_users add column if not exists password_hash text;
alter table app_users add column if not exists must_change_password boolean not null default true;
alter table app_users add column if not exists last_login_at timestamptz;
`;
