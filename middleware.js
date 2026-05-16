// Vercel Edge Middleware — pre-launch lockdown.
//
// /                           always serves coming-soon (index.html)
// /app.html, /posts/*, /pathway-*.js, etc.
//                             require preview-mode cookie OR a `?t=` claim
//                             token (from a reminder-email link)
// /?preview=<PREVIEW_SECRET>  sets the cookie and redirects to /app.html
//                             (preserving the hash via the JS redirect in
//                             index.html — middleware can't read the URL hash)
//
// Public exceptions (no auth needed): the coming-soon page itself, its assets,
// /robots.txt, /favicon.ico, /_vercel/* (Analytics + insights script).

export const config = {
  // Match every path except the always-public ones. Asset extensions in the
  // matcher are intentional — we want to gate /styles.css and /app.js too,
  // since they describe the full-site UI.
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

export default function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Root path: handle `?preview=<secret>`, `?preview=off`, or cookie-based
  // shortcut to the real site.
  if (path === '/' || path === '/index.html') {
    const previewParam = url.searchParams.get('preview');
    const secret =
      (typeof process !== 'undefined' && process.env && process.env.PREVIEW_SECRET) || '';

    // Grant: ?preview=<secret> → set cookie, redirect to /app.html
    if (previewParam && secret && previewParam === secret) {
      const target = new URL('/app.html', request.url);
      url.searchParams.delete('preview');
      for (const [k, v] of url.searchParams) target.searchParams.set(k, v);
      const response = new Response(null, { status: 302, headers: { Location: target.toString() } });
      response.headers.append(
        'Set-Cookie',
        'preview-mode=yes; Path=/; Max-Age=31536000; SameSite=Lax; Secure',
      );
      return response;
    }

    // Revoke: ?preview=off → clear cookie, serve coming-soon
    if (previewParam === 'off') {
      const target = new URL('/', request.url);
      const response = new Response(null, { status: 302, headers: { Location: target.toString() } });
      response.headers.append('Set-Cookie', 'preview-mode=; Path=/; Max-Age=0; SameSite=Lax; Secure');
      return response;
    }

    // Shortcut: if the owner has the cookie, jump straight to the full site
    if (hasPreviewCookie(request)) {
      const target = new URL('/app.html', request.url);
      for (const [k, v] of url.searchParams) target.searchParams.set(k, v);
      return new Response(null, { status: 302, headers: { Location: target.toString() } });
    }

    // Reminder-email hot link: `/?t=<token>` came from an older email. Forward
    // to /app.html so the claim flow can run.
    if (url.searchParams.has('t')) {
      const target = new URL('/app.html', request.url);
      for (const [k, v] of url.searchParams) target.searchParams.set(k, v);
      return new Response(null, { status: 302, headers: { Location: target.toString() } });
    }

    return; // pass through to coming-soon
  }

  // Other always-public files (assets needed by coming-soon)
  if (ALWAYS_PUBLIC_PATHS.has(path) || ALWAYS_PUBLIC_FILES.has(path)) {
    return;
  }

  // Preview cookie unlocks everything
  if (hasPreviewCookie(request)) {
    return; // pass through
  }

  // A `?t=<token>` query param is a hot link from a reminder email. Let it
  // through — the token will be validated by /claim-by-token before any
  // sensitive content is shown.
  if (url.searchParams.has('t')) {
    return; // pass through
  }

  // Otherwise, redirect to the coming-soon page
  const home = new URL('/', request.url);
  return Response.redirect(home, 302);
}
