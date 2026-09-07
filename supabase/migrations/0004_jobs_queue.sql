-- 0004_jobs_queue.sql
-- Postgres-backed job queue (no Redis). Jobs are claimed by the internal
-- /internal/process-jobs endpoint (triggered by AWS EventBridge Scheduler).

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','processing','done','failed')),
  attempts int default 0,
  created_at timestamptz default now(),
  processed_at timestamptz
);