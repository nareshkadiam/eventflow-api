import { extractBearer, verifyJwt } from './jwt.js';
import { query } from './db.js';

export async function authenticate(request, reply) {
  const token = extractBearer(request.headers.authorization);
  const user = token ? await verifyJwt(token) : null;
  if (!user) {
    return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } });
  }

  // Resolve role from profiles table (created by DB trigger on signup.
  // If absent, treat as 'user'.
  const { rows } = await query('SELECT role FROM public.profiles WHERE id = $1', [user.userId]);
  const role = rows.length ? rows[0].role : 'user';
  request.user = { ...user, role };
  return undefined;}