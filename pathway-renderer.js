/* ============================================================
   PATHWAY RENDERER — DOM glue between pathway-state.js and app.js
   ============================================================
   Functions here render the timeline, the "I've sat with this"
   action block, the email capture form, and the prev/next nav at
   the bottom of pathway essays. They read state from
   `window.PathwayState` (pure logic) and call `callPathwayFn` /
   `renderBlog` (defined in app.js, sibling globals via script tag).

   Bump v= in index.html when this file changes.
   ============================================================ */

function renderPathwayTimeline(grid, posts, pathwayName) {
  // Posts are pre-sorted by series_order. Each is a step.
  // Remove posts-grid because its CSS Grid layout fights the timeline's
  // alternating left/right margin-based positioning.
  grid.classList.remove('pathway-steps');
  grid.classList.remove('posts-grid');
  grid.classList.add('pathway-timeline');

  // Cache the inputs on the grid so the countdown ticker can re-render
  // the timeline in place when a step unlocks, without the cost of a
  // full renderBlog() call (which re-fetches manifest + series.json).
  grid._pathwayPosts = posts;
  grid._pathwayName = pathwayName;

  const progress = window.PathwayState.loadProgress(window.localStorage, pathwayName);
  const adminMode = window.localStorage.getItem('adminMode') === 'on';
  const states = window.PathwayState.derivePathwayState(progress, posts.length, new Date());

  const stepHTML = posts.map((p, i) => {
    const stateInfo = states[i];
    const effectiveState = adminMode ? 'available' : stateInfo.state;
    const side = i % 2 === 0 ? 'left' : 'right';
    const stepNum = p.series_order || (i + 1);

    let cardInner = '';
    if (effectiveState === 'available' || effectiveState === 'completed') {
      const cta = effectiveState === 'completed'
        ? `Sat with on ${formatShortDate(progress.lastCompletedAt)}`
        : (stepNum === 1 ? '→ Start' : '→ Continue');
      cardInner = `
        <span class="pathway-day">Day ${stepNum}</span>
        <div class="pathway-title">${p.title}</div>
        <div class="pathway-meta">${p.minutes} min</div>
        <span class="pathway-cta">${cta}</span>
      `;
    } else {
      // locked
      const countdown = stateInfo.unlockAt
        ? window.PathwayState.formatCountdown(stateInfo.unlockAt - new Date())
        : null;
      const label = stateInfo.unlockAt
        ? window.PathwayState.formatUnlockLabel(stateInfo.unlockAt, new Date())
        : 'after the one before lands';
      cardInner = `
        <span class="pathway-day">Day ${stepNum}</span>
        <div class="pathway-title">This step opens after the one before it lands.</div>
        <div class="pathway-cta-locked">
          ${countdown ? `<span class="pathway-countdown" data-unlock-at="${stateInfo.unlockAt.toISOString()}">${countdown}</span>` : ''}
          <span>${label}</span>
        </div>
      `;
    }

    const tag = (effectiveState === 'locked')
      ? 'div'
      : 'a';
    const attrs = (effectiveState === 'locked')
      ? ''
      : `href="#post/${p.slug}" data-nav="post/${p.slug}"`;
    return `
      <div class="pathway-step ${effectiveState} ${side}">
        <div class="pathway-dot"></div>
        <${tag} class="pathway-card" ${attrs}>${cardInner}</${tag}>
      </div>
    `;
  }).join('');

  grid.innerHTML = `
    <div class="pathway-timeline-line"></div>
    ${stepHTML}
  `;

  startCountdownInterval(grid);
}

function formatShortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

let countdownIntervalId = null;
function startCountdownInterval(grid) {
  if (countdownIntervalId) clearInterval(countdownIntervalId);
  countdownIntervalId = setInterval(() => {
    // If the grid has been detached (user navigated away), clear ourselves.
    if (!document.contains(grid)) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
      return;
    }
    const els = grid.querySelectorAll('.pathway-countdown[data-unlock-at]');
    if (els.length === 0) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
      return;
    }
    const now = new Date();
    let anyTransitioned = false;
    els.forEach(el => {
      const unlockAt = new Date(el.dataset.unlockAt);
      const text = window.PathwayState.formatCountdown(unlockAt - now);
      if (text === null) {
        anyTransitioned = true;
      } else {
        el.textContent = text;
      }
    });
    if (anyTransitioned) {
      // A step has unlocked. Re-render the timeline only (cached posts +
      // pathwayName are stashed on the grid by renderPathwayTimeline) instead
      // of calling renderBlog(), which would re-fetch the manifest and
      // re-render the entire blog page (filters, featured, fade-up, etc.)
      // for what is logically just one card flipping state.
      if (grid._pathwayPosts && grid._pathwayName) {
        renderPathwayTimeline(grid, grid._pathwayPosts, grid._pathwayName);
      }
    }
  }, 60 * 1000);
}

function appendPathwayAction(bodyEl, post, posts, _sMeta) {
  const inSeries = posts.filter(p => p.series === post.series)
    .sort((a, b) => (a.series_order || 99) - (b.series_order || 99));
  const total = inSeries.length;
  const stepNum = post.series_order || 1;
  const adminMode = window.localStorage.getItem('adminMode') === 'on';

  const wrap = document.createElement('div');
  wrap.className = 'pathway-action';

  const renderConfirmed = (progress) => {
    const isLast = stepNum === total;
    if (isLast) {
      wrap.innerHTML = `<p class="pathway-confirmation">You walked the path. Sit with what surfaced.</p>`;
      return;
    }
    const unlockAt = window.PathwayState.computeUnlockInstant(new Date(progress.lastCompletedAt));
    const label = window.PathwayState.formatUnlockLabel(unlockAt, new Date());
    const cd = window.PathwayState.formatCountdown(unlockAt - new Date());
    wrap.innerHTML = `
      <p class="pathway-confirmation">Landed · Day ${stepNum + 1} opens ${label}
        ${cd ? `<span class="pathway-countdown" data-unlock-at="${unlockAt.toISOString()}">${cd}</span>` : ''}
      </p>
    `;
  };

  const renderAdminConfirmed = () => {
    wrap.innerHTML = `
      <p class="pathway-confirmation">Admin · no progress recorded</p>
      <p class="pathway-admin-note">Bypass mode active.</p>
    `;
  };

  const renderInitial = () => {
    wrap.innerHTML = `<button type="button">I've sat with this</button>`;
    wrap.querySelector('button').addEventListener('click', () => {
      if (adminMode) {
        renderAdminConfirmed();
        return;
      }
      const now = new Date();
      const updated = window.PathwayState.markStepCompleted(window.localStorage, post.series, stepNum, total, now);
      const subscribed = !!window.localStorage.getItem('pathwayEmail');

      // First completion of Day 1 + not yet subscribed = email capture moment.
      // Every other completion = straight to confirmed state (and best-effort
      // server sync if already subscribed).
      if (stepNum === 1 && !subscribed) {
        renderEmailCapture(updated);
        return;
      }

      renderConfirmed(updated);
      startActionCountdownInterval(wrap);
      if (subscribed) {
        pushPathwayProgress(post.series, stepNum, total, now);
      }
    });
  };

  const renderEmailCapture = (progress) => {
    const isLast = stepNum === total; // never true for Day 1 of a 5-step pathway, but guard anyway
    if (isLast) {
      renderConfirmed(progress);
      return;
    }
    const unlockAt = window.PathwayState.computeUnlockInstant(new Date(progress.lastCompletedAt));
    const label = window.PathwayState.formatUnlockLabel(unlockAt, new Date());

    wrap.innerHTML = `
      <p class="pathway-confirmation">Day ${stepNum + 1} opens ${label}.</p>
      <p class="pathway-capture-q">Want me to send it to your inbox so you don't forget?</p>
      <form class="pathway-capture-form" novalidate>
        <input type="email" name="email" required autocomplete="email" placeholder="your@email.com" inputmode="email">
        <button type="submit">Send me Day ${stepNum + 1} →</button>
      </form>
      <p class="pathway-capture-skip"><a href="#" data-skip>Or keep going on this device only.</a></p>
      <p class="pathway-capture-promise">Just the pathway. No marketing. Unsubscribe in any email.</p>
    `;

    const form = wrap.querySelector('.pathway-capture-form');
    const input = form.querySelector('input[name="email"]');
    const button = form.querySelector('button');
    const skipLink = wrap.querySelector('[data-skip]');

    const showError = (msg) => {
      let err = wrap.querySelector('.pathway-capture-error');
      if (!err) {
        err = document.createElement('p');
        err.className = 'pathway-capture-error';
        form.after(err);
      }
      err.textContent = msg;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (input.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('That email looks off. Double-check?');
        return;
      }
      button.disabled = true;
      button.textContent = 'Sending…';
      try {
        const tz = (Intl && Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';
        const data = await callPathwayFn('subscribe', {
          method: 'POST',
          body: {
            email,
            pathwayName: post.series,
            lastCompletedStep: stepNum,
            lastCompletedAt: progress.lastCompletedAt,
            timezone: tz,
            totalSteps: total,
          },
        });
        window.localStorage.setItem('pathwayEmail', email);
        if (data && data.subscriberId) window.localStorage.setItem('pathwaySubscriberId', data.subscriberId);
        if (data && data.claimToken) window.localStorage.setItem('pathwayClaimToken', data.claimToken);
        renderConfirmed(progress);
        startActionCountdownInterval(wrap);
      } catch (err) {
        button.disabled = false;
        button.textContent = `Send me Day ${stepNum + 1} →`;
        showError("Couldn't save that. Try again, or skip and keep going on this device.");
        console.warn('subscribe failed', err.message);
      }
    });

    skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      renderConfirmed(progress);
      startActionCountdownInterval(wrap);
    });
  };

  // Initial state: if already completed (lastCompletedStep >= stepNum), show confirmed.
  const progress = window.PathwayState.loadProgress(window.localStorage, post.series);
  if (adminMode) {
    renderInitial();
  } else if ((progress.lastCompletedStep || 0) >= stepNum) {
    renderConfirmed(progress);
    startActionCountdownInterval(wrap);
  } else {
    renderInitial();
  }

  bodyEl.appendChild(wrap);
}

function pushPathwayProgress(pathwayName, stepNumber, totalSteps, now) {
  const claimToken = window.localStorage.getItem('pathwayClaimToken');
  if (!claimToken) return;
  const tz = (Intl && Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';
  callPathwayFn('progress-update', {
    method: 'POST',
    body: {
      claimToken,
      pathwayName,
      lastCompletedStep: stepNumber,
      lastCompletedAt: now.toISOString(),
      totalSteps,
      timezone: tz,
    },
  }).catch((e) => console.warn('progress sync failed', e.message));
}

let actionCountdownIntervalId = null;
function startActionCountdownInterval(wrap) {
  if (actionCountdownIntervalId) clearInterval(actionCountdownIntervalId);
  actionCountdownIntervalId = setInterval(() => {
    // Self-clear if the wrap has been detached (user navigated away).
    if (!document.contains(wrap)) {
      clearInterval(actionCountdownIntervalId);
      actionCountdownIntervalId = null;
      return;
    }
    const el = wrap.querySelector('.pathway-countdown[data-unlock-at]');
    if (!el) {
      clearInterval(actionCountdownIntervalId);
      actionCountdownIntervalId = null;
      return;
    }
    const unlockAt = new Date(el.dataset.unlockAt);
    const text = window.PathwayState.formatCountdown(unlockAt - new Date());
    if (text === null) {
      clearInterval(actionCountdownIntervalId);
      actionCountdownIntervalId = null;
      return;
    }
    el.textContent = text;
  }, 60 * 1000);
}

function appendPathwayNav(bodyEl, post, posts, _sMeta) {
  const inSeries = posts.filter(p => p.series === post.series)
    .sort((a, b) => (a.series_order || 99) - (b.series_order || 99));
  const idx = inSeries.findIndex(p => p.slug === post.slug);
  if (idx < 0) return;
  const total = inSeries.length;
  const prev = idx > 0 ? inSeries[idx - 1] : null;
  const next = idx < total - 1 ? inSeries[idx + 1] : null;
  const isLast = idx === total - 1;

  const nav = document.createElement('div');
  nav.className = 'pathway-nav';
  if (isLast) {
    nav.innerHTML = `
      <p class="pathway-closer">You walked the path. Sit with what surfaced.</p>
      <a href="#blog/series/${encodeURIComponent(post.series)}" data-nav="blog/series/${encodeURIComponent(post.series)}" class="btn ghost sm">Back to ${post.series}</a>
    `;
  } else {
    const prevHTML = prev ? `<a href="#post/${prev.slug}" data-nav="post/${prev.slug}" class="pathway-nav-prev"><span class="micro">← Step ${prev.series_order || idx}</span><span>${prev.title}</span></a>` : '<span></span>';
    const nextHTML = next ? `<a href="#post/${next.slug}" data-nav="post/${next.slug}" class="pathway-nav-next"><span class="micro">Step ${next.series_order || idx + 2} →</span><span>${next.title}</span></a>` : '<span></span>';
    nav.innerHTML = prevHTML + nextHTML;
  }
  bodyEl.appendChild(nav);
}
