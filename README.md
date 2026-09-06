# Become an AI Engineer

A self-paced, 12-week structured learning platform for developers moving into AI engineering.
See the product specification for full context on scope and decisions.

## Stack

- React + Vite + TypeScript + Tailwind CSS v4
- Supabase (Postgres, Auth, Storage, Edge Functions)
- Anthropic API (assignment feedback)
- Resend (transactional email)
- Vercel (hosting)

## Getting started

```bash
npm install
cp .env.example .env   # fill in Supabase project URL/anon key
npm run dev
```

## Project layout

```
src/
  pages/        route-level components, grouped by audience (public/student/mentor/admin)
  components/   shared UI, layout, and curriculum-specific components
  context/      React context providers (auth/session)
  hooks/        shared hooks
  lib/          Supabase client and other framework glue
  types/        hand-maintained types mirroring the Postgres schema
supabase/
  migrations/   SQL migrations (schema + RLS), applied in filename order
  functions/    Edge Functions (submission evaluation, link health checks, email sends)
```

## Database

Schema and RLS policies live entirely in `supabase/migrations`. Apply them with the Supabase CLI:

```bash
npx supabase start        # local Postgres + Studio
npx supabase db reset     # (re)apply all migrations + seed data
```
