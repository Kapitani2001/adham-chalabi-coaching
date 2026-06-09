// POST /assess-submit  { token, answers }
// Verifies the session token (issued by assess-load), scores the answers
// server-side using the client's config, stores the response, and returns the
// updated history. A session token only ever authorizes its own client_id.

import { adminClient, corsPreflight, errorResponse, jsonResponse } from '../_shared/util.ts';
import { scoreAnswers, verifySession } from '../_shared/assess.ts';

Deno.serve(async (req: Request) => {
  const pre = corsPreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return errorResponse('POST only', 405);

  let body: { token?: string; answers?: Record<string, number> };
  try { body = await req.json(); } catch { return errorResponse('Bad request', 400); }

  const clientId = await verifySession(body.token ?? '');
  if (!clientId) return errorResponse('Session expired, please re-enter your passcode', 401);

  const answers = body.answers ?? {};
  for (const k of Object.keys(answers)) {
    const v = answers[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 10) {
      return errorResponse('Invalid answers', 400);
    }
  }

  const sb = adminClient();
  const { data: client } = await sb
    .from('assessment_clients')
    .select('config')
    .eq('id', clientId)
    .maybeSingle();
  if (!client) return errorResponse('Not found', 404);

  const scores = scoreAnswers(client.config, answers);

  const { error } = await sb
    .from('assessment_responses')
    .insert({ client_id: clientId, answers, scores });
  if (error) return errorResponse('Could not save', 500);

  const { data: responses } = await sb
    .from('assessment_responses')
    .select('answers, scores, submitted_at')
    .eq('client_id', clientId)
    .order('submitted_at', { ascending: true })
    .limit(52);

  return jsonResponse({ ok: true, scores, responses: responses ?? [] });
});
