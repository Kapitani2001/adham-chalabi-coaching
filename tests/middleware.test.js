// Regression tests for the edge middleware preview gate.
// Covers: token shape checks (?t / ?unsubscribe / ?fnconfirm), signed HMAC
// preview cookie (forged constant cookie rejected), fail-closed behavior when
// PREVIEW_SECRET is unset, and public /posts/manifest.json.
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

const SECRET = 'test-secret-for-middleware';

let mw; // { default: middleware, looksLikeClaimToken, looksLikeFnConfirmToken, previewCookieValue }
async function loadMiddleware() {
  if (!mw) mw = await import('../middleware.js');
  return mw;
}

function b64url(str) {
  return Buffer.from(str).toString('base64url');
}

// Realistic token shapes (see supabase/functions/_shared/util.ts):
// 32-byte HMAC-SHA256 sig base64url-encodes to 43 chars.
const FAKE_SIG = b64url(Buffer.alloc(32, 7)); // 43 chars
const V2_TOKEN = `v2.${b64url(JSON.stringify({ p: 'c', s: '123e4567-e89b-12d3-a456-426614174000', e: 9999999999 }))}.${FAKE_SIG}`;
const V1_TOKEN = `${b64url('123e4567-e89b-12d3-a456-426614174000')}.${FAKE_SIG}`;
const FN_TOKEN = `fn.${b64url(JSON.stringify({ m: 'a@b.com', p: 'fnc', e: 9999999999 }))}.${FAKE_SIG}`;

function req(url, cookie) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  return new Request(url, { headers });
}

function rewriteTarget(res) {
  return res && res.headers.get('x-middleware-rewrite');
}

beforeEach(() => {
  process.env.PREVIEW_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.PREVIEW_SECRET;
});

// ----- Token shape checks ---------------------------------------------------

test('looksLikeClaimToken accepts real v2/v1 shapes, rejects garbage', async () => {
  const { looksLikeClaimToken } = await loadMiddleware();
  assert.ok(looksLikeClaimToken(V2_TOKEN));
  assert.ok(looksLikeClaimToken(V1_TOKEN));
  assert.ok(!looksLikeClaimToken('anything'));
  assert.ok(!looksLikeClaimToken('1'));
  assert.ok(!looksLikeClaimToken(''));
  assert.ok(!looksLikeClaimToken(null));
  assert.ok(!looksLikeClaimToken('v2.short.sig'));
  assert.ok(!looksLikeClaimToken('a.b'));
  assert.ok(!looksLikeClaimToken(FN_TOKEN)); // fn tokens are not claim tokens (3 parts)
  assert.ok(!looksLikeClaimToken('x'.repeat(5000))); // over max length
});

test('looksLikeFnConfirmToken accepts fn shape only', async () => {
  const { looksLikeFnConfirmToken } = await loadMiddleware();
  assert.ok(looksLikeFnConfirmToken(FN_TOKEN));
  assert.ok(!looksLikeFnConfirmToken(V2_TOKEN));
  assert.ok(!looksLikeFnConfirmToken('fn.x.y'));
  assert.ok(!looksLikeFnConfirmToken('anything'));
});

// ----- Gate: query-param unlocks --------------------------------------------

test('gated route without auth redirects to /', async () => {
  const { default: middleware } = await loadMiddleware();
  const res = await middleware(req('https://adham.coach/app.html'));
  assert.strictEqual(res.status, 302);
  assert.strictEqual(new URL(res.headers.get('location')).pathname, '/');
});

test('?t=<garbage> no longer bypasses the gate', async () => {
  const { default: middleware } = await loadMiddleware();
  const res = await middleware(req('https://adham.coach/post/some-slug?t=anything'));
  assert.strictEqual(res.status, 302);
  assert.strictEqual(new URL(res.headers.get('location')).pathname, '/');
});

test('?t=<valid-shaped token> unlocks a gated SPA route', async () => {
  const { default: middleware } = await loadMiddleware();
  const res = await middleware(req(`https://adham.coach/post/some-slug?t=${V2_TOKEN}`));
  assert.strictEqual(res.status, 200);
  assert.match(rewriteTarget(res), /\/app\.html$/);
});

test('?t=<legacy v1 token> still unlocks (emails in the wild)', async () => {
  const { default: middleware } = await loadMiddleware();
  const res = await middleware(req(`https://adham.coach/post/some-slug?t=${V1_TOKEN}`));
  assert.strictEqual(res.status, 200);
  assert.match(rewriteTarget(res), /\/app\.html$/);
});

test('root /?t=<valid-shaped token> rewrites to the SPA', async () => {
  const { default: middleware } = await loadMiddleware();
  const res = await middleware(req(`https://adham.coach/?t=${V2_TOKEN}`));
  assert.strictEqual(res.status, 200);
  assert.match(rewriteTarget(res), /\/app\.html$/);
});

test('root /?unsubscribe=<valid-shaped token> rewrites to the SPA', async () => {
  const { default: middleware } = await loadMiddleware();
  const res = await middleware(req(`https://adham.coach/?unsubscribe=${V2_TOKEN}`));
  assert.strictEqual(res.status, 200);
  assert.match(rewriteTarget(res), /\/app\.html$/);
});

test('root /?unsubscribe=<garbage> falls through to coming-soon', async () => {
  const { default: middleware } = await loadMiddleware();
  const res = await middleware(req('https://adham.coach/?unsubscribe=lol'));
  assert.strictEqual(res, undefined); // pass through to index.html
});

test('/blog?fnconfirm=<fn token> unlocks the Field Notes confirm flow', async () => {
  const { default: middleware } = await loadMiddleware();
  const res = await middleware(req(`https://adham.coach/blog?fnconfirm=${encodeURIComponent(FN_TOKEN)}`));
  assert.strictEqual(res.status, 200);
  assert.match(rewriteTarget(res), /\/app\.html$/);
});

test('/blog?fnconfirm=<garbage> redirects to /', async () => {
  const { default: middleware } = await loadMiddleware();
  const res = await middleware(req('https://adham.coach/blog?fnconfirm=nope'));
  assert.strictEqual(res.status, 302);
});

test('/posts/manifest.json is publicly served', async () => {
  const { default: middleware } = await loadMiddleware();
  const res = await middleware(req('https://adham.coach/posts/manifest.json'));
  assert.strictEqual(res, undefined); // pass through, no redirect
});

test('other /posts/* assets stay gated', async () => {
  const { default: middleware } = await loadMiddleware();
  const res = await middleware(req('https://adham.coach/posts/some-post.json'));
  assert.strictEqual(res.status, 302);
});

// ----- Signed cookie --------------------------------------------------------

test('forged constant cookie preview-mode=yes is rejected', async () => {
  const { default: middleware } = await loadMiddleware();
  const res = await middleware(req('https://adham.coach/app.html', 'preview-mode=yes'));
  assert.strictEqual(res.status, 302);
  assert.strictEqual(new URL(res.headers.get('location')).pathname, '/');
});

test('grant flow: ?preview=<secret> sets HMAC cookie, cookie then unlocks', async () => {
  const { default: middleware, previewCookieValue } = await loadMiddleware();

  const grant = await middleware(req(`https://adham.coach/?preview=${SECRET}`));
  assert.strictEqual(grant.status, 302);
  const setCookie = grant.headers.get('set-cookie');
  const match = /preview-mode=([0-9a-f]{64})/.exec(setCookie);
  assert.ok(match, `expected 64-hex HMAC cookie, got: ${setCookie}`);
  assert.strictEqual(match[1], await previewCookieValue(SECRET));
  assert.match(setCookie, /HttpOnly/);

  // The granted cookie unlocks the root SPA rewrite...
  const home = await middleware(req('https://adham.coach/', `preview-mode=${match[1]}`));
  assert.strictEqual(home.status, 200);
  assert.match(rewriteTarget(home), /\/app\.html$/);

  // ...and gated routes/assets.
  const gated = await middleware(req('https://adham.coach/about', `preview-mode=${match[1]}`));
  assert.strictEqual(gated.status, 200);
  assert.match(rewriteTarget(gated), /\/app\.html$/);
});

test('wrong ?preview value does not grant', async () => {
  const { default: middleware } = await loadMiddleware();
  const res = await middleware(req('https://adham.coach/?preview=wrong'));
  assert.strictEqual(res, undefined); // coming-soon, no Set-Cookie
});

test('?preview=off clears the cookie', async () => {
  const { default: middleware } = await loadMiddleware();
  const res = await middleware(req('https://adham.coach/?preview=off'));
  assert.strictEqual(res.status, 302);
  assert.match(res.headers.get('set-cookie'), /preview-mode=;.*Max-Age=0/);
});

test('fails closed when PREVIEW_SECRET is unset', async () => {
  const { default: middleware, previewCookieValue } = await loadMiddleware();
  const validCookie = await previewCookieValue(SECRET); // computed while secret known
  delete process.env.PREVIEW_SECRET;

  // Grant attempt does nothing.
  const grant = await middleware(req(`https://adham.coach/?preview=${SECRET}`));
  assert.strictEqual(grant, undefined);

  // Even a previously-valid cookie no longer unlocks anything.
  const res = await middleware(req('https://adham.coach/app.html', `preview-mode=${validCookie}`));
  assert.strictEqual(res.status, 302);
});
