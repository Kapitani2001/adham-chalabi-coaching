// POST /assess-load  { slug, passcode }
// Verifies the client's passcode server-side (rate-limited), and only then
// returns their assessment config + past responses + a short-lived session token.
// Generic errors avoid revealing whether a slug exists.

import { adminClient, corsPreflight, errorResponse, getClientIp, jsonResponse, recentRateHits, recordRateHit } from '../_shared/util.ts';
import { signSession, verifyPasscode } from '../_shared/assess.ts';

Deno.serve(async (req: Request) => {
  const pre = corsPreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return errorResponse('POST only', 405);

  let body: { slug?: string; passcode?: string };
  try { body = await req.json(); } catch { return errorResponse('Bad request', 400); }
  const slug = (body.slug ?? '').toLowerCase().trim();
  const passcode = body.passcode ?? '';
  if (!slug || !passcode) return errorResponse('Slug and passcode required', 400);

  const sb = adminClient();

  // Brute-force guard, counting only FAILED attempts so legitimate reloads
  // never lock anyone out. Per-IP for the common case, AND per-slug so that
  // rotating the source IP can't get around the cap on one client's passcode.
  const ip = getClientIp(req);
  const ipKey = `assess:${ip}:${slug}`;
  const slugKey = `assess-fail:${slug}`;
  if ((await recentRateHits(sb, ipKey, 600)) >= 8 || (await recentRateHits(sb, slugKey, 900)) >= 15) {
    return errorResponse('Too many attempts. Please wait a few minutes.', 429);
  }

  const { data: client } = await sb
    .from('assessment_clients')
    .select('id, name, config, passcode_hash, active')
    .eq('slug', slug)
    .maybeSingle();

  const fail = async () => {
    await Promise.all([recordRateHit(sb, ipKey), recordRateHit(sb, slugKey)]);
    return errorResponse('Invalid passcode', 401);
  };
  if (!client || !client.active) return await fail();

  const ok = await verifyPasscode(passcode, client.passcode_hash);
  if (!ok) return await fail();

  const { data: responses } = await sb
    .from('assessment_responses')
    .select('answers, scores, submitted_at')
    .eq('client_id', client.id)
    .order('submitted_at', { ascending: true })
    .limit(52);

  const token = await signSession(client.id);
  return jsonResponse({ name: client.name, config: client.config, responses: responses ?? [], token });
});
