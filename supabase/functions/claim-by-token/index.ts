// GET /claim-by-token?t=<token>
// Behavior: verify the HMAC token, return subscriber's progress so the client
// can mirror it into localStorage (effectively logs them in on the new device).

import { adminClient, corsPreflight, errorResponse, jsonResponse, verifyToken } from '../_shared/util.ts';

Deno.serve(async (req: Request) => {
  const pre = corsPreflight(req);
  if (pre) return pre;
  if (req.method !== 'GET' && req.method !== 'POST') return errorResponse('GET or POST only', 405);

  const url = new URL(req.url);
  let token = url.searchParams.get('t') ?? '';
  if (!token && req.method === 'POST') {
    try {
      const body = await req.json();
      token = body.token ?? '';
    } catch { /* fall through */ }
  }
  if (!token) return errorResponse('token required', 400);

  const subscriberId = await verifyToken(token, 'c');
  if (!subscriberId) return errorResponse('invalid token', 401);

  const sb = adminClient();
  const [{ data: sub }, { data: progress }] = await Promise.all([
    sb.from('subscribers').select('id, email, timezone, unsubscribed_at').eq('id', subscriberId).maybeSingle(),
    sb.from('pathway_progress').select('pathway_name, last_completed_step, last_completed_at, completed_at').eq('subscriber_id', subscriberId),
  ]);

  if (!sub) return errorResponse('subscriber not found', 404);

  return jsonResponse({
    subscriberId: sub.id,
    email: sub.email,
    timezone: sub.timezone,
    unsubscribed: !!sub.unsubscribed_at,
    progress: progress ?? [],
  });
});
