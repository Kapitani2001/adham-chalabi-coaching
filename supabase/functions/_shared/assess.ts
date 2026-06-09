// Assessment helpers, deliberately isolated from _shared/util.ts so the existing
// pathway/quiz functions are not affected. Reuses the project's HMAC_SECRET for
// short-lived session tokens, and PBKDF2 for passcode hashing. No external deps.

const enc = new TextEncoder();

function b64u(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
function unb64u(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s.replaceAll('-', '+').replaceAll('_', '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function hmacKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('HMAC_SECRET');
  if (!secret) throw new Error('Missing HMAC_SECRET');
  return await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

// ----- Session token: a1.<b64u(JSON{c,e})>.<b64u(HMAC(payload))> -----
const SESSION_TTL = 6 * 3600; // seconds

export async function signSession(clientId: string): Promise<string> {
  const payload = { c: clientId, e: Math.floor(Date.now() / 1000) + SESSION_TTL };
  const p = b64u(enc.encode(JSON.stringify(payload)));
  const key = await hmacKey();
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(p)));
  return `a1.${p}.${b64u(sig)}`;
}

export async function verifySession(token: string): Promise<string | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'a1') return null;
  const key = await hmacKey();
  let sig: Uint8Array;
  try { sig = unb64u(parts[2]); } catch { return null; }
  const ok = await crypto.subtle.verify('HMAC', key, sig, enc.encode(parts[1]));
  if (!ok) return null;
  let payload: { c?: string; e?: number };
  try { payload = JSON.parse(new TextDecoder().decode(unb64u(parts[1]))); } catch { return null; }
  if (typeof payload.c !== 'string' || typeof payload.e !== 'number') return null;
  if (payload.e < Math.floor(Date.now() / 1000)) return null;
  return payload.c;
}

// ----- Passcode hashing: pbkdf2$<iters>$<saltB64u>$<hashB64u> -----
const PBKDF2_ITERS = 100_000;

async function pbkdf2(passcode: string, salt: Uint8Array, iters: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(passcode), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iters }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPasscode(passcode: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const h = await pbkdf2(passcode, salt, PBKDF2_ITERS);
  return `pbkdf2$${PBKDF2_ITERS}$${b64u(salt)}$${b64u(h)}`;
}

export async function verifyPasscode(passcode: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iters = parseInt(parts[1], 10);
  let salt: Uint8Array, expected: Uint8Array;
  try { salt = unb64u(parts[2]); expected = unb64u(parts[3]); } catch { return false; }
  const actual = await pbkdf2(passcode, salt, iters);
  if (actual.length !== expected.length) return false;
  let d = 0;
  for (let i = 0; i < actual.length; i++) d |= actual[i] ^ expected[i];
  return d === 0;
}

// ----- Scoring (config-driven) -----
export interface AssessConfig {
  subscales: { key: string; label: string }[];
  signals: { key: string; sub: string }[];
  deeperKey?: string;
}

export function scoreAnswers(config: AssessConfig, answers: Record<string, number>) {
  const subMean: Record<string, number> = {};
  for (const s of config.subscales) {
    const items = config.signals.filter((x) => x.sub === s.key);
    const sum = items.reduce((a, x) => a + (answers[x.key] ?? 0), 0);
    subMean[s.key] = items.length ? sum / items.length : 0;
  }
  const means = Object.values(subMean);
  const overall = means.length ? means.reduce((a, b) => a + b, 0) / means.length : 0;
  const all = config.signals.map((x) => answers[x.key] ?? 0);
  const lo = all.length ? Math.min(...all) : 0;
  const minSub = means.length ? Math.min(...means) : 0;
  const deeper = config.deeperKey ? (answers[config.deeperKey] ?? 0) : overall;
  let gate: 'red' | 'amber' | 'green';
  if (overall <= 3 || minSub <= 3 || deeper <= 3 || lo <= 2) gate = 'red';
  else if (means.every((m) => m >= 7) && deeper >= 7 && lo >= 4) gate = 'green';
  else gate = 'amber';
  return { subscales: subMean, overall, gate };
}
