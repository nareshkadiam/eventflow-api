import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new pg.Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  max: parseInt(process.env.PGBOUNCER_MAX ?? '10'),   // keep low — many instances scale out
  idleTimeoutMillis: 30_000,
});

// Surface connection errors instead of silently dropping them.
pool.on('error', (err) => {
  console.error('Unexpected pg pool error', err);
});

export async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result;
}

export async function closePool() {
  await pool.end();
}