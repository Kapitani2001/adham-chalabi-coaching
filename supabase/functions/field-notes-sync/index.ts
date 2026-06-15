// POST /field-notes-sync
// Pulls sent "[Field Note NNN] ..." campaigns from the shared Brevo account
// into public.field_notes. Identified ONLY by the "[Field Note NNN]" name
// prefix (Brevo's API exposes no folders, and the account is shared across
// several brands, so the name convention is the only safe signal).
// Triggered by pg_cron (carries x-cron-secret); the anon key alone can't run it.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const FN_RE = /^\s*\[\s*field\s*note\s*(\d+)\s*\]\s*(.*)$/i;

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

Deno.serve(async (req: Request) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }
  const apiKey = Deno.env.get('BREVO_API_KEY');
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!apiKey || !url || !key) {
    return new Response(JSON.stringify({ error: 'env missing' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  // 1. Find Field Note campaigns by name prefix (cheap: skip HTML).
  const found: { id: number; number: number; title: string; subject: string; preview: string | null; sentDate: string | null }[] = [];
  for (let offset = 0; offset < 1000; offset += 100) {
    const res = await fetch(
      `https://api.brevo.com/v3/emailCampaigns?limit=100&offset=${offset}&excludeHtmlContent=true`,
      { headers: { 'api-key': apiKey, accept: 'application/json' } },
    );
    if (!res.ok) break;
    const j = await res.json();
    const list = j.campaigns ?? [];
    for (const c of list) {
      const m = FN_RE.exec(String(c.name ?? ''));
      // Only published issues (sent, or currently sending) belong in the archive.
      if (m && (c.status === 'sent' || c.status === 'in_process')) {
        found.push({
          id: c.id,
          number: parseInt(m[1], 10),
          title: (m[2] || '').trim() || String(c.subject ?? ''),
          subject: String(c.subject ?? ''),
          preview: c.previewText ? String(c.previewText) : null,
          sentDate: c.sentDate ?? null,
        });
      }
    }
    if (list.length < 100) break;
  }

  // 2. Fetch each matched campaign's HTML and upsert.
  let synced = 0;
  for (const f of found) {
    const cr = await fetch(`https://api.brevo.com/v3/emailCampaigns/${f.id}`, {
      headers: { 'api-key': apiKey, accept: 'application/json' },
    });
    if (!cr.ok) { console.error('campaign fetch failed', f.id, cr.status); continue; }
    const cj = await cr.json();
    const html = typeof cj.htmlContent === 'string' ? cj.htmlContent : '';
    const slug = `${String(f.number).padStart(3, '0')}-${slugify(f.title)}`;
    const { error } = await sb.from('field_notes').upsert({
      brevo_campaign_id: f.id,
      number: f.number,
      title: f.title,
      subject: f.subject,
      slug,
      preview: f.preview,
      html,
      sent_at: f.sentDate,
      synced_at: new Date().toISOString(),
    }, { onConflict: 'brevo_campaign_id' });
    if (error) console.error('upsert failed', f.id, error);
    else synced++;
  }

  return new Response(JSON.stringify({ found: found.length, synced }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
