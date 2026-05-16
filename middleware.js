// Vercel Edge Middleware — pre-launch lockdown + SPA-route rewrite.
//
// Public (no auth):
//   /                          → coming-soon (index.html)
//   /privacy.html, /terms.html → legal pages
//   /robots.txt, /favicon.ico  → site metadata
//   /adham-blob*.svg, /adham-clean.jpg → coming-soon assets
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
//   - preview-mode=yes cookie  (set by /?preview=<PREVIEW_SECRET>)
//   - ?t=<token> query param   (reminder-email hot link, validated downstream
//                                by /claim-by-token before any data exposed)
//   - ?preview=<PREVIEW_SECRET> (grant — sets cookie, redirects to /app.html)

export const config = {
  matcher: [
    '/((?!_vercel|_next|coming-soon|adham-blob|adham-blob-blue|adham-clean|favicon|robots\\.txt|middleware|privacy\\.html|terms\\.html).*)',
  ],
};

const ALWAYS_PUBLIC_PATHS = new Set([
  '/',
  '/index.html',
  '/robots.txt',
  '/favicon.ico',
  '/privacy.html',
  '/terms.html',
]);

const ALWAYS_PUBLIC_FILES = new Set([
  '/adham-blob.svg',
  '/adham-blob-blue.svg',
  '/adham-clean.jpg',
]);

function hasPreviewCookie(req) {
  const cookie = req.headers.get('cookie') || '';
  return /(?:^|;\s*)preview-mode=yes(?:;|$)/.test(cookie);
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

export default function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Root path: preview grant / revoke / cookie shortcut / coming-soon
  if (path === '/' || path === '/index.html') {
    const previewParam = url.searchParams.get('preview');
    const secret =
      (typeof process !== 'undefined' && process.env && process.env.PREVIEW_SECRET) || '';

    if (previewParam && secret && previewParam === secret) {
      const target = new URL('/', request.url);
      url.searchParams.delete('preview');
      for (const [k, v] of url.searchParams) target.searchParams.set(k, v);
      const response = new Response(null, { status: 302, headers: { Location: target.toString() } });
      response.headers.append(
        'Set-Cookie',
        'preview-mode=yes; Path=/; Max-Age=31536000; SameSite=Lax; Secure',
      );
      return response;
    }

    if (previewParam === 'off') {
      const target = new URL('/', request.url);
      const response = new Response(null, { status: 302, headers: { Location: target.toString() } });
      response.headers.append('Set-Cookie', 'preview-mode=; Path=/; Max-Age=0; SameSite=Lax; Secure');
      return response;
    }

    // Cookie shortcut: if the owner has the cookie, render the SPA home view
    // instead of the coming-soon page. Rewrite (not redirect) so the URL
    // stays as adham.coach/ — cleaner than /home.
    if (hasPreviewCookie(request)) {
      return rewriteToAppHtml(request);
    }

    // Reminder-email hot link: forward to the SPA so the claim flow runs.
    if (url.searchParams.has('t')) {
      return rewriteToAppHtml(request);
    }

    return; // pass through to coming-soon (index.html)
  }

  // Always-public files (assets needed by coming-soon, legal pages, etc.)
  if (ALWAYS_PUBLIC_PATHS.has(path) || ALWAYS_PUBLIC_FILES.has(path)) {
    return;
  }

  // From here on we require auth.
  const allowed = hasPreviewCookie(request) || url.searchParams.has('t');
  if (!allowed) {
    return Response.redirect(new URL('/', request.url), 302);
  }

  // Allowed. If it's a real static file, serve it. If it's a SPA route
  // (anything without a file extension), rewrite to /app.html.
  if (isStaticAsset(path)) {
    return; // pass through
  }
  return rewriteToAppHtml(request);
}
