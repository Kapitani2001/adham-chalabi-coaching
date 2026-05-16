# Full Audit — Adham Chalabi Coaching

**Date:** 2026-05-16
**Auditor:** general-purpose agent (Claude)
**Scope:** entire codebase + live deployment at adham.coach
**Focus areas:** what's left to ship, responsiveness, speed, security, SEO + a11y

## TL;DR

- **18 of 21 essays are placeholders** (5 Begin Here drafts + 7 grieving placeholders + 6 standalone field notes still in draft).
- **Contact form is dead** — `<form onsubmit="event.preventDefault()">` with no submit handler in `app.js:2019`.
- **Performance disaster on `adham-blob.svg` / `adham-blob-blue.svg`** — each is ~2 MB because they embed base64 PNG inside SVG. Referenced on virtually every page.
- **Phase 2 backend is solid.** Subscribe / progress / claim / unsubscribe / send-reminders are well-shaped. The meaningful gap is `subscribe` has zero rate-limiting or CAPTCHA.
- **SEO is intentionally turned off** (`Disallow: /` + `noindex` on coming-soon) and that's correct for pre-launch, but `app.html` is publicly reachable today via GitHub Pages mirror and via `adham.coach/app.html` directly. No `sitemap.xml`, no per-page meta descriptions.

---

## 1. What's left to ship (content + features)

| Item | Severity | Effort |
|---|---|---|
| Contact form has no submit handler — `app.js:2019` | Critical | trivial |
| 18 placeholder posts | Critical | large (writing) |
| "Take the 2-minute quiz" CTA is `href="#"` | Important | trivial |
| Resources page "Get it free" buttons all `href="#"` | Important | medium |
| Home page "Download the 7-day guide" → `#resources` (no real assets) | Important | small |
| Newsletter footer social links all `href="#"` (12+ across pages) | Important | trivial |
| No welcome-at-signup email | Important | small |
| End-of-pathway CTA missing | Important | small |
| Per-day reminder copy is the same generic template | Important | medium |
| Privacy policy + Terms — neither exists | Important | small |
| Fabricated testimonials on Results page | Important | trivial (mark as illustrative) or large (collect real) |
| Quiz, lead-magnet PDFs, audio meditation, video masterclass on Resources page — none exist | Important | medium |

## 2. Responsiveness

### Breakpoints in use
- `380px`, `600px`, `768px`, `880px`, `881px`

### Findings
| Finding | Severity | Effort |
|---|---|---|
| Form inputs are 14–15px on mobile — iOS auto-zooms when <16px | Critical | trivial |
| Burger only appears below 880px; 881–960px band is tight | Important | small |
| Hero h1 may collide with portrait at 360–390px | Important | small |
| Pathway timeline cards on small phones are tight | Nice | trivial |
| Social icon footer buttons 32×32px (below 44×44 Apple HIG) | Nice | trivial |
| Hover-only nav dropdown — desktop band only | Nice | trivial |
| Color contrast — gold `#c9a96b` on cream `#fbf7ef` is ~2.3:1, fails WCAG AA | Important | small |
| `:focus { outline: none }` with no `:focus-visible` replacement | Important | small |

## 3. Speed

### Asset inventory (uncompressed)
| Asset | Size |
|---|---|
| `adham-blob-blue.svg` | 2.07 MB |
| `adham-blob.svg` | 2.06 MB |
| `posts/covers/the-terror-of-history.png` | 2.29 MB |
| `posts/covers/you-have-never-suffered-...png` | 1.90 MB |
| `adham-clean.jpg` | 480 KB |
| `adham-cutout.png` | 248 KB (unused) |
| `app.js` | 106 KB |
| `styles.css` | 97 KB |
| `pathway-renderer.js` | 14 KB |
| `pathway-state.js` | 4.5 KB |

### Findings
| Finding | Severity | Effort |
|---|---|---|
| 2 MB SVGs embed base64 PNGs (not real vectors) | Critical | small (re-export) |
| Cover PNGs are 1.9–2.3 MB | Critical | small (convert to WebP) |
| `adham-cutout.png` (248 KB) is unused | Nice | trivial (delete) |
| No `loading="lazy"` on any `<img>` | Important | trivial |
| No `<link rel="preload">` for hero portrait | Nice | trivial |
| `marked.min.js` + `marked-footnote` load synchronously | Important | trivial (add `defer`) |
| `styles.css?v=33` is render-blocking, 97 KB | Nice | medium |
| Google Fonts: 6 weights of Fraunces + 4 Inter + 2 mono | Nice | small |
| No `Cache-Control` headers in `vercel.json` | Nice | small |
| Marquee animation runs forever | Nice | small |
| `manifest.json` fetched with `cache: 'no-store'` on every blog visit | Nice | trivial |

## 4. Security

| Finding | Severity | Effort |
|---|---|---|
| No rate-limiting on `subscribe` edge function | Important | medium |
| `PATHWAY_ADMIN_SECRET = 'adham2026'` is in client-side source AND is also the `?preview=adham2026` secret | Important | small |
| Preview cookie has no `Secure` flag | Important | trivial |
| Preview "gate" is entirely client-side — anyone hitting `/app.html` directly skips it | Important | small (Vercel middleware) |
| `marked.parse()` called without DOMPurify (low risk: author-controlled content) | Nice | trivial (document) |
| HMAC key length not verified in env | Important | trivial (verify) |
| `claim-by-token` is GET, token leaks via Referer/history; same token unsubscribes | Nice | small |
| Tokens never expire | Nice | small |
| No CSP header | Nice | medium |
| `Access-Control-Allow-Origin: '*'` on every edge function | Nice | trivial |
| `progress-update` accepts any timezone string without validation | Nice | trivial |
| RLS on tables: verify enabled (audit could not inspect live DB) | Critical IF NOT SET | trivial to verify |
| `send-reminders` — verify `verify_jwt = true` in deploy config | Important | trivial to verify |

## 5. SEO + Accessibility

### SEO
| Finding | Severity | Effort |
|---|---|---|
| `robots.txt: Disallow: /` correct for pre-launch | — | — |
| `app.html` has NO `noindex` meta — fully crawlable if Google ever discovers it | Important | trivial |
| No `sitemap.xml` | Important | small |
| No canonical URLs per route | Important | small |
| Per-page meta descriptions all share the global default | Important | small |
| JSON-LD `Article` schema on post pages ✓ | — | — |
| Twitter card + OG tags on `app.html` ✓ | — | — |
| Hash-routed SPA — poor SEO; consider History API routing | Nice | large |

### Accessibility
| Finding | Severity | Effort |
|---|---|---|
| Contact form `<label>` elements not associated (`for=`/`id=` missing) | Important | trivial |
| Heading hierarchy broken in places | Important | small |
| Inputs without `aria-label` when no visible label | Important | trivial |
| Color contrast — gold eyebrow on cream | Important | small |
| Focus indicators removed | Important | small |
| Pathway timeline locked steps use `<div>` with no card role or `aria-disabled` | Nice | trivial |
| Empty `href="#"` social links with fake aria-labels | Important | trivial |
| `.faq-q` toggle missing `aria-expanded` / `aria-controls` | Nice | small |
| Skip-to-content link missing | Important | trivial |
| All `<img>` have `alt` ✓ | — | — |
| Semantic landmarks present ✓ | — | — |

## Recommended next 3 moves

1. **Fix contact form + replace 2 MB SVGs** — single biggest perf + UX wins.
2. **Decide on the 18 placeholder essays** — write or hide.
3. **Lock `app.html` behind cookie at the edge + rotate preview secret** — real launch gate.
