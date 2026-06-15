// POST /field-notes  { action, ... }
// The Field Notes archive gate (light, double-opt-in style):
//   action "list"     -> public issue metadata (titles/dates/teaser, no body)
//   action "subscribe"-> { email } emails a confirm link
//   action "confirm"  -> { token } verifies the link, adds the email to the
//                        Brevo list, returns a long-lived access token
//   action "content"  -> { slug, accessToken } returns the issue HTML (gated)
//
// Self-contained (helpers inlined) so it deploys as a single file.

import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const SITE = (Deno.env.get('SITE_URL') || 'https://adham.coach').replace(/\/+$/, '');
const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const err = (m: string, status = 400) => json({ error: m }, status);

function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing SUPABASE env');
  return createClient(url, key, { auth: { persistSession: false } });
}

function clientIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const parts = fwd.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return 'unknown';
}

async function rateLimit(sb: SupabaseClient, key: string, max: number, windowSeconds: number) {
  await sb.from('rate_limits').insert({ key });
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const { count } = await sb.from('rate_limits').select('*', { count: 'exact', head: true }).eq('key', key).gte('created_at', since);
  return (count ?? 0) <= max;
}

// ----- HMAC tokens (reuse the project HMAC_SECRET): fn.<b64u(JSON{m,p,e})>.<b64u(sig)> -----
const encoder = new TextEncoder();
async function hmacKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('HMAC_SECRET');
  if (!secret) throw new Error('Missing HMAC_SECRET');
  return await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
function b64u(bytes: Uint8Array): string {
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
function unb64u(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s.replaceAll('-', '+').replaceAll('_', '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function signTok(email: string, purpose: string, ttlSeconds: number): Promise<string> {
  const payload = { m: email, p: purpose, e: Math.floor(Date.now() / 1000) + ttlSeconds };
  const p = b64u(encoder.encode(JSON.stringify(payload)));
  const sig = b64u(new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(), encoder.encode(p))));
  return `fn.${p}.${sig}`;
}
async function verifyTok(token: string, purpose: string): Promise<string | null> {
  const parts = (token || '').split('.');
  if (parts.length !== 3 || parts[0] !== 'fn') return null;
  let sig: Uint8Array;
  try { sig = unb64u(parts[2]); } catch { return null; }
  const ok = await crypto.subtle.verify('HMAC', await hmacKey(), sig, encoder.encode(parts[1]));
  if (!ok) return null;
  let payload: { m?: string; p?: string; e?: number };
  try { payload = JSON.parse(new TextDecoder().decode(unb64u(parts[1]))); } catch { return null; }
  if (payload.p !== purpose) return null;
  if (typeof payload.e !== 'number' || payload.e < Math.floor(Date.now() / 1000)) return null;
  return typeof payload.m === 'string' ? payload.m : null;
}

async function sendBrevo(to: string, subject: string, html: string, text: string) {
  const apiKey = Deno.env.get('BREVO_API_KEY');
  if (!apiKey) return { error: 'BREVO_API_KEY missing' };
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: {
        email: Deno.env.get('BREVO_SENDER_EMAIL') || 'adham@adham.coach',
        name: Deno.env.get('BREVO_SENDER_NAME') || 'Adham Chalabi',
      },
      to: [{ email: to }],
      subject, htmlContent: html, textContent: text,
    }),
  });
  if (!res.ok) {
    let j = ''; try { j = JSON.stringify(await res.json()); } catch (_) { /* */ }
    return { error: `${res.status} ${j.slice(0, 300)}` };
  }
  return { ok: true };
}

function confirmEmail(confirmUrl: string): { subject: string; html: string; text: string } {
  const subject = 'Confirm your email to open the Field Notes archive';
  const text = `You're one click from the full Field Notes archive.

Confirm your email here:
${confirmUrl}

If you didn't request this, just ignore it.

— Adham`;
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f9f6f3;color:#1a1a1a;">
<div style="font-family:Georgia,'Times New Roman',serif;line-height:1.6;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;">
    <p style="font-family:Inter,Helvetica,Arial,sans-serif;font-weight:600;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#6E8CE8;margin:0 0 8px;">The Field Notes</p>
    <h1 style="font-weight:600;font-size:24px;margin:0 0 20px;color:#1a1a1a;">One click to open the archive</h1>
    <p style="font-size:16px;margin:0 0 24px;">Confirm your email and the full Field Notes archive opens, every past issue, right on the site.</p>
    <p style="margin:28px 0;">
      <a href="${confirmUrl}" style="display:inline-block;background:#6E8CE8;color:#fff;padding:13px 30px;border-radius:999px;text-decoration:none;font-weight:600;font-family:Inter,Helvetica,Arial,sans-serif;">Confirm &amp; read</a>
    </p>
    <p style="color:#6b6b6b;font-size:14px;margin:24px 0 0;">If you didn't request this, just ignore it.</p>
    <p style="color:#6b6b6b;margin:20px 0 0;">— Adham</p>
  </div>
</div></body></html>`;
  return { subject, html, text };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return err('POST only', 405);

  let body: { action?: string; email?: string; token?: string; slug?: string; accessToken?: string };
  try { body = await req.json(); } catch { return err('invalid json'); }
  const action = (body.action ?? '').trim();
  const sb = adminClient();

  // ---- list: public issue metadata (no body) ----
  if (action === 'list') {
    const { data, error } = await sb
      .from('field_notes')
      .select('number, title, slug, subject, preview, sent_at')
      .order('number', { ascending: false });
    if (error) return err('could not load', 500);
    return json({ issues: data ?? [] });
  }

  // ---- subscribe: email a confirm link ----
  if (action === 'subscribe') {
    const email = (body.email ?? '').trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) return err('invalid email');
    const ip = clientIp(req);
    if (!(await rateLimit(sb, `fnsub:${ip}`, 10, 3600)) || !(await rateLimit(sb, `fnsub:${email}`, 3, 86400))) {
      return err('please wait a bit before trying again', 429);
    }
    const token = await signTok(email, 'fnc', 86400); // 24h confirm window
    const confirmUrl = `${SITE}/blog?fnconfirm=${encodeURIComponent(token)}`;
    const { subject, html, text } = confirmEmail(confirmUrl);
    const sent = await sendBrevo(email, subject, html, text);
    if ('error' in sent) { console.error('confirm email failed', sent.error); return err('could not send, try again', 502); }
    return json({ ok: true });
  }

  // ---- confirm: verify the link, record the subscriber, return access token ----
  if (action === 'confirm') {
    const email = await verifyTok(body.token ?? '', 'fnc');
    if (!email) return err('this link is invalid or has expired', 400);
    await sb.from('field_notes_subscribers').upsert(
      { email, confirmed_at: new Date().toISOString(), ip: clientIp(req) },
      { onConflict: 'email' },
    ).then((r) => { if (r.error) console.error('subscriber upsert failed', r.error); });
    // Add to the Brevo Field Notes list (best-effort) so they get future issues.
    const listId = Number(Deno.env.get('FIELD_NOTES_LIST_ID') || '0');
    const apiKey = Deno.env.get('BREVO_API_KEY');
    if (listId && apiKey) {
      try {
        await fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST',
          headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ email, listIds: [listId], updateEnabled: true }),
        });
      } catch (e) { console.error('brevo list add failed', e); }
    }
    const accessToken = await signTok(email, 'fna', 365 * 24 * 3600); // 1 year
    return json({ ok: true, accessToken });
  }

  // ---- content: gated issue HTML ----
  if (action === 'content') {
    const email = await verifyTok(body.accessToken ?? '', 'fna');
    if (!email) return err('locked', 401);
    const slug = (body.slug ?? '').trim();
    if (!slug) return err('missing slug');
    const { data, error } = await sb
      .from('field_notes')
      .select('title, subject, slug, sent_at, html')
      .eq('slug', slug)
      .maybeSingle();
    if (error || !data) return err('not found', 404);
    return json({ issue: data });
  }

  return err('unknown action');
});
