// Shared helpers for the pathway edge functions.
// Deno runtime. No external imports beyond Deno standard + supabase-js.

import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';

// ----- Brevo transactional email -----

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export interface BrevoSendOpts {
  to: { email: string; name?: string };
  subject: string;
  htmlContent: string;
  textContent: string;
  replyTo?: { email: string; name?: string };
  senderEmail?: string;
  senderName?: string;
}

export async function sendBrevoEmail(opts: BrevoSendOpts): Promise<{ messageId?: string; error?: string }> {
  const apiKey = Deno.env.get('BREVO_API_KEY');
  if (!apiKey) return { error: 'BREVO_API_KEY missing' };
  const senderEmail = opts.senderEmail || Deno.env.get('BREVO_SENDER_EMAIL') || 'adham@adham.coach';
  const senderName = opts.senderName || Deno.env.get('BREVO_SENDER_NAME') || 'Adham Chalabi';
  const body: Record<string, unknown> = {
    sender: { email: senderEmail, name: senderName },
    to: [opts.to],
    subject: opts.subject,
    htmlContent: opts.htmlContent,
    textContent: opts.textContent,
  };
  if (opts.replyTo) body.replyTo = opts.replyTo;
  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
  let json: Record<string, unknown> = {};
  try { json = await res.json(); } catch (_) { /* empty body */ }
  if (!res.ok) return { error: `${res.status} ${JSON.stringify(json).slice(0, 500)}` };
  return { messageId: (json.messageId as string) || 'sent' };
}

// ----- Client IP + rate limiting -----

export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || 'unknown';
}

/**
 * Slide-window rate limit by `key`. Inserts a row for this request, then
 * counts rows for `key` within the last `windowSeconds`. Returns `allowed: false`
 * if the count now exceeds `max`. Cleanup of stale rows is handled by a
 * separate pg_cron job.
 */
export async function rateLimitCheck(
  sb: SupabaseClient,
  key: string,
  max: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; current: number }> {
  await sb.from('rate_limits').insert({ key });
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const { count } = await sb
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('key', key)
    .gte('created_at', since);
  const current = count ?? 0;
  return { allowed: current <= max, current };
}

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*', // safe: site is public, no creds in cookies
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

export function corsPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  return null;
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

export function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

// ----- HMAC token: <base64url(subscriber_id)>.<base64url(hmac_sha256(subscriber_id, secret))> -----

const encoder = new TextEncoder();

async function hmacKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('HMAC_SECRET');
  if (!secret) throw new Error('Missing HMAC_SECRET');
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function b64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function b64urlDecode(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const std = s.replaceAll('-', '+').replaceAll('_', '/') + pad;
  const bin = atob(std);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Token format v2: `v2.<base64url(JSON{p,s,e})>.<base64url(HMAC(payloadB64))>`
// - p: purpose ("c" = claim, "u" = unsubscribe). Stops a stolen claim token
//   from being used to unsubscribe and vice versa.
// - s: subscriber id (UUID).
// - e: unix expiry. Claim tokens expire after 30 days (re-issued each reminder
//   email anyway); unsubscribe tokens last a year.
// Legacy v1 tokens (`<base64url(subscriberId)>.<HMAC>`) without prefix are
// still accepted so emails already in the wild keep working.

export type TokenPurpose = 'c' | 'u';
const CLAIM_EXPIRY_SECONDS = 30 * 24 * 3600;
const UNSUB_EXPIRY_SECONDS = 365 * 24 * 3600;

interface TokenPayload {
  p: TokenPurpose;
  s: string;
  e: number;
}

export async function signToken(subscriberId: string, purpose: TokenPurpose): Promise<string> {
  const lifetime = purpose === 'u' ? UNSUB_EXPIRY_SECONDS : CLAIM_EXPIRY_SECONDS;
  const payload: TokenPayload = {
    p: purpose,
    s: subscriberId,
    e: Math.floor(Date.now() / 1000) + lifetime,
  };
  const payloadB64 = b64urlEncode(encoder.encode(JSON.stringify(payload)));
  const key = await hmacKey();
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64)));
  return `v2.${payloadB64}.${b64urlEncode(sig)}`;
}

/**
 * Verify token and return the subscriber id, or null if invalid/expired/
 * wrong-purpose. If `expectedPurpose` is omitted, any purpose is accepted
 * (used by claim-by-token where we want to be lenient about email links
 * authoring a fresh claim).
 */
export async function verifyToken(token: string, expectedPurpose?: TokenPurpose): Promise<string | null> {
  if (!token) return null;
  const parts = token.split('.');
  const key = await hmacKey();

  // v2: prefixed, signed JSON payload with purpose + expiry
  if (parts.length === 3 && parts[0] === 'v2') {
    const [, payloadB64, sigB64] = parts;
    let sig: Uint8Array;
    try { sig = b64urlDecode(sigB64); } catch { return null; }
    const ok = await crypto.subtle.verify('HMAC', key, sig, encoder.encode(payloadB64));
    if (!ok) return null;
    let payload: TokenPayload;
    try {
      payload = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64)));
    } catch { return null; }
    if (typeof payload.s !== 'string' || typeof payload.e !== 'number' || typeof payload.p !== 'string') {
      return null;
    }
    if (payload.e < Math.floor(Date.now() / 1000)) return null;
    if (expectedPurpose && payload.p !== expectedPurpose) return null;
    return payload.s;
  }

  // v1 legacy: <base64url(subscriberId)>.<HMAC(subscriberId)>
  // No prefix, no expiry, no purpose check. Accepted indefinitely so emails
  // already in inboxes keep working; future audit can remove once no legacy
  // tokens remain valid.
  if (parts.length === 2) {
    const [idPart, sigPart] = parts;
    let subscriberId: string;
    try { subscriberId = new TextDecoder().decode(b64urlDecode(idPart)); } catch { return null; }
    let sig: Uint8Array;
    try { sig = b64urlDecode(sigPart); } catch { return null; }
    const ok = await crypto.subtle.verify('HMAC', key, sig, encoder.encode(subscriberId));
    return ok ? subscriberId : null;
  }

  return null;
}

// ----- Pathway pacing logic (mirror of pathway-state.js's computeUnlockInstant) -----

/**
 * Compute the unlock instant (next 6:00 AM in the subscriber's timezone)
 * for a step that was just completed.
 */
export function computeUnlockInstantInTz(completedAt: Date, timezone: string | null): Date {
  // Default to UTC if no timezone provided.
  const tz = timezone || 'UTC';
  // Get the calendar date components in the target timezone.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(completedAt);
  const y = Number(parts.find((p) => p.type === 'year')!.value);
  const m = Number(parts.find((p) => p.type === 'month')!.value);
  const d = Number(parts.find((p) => p.type === 'day')!.value);
  // Construct the next-day 06:00 instant in the target timezone.
  // Strategy: build "YYYY-MM-DD 06:00:00" string and find the UTC instant
  // that maps to that wall-clock time in the target zone.
  const next = new Date(Date.UTC(y, m - 1, d + 1, 6, 0, 0));
  // The Date.UTC above produces a UTC instant whose wall clock IS 06:00.
  // We need the instant whose wall clock in `tz` IS 06:00. Compute the offset.
  const offsetMs = tzOffsetMs(next, tz);
  return new Date(next.getTime() - offsetMs);
}

function tzOffsetMs(instant: Date, tz: string): number {
  // Difference between wall-clock in `tz` and wall-clock in UTC for `instant`, in ms.
  const wallInTz = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(instant);
  const get = (t: string) => Number(wallInTz.find((p) => p.type === t)!.value);
  const asUTC = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') === 24 ? 0 : get('hour'),
    get('minute'),
    get('second'),
  );
  return asUTC - instant.getTime();
}
