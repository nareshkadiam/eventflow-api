-- 0002_events_and_seats.sql
-- events, seat types enums, and individual seat rows (one row per physical
-- seat - required for seat-number selection).

create type seat_type as enum ('exec', 'normal', 'pod');
create type seat_status as enum ('available', 'held', 'booked');

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  place text not null,
  event_date timestamptz not null,
  coordinator text not null,
  description text,
  exec_seats_total int not null,
  normal_seats_total int not null,
  pods_total int not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.seats (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  seat_type seat_type not null,
  seat_number text not null,
  status seat_status not null default 'available',
  held_until timestamptz,
  unique (event_id, seat_number)
);

create index if not exists seats_event_status_idx on public.seats (event_id, status);