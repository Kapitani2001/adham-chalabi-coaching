-- Per-client assessments: secure, passcode-gated, isolated.
--
-- Security model: RLS is ON with NO policies, so the anon/auth roles can read
-- nothing. ALL access goes through edge functions running with the service-role
-- key (which bypasses RLS) AFTER a passcode or signed session token is verified.
-- This is the same gateway pattern the pathway/quiz functions already use.

-- One row per coaching client. The assessment itself is tailored per client
-- (stored in `config`), and gated by a per-client passcode (stored hashed).
create table if not exists public.assessment_clients (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,        -- URL: adham.coach/assess/<slug>
  name          text not null,               -- display name, e.g. "Alicia"
  passcode_hash text not null,               -- pbkdf2$<iters>$<saltB64>$<hashB64>, never plaintext
  config        jsonb not null,              -- assessment definition: signals, subscales, scoring, copy
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- One row per submitted weekly check-in. Tied to a single client; a client can
-- only ever be reached through its own verified session, so responses are isolated.
create table if not exists public.assessment_responses (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.assessment_clients(id) on delete cascade,
  answers      jsonb not null,               -- { signalKey: 0..10, ... }
  scores       jsonb not null,               -- { subscales: {...}, overall, gate }
  submitted_at timestamptz not null default now()
);

create index if not exists idx_assessment_responses_client
  on public.assessment_responses (client_id, submitted_at desc);

-- Lock both tables. No policies => anon and authenticated cannot touch them.
-- Only the service role (edge functions) can read/write, after verifying the
-- client's passcode (assess-load) or a signed session token (assess-submit).
alter table public.assessment_clients   enable row level security;
alter table public.assessment_responses enable row level security;
