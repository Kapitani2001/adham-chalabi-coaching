-- Codify the pathway / quiz / rate-limit tables and lock them with RLS.
--
-- These five tables were created out-of-band (no migration in-repo) when the
-- pathway backend shipped. This migration brings them under version control
-- and — the operative part — enables row level security on all of them.
--
-- Security model (same gateway pattern as assessment_* and field_notes*):
-- RLS is ON with NO policies, so the anon key shipped in the frontend can
-- read/write NOTHING here. ALL access goes through edge functions (subscribe,
-- claim-by-token, progress-update, send-reminders, unsubscribe, quiz-result,
-- contact, field-notes) which run with SUPABASE_SERVICE_ROLE_KEY and bypass
-- RLS after doing their own validation.
--
-- Column sets are derived strictly from the edge function code. On the live
-- database the `create table if not exists` statements are no-ops (the tables
-- already exist); the `alter table ... enable row level security` statements
-- are idempotent and apply regardless.

-- One row per email-captured pathway subscriber.
-- Used by: subscribe, claim-by-token, progress-update, send-reminders, unsubscribe.
create table if not exists public.subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text unique not null,        -- lowercased before insert/lookup
  timezone        text,                        -- IANA tz, defaults to 'UTC' in code
  unsubscribed_at timestamptz                  -- null = still subscribed
);

-- One row per (subscriber, pathway): how far they've walked.
-- Upserted with onConflict 'subscriber_id,pathway_name' => composite PK.
-- Used by: subscribe, claim-by-token, progress-update.
create table if not exists public.pathway_progress (
  subscriber_id       uuid not null references public.subscribers(id) on delete cascade,
  pathway_name        text not null,
  last_completed_step int not null default 0,
  last_completed_at   timestamptz,
  completed_at        timestamptz,             -- set when the final step is done
  primary key (subscriber_id, pathway_name)
);

-- Scheduled reminder emails, swept by send-reminders (pg_cron every 15min).
-- Used by: subscribe, progress-update, send-reminders.
create table if not exists public.reminder_jobs (
  id            uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.subscribers(id) on delete cascade,
  pathway_name  text not null,
  step_number   int not null,
  send_at       timestamptz not null,
  sent_at       timestamptz,                   -- null = pending; doubles as the claim flag
  send_error    text                           -- last Brevo error, null on success
);

-- The sweep query: send_at <= now() AND sent_at IS NULL, ordered by send_at.
create index if not exists idx_reminder_jobs_due
  on public.reminder_jobs (send_at) where sent_at is null;

-- Quiz completions + captured emails. response_id is client-generated
-- ([A-Za-z0-9_-]{1,64}) and upserted with onConflict 'response_id'.
-- Used by: quiz-result.
create table if not exists public.quiz_responses (
  response_id text primary key,
  profile     text,                            -- HL | HH | LL | LH
  presence    numeric,                         -- 1..7
  search      numeric,                         -- 1..7
  answers     jsonb,                           -- array of 10 numbers, 1..7
  email       text,                            -- set by action:email, never rebound
  email_at    timestamptz
);

-- Sliding-window rate limiting: one row per hit, counted by (key, created_at).
-- Stale rows are cleaned up by a separate pg_cron job.
-- Used by: every rate-limited function via rateLimitCheck/recordRateHit.
create table if not exists public.rate_limits (
  key        text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limits_key_created
  on public.rate_limits (key, created_at);

-- Lock all five. No policies => anon and authenticated can touch nothing;
-- only the service role (edge functions) reads or writes.
alter table public.subscribers      enable row level security;
alter table public.pathway_progress enable row level security;
alter table public.reminder_jobs    enable row level security;
alter table public.quiz_responses   enable row level security;
alter table public.rate_limits      enable row level security;
