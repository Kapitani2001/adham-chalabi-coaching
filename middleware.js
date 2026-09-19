// Vercel Edge Middleware — public site + SPA-route rewrite.
//
// LAUNCHED 2026-09-19: the pre-launch preview gate is gone. The whole site is
// public. This middleware now only does routing:
//
//   /                          → SPA (app.html) — coming-soon page retired
//   /post/<slug>, /blog/series/<name>, /about, /services, /resources, etc.
//                              → rewritten to /app.html so the SPA can render
//                                from location.pathname
//   /quiz                      → quiz.html (standalone page, not the SPA shell)
//   /tlt (+ /tlt/* assets)     → TLT session funnel (case-insensitive)
//   /assess/<slug>             → assessment app (passcode-gated server-side)
//   /assess/coach              → coach dashboard
//   /alicia                    → 302 to /assess/alicia (legacy link)
//   real files (extension)     → pass through as-is
//
// Email links (?t=, ?unsubscribe=, ?fnconfirm=) need no special-casing anymore:
// every SPA route rewrites to app.html and the tokens are cryptographically
// verified downstream by the Supabase edge functions before any data moves.

export const config = {
  matcher: [
    '/((?!_vercel|_next|favicon|robots\\.txt|sitemap\\.xml|middleware).*)',
  ],
};

function isStaticAsset(path) {
  // Any path ending in a 1–5 char extension is a real file; serve as-is.
  return /\.[a-z0-9]{1,5}$/i.test(path);
}

function rewriteTo(request, pathname) {
  // Vercel Edge Middleware rewrite via the x-middleware-rewrite header.
  // The browser URL stays as the original path; the server serves `pathname`.
  const target = new URL(pathname, request.url);
  const response = new Response(null, { status: 200 });
  response.headers.set('x-middleware-rewrite', target.toString());
  return response;
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const lowerPath = path.toLowerCase();

  // Root (and the retired coming-soon /index.html) → the SPA.
  if (path === '/' || path === '/index.html') {
    return rewriteTo(request, '/app.html');
  }

  // TLT session funnel — case-insensitive.
  // The funnel lives in the lowercase /tlt/ folder with absolute asset paths,
  // so it works whether the visitor types /tlt, /TLT, with or without a slash.
  if (lowerPath === '/tlt' || lowerPath === '/tlt/') {
    return rewriteTo(request, '/tlt/index.html');
  }
  if (lowerPath.startsWith('/tlt/')) {
    // The funnel's own assets (styles.css, image). Normalize any odd casing
    // to the real lowercase file, then serve it directly.
    if (path !== lowerPath) {
      return rewriteTo(request, lowerPath + url.search);
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
    return rewriteTo(request, '/assess/coach/index.html');
  }

  // Per-client assessments — passcode-gated app (server-verified via Supabase
  // edge functions). Any /assess/<slug> serves the single assessment page,
  // which reads the slug from the path. Real files pass through.
  if (lowerPath === '/assess' || lowerPath === '/assess/') {
    return rewriteTo(request, '/assess/index.html');
  }
  if (lowerPath.startsWith('/assess/')) {
    if (isStaticAsset(path)) {
      if (path !== lowerPath) {
        return rewriteTo(request, lowerPath + url.search);
      }
      return;
    }
    return rewriteTo(request, '/assess/index.html');
  }

  // Real static files pass through.
  if (isStaticAsset(path)) {
    return;
  }

  // The Meaning Quiz is its own standalone page (its own immersive design,
  // not the SPA shell), served at /quiz.
  if (path === '/quiz' || path === '/quiz/') {
    return rewriteTo(request, '/quiz.html');
  }

  // Everything else without a file extension is a SPA route.
  return rewriteTo(request, '/app.html');
}
