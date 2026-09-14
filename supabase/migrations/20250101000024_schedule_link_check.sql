-- Automates the resource link health check (PD-009) instead of relying on
-- an admin to click "Check links now". check-resource-links already
-- existed as an edge function but nothing was ever calling it, so
-- resources.is_broken never updated on its own.
--
-- pg_cron runs the schedule below inside Postgres; pg_net makes the HTTP
-- call out to the edge function from that same job.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- One-time manual step this migration depends on (do NOT put a real key in
-- a migration file, since migrations are committed to git): in the
-- Supabase SQL editor, run once —
--   select vault.create_secret('<your service_role key>', 'service_role_key');
-- Vault ships enabled by default on every Supabase project.

-- Before running `supabase db push`, replace YOUR_PROJECT_REF below with
-- your project's ref (the subdomain in VITE_SUPABASE_URL, e.g. the
-- "abcdefgh" in https://abcdefgh.supabase.co).
--
-- cron.schedule() upserts by job name, so re-running this migration just
-- updates the existing job rather than erroring or duplicating it.
select cron.schedule(
  'check-resource-links-daily',
  '0 6 * * *', -- 06:00 UTC daily
  $$
  select net.http_post(
    url := 'https://poizaqubkpueehuwczpu.supabase.co/functions/v1/check-resource-links',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
