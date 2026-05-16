// /unsubscribe — verify HMAC token and mark subscriber unsubscribed.
//
// Two modes:
//   POST {token}    -> JSON {status: "ok"|"already"|"invalid"}, called by the
//                      frontend at adham.coach/?unsubscribe=<token>
//   GET ?t=<token>  -> HTML fallback page, served directly. Kept so a link
//                      that for any reason bypasses the frontend (raw fetch,
//                      a copy-paste, an old email) still works end-to-end.

import { adminClient, corsPreflight, errorResponse, jsonResponse, verifyToken } from '../_shared/util.ts';

const PAGE = (status: 'ok' | 'invalid' | 'already') => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>Unsubscribed - Adham Chalabi Coaching</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font-family: Georgia, 'Times New Roman', serif; background: #fbf7ef; color: #2a2620; max-width: 540px; margin: 80px auto; padding: 0 24px; line-height: 1.55; }
  h1 { font-weight: 600; font-size: 22px; margin-bottom: 12px; }
  p { color: #4a4036; }
  a { color: #c9a96b; }
</style></head><body>
${status === 'ok' ? `
<h1>You're unsubscribed.</h1>
<p>The pathway stays open at <a href="https://adham.coach">adham.coach</a> whenever you want to come back to it. No more emails from me.</p>
` : status === 'already' ? `
<h1>Already unsubscribed.</h1>
<p>You're already off the list. You can keep reading at <a href="https://adham.coach">adham.coach</a>.</p>
` : `
<h1>That link didn't work.</h1>
<p>The unsubscribe link looks invalid. If you keep getting emails you don't want, reply to one of them and I'll handle it manually.</p>
`}
</body></html>`;

type UnsubStatus = 'ok' | 'already' | 'invalid';

async function unsubscribeByToken(token: string): Promise<UnsubStatus> {
  if (!token) return 'invalid';
  const subscriberId = await verifyToken(token, 'u');
  if (!subscriberId) return 'invalid';
  const sb = adminClient();
  const { data: sub } = await sb.from('subscribers').select('unsubscribed_at').eq('id', subscriberId).maybeSingle();
  if (!sub) return 'invalid';
  if (sub.unsubscribed_at) return 'already';
  const { error } = await sb.from('subscribers').update({ unsubscribed_at: new Date().toISOString() }).eq('id', subscriberId);
  if (error) {
    console.error('unsubscribe failed', error);
    return 'invalid';
  }
  return 'ok';
}

Deno.serve(async (req: Request) => {
  const pre = corsPreflight(req);
  if (pre) return pre;

  // POST: JSON API, called by the frontend at adham.coach/?unsubscribe=<token>
  if (req.method === 'POST') {
    let body: { token?: string } = {};
    try { body = await req.json(); } catch { /* empty body */ }
    const status = await unsubscribeByToken(body.token ?? '');
    return jsonResponse({ status });
  }

  // GET: HTML fallback (direct browser navigation)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const token = url.searchParams.get('t') ?? '';
    const status = await unsubscribeByToken(token);
    const httpStatus = status === 'invalid' ? 400 : 200;
    return new Response(PAGE(status), { status: httpStatus, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  return errorResponse('POST or GET only', 405);
});
