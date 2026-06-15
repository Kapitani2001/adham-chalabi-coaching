-- Confirmed Field Notes subscribers (the verified-email list the gate builds).
create table if not exists public.field_notes_subscribers (
  email        text primary key,
  confirmed_at timestamptz default now(),
  ip           text
);

alter table public.field_notes_subscribers enable row level security;
-- Deny-all: only the field-notes edge function (service role) writes here.
