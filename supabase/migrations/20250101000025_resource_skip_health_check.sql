-- Some sites (Cloudflare-protected ones especially, e.g. platform.openai.com)
-- block server-side health checks outright — via TLS/behavioral
-- fingerprinting, not just missing headers — no matter how browser-like the
-- request looks. Those links get stuck permanently "broken" on every sweep
-- even though they work fine for a real visitor. "Mark fixed" doesn't hold
-- for these, since the next scheduled sweep just re-flags them.
--
-- This lets an admin who has manually verified a link permanently exclude
-- it from the automated checker instead of re-dismissing it every day.
alter table resources add column skip_health_check boolean not null default false;
