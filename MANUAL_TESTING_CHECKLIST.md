# Manual testing checklist

Companion to the automated suite in `e2e/` (`npm run test:e2e`). Everything
below is either impossible to automate headlessly (Google's real consent
screen, an actual inbox) or is better judged by a human (visual QA, whether
AI feedback actually reads well). Run the automated suite first — it covers
RBAC, forms, submissions, and CRUD mechanically — then work through this
list for the rest.

Use a real device/browser, not just the dev server, for at least one full
pass. Check items off as you go.

## 1. Google OAuth (not automated — real consent screen)

- [ ] **New user, Google sign-up**: from `/signup`, click "Continue with
      Google", complete Google's consent screen with an account that has
      never signed up before. You land signed in, not on an error page.
- [ ] Your name and profile picture from Google appear correctly — no
      lingering "?" avatar or blank name anywhere (nav, dashboard
      "Welcome back, …", Settings). This was a specific corrections-list
      item — check it carefully, including right after the very first
      OAuth signup, before ever touching Settings.
- [ ] You're enrolled and Week 1 is unlocked immediately, same as
      email/password signup.
- [ ] **Returning user, Google login**: from `/login`, "Continue with
      Google" with an account that already exists signs you straight in
      without creating a duplicate account or profile.
- [ ] Google OAuth respects the same role-based redirect as email/password
      login (a mentor/admin test account, if you have one linked to
      Google, lands on `/mentor` or `/admin`, not `/dashboard`).
- [ ] Cancelling the Google consent screen returns you to the app with a
      sane error state, not a blank page or infinite spinner.

## 2. Real email delivery (not automated — needs an actual inbox)

For each, sign up / trigger the action with an email address you can
actually check.

- [ ] **Welcome email** on signup — arrives, renders correctly, links work.
- [ ] **Password reset email** — request one from `/reset-password`, the
      email arrives, the link lands on `/reset-password/confirm` and
      actually lets you set a new password you can then log in with.
- [ ] **Broken-link admin notification** — if you can trigger the
      `check-resource-links` function manually (Supabase dashboard →
      Functions, or `supabase functions invoke check-resource-links`),
      confirm every admin profile with a real email receives a summary
      naming the specific week/lesson/resource, and that a link which was
      *already* broken before this run does **not** trigger a duplicate
      email (only newly-broken links should).
- [ ] **Re-engagement email** (`send-reengagement-emails`) — if there's a
      way to trigger it against a test account that looks inactive, confirm
      it arrives and reads correctly. (Likely only practically testable by
      reading the function's logic + a dry run, since it depends on real
      inactivity elapsing.)
- [ ] Check spam folder behavior isn't pathological (from address, SPF/DKIM
      via Resend look sane) — not something to over-invest in, but worth a
      glance.

## 3. AI grading quality (judgment call, not pass/fail)

The automated suite confirms Gemini grading *runs* and returns a verdict.
It can't judge whether the verdict is *good*.

- [ ] Submit a genuinely strong text/url answer — does it pass, and does
      the feedback read as specific and useful rather than generic?
- [ ] Submit a genuinely weak/off-topic answer — does it correctly get
      "needs work", with feedback that would actually help a real student
      improve?
- [ ] Skim the rubric/instructions for 2–3 assignments in the admin CMS and
      confirm the AI's verdicts on real attempts line up with what you'd
      grade by hand.

## 4. The 30/day AI evaluation cap (PD-008) — expensive to automate

The automated suite doesn't burn 31 real Gemini calls to prove this. Pick
one of:

- [ ] Read `supabase/functions/evaluate-submission/index.ts`
      (`MAX_AI_EVALS_PER_DAY = 30`) and confirm the logic matches intent, **or**
- [ ] If you're willing to spend the quota once: submit to a text/url
      assignment 31 times in a day from one account and confirm attempt 31
      fails gracefully with the "a mentor will review this" message and
      lands in the mentor exception queue instead of erroring.

## 5. Visual / responsive / design QA

The design system ("loud outside, calm inside") was hand-built — this
suite doesn't screenshot-diff it. For each of: landing, curriculum, login,
signup, dashboard, week, lesson, assignment (all 3 types), settings, mentor
dashboard, student detail, exception queue, admin overview, curriculum
list/editor, students list/detail, broken links, certificate editor,
public certificate page, 404 —

- [ ] Looks right at mobile width (~375px), tablet (~768px), and desktop
      (~1280px+). No overlapping text, no horizontal scroll, no cut-off
      buttons.
- [ ] Long content doesn't break layout: a very long lesson title, a long
      student name, a long AI feedback paragraph, a resource with a very
      long URL.
- [ ] Empty states look intentional, not broken: a mentor with zero
      assigned students, an admin with zero broken links, a student on
      attempt 1 of an assignment (no submissions yet).
- [ ] Loading states (`loading…`) don't flash awkwardly or get stuck.
- [ ] Focus states / keyboard navigation are usable on at least the login,
      signup, and assignment-submission forms.

## 6. Production smoke test

Once deployed (Vercel or wherever), a quick pass against the **live URL**,
not the dev server — confirms env vars, redirects, and edge function URLs
are all correctly configured for production, not just localhost.

- [ ] Landing page loads, curriculum loads.
- [ ] Sign up with a real throwaway email, confirm the account works
      end-to-end (enroll, unlock, a lesson, a quiz submission).
- [ ] Log in as the admin/mentor test accounts from `.env.test` and confirm
      their pages load (they exist in the same real project either way,
      but this confirms the production build's Supabase URL/keys match).
- [ ] Submit a text or url assignment and confirm the Gemini-backed grading
      actually completes in production (confirms `GEMINI_API_KEY` is set
      as a deployed edge function secret, not just locally).
- [ ] Check browser console for errors on each major page — no CSP
      failures, no 404s on assets, no CORS errors calling Supabase.

## 7. Things the corrections list called out specifically — re-verify by eye

Quick re-checks of this session's fixes, since "it's covered by an
automated test" and "it actually looks/feels right to a user" aren't the
same claim:

- [ ] Deleting your own account (Settings → Danger zone): the confirmation
      flow feels appropriately serious (not too easy to fat-finger, not so
      hard it's unusable), and after deletion you land somewhere sensible
      with no lingering "you're still logged in" flash.
- [ ] Avatar: upload/set one, see it in the nav, in Settings, and anywhere
      else a user's identity shows up (mentor's student list? admin's
      student list, if avatars appear there).
- [ ] A lesson with resources genuinely can't be "continued" past until
      every required resource is checked — try clicking around it (browser
      back/forward, direct URL to the next lesson) to make sure there's no
      way to skip via a route that isn't the Continue button itself.
- [ ] As admin, confirm there is truly no way to grade/evaluate a student
      submission anywhere in the admin UI — admin's job here is content +
      broken-link visibility only, mentors own evaluation.
- [ ] First login after being created as a mentor or admin (via
      `scripts/create-test-users.mjs` or the Supabase dashboard) lands on
      `/mentor` or `/admin`, never on the generic student `/dashboard`.
- [ ] Log in as an existing user with an old browser session/localStorage
      from before this session's changes (if you have one) — no broken
      state from the `signUp` return-shape change or anything else.

## 8. Cross-browser spot check

The automated suite only runs Chromium.

- [ ] Safari (especially if you expect real users on iPhone/Mac) — sign
      up, log in, submit an assignment.
- [ ] Firefox — same quick pass.
- [ ] One real mobile device, not just a resized desktop browser window —
      touch targets, on-screen keyboard behavior on forms.
