# CLAUDE.md

## Project
Build a multi-tenant SaaS booking platform for small service businesses (nail salons, spas, barbers, etc.).

Core value:
- Beautiful public booking page
- No overlapping bookings
- Easy staff scheduling

## Stack
- Next.js App Router + TypeScript
- Supabase: Auth, Postgres, RLS, Realtime
- shadcn/ui
- React Hook Form + Zod
- Resend for email
- pg_cron + Supabase Edge Functions for jobs
- Vercel for deploy

## Repo Structure
```text
web-nail/
  supabase/
    migrations/
      0001_profiles.sql
      0002_businesses.sql
      0003_business_members.sql
      0004_staff.sql
      0005_services.sql
      0006_staff_services.sql
      0007_business_hours.sql
      0008_staff_working_hours.sql
      0009_staff_time_off.sql
      0010_customers.sql
      0011_bookings.sql
      0012_booking_audit_logs.sql
      0013_notification_logs.sql
      0014_rls_policies.sql
      0015_indexes_constraints.sql
      0016_booking_rpcs.sql
  src/
    app/
      (auth)/
      (dashboard)/
      b/[slug]/
    modules/
      booking/
      business/
      notifications/
      auth/
    lib/
      supabase/
      types/
    components/
      ui/
      booking/
      calendar/