// Vercel Edge Middleware — pre-launch lockdown + SPA-route rewrite.
//
// ── Gate design (security-hardened) ─────────────────────────────────────────
// 1. Preview cookie is SIGNED, not a constant: the cookie value is
//    hex(HMAC-SHA256(key = PREVIEW_SECRET, msg = "preview-v1")). A visitor
//    cannot forge it without knowing PREVIEW_SECRET. The cookie is granted
//    only by this middleware via /?preview=<PREVIEW_SECRET>. If PREVIEW_SECRET
//    is unset the gate FAILS CLOSED (no cookie is ever valid, no grant occurs).
// 2. Email-link query params (?t=, ?unsubscribe=, ?fnconfirm=) only unlock a
//    page when the token value matches the SHAPE of a real signed token
//    (see regexes below). Cryptographic verification still happens downstream
//    in the Supabase edge functions; the shape check just stops ?t=anything
//    from bypassing the gate.
// 3. OPERATIONAL NOTE: PREVIEW_SECRET must be ROTATED in the Vercel env —
//    the old 2026 value shipped in client JS and is burned.
//
// Public (no auth):
//   /                          → coming-soon (index.html)
//   /privacy.html, /terms.html → legal pages
//   /robots.txt, /sitemap.xml, /favicon.ico → site metadata
//   /adham-blob*.svg, /adham-clean.jpg → coming-soon assets
//   /posts/manifest.json       → post metadata (needed by send-reminders cron)
//   /tlt (+ /tlt/* assets)     → TLT session funnel (case-insensitive)
//   /_vercel/*                 → Vercel Analytics + insights
//
// Behind preview gate:
//   /app.html                  → the SPA shell
//   /post/<slug>, /blog/series/<name>, /about, /services, /resources, etc.
//                              → rewritten to /app.html so the SPA can render
//                                from location.pathname
//   /styles.css, /app.js, /pathway-*.js, /posts/*  → static assets the SPA needs
//
// Auth signals (any one unlocks):
//   - preview-mode=<HMAC> cookie (set by /?preview=<PREVIEW_SECRET>)
//   - ?t=<token> query param     (reminder-email hot link; shape-checked here,
//                                 cryptographically verified downstream by
//                                 /claim-by-token before any data exposed)
//   - ?unsubscribe=<token>       (root only — email opt-out link, shape-checked)
//   - ?fnconfirm=<token>         (Field Notes confirm link, shape-checked)
//   - ?preview=<PREVIEW_SECRET>  (grant — sets HMAC cookie, redirects)

export const config = {
  matcher: [
    '/((?!_vercel|_next|coming-soon|adham-blob|adham-blob-blue|adham-clean|favicon|robots\\.txt|sitemap\\.xml|middleware|privacy\\.html|terms\\.html|posts/manifest\\.json).*)',
  ],
};

const ALWAYS_PUBLIC_PATHS = new Set([
  '/',
  '/index.html',
  '/robots.txt',
  '/sitemap.xml',
  '/favicon.ico',
  '/privacy.html',
  '/terms.html',
  '/posts/manifest.json',
]);

const ALWAYS_PUBLIC_FILES = new Set([
  '/adham-blob.svg',
  '/adham-blob-blue.svg',
  '/adham-clean.jpg',
]);

// ----- Token shape checks (format only — crypto verification is downstream) --
//
// Real token formats (see supabase/functions/_shared/util.ts and
// supabase/functions/field-notes/index.ts):
//   v2 claim/unsubscribe: `v2.<b64url(JSON payload)>.<b64url(HMAC-SHA256 sig)>`
//   v1 legacy claim:      `<b64url(subscriberId)>.<b64url(HMAC-SHA256 sig)>`
//     (NOTE: the v1 signature is base64url, NOT hex — verifyToken b64url-decodes it)
//   field-notes confirm:  `fn.<b64url(JSON payload)>.<b64url(HMAC-SHA256 sig)>`
// A 32-byte HMAC-SHA256 signature base64url-encodes to exactly 43 chars, so
// the sig segment requires {40,}. Payload segments are ≥16 chars in practice.

const V2_TOKEN_RE = /^v2\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{40,}$/;
const V1_TOKEN_RE = /^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{40,}$/;
const FN_TOKEN_RE = /^fn\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{40,}$/;
const MAX_TOKEN_LENGTH = 2048;

export function looksLikeClaimToken(t) {
  if (typeof t !== 'string' || !t || t.length > MAX_TOKEN_LENGTH) return false;
  return V2_TOKEN_RE.test(t) || V1_TOKEN_RE.test(t);
}

export function looksLikeFnConfirmToken(t) {
  if (typeof t !== 'string' || !t || t.length > MAX_TOKEN_LENGTH) return false;
  return FN_TOKEN_RE.test(t);
}

// ----- Signed preview cookie ------------------------------------------------

function getPreviewSecret() {
  return (typeof process !== 'undefined' && process.env && process.env.PREVIEW_SECRET) || '';
}

// Cache per isolate — the secret cannot change within a deployment.
let cachedCookieValue = null;
let cachedCookieSecret = null;

export async function previewCookieValue(secret) {
  if (!secret) throw new Error('PREVIEW_SECRET missing');
  if (cachedCookieValue && cachedCookieSecret === secret) return cachedCookieValue;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode('preview-v1')));
  let hex = '';
  for (const b of sig) hex += b.toString(16).padStart(2, '0');
  cachedCookieValue = hex;
  cachedCookieSecret = secret;
  return hex;
}

export async function hasPreviewCookie(req) {
  const secret = getPreviewSecret();
  if (!secret) return false; // fail closed: no secret → no valid cookie exists
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(/(?:^|;\s*)preview-mode=([^;\s]+)/);
  if (!m) return false;
  return m[1] === await previewCookieValue(secret);
}

function isStaticAsset(path) {
  // Any path ending in a 1–5 char extension is a real file; serve as-is.
  return /\.[a-z0-9]{1,5}$/i.test(path);
}

function rewriteToAppHtml(request) {
  // Vercel Edge Middleware rewrite via the x-middleware-rewrite header.
  // The browser URL stays as the original SPA path; the server serves
  // /app.html so the SPA can boot and read location.pathname.
  const target = new URL('/app.html', request.url);
  const response = new Response(null, { status: 200 });
  response.headers.set('x-middleware-rewrite', target.toString());
  return response;
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Root path: preview grant / revoke / cookie shortcut / coming-soon
  if (path === '/' || path === '/index.html') {
    const previewParam = url.searchParams.get('preview');
    const secret = getPreviewSecret();

    if (previewParam && secret && previewParam === secret) {
      const target = new URL('/', request.url);
      url.searchParams.delete('preview');
      for (const [k, v] of url.searchParams) target.searchParams.set(k, v);
      const response = new Response(null, { status: 302, headers: { Location: target.toString() } });
      const cookieValue = await previewCookieValue(secret);
      response.headers.append(
        'Set-Cookie',
        `preview-mode=${cookieValue}; Path=/; Max-Age=31536000; SameSite=Lax; Secure; HttpOnly`,
      );
      return response;
    }

    if (previewParam === 'off') {
      const target = new URL('/', request.url);
      const response = new Response(null, { status: 302, headers: { Location: target.toString() } });
      response.headers.append(
        'Set-Cookie',
        'preview-mode=; Path=/; Max-Age=0; SameSite=Lax; Secure; HttpOnly',
      );
      return response;
    }

    // Cookie shortcut: if the owner has the (signed) cookie, render the SPA
    // home view instead of the coming-soon page. Rewrite (not redirect) so the
    // URL stays as adham.coach/ — cleaner than /home.
    if (await hasPreviewCookie(request)) {
      return rewriteToAppHtml(request);
    }

    // Reminder-email hot link: forward to the SPA so the claim flow runs.
    // Only for values shaped like a real signed token — `?t=anything` no
    // longer opens the gate.
    if (looksLikeClaimToken(url.searchParams.get('t'))) {
      return rewriteToAppHtml(request);
    }

    // Email unsubscribe link (`/?unsubscribe=<token>`): forward to the SPA so
    // app.js can call the unsubscribe edge function and render confirmation.
    if (looksLikeClaimToken(url.searchParams.get('unsubscribe'))) {
      return rewriteToAppHtml(request);
    }

    return; // pass through to coming-soon (index.html)
  }

  // TLT session funnel — fully public, no auth, case-insensitive.
  // The funnel lives in the lowercase /tlt/ folder with absolute asset paths,
  // so it works whether the visitor types /tlt, /TLT, with or without a slash.
  const lowerPath = path.toLowerCase();
  if (lowerPath === '/tlt' || lowerPath === '/tlt/') {
    const target = new URL('/tlt/index.html', request.url);
    const response = new Response(null, { status: 200 });
    response.headers.set('x-middleware-rewrite', target.toString());
    return response;
  }
  if (lowerPath.startsWith('/tlt/')) {
    // The funnel's own assets (styles.css, image). Normalize any odd casing
    // to the real lowercase file, then serve it directly.
    if (path !== lowerPath) {
      const target = new URL(lowerPath + url.search, request.url);
      const response = new Response(null, { status: 200 });
      response.headers.set('x-middleware-rewrite', target.toString());
      return response;
    }
    return;
  }

  // Legacy redirect: /alicia moved to the secure, passcode-gated /assess/alicia.
  if (lowerPath === '/alicia' || lowerPath === '/alicia/' || lowerPath.startsWith('/alicia/')) {
    return Response.redirect(new URL('/assess/alicia', request.url), 302);
  }

  // Coach dashboard (admin) — its own page, must be checked before the generic
  // /assess/<slug> rule so "coach" is not treated as a client slug.
  if (lowerPath === '/assess/coach' || lowerPath === '/assess/coach/') {
    const target = new URL('/assess/coach/index.html', request.url);
    const response = new Response(null, { status: 200 });
    response.headers.set('x-middleware-rewrite', target.toString());
    return response;
  }

  // Per-client assessments — public, passcode-gated app. Any /assess/<slug> serves
  // the single assessment page, which reads the slug from the path and gates on a
  // server-verified passcode (Supabase edge functions). Real files pass through.
  if (lowerPath === '/assess' || lowerPath === '/assess/') {
    const target = new URL('/assess/index.html', request.url);
    const response = new Response(null, { status: 200 });
    response.headers.set('x-middleware-rewrite', target.toString());
    return response;
  }
  if (lowerPath.startsWith('/assess/')) {
    if (isStaticAsset(path)) {
      // Normalize any odd casing to the real lowercase file (same treatment
      // as /tlt/* assets above), then serve it directly.
      if (path !== lowerPath) {
        const target = new URL(lowerPath + url.search, request.url);
        const response = new Response(null, { status: 200 });
        response.headers.set('x-middleware-rewrite', target.toString());
        return response;
      }
      return;
    }
    const target = new URL('/assess/index.html', request.url);
    const response = new Response(null, { status: 200 });
    response.headers.set('x-middleware-rewrite', target.toString());
    return response;
  }

  // Always-public files (assets needed by coming-soon, legal pages, etc.)
  if (ALWAYS_PUBLIC_PATHS.has(path) || ALWAYS_PUBLIC_FILES.has(path)) {
    return;
  }

  // From here on we require auth. Query-param unlocks are shape-checked;
  // the actual cryptographic verification happens in the edge functions the
  // SPA calls with the token.
  const allowed =
    (await hasPreviewCookie(request)) ||
    looksLikeClaimToken(url.searchParams.get('t')) ||
    looksLikeFnConfirmToken(url.searchParams.get('fnconfirm'));
  if (!allowed) {
    return Response.redirect(new URL('/', request.url), 302);
  }

  // Allowed. If it's a real static file, serve it. If it's a SPA route
  // (anything without a file extension), rewrite to /app.html.
  if (isStaticAsset(path)) {
    return; // pass through
  }
  // The Meaning Quiz is its own standalone page (its own immersive design,
  // not the SPA shell), served at /quiz.
  if (path === '/quiz' || path === '/quiz/') {
    const target = new URL('/quiz.html', request.url);
    const response = new Response(null, { status: 200 });
    response.headers.set('x-middleware-rewrite', target.toString());
    return response;
  }
  return rewriteToAppHtml(request);
}
