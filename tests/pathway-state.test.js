const { test } = require('node:test');
const assert = require('node:assert');
const PS = require('../pathway-state.js');

test('derivePathwayState: fresh user, Day 1 is available, rest are locked', () => {
  const progress = { lastCompletedStep: 0, lastCompletedAt: null };
  const stepCount = 5;
  const now = new Date('2026-05-01T10:00:00-04:00');
  const states = PS.derivePathwayState(progress, stepCount, now);
  assert.deepStrictEqual(states, [
    { step: 1, state: 'available', unlockAt: null },
    { step: 2, state: 'locked', unlockAt: null },
    { step: 3, state: 'locked', unlockAt: null },
    { step: 4, state: 'locked', unlockAt: null },
    { step: 5, state: 'locked', unlockAt: null },
  ]);
});

test('computeUnlockInstant: returns 6am the day after lastCompletedAt', () => {
  // Marked at 8pm on April 30 local
  const completedAt = new Date('2026-04-30T20:00:00-04:00');
  const unlock = PS.computeUnlockInstant(completedAt);
  // Expect 6am May 1, same TZ offset
  assert.strictEqual(unlock.toISOString(), new Date('2026-05-01T06:00:00-04:00').toISOString());
});

test('computeUnlockInstant: marked just past midnight still unlocks the *next* 6am', () => {
  const completedAt = new Date('2026-04-30T00:30:00-04:00');
  const unlock = PS.computeUnlockInstant(completedAt);
  // Should be May 1 at 6am, NOT April 30 at 6am
  assert.strictEqual(unlock.toISOString(), new Date('2026-05-01T06:00:00-04:00').toISOString());
});

test('computeUnlockInstant: marked at 5am, unlocks at 6am the *next* day (next-calendar-day rule)', () => {
  const completedAt = new Date('2026-04-30T05:00:00-04:00');
  const unlock = PS.computeUnlockInstant(completedAt);
  assert.strictEqual(unlock.toISOString(), new Date('2026-05-01T06:00:00-04:00').toISOString());
});

test('derivePathwayState: Day 1 done, current time before unlock = Day 2 locked with unlockAt set', () => {
  const progress = {
    lastCompletedStep: 1,
    lastCompletedAt: '2026-04-30T20:00:00-04:00',
  };
  const now = new Date('2026-04-30T22:00:00-04:00');
  const states = PS.derivePathwayState(progress, 5, now);
  assert.strictEqual(states[0].state, 'completed');
  assert.strictEqual(states[1].state, 'locked');
  assert.strictEqual(states[1].unlockAt.toISOString(), new Date('2026-05-01T06:00:00-04:00').toISOString());
  assert.strictEqual(states[2].state, 'locked');
  assert.strictEqual(states[2].unlockAt, null); // only Day N+1 has unlockAt
});

test('derivePathwayState: Day 1 done, current time past unlock = Day 2 available', () => {
  const progress = {
    lastCompletedStep: 1,
    lastCompletedAt: '2026-04-30T20:00:00-04:00',
  };
  const now = new Date('2026-05-01T07:00:00-04:00');
  const states = PS.derivePathwayState(progress, 5, now);
  assert.strictEqual(states[1].state, 'available');
});

test('derivePathwayState: All 5 done = all completed', () => {
  const progress = {
    lastCompletedStep: 5,
    lastCompletedAt: '2026-05-04T20:00:00-04:00',
  };
  const now = new Date('2026-05-05T07:00:00-04:00');
  const states = PS.derivePathwayState(progress, 5, now);
  states.forEach(s => assert.strictEqual(s.state, 'completed'));
});

test('formatCountdown: < 1h shows minutes', () => {
  const ms = 47 * 60 * 1000;
  assert.strictEqual(PS.formatCountdown(ms), 'Opens in 47m');
});

test('formatCountdown: 1-24h shows hours and minutes', () => {
  const ms = (14 * 3600 + 32 * 60) * 1000;
  assert.strictEqual(PS.formatCountdown(ms), 'Opens in 14h 32m');
});

test('formatCountdown: > 24h shows days and hours', () => {
  const ms = (2 * 86400 + 4 * 3600) * 1000;
  assert.strictEqual(PS.formatCountdown(ms), 'Opens in 2d 4h');
});

test('formatCountdown: zero or negative returns null (caller handles transition)', () => {
  assert.strictEqual(PS.formatCountdown(0), null);
  assert.strictEqual(PS.formatCountdown(-1000), null);
});

test('formatUnlockLabel: same calendar day = "today at 6am"', () => {
  const unlockAt = new Date('2026-05-01T06:00:00-04:00');
  const now = new Date('2026-05-01T02:00:00-04:00');
  assert.strictEqual(PS.formatUnlockLabel(unlockAt, now), 'today at 6am');
});

test('formatUnlockLabel: next calendar day = "tomorrow at 6am"', () => {
  const unlockAt = new Date('2026-05-02T06:00:00-04:00');
  const now = new Date('2026-05-01T20:00:00-04:00');
  assert.strictEqual(PS.formatUnlockLabel(unlockAt, now), 'tomorrow at 6am');
});

test('formatUnlockLabel: 2+ days out = "Apr 30 at 6am"', () => {
  const unlockAt = new Date('2026-04-30T06:00:00-04:00');
  const now = new Date('2026-04-27T20:00:00-04:00');
  assert.strictEqual(PS.formatUnlockLabel(unlockAt, now), 'Apr 30 at 6am');
});

test('loadProgress: missing key returns default empty object', () => {
  const fakeStorage = { getItem: () => null };
  const result = PS.loadProgress(fakeStorage, 'Begin Here');
  assert.deepStrictEqual(result, { lastCompletedStep: 0, lastCompletedAt: null, completedAt: null });
});

test('loadProgress: existing entry returns stored values', () => {
  const fakeStorage = {
    getItem: () => JSON.stringify({
      'Begin Here': { lastCompletedStep: 2, lastCompletedAt: '2026-04-30T20:00:00-04:00', completedAt: null }
    })
  };
  const result = PS.loadProgress(fakeStorage, 'Begin Here');
  assert.strictEqual(result.lastCompletedStep, 2);
  assert.strictEqual(result.lastCompletedAt, '2026-04-30T20:00:00-04:00');
});

test('markStepCompleted: advances lastCompletedStep and stamps lastCompletedAt', () => {
  const stored = {};
  const fakeStorage = {
    getItem: () => stored.value || null,
    setItem: (k, v) => { stored.value = v; },
  };
  const now = new Date('2026-04-30T20:00:00-04:00');
  PS.markStepCompleted(fakeStorage, 'Begin Here', 1, 5, now);
  const all = JSON.parse(stored.value);
  assert.strictEqual(all['Begin Here'].lastCompletedStep, 1);
  assert.strictEqual(new Date(all['Begin Here'].lastCompletedAt).toISOString(), now.toISOString());
  assert.strictEqual(all['Begin Here'].completedAt, null);
});

test('markStepCompleted: setting last step also stamps completedAt', () => {
  const stored = {};
  const fakeStorage = {
    getItem: () => stored.value || null,
    setItem: (k, v) => { stored.value = v; },
  };
  const now = new Date('2026-05-04T20:00:00-04:00');
  PS.markStepCompleted(fakeStorage, 'Begin Here', 5, 5, now);
  const all = JSON.parse(stored.value);
  assert.strictEqual(all['Begin Here'].lastCompletedStep, 5);
  assert.strictEqual(new Date(all['Begin Here'].completedAt).toISOString(), now.toISOString());
});

test('markStepCompleted: does not regress (re-reading Day 2 after marking Day 3 keeps lastCompletedStep=3)', () => {
  const stored = { value: JSON.stringify({
    'Begin Here': { lastCompletedStep: 3, lastCompletedAt: '2026-05-02T20:00:00-04:00', completedAt: null }
  }) };
  const fakeStorage = {
    getItem: () => stored.value,
    setItem: (k, v) => { stored.value = v; },
  };
  const now = new Date('2026-05-03T15:00:00-04:00');
  PS.markStepCompleted(fakeStorage, 'Begin Here', 2, 5, now);
  const all = JSON.parse(stored.value);
  assert.strictEqual(all['Begin Here'].lastCompletedStep, 3, 'must not regress');
});
