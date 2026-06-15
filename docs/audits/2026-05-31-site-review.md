# Full Site Review — 2026-05-31

Multi-agent review (6 dimensions, 38 agents) + live runtime testing, every code finding adversarially verified. 26 confirmed, 6 refuted. No critical/high after verification; the list below is medium and low.

## Resolution (as of 2026-05-31)

**Fixed & deployed:** M-5 (double-tap), M-6 (email-action save-failure path), M-7 (TOC links), M-8 (blog filter double-bind), M-9 (defer), M-10 (hero preload), M-11 (reminder atomic claim), M-1 (rate-limit / getClientIp + per-slug/global brute-force backstop), M-2 (reminder auth), M-3 (email-abuse caps), L-1 (quiz responseId charset + email-rebind guard), L-2 (assess-submit key whitelist), L-3 (error-message textContent), L-4 (img-src tightened), L-6 (unsubscribe chrome), L-7 (quote-share listener leak), L-8 (immutable asset caching), L-11 (manifest no-store removed), L-12 (assess lockout-on-reload, via failure-only counting), L-13 (assess incomplete→red), L-14 (subscribe no-regress).

**Intentionally deferred (with rationale):**
- L-3 (DOMPurify on post markdown + removing CSP `unsafe-inline`): post content is author-controlled (only the owner publishes), so not attacker-reachable; removing `unsafe-inline` needs a nonce refactor that risks breaking the site, and adding a sanitizer needs careful rendering verification. The cheap, safe part (textContent for interpolated error strings) is done.
- L-5 (sign/HttpOnly the preview cookie) and the gate bypasses (M-4): the pre-launch gate is intentionally kept cosmetic until launch (owner decision); it is removed entirely at launch.
- L-9 (exclude static assets from the middleware matcher): gate-coupled — excluding them would serve them publicly, partially defeating the gate that is being kept. Revisit at launch. Note the caching win (L-8) was achieved via vercel.json headers without needing this.
- L-10 (minify build step): would add a build pipeline to a site that currently has none; Brotli already compresses these ~80% over the wire. Revisit if parse time becomes an issue.

## Security

### M-1 Rate limits are bypassable (X-Forwarded-For spoofing) — HIGHEST REAL-WORLD STAKES
`_shared/util.ts:46` (and a second inline copy at `quiz-result/index.ts:30`). `getClientIp` trusts the client-supplied `x-forwarded-for` header. Every rate limit keys off it: the **client assessment passcode** brute-force guard (`assess-load:23`), the **coach admin login** (`assess-admin:19`), subscribe, contact, quiz. An attacker sending a fresh random `X-Forwarded-For` per request never trips the limit → unlimited guesses against a client's assessment passcode or your admin passcode.
Fix: take the last (trusted-proxy) XFF hop or prefer `cf-connecting-ip`; AND key the passcode/admin limits on the slug/global identity, not IP, so IP rotation can't help. Patch both copies of getClientIp.

### M-2 `send-reminders` has no authentication
`send-reminders/index.ts:132` — handler ignores the request (`_req`), reads due jobs, sends emails, marks them sent. No shared-secret/cron check; `verify_jwt` unconfirmed and the anon key is public anyway. Anyone who finds the URL can trigger your reminder-email loop (burns Brevo quota, can flush/disorder the queue).
Fix: require an `x-cron-secret` header matched against an env var; commit `supabase/config.toml` pinning `verify_jwt`.

### M-3 Email endpoints can send from your domain to anyone
`quiz-result/index.ts:234` (quiz reading), `subscribe` (welcome), `contact` (replyTo). Recipient is attacker-controlled; the only limit is per-IP (spoofable, see M-1). An attacker can send mail from your verified sending domain to victims of their choice (harassment / phishing-with-your-name) and torch your deliverability reputation.
Fix: per-recipient-email cap (e.g. 1/email/day) in `rate_limits`; consider a signed token before sending to a fresh address.

### M-4 The pre-launch gate is cosmetic (three independent bypasses)
- `middleware.js:169` — `allowed = hasPreviewCookie || url.searchParams.has('t')`. Any `?t=x` opens every gated page. **Verified live: `/home?t=x`, `/services?t=x`, `/quiz?t=x` all return 200.**
- The unlock secret is hardcoded in public JS as `PATHWAY_ADMIN_SECRET='adham2026'` (`app.js`), and `?preview=adham2026` mints the cookie.
- The cookie `preview-mode=yes` is an unsigned static flag set via `document.cookie` — anyone can type it into devtools.
Net: the lockdown provides no real confidentiality. Pre-launch content is reachable now.
Fix: remove `?t=` from the allow expression; make the gate a signed/HMAC cookie set only server-side after matching a high-entropy env secret; or gate sensitive content server-side. At minimum rotate `adham2026`.

### L-1 Client-chosen `responseId` lets a known id be overwritten / email rebound
`quiz-result/index.ts:220,238`. `responseId` is client-controlled and is the upsert conflict key with no ownership binding. Enumeration is infeasible (UUIDv4) but a known id can be overwritten or have a different email bound. Fix: server-generate or HMAC-sign the id; refuse to change an email already set; enforce UUIDv4.

### L-2 `assess-submit` mass-assignment into answers JSONB
`assess-submit/index.ts:20`. Answer KEYS aren't validated against `config.signals`; arbitrary/oversized payloads stored verbatim (DB bloat for that client's own rows; scoring ignores unknown keys). Fix: whitelist keys against config (after the config fetch at line 29), cap key count.

### L-3 CSP `script-src 'unsafe-inline'` + unsanitized markdown innerHTML
`vercel.json:18`; sinks `app.js:1697` (marked.parse → innerHTML, no DOMPurify), `app.js:1075,1712` (e.message into innerHTML). Markdown is repo-controlled today, so this is defense-in-depth — but with `unsafe-inline` any HTML-injection becomes script execution. Fix: drop `unsafe-inline` (nonce/hash), sanitize markdown with DOMPurify, use textContent for error strings.

### L-4 `img-src https:` is a blanket allow
`vercel.json:18`. Any HTTPS origin can load images (widens exfiltration via any injection sink). `frame-ancestors`/`object-src` are correctly `'none'`. Fix: scope img-src to the origins actually used.

### L-5 Preview cookie not HttpOnly / unsigned
`middleware.js:82`, `app.js:64`. Compounds M-4. Fix: signed, HttpOnly, Secure, server-set only.

## Bugs

### M-5 Double-click "See my result" logs two responses (touches the new Sheet logging)
`quiz.js:271`. No re-entry guard: a fast double-tap (likely on mobile, where the quiz is targeted) mints two responseIds and logs twice → two rows in Supabase + the Sheet for one taker, and the email later attaches to the second row, leaving the first orphaned. Fix: only mint+log when no rid exists yet (`if (!localStorage.getItem(RESPONSE_ID_KEY))`), reuse the stored rid otherwise; disable the button on first click.

### M-6 quiz-result returns 200 even when the DB save fails (touches the new Sheet logging)
`quiz-result/index.ts:220` (and the email action at 238). The upsert error is only `console.error`'d; the function returns `{ok:true}`. On a DB failure the client is told "saved" but nothing persisted (Sheet mirror is a partial backstop for the log path). Fix: return 500 on `r.error` so the client can retry.

### M-7 Essay Table-of-Contents links break navigation
`app.js:1465`. TOC entries are built as full-path anchors with no `data-nav`, so clicking one hard-navigates to `/<heading-slug>`, the middleware rewrites to the SPA, the slug isn't a known route, and the user is dumped on the homepage instead of scrolling to the section. Affects essays with 2+ headings. Fix: use `#<id>` hash anchors (or a scroll handler with sticky-nav offset).

### M-8 Blog category filters accumulate click listeners
`app.js:1078`. `renderBlog()` re-binds per-button listeners every call, and the filter handler calls `renderBlog()`, so handlers multiply (~2^n) within a filtering session → compounding redundant re-renders. Fix: single delegated listener on `#blog-filters`, or bind once.

### L-6 Unsubscribe page renders with no nav/footer
`app.js:140`. The unsubscribe takeover writes only `#main-mount`; the comment claims it mounts nav+footer but it doesn't. Users land on a bare, broken-looking confirmation page on a high-stakes screen. Fix: populate nav/footer markup (or route through `navigate()`).

### L-7 `setupQuoteShare` leaks document listeners
`app.js:1521`. Adds `mouseup`/`selectionchange` document listeners on every post render without removing prior ones (the sibling `setupPostProgress` does it correctly). N posts → N listener pairs. Fix: stash + removeEventListener before re-adding.

## Performance

### M-9 `app.js` loaded without `defer`
`app.html:50-52`. The page body is three empty mount divs, so nothing renders until ~115KB of unminified JS downloads, parses, and runs. Fix: add `defer` to all three scripts (order preserved); optionally move to `<head>`.

### M-10 72KB hero SVG is the LCP element, not preloaded
`app.js:371`. `/adham-blob.svg` (72KB) is injected only after app.js runs, and there's no preload. Render-blocking Google Fonts (Fraunces 6 axes + Inter + Mono) compete for the connection. Fix: `<link rel=preload as=image href=/adham-blob.svg>`; trim Fraunces weights; SVGO the blob.

### L-8 Versioned assets have no immutable cache (verified live)
`vercel.json`. `app.js?v=86`, `styles.css?v=42`, etc. serve `Cache-Control: max-age=0, must-revalidate`, so ~220KB of JS+CSS revalidates every visit despite the `?v=N` cache-busting. Fix: add a headers block for `*.(js|css|svg|jpg|png|woff2)` with `public, max-age=31536000, immutable`; keep HTML short-cached.

### L-9 Middleware runs on every static asset (verified live)
`middleware.js:24`. The matcher doesn't exclude `app.js`/`styles.css`/`pathway-*.js`/`posts/*` → an edge invocation + a few ms per asset, and it's the reason L-8's caching is downgraded. Fix: add static-extension exclusion to the matcher (note: this serves those files publicly, fine for CSS/JS; `posts/*.md` are blog content currently gated — decide consciously).

### L-10 `app.js` / `styles.css` shipped unminified
~115KB + ~104KB raw (Brotli helps the wire, but parse/compile cost remains). Fix: add an esbuild/lightningcss minify step.

### L-11 Blog manifest fetched `no-store` every render
`app.js:823`. `manifest.json`/`series.json` fetched with `cache:'no-store'`, forcing a network round trip on every blog/series/post view. Fix: short revalidating cache or version the URL.

## Backend correctness

### M-11 `send-reminders` can double-send (no atomic claim)
`send-reminders/index.ts:136`. Jobs are selected, emailed, then marked sent without a compare-and-swap. Overlapping cron runs both see `sent_at NULL` and both send → duplicate reminder to the subscriber (despite the header comment claiming idempotency). Fix: atomic `UPDATE ... WHERE id=$1 AND sent_at IS NULL RETURNING id`, send only if claimed.

### L-12 `assess-load` rate limit consumes successful loads → lockout
`assess-load/index.ts:22`. The limiter inserts before the passcode check, counting successful loads; a client re-entering the passcode ~8x/10min is locked out though never wrong. Fix: record an attempt only on passcode failure.

### L-13 `assess-submit` partial answers score as "red"
`assess-submit/index.ts:20`. Missing signals default to 0 → `gate='red'` stored permanently; an empty `{}` passes validation. Misrepresents the client in the dashboard. Fix: require every `config.signals[].key` present, reject incomplete.

### L-14 `subscribe` can regress server progress
`subscribe/index.ts:104`. Re-subscribe overwrites `last_completed_step` with the client value, no `Math.max` guard (unlike progress-update). A returning subscriber with cleared localStorage can lose progress. Fix: only advance, mirroring progress-update's no-regress logic.

## Verified healthy
Security headers (CSP, HSTS+preload, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy); Brotli compression on; no secrets leak to the client (only the anon key, which is expected); quiz function rejects no-auth (401); robots.txt blocks indexing pre-launch; the new `/quiz` CTA links correctly escape the SPA router.

## False alarms (refuted by verification — do NOT chase)
backslash `href="\contact"` (doesn't exist); `/quiz` links routing (correct); email-gate null responseId (unreachable + backend rejects); email validation (native + backend cover it); stale `lastResult` after retake (unreachable); logResponse answers desync (unreachable, single-threaded).
