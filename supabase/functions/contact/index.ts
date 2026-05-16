// POST /contact
// Body: { name, email, message }
// Forwards the note to adham@adham.coach via Brevo transactional API.
// Replies set reply-to = the sender's email so Adham can answer in one click.

import {
  adminClient,
  corsPreflight,
  errorResponse,
  jsonResponse,
  getClientIp,
  rateLimitCheck,
} from '../_shared/util.ts';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface Body { name?: string; email?: string; message?: string; }

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

Deno.serve(async (req: Request) => {
  const pre = corsPreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return errorResponse('POST only', 405);

  let body: Body;
  try { body = await req.json(); } catch { return errorResponse('invalid json', 400); }

  const name = (body.name ?? '').trim();
  const email = (body.email ?? '').trim().toLowerCase();
  const message = (body.message ?? '').trim();

  if (!name) return errorResponse('name required', 400);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return errorResponse('valid email required', 400);
  if (!message) return errorResponse('message required', 400);
  if (name.length > 200) return errorResponse('name too long', 400);
  if (message.length > 5000) return errorResponse('message too long', 400);

  // Rate limit: max 3 contact messages per hour per IP. Same address can still
  // send up to 3 in case the first send fails or the user wants to follow up.
  const ip = getClientIp(req);
  const rl = await rateLimitCheck(adminClient(), `contact:${ip}`, 3, 3600);
  if (!rl.allowed) {
    return errorResponse('too many messages, try again in an hour', 429);
  }

  const apiKey = Deno.env.get('BREVO_API_KEY');
  if (!apiKey) {
    console.error('BREVO_API_KEY missing');
    return errorResponse('email service not configured', 500);
  }
  const inbox = Deno.env.get('CONTACT_INBOX_EMAIL') || 'adham@adham.coach';
  const inboxName = Deno.env.get('CONTACT_INBOX_NAME') || 'Adham Chalabi';
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || 'adham@adham.coach';

  const subject = `New note via adham.coach — ${name}`;
  const text = `From: ${name} <${email}>

${message}

---
Sent via the contact form at https://adham.coach
`;
  const html = `<div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #2a2620; line-height: 1.55;">
  <p style="font-family: 'Inter', sans-serif; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #9a8f7a; margin: 0 0 8px;">Contact form</p>
  <p style="font-size: 16px; margin: 0 0 8px;"><strong>${escapeHtml(name)}</strong> &lt;<a href="mailto:${escapeHtml(email)}" style="color: #c9a96b;">${escapeHtml(email)}</a>&gt;</p>
  <hr style="border: none; border-top: 1px solid #e5e1d8; margin: 16px 0;">
  <div style="white-space: pre-wrap; font-size: 15px;">${escapeHtml(message)}</div>
  <hr style="border: none; border-top: 1px solid #e5e1d8; margin: 24px 0 12px;">
  <p style="font-family: 'Inter', sans-serif; font-size: 11px; color: #9a8f7a; margin: 0;">Sent via the contact form at <a href="https://adham.coach" style="color: #9a8f7a;">adham.coach</a>. Hit reply to respond directly.</p>
</div>`;

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: 'Adham Chalabi Coaching' },
      to: [{ email: inbox, name: inboxName }],
      replyTo: { email, name },
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('brevo contact send failed', res.status, errText.slice(0, 500));
    return errorResponse('could not send', 502);
  }

  return jsonResponse({ ok: true });
});
