// DOM-stub tests for pathway-renderer.js (browser globals, no module exports —
// loaded via node:vm with just enough window/document to exercise rendering).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const PS = require('../pathway-state.js');

const RENDERER_SRC = fs.readFileSync(path.join(__dirname, '..', 'pathway-renderer.js'), 'utf8');

function makeEl() {
  return {
    className: '',
    innerHTML: '',
    children: [],
    classList: { add() {}, remove() {}, toggle() {} },
    appendChild(c) { this.children.push(c); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
}

function makeStorage(init) {
  const map = new Map(Object.entries(init || {}));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
  };
}

function loadRenderer(storage) {
  const sandbox = {
    window: { PathwayState: PS, localStorage: storage, sessionStorage: makeStorage() },
    document: {
      createElement: () => makeEl(),
      contains: () => true,
      querySelectorAll: () => [],
    },
    // Countdown tickers: stub timers so tests never keep the process alive.
    setInterval: () => 1,
    clearInterval: () => {},
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(RENDERER_SRC, sandbox, { filename: 'pathway-renderer.js' });
  return sandbox;
}

const PATHWAY = 'Begin Here';

function makePosts(n) {
  const posts = [];
  for (let i = 1; i <= n; i++) {
    posts.push({ slug: `day-${i}`, title: `Day ${i} essay`, series: PATHWAY, series_order: i, minutes: 4 });
  }
  return posts;
}

function storageWithProgress(lastCompletedStep, lastCompletedAtIso) {
  return makeStorage({
    [PS.STORAGE_KEY]: JSON.stringify({
      [PATHWAY]: { lastCompletedStep, lastCompletedAt: lastCompletedAtIso, completedAt: null },
    }),
  });
}

test('appendPathwayAction: revisiting an earlier completed step shows plain Landed, not "Day N+1 opens"', () => {
  // Completed through Day 3; revisit Day 1. The stored timestamp belongs to
  // Day 3, so Day 1's page must NOT claim "Day 2 opens <computed from it>".
  const storage = storageWithProgress(3, new Date().toISOString());
  const ctx = loadRenderer(storage);
  const posts = makePosts(5);
  const bodyEl = makeEl();
  ctx.appendPathwayAction(bodyEl, posts[0], posts, {});
  const wrap = bodyEl.children[0];
  assert.ok(wrap, 'action block appended');
  assert.match(wrap.innerHTML, /Landed/);
  assert.doesNotMatch(wrap.innerHTML, /opens/i, 'earlier completed step must not show an unlock line');
});

test('appendPathwayAction: the most recently completed step still shows the "next day opens" line', () => {
  const storage = storageWithProgress(3, new Date().toISOString());
  const ctx = loadRenderer(storage);
  const posts = makePosts(5);
  const bodyEl = makeEl();
  ctx.appendPathwayAction(bodyEl, posts[2], posts, {}); // Day 3 === lastCompletedStep
  const wrap = bodyEl.children[0];
  assert.ok(wrap, 'action block appended');
  assert.match(wrap.innerHTML, /Landed · Day 4 opens/);
});

test('appendPathwayAction: completed final step shows the closing line', () => {
  const storage = storageWithProgress(5, new Date().toISOString());
  const ctx = loadRenderer(storage);
  const posts = makePosts(5);
  const bodyEl = makeEl();
  ctx.appendPathwayAction(bodyEl, posts[4], posts, {});
  const wrap = bodyEl.children[0];
  assert.match(wrap.innerHTML, /You walked the path/);
});

test('renderPathwayTimeline: only the most recently completed card carries the date', () => {
  // One timestamp is stored for the whole pathway — it is only true for the
  // latest completion, so earlier completed cards must show "Sat with" undated.
  const completedAt = new Date(2026, 4, 3, 20, 0, 0); // May 3 local
  const storage = storageWithProgress(3, completedAt.toISOString());
  const ctx = loadRenderer(storage);
  const posts = makePosts(5);
  const grid = makeEl();
  ctx.renderPathwayTimeline(grid, posts, PATHWAY);
  const html = grid.innerHTML;
  const dated = html.match(/Sat with on/g) || [];
  assert.strictEqual(dated.length, 1, 'exactly one card shows a completion date');
  assert.match(html, /Sat with on May 3/);
  // Earlier completed cards still show the undated label.
  const undated = html.match(/>Sat with</g) || [];
  assert.strictEqual(undated.length, 2, 'Days 1 and 2 show "Sat with" without a date');
});
