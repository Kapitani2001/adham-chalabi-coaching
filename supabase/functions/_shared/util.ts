// Shared helpers for the pathway edge functions.
// Deno runtime. No external imports beyond Deno standard + supabase-js.

import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';

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

export async function signToken(subscriberId: string): Promise<string> {
  const key = await hmacKey();
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(subscriberId)));
  return `${b64urlEncode(encoder.encode(subscriberId))}.${b64urlEncode(sig)}`;
}

export async function verifyToken(token: string): Promise<string | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [idPart, sigPart] = parts;
  let subscriberId: string;
  try {
    subscriberId = new TextDecoder().decode(b64urlDecode(idPart));
  } catch {
    return null;
  }
  const key = await hmacKey();
  let sig: Uint8Array;
  try {
    sig = b64urlDecode(sigPart);
  } catch {
    return null;
  }
  const ok = await crypto.subtle.verify('HMAC', key, sig, encoder.encode(subscriberId));
  return ok ? subscriberId : null;
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
