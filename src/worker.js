import { pool } from './lib/db.js';

const HANDLERS = {
  async booking_receipt(payload) {
    // Placeholder: generate PDF/QR receipt via pdfkit/qrcode and email via nodemailer.

    // Real implementation wires THIS: build receipt buffer, attach to nodemailer transport, send.
    return { ok: true, deliveredTo: payload.email };
  },
};

export async function processJobs(batchSize = 10, pollMs = 0) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE public.jobs SET status = 'processing', processed_at = now() WHERE id IN (
         SELECT id FROM public.jobs WHERE status = 'pending' ORDER BY created_at LIMIT $1 FOR UPDATE SKIP LOCKED
       ) RETURNING *`,
      [batchSize],
    );
    await client.query('COMMIT');
    const results = [];
    for (const job of rows) {
      try {
        const handler = HANDLERS[job.type];
        if (!handler) throw new Error(`Unknown job type: ${job.type}`);
        const result = await handler(job.payload);
        await client.query(
          `UPDATE public.jobs SET status = 'done', processed_at = now() WHERE id = $1`,
          [job.id],
        );
        results.push({ id: job.id, status: 'done', result });
      } catch (err) {
        await client.query(
          `UPDATE public.jobs SET status = 'failed', processed_at = now() WHERE id = $1`,
          [job.id],
        );
        results.push({ id: job.id, status: 'failed', error: err.message });
      }
    }
    return results;
  } finally {
    client.release();
  }
}

const isMain = process.argv[1]?.endsWith('src/worker.js') ?? false;
if (isMain) {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  async function loop() {
    for (;;) {
      try {
        const done = await processJobs();
        console.log(`[worker] processed ${done.length} jobs`);
      } catch (err) {
        console.error('[worker] error', err);
      }
      await sleep(5000);
    }
  }
  loop();
}