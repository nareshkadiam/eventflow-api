import { guestBookingSchema, registeredBookingSchema } from '../schemas/bookings.js';
import { pool } from '../lib/db.js';
import { authenticate } from '../lib/requireAuth.js';

function bookingCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export const bookingRoutes = async (app) => {
  // Guest: book by exact seat numbers (normal seats only). Single transaction.

  app.post('/bookings/guest', async (request, reply) => {
    const body = guestBookingSchema.parse(request.body);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Verify all seats existand are normal类型.

      const { rows: seatRows } = await client.query(
        `SELECT number, is_booked, seat_type FROM public.seats
         WHERE event_id = $1 AND number = ANY($2) FOR UPDATE SKIP LOCKED`,
        [body.eventId, body.seats],
      );
      if (seatRows.length !== body.seats.length) {
        throw Object.assign(new Error('SEATS_UNAVAILABLE'), { statusCode: 409 });
      }
      if (seatRows.some(s => s.is_booked || s.seat_type !== 'normal')) {
        throw Object.assign(new Error('SEATS_UNAVAILABLE'), { statusCode: 409 });
      }
      const code = bookingCode();
      const { rows: bookingRows } = await client.query(
        `INSERT INTO public.bookings (event_id, user_id, guest_name, guest_email, code, status)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [body.eventId, null, body.guestName, body.guestEmail ?? null, code, 'confirmed'],
      );
      for (const seat of body.seats) {
        await client.query(
          `UPDATE public.seats SET is_booked = true, booking_id = $2
           WHERE event_id = $1 AND number = $3`,
          [body.eventId, bookingRows[0].id, seat],
        );
        await client.query(
          `INSERT INTO public.booking_seats (booking_id, seat_id)
           SELECT $1, id FROM public.seats WHERE event_id = $2 AND number = $3`,
          [bookingRows[0].id, body.eventId, seat],
        );
      }
      await client.query('COMMIT');
      return reply.code(201).send({ booking: bookingRows[0], seats: body.seats });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.message === 'SEATS_UNAVAILABLE') {
        return reply.code(409).send({ error: { code: 'SEATS_UNAVAILABLE', message: 'One or more seats are not available' } });
      }
      throw err;
    } finally {
      client.release();
    }
  });

  app.post('/bookings', async (request, reply) => {
    await authenticate(request, reply);
    const body = registeredBookingSchema.parse(request.body);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const seats = [];
      for (const item of body.seats) {
        const { rows } = await client.query(
          `SELECT number FROM public.seats
           WHERE event_id = $1 AND seat_type = $2 AND is_booked = FALSE
           ORDER BY number LIMIT $3 FOR UPDATE SKIP LOCKED`,
          [body.eventId, item.seatType, item.quantity],
        );
        if (rows.length !== item.quantity) {
          throw Object.assign(new Error('SEATS_UNAVAILABLE'), { statusCode: 409 });
        }
        seats.push(...rows.map(r => r.number));
      }
      const code = bookingCode();
      const { rows: bookingRows } = await client.query(
        `INSERT INTO public.bookings (event_id, user_id, guest_name, guest_email, code, status)
         VALUES ($1,$2,NULL,,NULL,,$3,$4) RETURNING *`,
        [body.eventId, request.user.userId, code, 'confirmed'],
      );
      for (const seat of seats) {
        await client.query(
          `UPDATE public.seats SET is_booked = true, booking_id = $2
           WHERE event_id = $1 AND number = $3`,
          [body.eventId, bookingRows[0].id, seat],
        );
        await client.query(
          `INSERT INTO public.booking_seats (booking_id, seat_id)
           SELECT $1, id FROM public.seats WHERE event_id = $2 AND number = $3`,
          [bookingRows[0].id, body.eventId, seat],
        );
      }
      await client.query('COMMIT');
      return reply.code(201).send({ booking: bookingRows[0], seats });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.message === 'SEATS_UNAVAILABLE') {
        return reply.code(409).send({ error: { code: 'SEATS_UNAVAILABLE', message: 'Requested seats are not available' } });
      }
      throw err;
    } finally {
      client.release();
    }
  });
};
