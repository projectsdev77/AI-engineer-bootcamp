# E2E test suite

Playwright tests that drive the real app through a real browser against
**your real, already-deployed Supabase project** — the same one your `.env`
already points at. Nothing here is mocked: RLS, the unlock/completion
triggers (PD-001/PD-007), quiz grading, and the live Gemini-backed
`evaluate-submission` edge function all run for real.

This is deliberately close to manual testing, not a substitute for it —
see `../MANUAL_TESTING_CHECKLIST.md` for the parts that can't be automated
(Google OAuth sign-in, real email delivery, visual/responsive QA).

## One-time setup

1. Make sure `.env` has real values for `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (Project
   Settings → API in the Supabase dashboard for the service role key —
   never commit it, never ship it to a client bundle).
2. `cp .env.test.example .env.test` and fill in `TEST_ADMIN_EMAIL` /
   `TEST_ADMIN_PASSWORD` / `TEST_MENTOR_EMAIL` / `TEST_MENTOR_PASSWORD` /
   `TEST_STUDENT_EMAIL` / `TEST_STUDENT_PASSWORD`. Pick emails that don't
   belong to real people — these three accounts are created in your real
   project and reused on every run.
3. `npm install` (installs `@playwright/test`; Chromium is already
   downloaded for the `playwright` package this repo already depended on —
   if `npx playwright install chromium` is ever needed, run that once).

## Running

```bash
npm run test:e2e            # headless, runs against a local `npm run dev`
npm run test:e2e:headed     # same, with a visible browser
npm run test:e2e:ui         # Playwright's interactive UI mode
npm run test:e2e:report     # open the HTML report from the last run
```

By default the suite starts `npm run dev` on an unused local port and runs
against that — which itself talks to your real Supabase project via
`.env`. To run against a deployed URL (e.g. a Vercel preview) instead, set
`PLAYWRIGHT_BASE_URL` in `.env.test` and nothing local is started.

## What it does on every run

`e2e/global-setup.ts` runs once before all tests and:

- Creates (or resets the password of, if it already exists) the admin,
  mentor, and student accounts from `.env.test`, via the Supabase Admin
  API — the same approach as `scripts/create-test-users.mjs`.
- Links the test mentor to the test student (`mentor_assignments`), so
  mentor-facing tests (assigned students, messaging, exception queue) have
  something real to look at.

`e2e/auth.setup.ts` (a Playwright "setup" project) then logs into the real
`/login` form as each of the three roles and saves the resulting session,
so most spec files can start already authenticated without re-testing
login every time — login itself is still explicitly tested in
`auth-flows.spec.ts`.

## Account isolation — read this before adding a test

The three seeded accounts (admin/mentor/student) are **shared and
persistent** across every run. Some actions are one-way in the app itself
(passing an assignment hides its submission form forever; deleting an
account is permanent) — mutating the shared accounts with those actions
would break the suite for its own next run. The pattern used throughout:

- Read-only checks (RBAC, nav, dashboards, settings field visibility) use
  the shared accounts via `storageStatePath` from `e2e/helpers/authState.ts`.
- Anything that submits/passes an assignment, deletes an account, or
  otherwise makes a one-way change creates its **own disposable account**
  with `upsertAuthUser` (`e2e/helpers/supabaseAdmin.ts`) — with a
  timestamp in the email — and cleans it up with
  `supabaseAdmin().auth.admin.deleteUser(...)` in `afterAll`/`finally`.
- Content lookups (which assignment/lesson to use) go through the shared
  *student* session read-only, via `e2e/helpers/testData.ts` — safe to
  share since nothing there is mutated.
- The 60-second inter-submission rate limit is per (student, assignment).
  Tests that submit to the same assignment type more than once use
  `findAssignmentByType(type, offset)` to pick distinct assignments where
  possible, falling back to waiting out the cooldown otherwise.

If you add a test that submits an assignment, deletes something, or
otherwise can't be safely re-run against the same account, follow this
pattern rather than reusing the shared admin/mentor/student sessions.

## Known real API costs

`assignments.spec.ts` and `mentor.spec.ts`'s exception-queue test make
real calls to Gemini (via `evaluate-submission`) and consume part of the
free-tier quota. Not huge, but don't run this suite in a tight loop.

## Not covered here (see the manual checklist)

- Google OAuth sign-in — can't be driven headlessly through Google's real
  consent screen.
- Real email delivery (welcome email, password reset, broken-link admin
  notification, re-engagement emails) — the app only triggers these;
  actually receiving them needs a human inbox.
- The 30-submissions/day AI evaluation cap (PD-008) — exercising it for
  real means 31 real Gemini calls from one account in one day; too
  expensive/slow to run routinely.
- Visual/responsive/design QA — this suite checks behavior, not pixels.
