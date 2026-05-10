// POST /progress-update
// Body: { claimToken, pathwayName, lastCompletedStep, lastCompletedAt, totalSteps, timezone? }
// Behavior: update pathway_progress and reschedule next reminder. No-regress.

import { adminClient, corsPreflight, errorResponse, jsonResponse, verifyToken, computeUnlockInstantInTz } from '../_shared/util.ts';

interface Body {
  claimToken?: string;
  pathwayName?: string;
  lastCompletedStep?: number;
  lastCompletedAt?: string;
  totalSteps?: number;
  timezone?: string;
}

Deno.serve(async (req: Request) => {
  const pre = corsPreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return errorResponse('POST only', 405);

  let body: Body;
  try { body = await req.json(); } catch { return errorResponse('invalid json', 400); }

  const claimToken = (body.claimToken ?? '').trim();
  const pathwayName = (body.pathwayName ?? '').trim();
  const lastCompletedStep = Number(body.lastCompletedStep ?? 0);
  const lastCompletedAtStr = body.lastCompletedAt ?? null;
  const totalSteps = Number(body.totalSteps ?? 0);
  const timezone = (body.timezone ?? '').trim() || null;

  if (!claimToken) return errorResponse('claimToken required', 400);
  if (!pathwayName) return errorResponse('pathwayName required', 400);
  if (lastCompletedStep < 1) return errorResponse('lastCompletedStep must be >= 1', 400);

  const subscriberId = await verifyToken(claimToken);
  if (!subscriberId) return errorResponse('invalid token', 401);

  const lastCompletedAt = lastCompletedAtStr ? new Date(lastCompletedAtStr) : null;
  if (!lastCompletedAt || isNaN(lastCompletedAt.getTime())) {
    return errorResponse('invalid lastCompletedAt', 400);
  }

  const sb = adminClient();

  // Look up subscriber + existing progress in parallel.
  const [{ data: sub }, { data: existing }] = await Promise.all([
    sb.from('subscribers').select('timezone, unsubscribed_at').eq('id', subscriberId).maybeSingle(),
    sb.from('pathway_progress').select('last_completed_step').eq('subscriber_id', subscriberId).eq('pathway_name', pathwayName).maybeSingle(),
  ]);

  if (!sub) return errorResponse('subscriber not found', 404);
  if (sub.unsubscribed_at) return errorResponse('subscriber unsubscribed', 410);

  // Honor no-regress: server only advances forward.
  const currentStep = existing?.last_completed_step ?? 0;
  if (lastCompletedStep <= currentStep) {
    return jsonResponse({ ok: true, regressed: true });
  }

  const isLast = totalSteps > 0 && lastCompletedStep >= totalSteps;
  const { error: progErr } = await sb.from('pathway_progress').upsert(
    {
      subscriber_id: subscriberId,
      pathway_name: pathwayName,
      last_completed_step: lastCompletedStep,
      last_completed_at: lastCompletedAt.toISOString(),
      completed_at: isLast ? lastCompletedAt.toISOString() : null,
    },
    { onConflict: 'subscriber_id,pathway_name' },
  );
  if (progErr) {
    console.error('progress upsert failed', progErr);
    return errorResponse('progress upsert failed', 500);
  }

  // Update timezone if a fresher one was provided.
  if (timezone && timezone !== sub.timezone) {
    await sb.from('subscribers').update({ timezone }).eq('id', subscriberId);
  }

  // Schedule reminder for step + 1 (idempotent).
  if (!isLast) {
    const tz = timezone || sub.timezone || 'UTC';
    const sendAt = computeUnlockInstantInTz(lastCompletedAt, tz);
    const nextStep = lastCompletedStep + 1;
    await sb.from('reminder_jobs').delete()
      .eq('subscriber_id', subscriberId)
      .eq('pathway_name', pathwayName)
      .eq('step_number', nextStep)
      .is('sent_at', null);
    await sb.from('reminder_jobs').insert({
      subscriber_id: subscriberId,
      pathway_name: pathwayName,
      step_number: nextStep,
      send_at: sendAt.toISOString(),
    });
  }

  return jsonResponse({ ok: true });
});
