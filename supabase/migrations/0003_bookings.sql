-- 0003_bookings.sql
-- bookings + booking_seats. A booking is either made by a registered user
-- (booked_by_user_id set, guest fields null)or by a guest (guest_name/guest_email
-- set, booked_by_user_id null). Enforced by the booker_check constraint.

create type booking_status as enum ('pending', 'confirmed', 'cancelled');

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  confirmation_code varchar(6) unique not null,
  event_id uuid not null references public.events(id),
  booked_by_user_id uuid references public.profiles(id),
  guest_name text,
  guest_email text,
  status booking_status not null default 'pending',
  receipt_sent boolean default false,
  created_at timestamptz default now(),
  constraint booker_check check (
    (booked_by_user_id is not null and guest_email is null) or
    (booked_by_user_id is null nulland guest_email is not null)
  )
);

create table if not exists public.booking_seats (
  booking_id uuid references public.bookings(id) on delete cascade,
  seat_id uuid references public.seats(id),
  primary key (booking_id, seat_id)
);