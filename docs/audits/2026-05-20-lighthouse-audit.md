# Lighthouse Audit — 2026-05-20

Mobile, simulated throttling, against live `https://adham.coach` with the
preview cookie. Categories: performance, accessibility, best-practices, SEO.
Run via `npx lighthouse` against three representative URLs.

## Scores

|         | Perf | A11y | BestP | SEO | LCP   | CLS   | Console errors |
|---------|------|------|-------|-----|-------|-------|----------------|
| **Before** |      |      |       |     |       |       |                |
| `/`         | 62   | 90   | 96    | 69  | 4.1 s | 0.346 | 1 |
| `/services` | 89   | 89   | 96    | 66  | 2.9 s | 0     | 1 |
| `/post/<slug>` | 98* | 100* | 96 | 63  | 2.0 s | 0     | 8 |
| **After**  |      |      |       |     |       |       |                |
| `/`         | **95** | **94** | 96 | 69 | 2.5 s | **0** | 1† |
| `/services` | 89   | **93** | **100** | 66 | 3.0 s | 0 | **0** |
| `/post/<slug>` | 70‡ | 94 | **100** | 61 | 5.0 s | **0** | **0** |

\* The `/post/<slug>` pre-fix scores were misleading: the SPA never booted
on the deep link (see "P0 finding" below), so Lighthouse was auditing a
near-empty page. The post-fix scores reflect the page actually rendering
its content.

† `ERR_NO_BUFFER_SPACE` on Google Fonts CSS — transient network error on
the audit host, not a site bug.

‡ Real perf score on a content-heavy page with a full-width cover image
and a markdown parser CDN. LCP 5 s is the cover. See backlog for optimisation.

SEO scores stay stuck at 60s because `robots.txt` says `Disallow: /` —
expected pre-launch, resolved by the launch-day flip.

## P0 finding: deep-linked SPA routes were broken

`app.html` referenced its assets with relative paths:

```html
<link rel="stylesheet" href="styles.css?v=35">
<script src="pathway-state.js?v=2"></script>
<script src="pathway-renderer.js?v=2"></script>
<script src="app.js?v=70"></script>
```

When the edge middleware rewrites `/post/<slug>` to `/app.html`, the browser
keeps the original URL in the bar, so `styles.css?v=35` resolves to
`/post/styles.css?v=35` → 404. Same for the JS files. **The SPA never
booted on any nested path.** Sub-routes at one level deep (`/services`,
`/about`) still worked by coincidence (`/services` + `app.js` → `/app.js`),
but `/post/<slug>` and reminder-email `?t=<token>` links were silently
broken in any fresh browser context.

Three more relative paths kept the SPA half-broken even after the asset
fix: `fetch('posts/manifest.json')`, `fetch('posts/series.json')`, and
`fetch(\`posts/${slug}.md\`)`. Cover images in `posts/manifest.json` were
also relative (`posts/covers/foo.webp`), so they 404'd on deep links too.

The fix moves every site-internal asset to an absolute path (leading `/`)
and updates [build-posts.js](../../build-posts.js) to normalize cover
paths to absolute when writing the manifest, so the convention holds
automatically for future posts.

## Other fixes shipped this session

- **Home CLS 0.346 → 0.** Added `width` and `height` to `hey-hero-blob-img`
  and `guide-photo-img`. Also reserved the post cover section's vertical
  space upfront so the cover loading doesn't push body content down.
- **`aria-hidden-focus` on mobile menu.** Swapped `aria-hidden="true"` for
  `inert`, which removes the menu's focusable descendants from the tab
  order and the accessibility tree while it's closed. Toggled via
  `menu.toggleAttribute('inert', !open)`.
- **Favicon 404.** Added `<link rel="icon" type="image/svg+xml" href="/adham-blob.svg">`
  in [app.html](../../app.html). Removes the console 404 on every page.
- **og:image / twitter:image absolute.** Now `https://adham.coach/adham-clean.jpg`
  so social card previews resolve regardless of which deep URL was shared.

## Logged to backlog (not fixed this session)

- **Color contrast.** Failing on `.subscribe-stats .micro`, footer-bottom
  spans, `.tier-meta-label`. Needs design call on which tokens to bump.
- **Heading order.** `<h4>` appearing without an `<h3>` parent in
  stakes-grid and footer-grid. Pure markup fix, low effort.
- **Unused JS on /services (72%).** `app.js` ships render code for every
  page; only the active route uses it. A real build step would tree-shake,
  but we accepted "no build" as a project constraint. Either revisit that,
  or split per-page renderers into separate files.
- **Post LCP 5.0 s.** Driven by the full-width cover image. Either compress
  covers further, serve responsive sizes via `srcset`, or preload the
  cover URL early.
- **Unminified CSS and JS.** Same root cause as the unused-JS item. No
  build step.
- **Coming-soon (`/`, unauthenticated) was not audited.** Audits used the
  preview cookie to see the SPA. Worth a single PSI run on the
  unauthenticated coming-soon before launch.

## Methodology

```bash
mkdir -p tmp/lh
CHROME_PATH="/c/Program Files/Google/Chrome/Application/chrome.exe" \
  npx --yes lighthouse "https://adham.coach<path>" \
    --extra-headers='{"Cookie":"preview-mode=yes"}' \
    --output=json --output-path=./tmp/lh/<name>.json \
    --quiet --chrome-flags="--headless=new --no-sandbox" \
    --form-factor=mobile --throttling-method=simulate \
    --only-categories=performance,accessibility,best-practices,seo \
    --max-wait-for-load=45000
```

Raw JSON reports live in `tmp/lh/` (gitignored — large, regenerable). The
pre-fix snapshot is named `<name>.json`; the final post-fix snapshot is
`<name>-v3.json`.
