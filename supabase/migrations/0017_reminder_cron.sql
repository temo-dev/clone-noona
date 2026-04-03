-- 0017_reminder_cron.sql
-- Schedule the send-reminders Edge Function to run every 15 minutes via pg_cron.
-- Requires the pg_cron and pg_net extensions (enabled by default on Supabase Cloud).
--
-- The Edge Function URL and service role key are read from Supabase Vault secrets
-- set via: supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_APP_URL=...
--
-- Run this migration AFTER deploying the send-reminders Edge Function:
--   supabase functions deploy send-reminders

-- Enable required extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule: every 15 minutes
SELECT cron.schedule(
  'send-reminders',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'Authorization',  'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);
