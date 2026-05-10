// GET /unsubscribe?t=<token>
// Behavior: verify token, mark subscriber unsubscribed, return a tiny HTML page.

import { adminClient, corsPreflight, errorResponse, verifyToken } from '../_shared/util.ts';

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

Deno.serve(async (req: Request) => {
  const pre = corsPreflight(req);
  if (pre) return pre;
  if (req.method !== 'GET') return errorResponse('GET only', 405);

  const url = new URL(req.url);
  const token = url.searchParams.get('t') ?? '';
  if (!token) {
    return new Response(PAGE('invalid'), { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const subscriberId = await verifyToken(token);
  if (!subscriberId) {
    return new Response(PAGE('invalid'), { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const sb = adminClient();
  const { data: sub } = await sb.from('subscribers').select('unsubscribed_at').eq('id', subscriberId).maybeSingle();
  if (!sub) {
    return new Response(PAGE('invalid'), { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
  if (sub.unsubscribed_at) {
    return new Response(PAGE('already'), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const { error } = await sb.from('subscribers').update({ unsubscribed_at: new Date().toISOString() }).eq('id', subscriberId);
  if (error) {
    console.error('unsubscribe failed', error);
    return new Response(PAGE('invalid'), { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  return new Response(PAGE('ok'), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
});
