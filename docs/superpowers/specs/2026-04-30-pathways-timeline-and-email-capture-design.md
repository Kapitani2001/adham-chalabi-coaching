# Pathways: Timeline UI, Day Gating, and Email Capture

**Date:** 2026-04-30
**Project:** adham-chalabi-coaching (https://github.com/Kapitani2001/adham-chalabi-coaching)
**Status:** Design approved by Adham. Pending spec review and implementation planning.

## 1. Motivation

The site has a series called "Begin Here" intended to be read "one essay a day for five days". Currently it renders as a generic grid of cards with no pacing enforcement. Readers can speed through all five in five minutes, defeating the contemplative intent.

This change does three things:

1. Replaces the current grid with a vertical alternating timeline so the multi-day pathway *looks* like a journey, not a content list.
2. Enforces "one a day" pacing through a small action gate ("I've sat with this") followed by a calendar-day wait.
3. Adds optional email capture at the Day 1 to Day 2 handoff to grow Adham's mailing list and let progress sync across devices.

It also renames the concept from "ritual" to "pathway" everywhere, since "pathway" reads as more universal and less religious.

## 2. Scope

### 2.1 In scope

- Renaming the "ritual" concept to "pathway" across data, code, copy, and CSS.
- A new vertical alternating timeline layout for pathway series detail pages.
- A per-step state machine (locked, available, completed) with visual treatment for each state.
- An "I've sat with this" action button on each pathway essay's bottom.
- Hard-blocking direct URLs to locked pathway essays.
- Live countdown text (e.g. "Opens in 14h 32m") and a fixed unlock time ("tomorrow at 6am") on locked steps.
- An admin bypass mode triggered by a query param.
- An optional email capture form that appears at the Day 1 completion moment.
- A scheduled reminder email sent at 6am local time when the next step opens.
- Cross-device progress sync via tokenized links in reminder emails.

### 2.2 Explicitly out of scope

- Full user accounts with passwords, login screens, or magic-link authentication for general access.
- Account management UI (profile pages, settings, etc.).
- Member-only content or paywalls of any kind.
- Comments, journaling fields, or other user-generated content.
- Social sharing features.
- Analytics dashboards.
- Reminder emails for non-pathway content.
- Per-step reflection prompts or text fields. Only the binary "I've sat with this" action.
- Push notifications, in-app notifications, or any non-email notification channel.
- Adding gating to non-pathway series (e.g. "Self-Love"). Those keep the existing grid and remain ungated.

### 2.3 Pathway definition

A series is a "pathway" when its `series.json` entry has either `is_welcome: true` or a non-empty `pathway_for` value (renamed from `ritual_for`). Currently this matches only the "Begin Here" series.

## 3. Naming changes (rituals to pathways)

Apply consistently:

- Frontmatter keys: `ritual_for` becomes `pathway_for`. `ritual_intro` becomes `pathway_intro`. The `is_welcome` key is unchanged.
- `series.json`: same key renames.
- JS: `isRitualSeries()` becomes `isPathwaySeries()`. All `ritual*` variables, function names, and comments rename accordingly.
- CSS classes: `.ritual-eyebrow`, `.ritual-subtitle`, `.ritual-intro`, `.ritual-step-badge`, `.ritual-flag`, `.ritual-nav`, `.ritual-nav-prev`, `.ritual-nav-next`, `.ritual-closer`, `.is-ritual`, `.posts-grid.ritual-steps` all rename to `pathway-*`.
- Nav copy: "Rituals" becomes "Pathways" in the desktop and mobile nav menus.
- Page copy: any user-facing reference to "ritual" becomes "pathway" or rephrased equivalent.
- The `series-ribbon.ritual` class becomes `series-ribbon.pathway`. The text "For [grieving]" stays.

A migration step renames frontmatter in existing post markdown files. The `build-posts.js` script that generates `posts/manifest.json` from frontmatter must be updated to read the new keys.

No backward compatibility for old keys is required since the site has not yet been published with pathway content beyond what is in this repo.

## 4. Timeline UI (vertical alternating)

### 4.1 Layout

On a pathway series detail page (e.g. `?series=Begin Here`), the existing `posts-grid.ritual-steps` block is replaced with a `pathway-timeline` block.

Structure:

- A vertical center line, 2px wide, soft tan color (`#d9cdb6`).
- One step row per essay in the pathway, ordered by `series_order`.
- Steps alternate left and right of the center line.
- Each step has:
  - A dot on the center line.
  - A connector line from the dot to the card edge.
  - A card containing the day label, title, and reading time.

On mobile (max-width 600px) the layout collapses to a single left-aligned trail (Layout C from the brainstorm), with all cards on the right of the line and the line on the far left.

### 4.2 Step states

Each step is in exactly one of three states.

**Available:**
- Card is fully opaque, white background, accent-tan border.
- Dot is solid gold (`#c9a96b`).
- Card is clickable; clicking navigates to the essay.
- Card shows day label, full essay title, reading time in minutes, and a small "Start" or "Continue" link.

**Completed:**
- Card is slightly dimmed (90% opacity).
- Dot is solid forest green with a small white checkmark glyph centered.
- Card is clickable; clicking re-opens the essay (re-reading is always allowed).
- Card shows day label, full essay title, reading time, and "Sat with on [date]" caption (date in user's local timezone, formatted as "Apr 30").

**Locked:**
- Card is heavily dimmed (60% opacity), no border accent.
- Dot is hollow (just a tan ring, no fill).
- Card is not clickable. Cursor is `default`. Hover does nothing.
- Card shows the day label (`Day N`) only. The essay title is replaced with a generic line: "This step opens after the one before it lands."
- Below the day label: a live countdown (`Opens in 14h 32m`) and a fixed line (`tomorrow at 6am`).

### 4.3 Header

Above the timeline, retain the existing pathway header treatment (eyebrow, subtitle, intro paragraph). The intro from `series.json` already reads "Read one a day for five days. Sit with each before moving to the next." Keep that text by default per pathway.

## 5. Gating logic

### 5.1 State machine

Each pathway tracks per-step state. The state for step N is computed from two stored values for the pathway:

- `lastCompletedStep`: the highest step number marked complete. `0` if none.
- `lastCompletedAt`: ISO timestamp of the last completion. `null` if none.

Derivation:

- Step N where N <= lastCompletedStep: `completed`.
- Step N where N == lastCompletedStep + 1 AND current local time >= 6am of the calendar day after `lastCompletedAt`: `available`.
- Step 1 when `lastCompletedStep == 0`: `available`.
- Otherwise: `locked`.

### 5.2 Unlock time

The unlock time for step N (where N == lastCompletedStep + 1) is:

- The first 6:00:00 AM in the user's local timezone that is strictly later than `lastCompletedAt`.
- Concretely: take the calendar date of `lastCompletedAt`, add 1 day, set time to 06:00:00 local. That is the unlock instant.

### 5.3 Countdown text

While locked and the unlock instant is in the future:

- Less than 1 hour: "Opens in 47m"
- 1 to 24 hours: "Opens in 14h 32m"
- More than 24 hours (rare, only if user revisits days later without acting): "Opens in 2d 4h"

Plus a fixed line beneath: "tomorrow at 6am" (or "today at 6am" if the unlock is later today, or "Apr 30 at 6am" if it is a specific date more than 1 day out).

The countdown updates every minute via `setInterval` while the page is open.

### 5.4 Action button

At the bottom of every pathway essay, above the existing prev/next nav, add a button block.

**Initial render** (essay is not yet completed):
- Button label: `I've sat with this`
- Button style: prominent, accent-gold background, serif font.

**Click behavior:**
- Set `lastCompletedStep` to this essay's `series_order`.
- Set `lastCompletedAt` to the current ISO timestamp.
- If this is Day 1 of the pathway AND email has not yet been captured AND admin mode is off: replace the button block with the email capture form (see section 7).
- Otherwise: replace the button block with the confirmation block.

**Confirmation block** (essay is completed):
- Reads: `Landed · Day [N+1] opens [tomorrow|today|Apr 30] at 6am`
- If this is the last day of the pathway: reads `You walked the path. Sit with what surfaced.` (already exists as `.ritual-closer`, rename to `.pathway-closer`)
- Plus a secondary line beneath: a live countdown matching section 5.3.

If admin mode is on, the button still works but does not change progress state. Confirmation reads `Admin · no progress recorded`.

### 5.5 Locked URL behavior

When the user navigates to a pathway essay's URL (e.g. `?p=begin-here-3-sit-with-it`) and that essay's state is `locked`:

- The essay does not render.
- The page redirects to the pathway series page (`?series=Begin Here`) using `history.replaceState`. The locked URL does not appear in browser history, so the back button takes the user to wherever they were before, not back to the locked page.
- A small banner appears at the top of the timeline: `Day 3 isn't open yet. Opens [tomorrow|...] at 6am.`
- The banner auto-dismisses after 8 seconds, or when the user clicks anywhere.

This applies to both direct URL entry and clicks on locked timeline steps (though locked steps should not be clickable in the first place; this is a defense in depth).

Admin mode bypasses this redirect.

## 6. Storage model

### 6.1 localStorage (Phase 1)

Single key: `pathwayProgress`.

Value: JSON object keyed by pathway series name.

```json
{
  "Begin Here": {
    "lastCompletedStep": 2,
    "lastCompletedAt": "2026-04-29T22:14:00-04:00",
    "completedAt": null
  }
}
```

`completedAt` is set when `lastCompletedStep` reaches the final step of the pathway.

Additional standalone localStorage keys:

- `pathwayUserId`: a UUID v4 generated on first visit, used to anchor cross-device sync (Phase 2).
- `pathwayEmail`: set when the user submits the email capture form. Indicates server sync is active.
- `adminMode`: `"on"` or absent. Set/cleared by query params.

### 6.2 Supabase (Phase 2)

Schema (PostgreSQL via Supabase):

**Table `subscribers`:**
- `id` UUID primary key
- `email` TEXT unique not null
- `created_at` TIMESTAMPTZ default now()
- `unsubscribed_at` TIMESTAMPTZ nullable
- `timezone` TEXT (IANA tz string, captured from browser at signup)

**Table `pathway_progress`:**
- `subscriber_id` UUID references subscribers(id), part of composite PK
- `pathway_name` TEXT not null, part of composite PK
- `last_completed_step` INTEGER default 0
- `last_completed_at` TIMESTAMPTZ nullable
- `completed_at` TIMESTAMPTZ nullable

**Table `reminder_jobs`:**
- `id` UUID primary key
- `subscriber_id` UUID references subscribers(id)
- `pathway_name` TEXT
- `step_number` INTEGER
- `send_at` TIMESTAMPTZ (computed = next 6am local for that subscriber)
- `sent_at` TIMESTAMPTZ nullable
- `unsubscribed` BOOLEAN default false (snapshot at send time)

Phase 2 is described in section 8.

## 7. Email capture flow (Phase 2)

### 7.1 Trigger

User clicks "I've sat with this" on Day 1 of a pathway. This is the only place email capture appears. Subsequent days never show the form, regardless of whether email was captured.

### 7.2 UI

The button block is replaced inline (no modal, no page navigation) with:

```
Day 2 opens tomorrow at 6am.

Want me to send it to your inbox so you don't forget?

[ your email                          ] [ Send me Day 2 ]

Or keep going on this device only. I'll save your progress here.

We send the pathway and nothing else. Unsubscribe in any email.
```

The "keep going on this device only" link dismisses the form and shows the standard confirmation block (section 5.4).

### 7.3 Submit behavior

On submit:

1. Validate the email format client-side (basic regex).
2. POST to a Supabase Edge Function endpoint with `{ email, pathwayUserId, pathwayName, timezone }`.
3. The endpoint:
   a. Upserts a row in `subscribers` (if email is new, insert; if existing, return existing id).
   b. Upserts the `pathway_progress` row for this subscriber and pathway, copying current localStorage state.
   c. Schedules a row in `reminder_jobs` for the unlock instant of step 2.
   d. Returns `{ subscriberId }`.
4. Client stores `pathwayEmail` in localStorage.
5. Client replaces the form with the standard confirmation block.

### 7.4 Subsequent step completions

When the user marks Day 2, Day 3, etc. complete and `pathwayEmail` is set in localStorage, the client also POSTs to a `progress-update` endpoint that updates the server-side `pathway_progress` row and schedules the next reminder.

If the network call fails, localStorage remains the source of truth and the failure is silent. Reminders may not fire but the user can still progress on their current device.

### 7.5 Reminder email

A scheduled job (Supabase Edge Function on cron, runs every 15 minutes) checks `reminder_jobs` for rows where `send_at <= now()` AND `sent_at IS NULL` AND `unsubscribed = false`.

For each match:
1. Look up the subscriber's email and the pathway essay metadata.
2. Send via a transactional email provider (Resend recommended).
3. Mark `sent_at = now()`.

**Email content (placeholder, Adham finalizes):**

- Subject: `Day [N] of Begin Here is open`
- Body (HTML and plaintext):
  - Greeting line.
  - 2 to 3 sentences of intro in Adham's voice (template authored by Adham, one per pathway).
  - Button: `Read Day [N]` linking to `https://kapitani2001.github.io/adham-chalabi-coaching/?p=[slug]&t=[token]`.
  - Footer: `Unsubscribe with one click` linking to `?unsubscribe=[token]`.

The `t=[token]` query param contains an HMAC-signed token of the form `<base64url(subscriber_id)>.<base64url(hmac_sha256(subscriber_id, server_secret))>`. The server secret lives in Supabase Edge Function env vars. On load, the client posts the token to a `claim-by-token` endpoint, which verifies the HMAC and returns the subscriber's server-side progress, which the client then writes into localStorage. Effectively logs the user in on this device.

Same token format is used for `?unsubscribe=[token]`.

### 7.6 Unsubscribe

Visiting `?unsubscribe=[token]` calls an endpoint that sets `unsubscribed_at` on the subscriber row and shows a brief "You're unsubscribed. The pathway stays accessible at this URL whenever you want to come back" page.

Future reminder jobs for that subscriber are skipped (snapshot the unsubscribe state at send time).

## 8. Admin bypass

### 8.1 Activation

- Visit any URL on the site with `?admin=<secret>` where `<secret>` is a hard-coded constant in `app.js`. (Example value: `?admin=adham2026`. Adham can change this in code.)
- On match, set `adminMode = "on"` in localStorage.
- Visit `?admin=off` to clear.

### 8.2 Effects when active

- All pathway steps appear `available` regardless of state.
- Locked URL redirect is skipped.
- Email capture form is hidden on Day 1 completion.
- "I've sat with this" still renders and is clickable but does not modify localStorage progress. Confirmation block reads `Admin · no progress recorded`.
- A small floating ribbon in the top-right of every page reads `admin mode · exit`. Clicking exit triggers the `?admin=off` flow.

### 8.3 No server effect

Admin mode is purely client-side. Admin actions never POST to Supabase. Adham cannot accidentally pollute the production progress data.

## 9. Architecture and shipping order

### 9.1 Phase 1: Frontend only (localStorage)

Half-day estimate.

- Rename rituals to pathways everywhere.
- Build the vertical alternating timeline (layout B).
- Wire the gating state machine in `app.js` reading from localStorage.
- Add the "I've sat with this" button.
- Implement the locked URL redirect.
- Implement the admin bypass query param.
- Update `build-posts.js` to handle renamed frontmatter keys.
- Ship to GitHub Pages.

After Phase 1, the entire UX works for single-device readers.

### 9.2 Phase 2: Email capture and reminders

2 to 3 day estimate. Independently deployable on top of Phase 1.

- Provision a Supabase project. Disable email/password auth (we do not use it). Create the schema in section 6.2.
- Author the Supabase Edge Functions: `subscribe`, `progress-update`, `send-reminders` (cron), `unsubscribe`, `claim-by-token`.
- Set up Resend or equivalent for transactional email.
- Build the email capture form on Day 1 completion.
- Wire client-side calls to `subscribe` and `progress-update`.
- Implement the tokenized link claim flow.
- Implement the unsubscribe page.
- Configure the cron schedule for `send-reminders` (every 15 minutes).
- Author one reminder email template per pathway day-transition (4 templates for Begin Here, since Day 1 has no reminder before it and Day 5 has no reminder after it: Day 2, Day 3, Day 4, Day 5 reminders. Drafts to be written by Adham.).

### 9.3 Hosting note

The site continues to be served from GitHub Pages. Only the JSON API endpoints (Supabase Edge Functions) live elsewhere. No backend hosting changes are needed for the site itself.

## 10. Open questions and explicit deferrals

These are decisions deliberately deferred or accepted as known limitations. They are not blockers for implementation but are noted so future work can address them.

- **Timezone edge cases.** If a user travels across timezones between marking Day N complete and the unlock instant, the unlock fires at the original timezone's 6am. Acceptable; rare.
- **Multiple devices, no email.** A user reading on phone in the morning and laptop in the evening sees independent localStorage on each. Without email, no sync. Acceptable; that is the price of skipping email.
- **Email mismatched to actual user.** If a user enters someone else's email, that other person receives reminders for content they did not sign up for. Mitigation deferred. Volume is expected to be tiny. Unsubscribe is one click.
- **No transactional email confirmation.** A welcome confirmation email is not sent on signup; only the scheduled Day 2 reminder. Reduces email volume. Acceptable for v1.
- **No CAPTCHA on the email form.** Bot signup is possible but low-impact since the only side effect is a single reminder email being sent. Add later if abuse appears.
- **Token expiry.** Tokens in reminder emails do not expire. A leaked token would let the holder re-bind progress on a new device. Low risk for non-sensitive content. Add expiry later if needed.
- **No data deletion UI.** Users wanting their data deleted reply to any reminder email. Manual handling for now. Acceptable at small scale; revisit if the list grows.
- **Admin secret is visible in public source.** The repo is public on GitHub, so anyone reading `app.js` can find the admin query-param secret. Per section 8.3 admin mode has zero server effect, so the worst case is a visitor self-bypassing client-side gating (which costs nothing). If real protection ever matters, move the bypass behind a Supabase auth check.
- **Spec covers Begin Here only.** Future pathways inherit the same mechanics automatically (the system is data-driven from `series.json`), but copy and reminder templates need authoring per pathway.
