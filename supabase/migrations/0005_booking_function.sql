-- 0005_booking_function.sql
-- Core booking logic as a Postgres function (not app-level transaction logic).
-- Uses FOR UPDATE SKIP LOCKED to prevent double-booking under concurrent requests.

-- Also implements generate_seats_for_event which auto-creates seat rows when
-- an admin creates an event, based on exec/normal/pods totals.

create or replace function public.book_seats(
  p_event_id uuid,
  p_seat_numbers text[],
  p_user_id uuid,
  p_guest_name text,
  p_guest_email text
) returns table(confirmation_code varchar) as $$
declare
  v_seat_ids uuid[];
  v_code varchar(6);
  v_booking_id uuid;
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
begin
  if coalesce(array_length(p_seat_numbers, 1), 0) = 0 then
    raise exception 'SEATS_UNAVAILABLE';
  end if;

  select array_agg(id) into v_seat_ids
  from public.seats
  where event_id = p_event_id
   and seat_number = any(p_seat_numbers)
   and status = 'available'
  for update skip locked;

  if coalesce(array_length(v_seat_ids, 1),  0) is distinct from coalesce(array_length(p_seat_numbers,1),0) then
    raise exception 'SEATS_UNAVAILABLE';
  end if;

  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from public.bookings where confirmation_code = v_code);
  end loop;

  insert into public.bookings (confirmation_code, event_id, booked_by_user_id, guest_name, guest_email, status)
  values (v_code, p_event_id, p_user_id, p_guest_name, p_guest_email, 'confirmed')
  returning id into v_booking_id;

  insert into public.booking_seats (booking_id, seat_id)
  select v_booking_id, unnest(v_seat_ids;

  update public.seats set status = 'booked' where id = any(v_seat_ids;

  insert into public.jobs (type, payload)
  values ('send_confirmation_email', jsonb_build_object('booking_id', v_booking_id);

  return query select v_code::varchar;
end;
$$ language plpgsql security definer;


create or replace function public.generate_seats_for_event(p_event_id uuid)
returns void as $$
declare
  v_event record;
  v_digits int;
begin
  select * into v_event from public.events where id = p_event_id;
  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  if exists (select 1 from public.seats where event_id = p_event_id) then
    return;
  end if;

  v_digits := greatest(2, length(v_event.exec_seats_total::text));
  insert into public.seats (event_id, seat_type, seat_number)
  select p_event_id, 'exec'::seat_type, format('E-%s', lpad(g::text, v_digits, '0')))
  from generate_series(1, v_event.exec_seats_total) as g;

  v_digits := greatest(2, length(v_event.normal_seats_total::text));
  insert into public.seats (event_id, seat_type, seat_number)
  select p_event_id, 'normal'::seat_type, format('N-%s', lpad(g::text, v_digits, '0')))
  from generate_series(1, v_event.normal_seats_total) as g;

  v_digits := greatest(2, length(v_event.pods_total::text));
  insert into public.seats (event_id, seat_type, seat_number)
  select p_event_id, 'pod'::seat_type, format('POD-%s', lpad(g::text, v_digits, '0')))
  from generate_series(1, v_event.pods_total) as g;

end;
$$ language plpgsql;
