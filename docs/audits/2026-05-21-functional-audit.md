# Functional Audit — 2026-05-21

Goal: confirm every page, button, image, and form is wired up. Not a copy
or content review. Where something is structurally incomplete (placeholder
content that an essay or PDF will later fill), flag it as such.

Method: a code-level grep for every `href=`, `src=`, `data-nav=`, `fetch(`,
and `action=`, plus a browser walkthrough of every page on the live site
(`adham.coach` with preview cookie) on Chrome at desktop width.

## Summary: what works, what doesn't

| Item | Status |
|------|--------|
| Routes return 200 (13 pages + 4 static files) | ✅ |
| Every nav link points to a real route | ✅ |
| Every image file exists (root SVGs/JPG, post covers + variants) | ✅ |
| External endpoints reachable (Brevo, Supabase functions, TidyCal) | ✅ |
| Post page renders fully (cover, byline, body, author bio, share row) | ✅ |
| Mobile menu burger opens, closes via Escape, uses `inert` | ✅ |
| Post share buttons (X, LinkedIn, Copy, Email) wired at runtime, copy works | ✅ |
| Blog → featured post navigation works via SPA click | ✅ |
| Bad route (e.g. /typo) now renders home AND fixes the URL bar | ✅ Fixed |
| `/post/<nonexistent>` shows "Essay not found" cleanly (no broken image) | ✅ Fixed |
| **TidyCal booking calendar renders** | ✅ Fixed (CSP) |
| Coming-soon page renders for un-authed visitors with Brevo email capture | ✅ |
| Featured blog cover loads eagerly (no black flash on initial render) | ✅ Fixed |
| Pages render fully on initial load (no blank-until-scroll) | ✅ Fixed |
| Dead CTAs ("Start the quiz", 6× "Get it free") now route to /contact | ✅ Fixed |
| **Social icons in nav + footer still dead (8 links)** | ⚠️ Pending URLs |

## Page-by-page walkthrough

All pages render correctly once anything triggers the fade-up animations.
Each one was viewed at 1568px on desktop Chrome with the preview cookie.

| Page | Status | Notes |
|------|--------|-------|
| `/` (home) | ✅ | Hero, 3-card "you're hiding", "The plan", stakes, tier preview, CTA, footer all render |
| `/about` | ✅ | "Hi, I'm Adham. I coach you through what you've been avoiding." with photo and CTAs |
| `/services` (Work With Me) | ✅ | "Three doors. Pick yours." with 3 tier cards (Foundation / Breakthrough / Transformation), promise grid, FAQ |
| `/blog` (Writing) | ✅ | "Writing on meaning, suffering, and the way through." with featured post card and list |
| `/series` | ✅ | "Read with intent." Pathways section is empty (no pathway-tagged series exist); "Themed groups" shows Self-Love |
| `/resources` | ⚠️ | "Tools to help you move." Featured 5-Minute Anxiety Reset is wired to Brevo; the 6 other cards are placeholder content with dead buttons |
| `/results` | ✅ | "Real people. Real change." Stats grid and testimonial wall (content is placeholder per handoff but UI works) |
| `/contact` | ✅ | "Two ways to reach me." Contact form + TidyCal embed both render |
| `/post/<slug>` | ✅ | Cover, byline, markdown body, share row, author bio, "read next" all render. Cover uses srcset. |
| `/blog/series/Self-Love` | ✅ | Series page with the one tagged essay |
| `/privacy.html`, `/terms.html` | ✅ | Static legal pages |

## Fixes shipped (same session)

After the initial walkthrough, this session shipped fixes for every
real bug the audit found:

1. **Blank-on-load fade-up.** `initFadeUp()` now sweeps a one-time
   bounding-rect check on the next animation frame, at `document.fonts.ready`,
   at 200 ms, and at 800 ms (last sweep is generous: reveals anything
   within two viewport heights). Above-the-fold content appears within
   ~1 s instead of waiting for a scroll.

2. **TidyCal calendar widget didn't render.** CSP blocked the embed
   script. Added `https://asset-tidycal.b-cdn.net` to `script-src` and
   `https://tidycal.com` to `connect-src` + `frame-src`. The calendar
   loads and displays available dates.

3. **`/post/<nonexistent>`** showed a broken-image icon under the
   "Essay not found" heading because the cover section was always
   visible (a CLS fix from earlier today). Now the cover, byline, share
   row, author bio, "read next", post-progress, and meta eyebrow are
   all hidden on the not-found path.

4. **Bad route URL bar.** Typing `/typo` rendered home but the URL bar
   kept `/typo`. Now `history.replaceState` swaps to `/` when the route
   doesn't match.

5. **Blog featured cover.** Was `loading="lazy"`, so visitors saw a
   black box until they scrolled. Featured cover now loads eagerly (the
   smaller post-card covers in the list stay lazy).

6. **Dead CTAs pointed at /contact.** "Start the quiz" on services →
   "Not sure? Book a free call". "Get it free" on every resource card →
   "Ask me about this".

## Original bug: blank-on-load until scroll

Every page that's not the home page can appear completely blank for several
seconds after navigation. Content only fades in once the user scrolls
(any amount, even one tick).

**Root cause**: `.fade-up` has `opacity: 0` and only becomes visible when
the IntersectionObserver in `initFadeUp()` ([app.js:2095](../../app.js#L2095))
adds the `.in` class. The observer uses
`{ threshold: 0.1, rootMargin: '0px 0px -5% 0px' }`. The initial
intersection callback doesn't always fire reliably for above-the-fold
content right after the SPA's `innerHTML` write — likely because layout
hasn't finished settling when the observer is set up. Once the user
scrolls, the observer re-evaluates and content appears.

**User impact**: anyone who lands on a non-home route and doesn't
immediately scroll sees a blank page for an indefinite period. Pretty bad
first impression.

**Fix sketch**: after creating the observer, manually walk every observed
element with `getBoundingClientRect()` and add `.in` to anything already
within the viewport. Cheap one-time pass.

## Remaining: dead social icons

Adham has Instagram (`@captain_adham`) and LinkedIn but no YouTube or X
yet. Eight icons in the mobile menu + footer (4 IG/YT/LI/X each) still
point at `href="#"`. Deferred — Adham can hand the URLs over later, at
which point we wire the real two and drop the empty two.

The featured "5-Minute Anxiety Reset" on Resources and Home **does work**
(captures email via Brevo lead-magnet form).

## ✅ Confirmed working interactions

- Top nav: Home / About / Work With Me / Writing dropdown (All essays /
  Series / Pathways) / Resources / Results / Book a call
- Mobile burger menu (proper `inert` attribute when closed, removed on open)
- Footer "Explore" / "Free" / "Get in touch" link columns
- `mailto:Adham@Adham.coach` link in footer
- Privacy / Terms links in footer
- Post page share row: X / LinkedIn buttons get real URLs via JS, copy-link
  button + email button wired via `renderPost()` ([app.js:1632](../../app.js#L1632))
- Featured-essay "Read essay" button on blog wired to `/post/<slug>`
  ([app.js:997](../../app.js#L997))
- Newsletter sign-up forms (subscribe action posts to Brevo)
- Contact "Send a note" form (posts to Supabase `/functions/v1/contact`)
- TidyCal calendar embed (path `captain/mwm`, script loads from
  `asset-tidycal.b-cdn.net`)

## Image inventory

All site-internal images verified to exist:

- `/adham-blob.svg` (72 KB) — hero / avatar
- `/adham-blob-blue.svg` (73 KB) — guide / author bio
- `/adham-clean.jpg` (492 KB) — coming-soon photo, og:image
- `posts/covers/the-terror-of-history.webp` (161 KB) + `-720w` (29 KB) + `-1440w` (86 KB)
- `posts/covers/you-have-never-suffered-from-anything-but-love.webp` (94 KB) + variants

Favicon is served from `<link rel="icon" type="image/svg+xml" href="/adham-blob.svg">`
(no `favicon.ico` file, by design).

## Endpoint reachability

- Brevo newsletter (`ebebc29d.sibforms.com`): 200 ✅
- Brevo lead magnet (same host): 200 ✅
- Supabase `/functions/v1/subscribe`, `/contact`, `/claim-by-token`,
  `/progress-update`, `/unsubscribe`, `/send-reminders`: all 401 without
  auth ✅ (expected — they accept the publishable anon key from the SPA)
- TidyCal: loaded via CDN script tag, embed div present
