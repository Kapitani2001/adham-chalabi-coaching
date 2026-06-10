-- Coach (admin) login for the assessment dashboard. One hashed passcode that
-- unlocks the read-only view of every client's results. RLS on, no policies;
-- only the assess-admin edge function (service role) reads it.
create table if not exists public.assessment_admins (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  passcode_hash text not null,
  created_at    timestamptz not null default now()
);

alter table public.assessment_admins enable row level security;
