// POST /subscribe
// Body: { email, pathwayName, lastCompletedStep, lastCompletedAt, timezone }
// Behavior: upsert subscriber, upsert pathway_progress, schedule reminder for step+1 (if not last).
// Returns: { subscriberId, claimToken, unsubscribeToken }
//
// The claimToken lets the user re-bind their progress on a new device by visiting
// `/?t=<token>`. The unsubscribeToken is used in reminder emails for one-click opt-out.

import {
  adminClient,
  corsPreflight,
  errorResponse,
  jsonResponse,
  signToken,
  computeUnlockInstantInTz,
  sendBrevoEmail,
  getClientIp,
  rateLimitCheck,
} from '../_shared/util.ts';

const SITE_URL = (Deno.env.get('SITE_URL') || 'https://adham.coach').replace(/\/+$/, '');
const FUNCTIONS_BASE = `${Deno.env.get('SUPABASE_URL')}/functions/v1`;

interface Body {
  email?: string;
  pathwayName?: string;
  lastCompletedStep?: number;
  lastCompletedAt?: string; // ISO
  timezone?: string;
  totalSteps?: number;
}

Deno.serve(async (req: Request) => {
  const pre = corsPreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return errorResponse('POST only', 405);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return errorResponse('invalid json', 400);
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const pathwayName = (body.pathwayName ?? '').trim();
  const lastCompletedStep = Number(body.lastCompletedStep ?? 0);
  const lastCompletedAtStr = body.lastCompletedAt ?? null;
  const timezone = (body.timezone ?? 'UTC').trim();
  const totalSteps = Number(body.totalSteps ?? 0);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return errorResponse('invalid email', 400);
  }
  if (!pathwayName) return errorResponse('pathwayName required', 400);
  if (lastCompletedStep < 0) return errorResponse('lastCompletedStep must be >= 0', 400);

  const lastCompletedAt = lastCompletedAtStr ? new Date(lastCompletedAtStr) : null;
  if (lastCompletedAt && isNaN(lastCompletedAt.getTime())) {
    return errorResponse('invalid lastCompletedAt', 400);
  }

  const sb = adminClient();

  // Rate limit: 5 subscribe requests per hour per IP (junk-email vector
  // mitigation). Each subscribe schedules an actual email send tomorrow.
  const ip = getClientIp(req);
  const rl = await rateLimitCheck(sb, `subscribe:${ip}`, 5, 3600);
  if (!rl.allowed) {
    return errorResponse('too many requests, slow down', 429);
  }

  // Look up existing subscriber to detect new vs returning (drives the
  // welcome email below).
  const { data: existing } = await sb
    .from('subscribers')
    .select('id, unsubscribed_at')
    .eq('email', email)
    .maybeSingle();

  let subscriberId: string;
  const isNew = !existing;

  if (existing) {
    subscriberId = existing.id as string;
    // Re-subscribing: clear unsubscribed flag and refresh timezone.
    await sb.from('subscribers')
      .update({ timezone, unsubscribed_at: null })
      .eq('id', subscriberId);
  } else {
    const { data: inserted, error: insErr } = await sb
      .from('subscribers')
      .insert({ email, timezone })
      .select('id')
      .single();
    if (insErr || !inserted) {
      console.error('subscriber insert failed', insErr);
      return errorResponse('subscriber insert failed', 500);
    }
    subscriberId = inserted.id as string;
  }

  // Upsert pathway_progress (server adopts the localStorage state as authoritative for now).
  const isLast = totalSteps > 0 && lastCompletedStep >= totalSteps;
  const completedAt = isLast && lastCompletedAt ? lastCompletedAt.toISOString() : null;
  const { error: progErr } = await sb.from('pathway_progress').upsert(
    {
      subscriber_id: subscriberId,
      pathway_name: pathwayName,
      last_completed_step: lastCompletedStep,
      last_completed_at: lastCompletedAt ? lastCompletedAt.toISOString() : null,
      completed_at: completedAt,
    },
    { onConflict: 'subscriber_id,pathway_name' },
  );
  if (progErr) {
    console.error('progress upsert failed', progErr);
    return errorResponse('progress upsert failed', 500);
  }

  // Schedule the next reminder (only if there is a next step).
  if (lastCompletedAt && lastCompletedStep > 0 && (totalSteps === 0 || lastCompletedStep < totalSteps)) {
    const sendAt = computeUnlockInstantInTz(lastCompletedAt, timezone);
    // Idempotent: delete any existing pending job for this (subscriber, pathway, step+1) before insert.
    const nextStep = lastCompletedStep + 1;
    await sb.from('reminder_jobs').delete()
      .eq('subscriber_id', subscriberId)
      .eq('pathway_name', pathwayName)
      .eq('step_number', nextStep)
      .is('sent_at', null);
    const { error: jobErr } = await sb.from('reminder_jobs').insert({
      subscriber_id: subscriberId,
      pathway_name: pathwayName,
      step_number: nextStep,
      send_at: sendAt.toISOString(),
    });
    if (jobErr) {
      console.error('reminder schedule failed', jobErr);
      // Non-fatal: subscriber + progress are saved; reminder is best-effort.
    }
  }

  const claimToken = await signToken(subscriberId);
  const unsubscribeToken = claimToken; // same HMAC scheme; semantics differ at endpoint

  // Welcome email — only on the first signup. Best-effort: if it fails,
  // the signup still succeeds and the user will get the Day-2 reminder.
  if (isNew && lastCompletedAt && (totalSteps === 0 || lastCompletedStep < totalSteps)) {
    const unlockAt = computeUnlockInstantInTz(lastCompletedAt, timezone);
    const unsubUrl = `${SITE_URL}/?unsubscribe=${unsubscribeToken}`;
    const dayLabel = unlockAt.toLocaleString('en-US', {
      timeZone: timezone || 'UTC',
      weekday: 'long',
      hour: 'numeric',
      hour12: true,
    });
    const subject = `You're in. Day ${lastCompletedStep + 1} of ${pathwayName} lands ${dayLabel}.`;
    const text = `You signed up to walk ${pathwayName} just now.

Day ${lastCompletedStep + 1} will land in your inbox ${dayLabel}.

Until then: sit with what came up on Day ${lastCompletedStep}. Don't analyze it. Just notice.

— Adham

PS: if you didn't sign up, or you want out, one click here: ${unsubUrl}
`;
    const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#fbf7ef;color:#2a2620;">
<div style="font-family: Georgia, 'Times New Roman', serif; line-height:1.6; padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;">
    <p style="font-family:'Inter',Helvetica,Arial,sans-serif;font-weight:600;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#9a8f7a;margin:0 0 8px;">${pathwayName}</p>
    <h1 style="font-weight:600;font-size:26px;margin:0 0 24px;color:#2a2620;">You're in. See you ${dayLabel}.</h1>
    <p style="font-size:16px;color:#2a2620;margin:0 0 16px;">Day ${lastCompletedStep + 1} will land in your inbox then.</p>
    <p style="font-size:16px;color:#2a2620;margin:0 0 16px;">Until then: sit with what came up on Day ${lastCompletedStep}. Don't analyze it. Just notice.</p>
    <p style="color:#6b5e44;margin:24px 0 0;">— Adham</p>
    <hr style="border:none;border-top:1px solid #e5e1d8;margin:32px 0 16px;">
    <p style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:#9a8f7a;line-height:1.5;margin:0;">
      Didn't sign up? <a href="${unsubUrl}" style="color:#9a8f7a;text-decoration:underline;">Unsubscribe in one click.</a>
    </p>
  </div>
</div>
</body></html>`;
    sendBrevoEmail({
      to: { email },
      subject,
      htmlContent: html,
      textContent: text,
    }).catch((e) => console.error('welcome email failed', e));
  }

  return jsonResponse({ subscriberId, claimToken, unsubscribeToken });
});
// FUNCTIONS_BASE imported to keep parity with other functions; not used yet.
void FUNCTIONS_BASE;
