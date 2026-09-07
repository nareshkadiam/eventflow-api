import { test } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { authRoutes } from '../src/routes/auth.js';
import { eventRoutes } from '../src/routes/events.js';
import { bookingRoutes } from '../src/routes/bookings.js';
import { guestBookingSchema, registeredBookingSchema } from '../src/schemas/bookings.js';
import { createEventSchema } from '../src/schemas/events.js';

test('guest booking schema accepts explicit seat selection', () => {
  const body = guestBookingSchema.parse({
    seats: ['N-01', 'N-02'],
  guestName: 'Ada Lovelace',
  });
  assert.deepEqual(body.seats, ['N-01', 'N-02']);
});

test('registered booking schema caps seat lines per type', () => {
  const body = registeredBookingSchema.parse({
    eventId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    seats: [{ seatType: 'exec', quantity: 2 }, { seatType: 'pod', quantity: 1 }],
  });
  assert.equal(body.seats.length, 2);
});

test('create event schema validates numeric seat counts', () => {
  const ev = createEventSchema.parse({
    name: 'Tech Conf',
    place: 'Berlin',
    date: '2026-12-01T10:00:00Z',
    execSeatsTotal: 20,
    normalSeatsTotal: 80,
    podsTotal: 4,
  });
  assert.equal(ev.normalSeatsTotal, 80);
});

test('all route plugins register', async () => {
  const app = Fastify({ logger: false });
  await app.register(authRoutes);
  await app.register(eventRoutes);
  await app.register(bookingRoutes);
  await app.ready();
  const routes = app.printRoutes() ?? '';
  assert.match(routes, /register\s*\(POST\)/);
  assert.match(routes, /login\s*\(POST\)/);
  assert.match(routes, /\bevents\s*\(GET/);
  assert.match(routes, /\bbookings\s*\(POST/);
  await app.close();
});