// POST /send-reminders
// Triggered by pg_cron every 15min. Picks up reminder_jobs whose send_at <= now()
// and sent_at is null, and where the subscriber is still subscribed. Sends the
// reminder email via Brevo and marks the job sent.
//
// Idempotent on each row by `sent_at IS NULL` filter; if the cron fires twice
// before the first sweep finishes, the second one just sees fewer due jobs.

import { adminClient, signToken } from '../_shared/util.ts';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const FUNCTIONS_BASE = `${Deno.env.get('SUPABASE_URL')}/functions/v1`;
const SITE_URL = (Deno.env.get('SITE_URL') || 'https://adham.coach').replace(/\/+$/, '');

interface PostMeta {
  slug: string;
  title: string;
  series?: string;
  series_order?: number;
}

interface ReminderJob {
  id: string;
  subscriber_id: string;
  pathway_name: string;
  step_number: number;
  send_at: string;
}

interface Subscriber {
  id: string;
  email: string;
  unsubscribed_at: string | null;
}

async function loadPostsManifest(): Promise<PostMeta[]> {
  const res = await fetch(`${SITE_URL}/posts/manifest.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`manifest fetch failed: ${res.status}`);
  return await res.json();
}

interface BrevoResult { messageId?: string; error?: string }

async function sendBrevoEmail(opts: {
  toEmail: string;
  subject: string;
  htmlContent: string;
  textContent: string;
}): Promise<BrevoResult> {
  const apiKey = Deno.env.get('BREVO_API_KEY');
  if (!apiKey) return { error: 'BREVO_API_KEY missing' };
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || 'adham@adham.coach';
  const senderName = Deno.env.get('BREVO_SENDER_NAME') || 'Adham Chalabi';
  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: opts.toEmail }],
      subject: opts.subject,
      htmlContent: opts.htmlContent,
      textContent: opts.textContent,
    }),
  });
  let json: Record<string, unknown> = {};
  try { json = await res.json(); } catch (_) { /* empty body */ }
  if (!res.ok) return { error: `${res.status} ${JSON.stringify(json).slice(0, 500)}` };
  return { messageId: (json.messageId as string) || 'sent' };
}

function buildEmail(opts: {
  pathwayName: string;
  step: number;
  postSlug: string;
  postTitle: string;
  claimToken: string;
  unsubscribeToken: string;
}): { subject: string; html: string; text: string } {
  const { pathwayName, step, postTitle, postSlug, claimToken, unsubscribeToken } = opts;
  // Clean URL with the claim token. Middleware lets `?t=` requests through
  // (token is validated downstream by /claim-by-token) and rewrites the SPA
  // route to /app.html, so the URL bar stays pretty.
  const readUrl = `${SITE_URL}/post/${postSlug}?t=${claimToken}`;
  // Branded unsubscribe URL — frontend picks up ?unsubscribe=, calls the
  // edge function, renders an in-site confirmation. Uses a SEPARATE token
  // namespace (purpose='u', longer-lived) so a leaked claim token can't be
  // used to unsubscribe and vice versa.
  const unsubscribeUrl = `${SITE_URL}/?unsubscribe=${unsubscribeToken}`;
  // Suppress unused-var lint by referencing FUNCTIONS_BASE somewhere benign.
  void FUNCTIONS_BASE;

  const subject = `Day ${step} of ${pathwayName} is open`;
  const text = `Day ${step}: ${postTitle}

It's open. Sit with this one when you can.

Read it here:
${readUrl}

— Adham

You can unsubscribe in one click:
${unsubscribeUrl}
`;

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#fbf7ef;color:#2a2620;">
<div style="font-family: Georgia, 'Times New Roman', serif; line-height:1.6; padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;">
    <p style="font-family:'Inter',Helvetica,Arial,sans-serif;font-weight:600;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#9a8f7a;margin:0 0 8px;">Day ${step}</p>
    <h1 style="font-weight:600;font-size:26px;margin:0 0 24px;color:#2a2620;">${postTitle}</h1>
    <p style="font-size:16px;color:#2a2620;margin:0 0 16px;">It's open. Sit with this one when you can.</p>
    <p style="margin:32px 0;">
      <a href="${readUrl}" style="display:inline-block;background:#c9a96b;color:#fbf7ef;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:600;font-family:Georgia, serif;">Read Day ${step}</a>
    </p>
    <p style="color:#6b5e44;margin:24px 0 0;">— Adham</p>
    <hr style="border:none;border-top:1px solid #e5e1d8;margin:32px 0 16px;">
    <p style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:#9a8f7a;line-height:1.5;margin:0;">
      Don't want these? <a href="${unsubscribeUrl}" style="color:#9a8f7a;text-decoration:underline;">Unsubscribe in one click.</a>
    </p>
  </div>
</div>
</body></html>`;

  return { subject, html, text };
}

Deno.serve(async (_req: Request) => {
  const sb = adminClient();

  const nowIso = new Date().toISOString();
  const { data: jobs, error } = await sb
    .from('reminder_jobs')
    .select('id, subscriber_id, pathway_name, step_number, send_at')
    .lte('send_at', nowIso)
    .is('sent_at', null)
    .order('send_at', { ascending: true })
    .limit(100);

  if (error) {
    console.error('job fetch failed', error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  if (!jobs || jobs.length === 0) {
    return new Response(JSON.stringify({ ok: true, due: 0 }), { headers: { 'Content-Type': 'application/json' } });
  }

  let manifest: PostMeta[] = [];
  try {
    manifest = await loadPostsManifest();
  } catch (e) {
    console.error('manifest load failed', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const subscriberIds = [...new Set(jobs.map((j) => j.subscriber_id))];
  const { data: subs, error: subErr } = await sb
    .from('subscribers')
    .select('id, email, unsubscribed_at')
    .in('id', subscriberIds);
  if (subErr) {
    console.error('subscribers load failed', subErr);
    return new Response(JSON.stringify({ ok: false, error: subErr.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const subMap = new Map<string, Subscriber>();
  for (const s of (subs ?? [])) subMap.set(s.id, s as Subscriber);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const job of jobs as ReminderJob[]) {
    const sub = subMap.get(job.subscriber_id);

    // Subscriber missing entirely
    if (!sub) {
      await sb.from('reminder_jobs')
        .update({ sent_at: new Date().toISOString(), send_error: 'subscriber missing' })
        .eq('id', job.id);
      skipped++;
      continue;
    }

    // Subscriber unsubscribed
    if (sub.unsubscribed_at) {
      await sb.from('reminder_jobs')
        .update({ sent_at: new Date().toISOString(), send_error: 'unsubscribed' })
        .eq('id', job.id);
      skipped++;
      continue;
    }

    // Resolve the post for this step
    const post = manifest.find((p) => p.series === job.pathway_name && (p.series_order ?? 0) === job.step_number);
    if (!post) {
      await sb.from('reminder_jobs')
        .update({ sent_at: new Date().toISOString(), send_error: `post not found for step ${job.step_number}` })
        .eq('id', job.id);
      skipped++;
      continue;
    }

    const [claimToken, unsubscribeToken] = await Promise.all([
      signToken(sub.id, 'c'),
      signToken(sub.id, 'u'),
    ]);
    const email = buildEmail({
      pathwayName: job.pathway_name,
      step: job.step_number,
      postSlug: post.slug,
      postTitle: post.title,
      claimToken,
      unsubscribeToken,
    });

    const result = await sendBrevoEmail({
      toEmail: sub.email,
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
    });

    if (result.error) {
      console.error('brevo send failed', sub.email, result.error);
      // Don't mark sent; let it retry on the next cron tick.
      // Record the error so debugging is easier.
      await sb.from('reminder_jobs')
        .update({ send_error: result.error.slice(0, 500) })
        .eq('id', job.id);
      failed++;
      continue;
    }

    await sb.from('reminder_jobs')
      .update({ sent_at: new Date().toISOString(), send_error: null })
      .eq('id', job.id);
    sent++;
  }

  return new Response(JSON.stringify({ ok: true, due: jobs.length, sent, skipped, failed }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
