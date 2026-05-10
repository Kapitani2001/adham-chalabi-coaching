// POST /subscribe
// Body: { email, pathwayName, lastCompletedStep, lastCompletedAt, timezone }
// Behavior: upsert subscriber, upsert pathway_progress, schedule reminder for step+1 (if not last).
// Returns: { subscriberId, claimToken, unsubscribeToken }
//
// The claimToken lets the user re-bind their progress on a new device by visiting
// `/?t=<token>`. The unsubscribeToken is used in reminder emails for one-click opt-out.

import { adminClient, corsPreflight, errorResponse, jsonResponse, signToken, computeUnlockInstantInTz } from '../_shared/util.ts';

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

  // Upsert subscriber by email.
  const { data: subRows, error: subErr } = await sb
    .from('subscribers')
    .upsert(
      { email, timezone },
      { onConflict: 'email', ignoreDuplicates: false },
    )
    .select('id')
    .limit(1);
  if (subErr || !subRows?.[0]) {
    console.error('subscriber upsert failed', subErr);
    return errorResponse('subscriber upsert failed', 500);
  }
  const subscriberId = subRows[0].id as string;

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

  return jsonResponse({ subscriberId, claimToken, unsubscribeToken });
});
