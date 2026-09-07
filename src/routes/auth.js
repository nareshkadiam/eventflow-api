import { registerSchema, loginSchema } from '../schemas/auth.js';
import { authClient } from '../lib/supabaseAuth.js';

export const authRoutes = async (app) => {
  // Proxy to Supabase Auth signUp. Passwords never touch our servers.

  app.post('/auth/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const client = authClient();
    const { data, error } = await client.auth.signUp({
      email: body.email,
      password: body.password,
      options: body.fullName ? { data: { full_name: body.fullName } } : undefined,
    });
    if (error) {
      return reply.code(error.status ?? 400).send({ error: { code: 'AUTH_ERROR', message: error.message } });
    }
    return reply.code(201).send({ user: data.user, session: data.session });
  });


  // Proxy to Supabase Auth signInWithPassword.



  app.post('/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const client = authClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });
    if (error) {
      return reply.code(error.status ?? 401).send({ error: { code: 'AUTH_ERROR', message: error.message } });
    }
    return reply.send({ user: data.user, session: data.session });
  });
};