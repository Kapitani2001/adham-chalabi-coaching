// Tests for the public-site edge middleware (post-launch, 2026-09-19).
// The preview gate is gone; middleware only routes:
//   / and SPA routes → /app.html, /quiz → /quiz.html, /tlt → funnel,
//   /assess → assessment app, /alicia → 302, static files pass through.
const { test } = require('node:test');
const assert = require('node:assert');

let mw;
async function loadMiddleware() {
  if (!mw) mw = await import('../middleware.js');
  return mw;
}

function req(url) {
  return new Request(url);
}

function rewriteTarget(res) {
  return res && res.headers.get('x-middleware-rewrite');
}

// ----- Root + SPA routes ----------------------------------------------------

test('/ rewrites to the SPA', async () => {
  const { default: middleware } = await loadMiddleware();
  const res = await middleware(req('https://adham.coach/'));
  assert.strictEqual(res.status, 200);
  assert.match(rewriteTarget(res), /\/app\.html$/);
});

test('/index.html (retired coming-soon) rewrites to the SPA', async () => {
  const { default: middleware } = await loadMiddleware();
  const res = await middleware(req('https://adham.coach/index.html'));
  assert.strictEqual(res.status, 200);
  assert.match(rewriteTarget(res), /\/app\.html$/);
});

test('SPA routes rewrite to /app.html', async () => {
  const { default: middleware } = await loadMiddleware();
  for (const path of ['/about', '/services', '/blog', '/post/some-slug', '/blog/series/Some%20Series']) {
    const res = await middleware(req(`https://adham.coach${path}`));
    assert.strictEqual(res.status, 200, `${path} should rewrite`);
    assert.match(rewriteTarget(res), /\/app\.html$/, `${path} should target app.html`);
  }
});

test('legacy email query params on SPA routes rewrite harmlessly to /app.html', async () => {
  const { default: middleware } = await loadMiddleware();
  for (const url of [
    'https://adham.coach/post/some-slug?t=anything',
    'https://adham.coach/?unsubscribe=whatever',
    'https://adham.coach/blog?fnconfirm=whatever',
  ]) {
    const res = await middleware(req(url));
    assert.strictEqual(res.status, 200, `${url} should rewrite`);
    assert.match(rewriteTarget(res), /\/app\.html$/);
  }
});

// ----- Static files ---------------------------------------------------------

test('real static files pass through', async () => {
  const { default: middleware } = await loadMiddleware();
  for (const path of ['/styles.css', '/app.js', '/posts/manifest.json', '/posts/some-post.json', '/adham-blob.svg', '/privacy.html']) {
    const res = await middleware(req(`https://adham.coach${path}`));
    assert.strictEqual(res, undefined, `${path} should pass through`);
  }
});

// ----- Quiz -----------------------------------------------------------------

test('/quiz and /quiz/ rewrite to quiz.html', async () => {
  const { default: middleware } = await loadMiddleware();
  for (const path of ['/quiz', '/quiz/']) {
    const res = await middleware(req(`https://adham.coach${path}`));
    assert.strictEqual(res.status, 200);
    assert.match(rewriteTarget(res), /\/quiz\.html$/);
  }
});

// ----- TLT funnel -----------------------------------------------------------

test('/tlt variants rewrite to the funnel index (case-insensitive)', async () => {
  const { default: middleware } = await loadMiddleware();
  for (const path of ['/tlt', '/tlt/', '/TLT', '/TLT/']) {
    const res = await middleware(req(`https://adham.coach${path}`));
    assert.strictEqual(res.status, 200, `${path} should rewrite`);
    assert.match(rewriteTarget(res), /\/tlt\/index\.html$/);
  }
});

test('/tlt/ lowercase assets pass through; odd casing is normalized', async () => {
  const { default: middleware } = await loadMiddleware();

  const lower = await middleware(req('https://adham.coach/tlt/styles.css'));
  assert.strictEqual(lower, undefined);

  const mixed = await middleware(req('https://adham.coach/TLT/Styles.CSS?x=1'));
  assert.strictEqual(mixed.status, 200);
  assert.match(rewriteTarget(mixed), /\/tlt\/styles\.css\?x=1$/);
});

// ----- Assessments ----------------------------------------------------------

test('/alicia redirects 302 to /assess/alicia', async () => {
  const { default: middleware } = await loadMiddleware();
  for (const path of ['/alicia', '/alicia/', '/alicia/anything']) {
    const res = await middleware(req(`https://adham.coach${path}`));
    assert.strictEqual(res.status, 302, `${path} should redirect`);
    assert.strictEqual(new URL(res.headers.get('location')).pathname, '/assess/alicia');
  }
});

test('/assess/coach rewrites to the coach dashboard', async () => {
  const { default: middleware } = await loadMiddleware();
  for (const path of ['/assess/coach', '/assess/coach/']) {
    const res = await middleware(req(`https://adham.coach${path}`));
    assert.strictEqual(res.status, 200);
    assert.match(rewriteTarget(res), /\/assess\/coach\/index\.html$/);
  }
});

test('/assess and /assess/<slug> rewrite to the assessment app', async () => {
  const { default: middleware } = await loadMiddleware();
  for (const path of ['/assess', '/assess/', '/assess/some-client']) {
    const res = await middleware(req(`https://adham.coach${path}`));
    assert.strictEqual(res.status, 200, `${path} should rewrite`);
    assert.match(rewriteTarget(res), /\/assess\/index\.html$/);
  }
});

test('/assess/* static assets pass through (case-normalized)', async () => {
  const { default: middleware } = await loadMiddleware();

  const lower = await middleware(req('https://adham.coach/assess/app.js'));
  assert.strictEqual(lower, undefined);

  const mixed = await middleware(req('https://adham.coach/Assess/App.JS'));
  assert.strictEqual(mixed.status, 200);
  assert.match(rewriteTarget(mixed), /\/assess\/app\.js$/);
});
