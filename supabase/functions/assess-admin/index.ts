// POST /assess-admin  { passcode }
// Coach login: verifies the admin passcode (rate-limited) and returns every
// client with their full response history, for the read-only coach dashboard.

import { adminClient, corsPreflight, errorResponse, getClientIp, jsonResponse, rateLimitCheck } from '../_shared/util.ts';
import { verifyPasscode } from '../_shared/assess.ts';

Deno.serve(async (req: Request) => {
  const pre = corsPreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return errorResponse('POST only', 405);

  let body: { passcode?: string };
  try { body = await req.json(); } catch { return errorResponse('Bad request', 400); }
  const passcode = body.passcode ?? '';
  if (!passcode) return errorResponse('Passcode required', 400);

  const sb = adminClient();
  const rl = await rateLimitCheck(sb, `assess-admin:${getClientIp(req)}`, 8, 600);
  if (!rl.allowed) return errorResponse('Too many attempts. Please wait a few minutes.', 429);

  const { data: admins } = await sb.from('assessment_admins').select('name, passcode_hash');
  let ok = false;
  let adminName = 'Coach';
  for (const a of admins ?? []) {
    if (await verifyPasscode(passcode, a.passcode_hash)) { ok = true; adminName = a.name; break; }
  }
  if (!ok) return errorResponse('Invalid passcode', 401);

  const { data: clients } = await sb
    .from('assessment_clients')
    .select('id, slug, name, config, active')
    .order('name');

  const ids = (clients ?? []).map((c) => c.id);
  const { data: responses } = ids.length
    ? await sb
        .from('assessment_responses')
        .select('client_id, answers, scores, submitted_at')
        .in('client_id', ids)
        .order('submitted_at', { ascending: true })
    : { data: [] };

  const byClient: Record<string, unknown[]> = {};
  for (const r of responses ?? []) {
    (byClient[r.client_id] ||= []).push({ answers: r.answers, scores: r.scores, submitted_at: r.submitted_at });
  }

  const out = (clients ?? []).map((c) => ({
    slug: c.slug,
    name: c.name,
    active: c.active,
    subscales: c.config?.subscales ?? [],
    signals: c.config?.signals ?? [],
    responses: byClient[c.id] ?? [],
  }));

  return jsonResponse({ adminName, clients: out });
});
