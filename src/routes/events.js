import { createEventSchema, updateEventSchema } from '../schemas/events.js';
import { pool, query } from '../lib/db.js';
import { authenticate } from '../lib/requireAuth.js';

export const eventRoutes = async (app) => {
  app.addHook('preHandler', async (request) => {
    if (request.url.startsWith('/events') && !['GET'].includes(request.method)) {
      await authenticate(request, null);
    }
  });

  app.get('/events', async (request, reply) => {
    const { rows } = await query('SELECT * FROM public.events ORDER BY date ASC');
    return reply.send({ events: rows });
  });

  app.get('/events/:id', async (request, reply) => {
    const { rows } = await query('SELECT * FROM public.events WHERE id = $1', [request.params.id]);
    if (rows.length === 0) {
      return reply.code(404).send({ error: { code: 'EVENT_NOT_FOUND', message: 'Event not found' } });
    }
    return reply.send({ event: rows[0] });
  });

  app.post('/events', async (request, reply) => {
    if (!request.user || request.user.role !== 'admin') {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Admin required' } });
    }
    const body = createEventSchema.parse(request.body);
    const { rows } = await pool.query(
      `INSERT INTO public.events (name, place, date, coordinator, description,
       exec_seats_total, normal_seats_total, pods_total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [body.name, body.place, body.date, body.coordinator ?? null,
       body.description ?? null, body.execSeatsTotal, body.normalSeatsTotal, body.podsTotal],
    );
    await pool.query('SELECT public.generate_seats_for_event($1)', [rows[0].id]);
    return reply.code(201).send({ event: rows[0] });
  });

  app.patch('/events/:id', async (request, reply) => {
    if (!request.user || request.user.role !== 'admin') {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Admin required' } });
    }
    const body = updateEventSchema.parse(request.body);
    const { rows } = await pool.query(
      `UPDATE public.events SET
         name       = COALESCE($1,
 name),
         place      = COALESCE($2,
 place),
         date       = COALESCE($3,
 date),
         coordinator = COALESCE($4,
 coordinator),
         description = COALESCE($5,
 description),
         exec_seats_total    = COALESCE($6,
 exec_seats_total),
         normal_seats_total = COALESCE($7,
 normal_seats_total),
         pods_total           = COALESCE($8,
 pods_total)
       WHERE id = $9 RETURNING *`,
      [body.name ?? null, body.place ?? null,
       body.date ?? null,
       body.coordinator ?? null,
       body.description ?? null,
       body.execSeatsTotal ?? null,
       body.normalSeatsTotal ?? null,
       body.podsTotal ?? null,
       request.params.id],
    );
    if (rows.length === 0) {
      return reply.code(404).send({ error: { code: 'EVENT_NOT_FOUND', message: 'Event not found' } });
    }
    await pool.query('SELECT public.generate_seats_for_event($1)', [rows[0].id]);
    return reply.send({ event: rows[0] });
  });

  app.delete('/events/:id', async (request, reply) => {
    if (!request.user || request.user.role !== 'admin') {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Admin required' } });
    }
    const { rows } = await pool.query('DELETE FROM public.events WHERE id = $1 RETURNING id', [request.params.id]);
    if (rows.length === 0) {
      return reply.code(404).send({ error: { code: 'EVENT_NOT_FOUND', message: 'Event not found' } });
    }
    return reply.send({ ok: true });
  });
};
