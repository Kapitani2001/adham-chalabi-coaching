// POST /quiz-result
// Body: { email, profile (HL|HH|LL|LH), presence, search }
// Captures the lead and emails the personalized "what you're struggling with +
// what to work on" reading via Brevo. The gated content lives ONLY here on the
// server, never in the page, so a fake email gets nothing and the content
// cannot be scraped from the client.
//
// Self-contained (helpers inlined) so it deploys as a single file.

import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const err = (m: string, status = 400) => json({ error: m }, status);

function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing SUPABASE env');
  return createClient(url, key, { auth: { persistSession: false } });
}

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

async function rateLimit(sb: SupabaseClient, key: string, max: number, windowSeconds: number) {
  await sb.from('rate_limits').insert({ key });
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const { count } = await sb.from('rate_limits').select('*', { count: 'exact', head: true }).eq('key', key).gte('created_at', since);
  return (count ?? 0) <= max;
}

async function sendBrevo(to: string, subject: string, html: string, text: string) {
  const apiKey = Deno.env.get('BREVO_API_KEY');
  if (!apiKey) return { error: 'BREVO_API_KEY missing' };
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: {
        email: Deno.env.get('BREVO_SENDER_EMAIL') || 'adham@adham.coach',
        name: Deno.env.get('BREVO_SENDER_NAME') || 'Adham Chalabi',
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });
  if (!res.ok) {
    let j = ''; try { j = JSON.stringify(await res.json()); } catch (_) { /* */ }
    return { error: `${res.status} ${j.slice(0, 300)}` };
  }
  return { ok: true };
}

// ---- gated content (server-side only) ----
interface Reading {
  title: string;
  recap: string;
  struggles: string;
  work: string[];
}
const READINGS: Record<string, Reading> = {
  HL: {
    title: 'Settled',
    recap: 'Your life feels meaningful, and you are not restlessly chasing more. That is a rare kind of quiet, and most people never reach it.',
    struggles:
      'The risk for you is not emptiness, it is drift. The honest things to watch: mistaking settled for finished, slipping into autopilot without noticing, and a quiet voice that wonders about a next chapter, which you keep talking yourself out of.',
    work: [
      'Pick one area you have stopped growing in and put a small, real challenge back into it.',
      'Be honest about where you are coasting, and whether it is genuine peace or quiet avoidance.',
      'Decide what your next chapter looks like, on purpose, before life decides it for you.',
    ],
  },
  HH: {
    title: 'Grounded, still growing',
    recap: 'You have real meaning and you are still reaching for more. That combination is the healthiest one there is. You are not searching because something is broken, you are building on a foundation that is already solid.',
    struggles:
      'The one thing that can trip you up is busyness that looks like growth but is really just motion. Watch for: filling every gap with more until the searching becomes a treadmill, trouble sitting still inside the good life you built, and confusing being busy with being on purpose.',
    work: [
      'Before you add anything new, ask whether it deepens your life or just fills it.',
      'Protect time to actually enjoy what you have built, not only to build the next thing.',
      'Pick one direction to go deep on instead of five to go shallow on.',
    ],
  },
  LL: {
    title: 'Running on empty',
    recap: 'Right now life does not feel like it points anywhere in particular, and you are not really looking either. This is not a verdict, it is a snapshot of right now. Usually it is a quiet kind of self-protection: when looking for meaning has hurt before, the mind learns to stop looking.',
    struggles:
      'The numbness has a cost, it is the exact place a life quietly shrinks. What it usually looks like: going through the motions while feeling far from your own life, low energy for things you used to care about, and staying busy or distracted so it never gets quiet enough to feel the gap.',
    work: [
      'Start smaller than you think. One thing a week that used to matter, done on purpose, not for results.',
      'Let it get quiet sometimes, and notice what comes up instead of reaching for your phone.',
      'Get a second set of eyes on it, because this is the spiral that is hardest to break alone.',
    ],
  },
  LH: {
    title: 'In the search',
    recap: 'You do not feel much meaning right now, but you have not given up, you are still looking. That ache is not a weakness, it is honesty. The answer for you is not to try harder, you already have the effort. What you are missing is a direction.',
    struggles:
      'Searching without a foundation can turn into a loop. What it usually looks like: jumping from one thing to the next, new book, new habit, new plan, same spiral, progress that feels like motion but never quite arrives, and a quiet fear that the searching might never end.',
    work: [
      'Stop adding inputs. Sit with the one question you keep circling and avoiding.',
      'Get specific about what meaningful actually means to you, in plain words, not borrowed ideals.',
      'Do it with someone who will not let you flinch, because the mind protects the exact spot that needs to be seen.',
    ],
  },
};

function buildEmail(r: Reading, presence: number, search: number) {
  const subject = `Your full reading: ${r.title}`;
  const workText = r.work.map((w, i) => `${i + 1}. ${w}`).join('\n');
  const text = `Here is your full reading from the Meaning Quiz.

YOUR TYPE: ${r.title}
Meaning you have (presence): ${presence.toFixed(1)}/7
Meaning you are chasing (search): ${search.toFixed(1)}/7

${r.recap}

WHAT YOU ARE PROBABLY STRUGGLING WITH
${r.struggles}

WHAT TO WORK ON
${workText}

If any of this landed too accurately, that is worth paying attention to. A single honest conversation can move more than another year of waiting. If you want to talk it through, book a free call: https://adham.coach/contact

Adham Chalabi
adham.coach

This reading is based on the Meaning in Life Questionnaire (Steger et al., 2006). It is a tool for reflection, not a clinical or diagnostic assessment.`;

  const workHtml = r.work
    .map((w) => `<li style="margin:0 0 10px;">${w}</li>`)
    .join('');
  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f9f6f3;">
<div style="font-family:Georgia,'Times New Roman',serif;line-height:1.6;color:#1a1a1a;padding:32px 16px;">
  <div style="max-width:540px;margin:0 auto;background:#ffffff;border:1px solid rgba(26,26,26,0.08);border-radius:20px;padding:32px 28px;">
    <p style="font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#5470D6;margin:0 0 10px;">Your full reading</p>
    <h1 style="font-weight:600;font-size:30px;margin:0 0 8px;color:#1a1a1a;">${r.title}</h1>
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b6b6b;margin:0 0 20px;">Meaning you have: <b style="color:#1a1a1a;">${presence.toFixed(1)}/7</b> &nbsp;·&nbsp; Meaning you are chasing: <b style="color:#1a1a1a;">${search.toFixed(1)}/7</b></p>
    <p style="font-size:16px;color:#4c4843;margin:0 0 24px;">${r.recap}</p>
    <p style="font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#5470D6;margin:0 0 8px;">What you are probably struggling with</p>
    <p style="font-size:16px;color:#4c4843;margin:0 0 24px;">${r.struggles}</p>
    <p style="font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#5470D6;margin:0 0 8px;">What to work on</p>
    <ul style="font-size:16px;color:#4c4843;margin:0 0 28px;padding-left:20px;">${workHtml}</ul>
    <a href="https://adham.coach/contact" style="display:inline-block;background:#6E8CE8;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:15px;padding:14px 26px;border-radius:99px;">Book a free call &rarr;</a>
    <p style="color:#6b6b6b;margin:28px 0 0;font-size:15px;">Adham Chalabi</p>
    <hr style="border:none;border-top:1px solid #e5e1d8;margin:24px 0 14px;">
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9a9488;line-height:1.5;margin:0;">Based on the Meaning in Life Questionnaire (Steger et al., 2006). A tool for reflection, not a clinical or diagnostic assessment. You received this because you asked for your result at adham.coach.</p>
  </div>
</div>
</body></html>`;
  return { subject, html, text };
}

// Mirror to the Google Sheet via the bound Apps Script web app. Best-effort:
// Supabase is the source of truth, so a Sheet hiccup never loses data.
async function postSheet(payload: Record<string, unknown>) {
  const url = Deno.env.get('SHEETS_WEBHOOK_URL');
  const secret = Deno.env.get('SHEETS_SECRET');
  if (!url || !secret) { console.error('SHEETS_WEBHOOK_URL / SHEETS_SECRET missing'); return; }
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, secret }),
      redirect: 'follow',
    });
  } catch (e) {
    console.error('sheet post failed', e);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return err('POST only', 405);

  let body: {
    action?: string; responseId?: string; email?: string;
    profile?: string; presence?: number; search?: number; answers?: number[];
  };
  try { body = await req.json(); } catch { return err('invalid json'); }

  const action = (body.action ?? 'email').trim();
  const responseId = (body.responseId ?? '').trim();
  const profile = (body.profile ?? '').trim().toUpperCase();
  const presence = Number(body.presence);
  const search = Number(body.search);

  if (!responseId || responseId.length > 64) return err('invalid responseId');
  if (!READINGS[profile]) return err('invalid profile');
  if (!isFinite(presence) || !isFinite(search) || presence < 1 || presence > 7 || search < 1 || search > 7) {
    return err('invalid scores');
  }

  const sb = adminClient();
  const ip = clientIp(req);
  const rlOk = await rateLimit(sb, `quiz:${ip}`, 8, 3600);
  if (!rlOk) return err('too many requests, slow down', 429);

  // ---- action: log (quiz completed, no email yet) ----
  if (action === 'log') {
    const answers = Array.isArray(body.answers) ? body.answers : [];
    if (answers.length !== 10 || answers.some((v) => !isFinite(Number(v)) || v < 1 || v > 7)) {
      return err('invalid answers');
    }
    await sb.from('quiz_responses').upsert(
      { response_id: responseId, profile, presence, search, answers },
      { onConflict: 'response_id', ignoreDuplicates: false },
    ).then((r) => { if (r.error) console.error('quiz_responses upsert failed', r.error); });

    const sheetRow: Record<string, unknown> = {
      action: 'append', responseId, type: READINGS[profile].title, presence, search,
    };
    for (let i = 0; i < 10; i++) sheetRow['a' + (i + 1)] = answers[i];
    await postSheet(sheetRow);
    return json({ ok: true });
  }

  // ---- action: email (associate email + send the reading) ----
  const email = (body.email ?? '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('invalid email');

  const nowIso = new Date().toISOString();
  await sb.from('quiz_responses').upsert(
    { response_id: responseId, profile, presence, search, email, email_at: nowIso },
    { onConflict: 'response_id', ignoreDuplicates: false },
  ).then((r) => { if (r.error) console.error('quiz_responses email upsert failed', r.error); });

  await postSheet({ action: 'setEmail', responseId, email, emailAt: nowIso });

  const { subject, html, text } = buildEmail(READINGS[profile], presence, search);
  const sent = await sendBrevo(email, subject, html, text);
  if ('error' in sent) {
    console.error('quiz email send failed', sent.error);
    return err('could not send email, try again', 502);
  }

  return json({ ok: true });
});
