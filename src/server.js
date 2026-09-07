import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { authRoutes } from './routes/auth.js';
import { eventRoutes } from './routes/events.js';
import { bookingRoutes } from './routes/bookings.js';

const app = Fastify({ logger: true });

async function main() {
  await app.register(cors, { origin: true });
  await app.register(rateLimit, { max: 60, timeWindow: '1 minute' });
  await app.register(authRoutes);
  await app.register(eventRoutes);
  await app.register(bookingRoutes);

  const port = Number(process.env.PORT ?? 3000);
try {
  await app.listen({ port, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
}

main();

export default app;