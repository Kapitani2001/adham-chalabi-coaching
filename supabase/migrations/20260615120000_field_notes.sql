-- Field Notes archive: synced from Brevo "[Field Note NNN] ..." campaigns.
create table if not exists public.field_notes (
  brevo_campaign_id bigint primary key,
  number            int,
  title             text not null,
  subject           text,
  slug              text unique not null,
  preview           text,
  html              text,
  sent_at           timestamptz,
  synced_at         timestamptz default now()
);

alter table public.field_notes enable row level security;
-- Deny-all: the service role (edge functions) bypasses RLS; all reads go
-- through edge functions so the gated content is never exposed directly.

create index if not exists field_notes_sent_at_idx on public.field_notes (sent_at desc nulls last);
