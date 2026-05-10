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
  // Marked at 8pm local on April 30
  const completedAt = new Date(2026, 3, 30, 20, 0, 0); // local time, month is 0-indexed
  const unlock = PS.computeUnlockInstant(completedAt);
  // Expect 6am local on May 1
  assert.strictEqual(unlock.getFullYear(), 2026);
  assert.strictEqual(unlock.getMonth(), 4); // May (0-indexed)
  assert.strictEqual(unlock.getDate(), 1);
  assert.strictEqual(unlock.getHours(), 6);
  assert.strictEqual(unlock.getMinutes(), 0);
});

test('computeUnlockInstant: marked just past midnight still unlocks the *next* 6am', () => {
  const completedAt = new Date(2026, 3, 30, 0, 30, 0); // April 30, 00:30 local
  const unlock = PS.computeUnlockInstant(completedAt);
  // Should be May 1 at 6am, NOT April 30 at 6am
  assert.strictEqual(unlock.getMonth(), 4);
  assert.strictEqual(unlock.getDate(), 1);
  assert.strictEqual(unlock.getHours(), 6);
});

test('computeUnlockInstant: marked at 5am, unlocks at 6am the *next* day (next-calendar-day rule)', () => {
  const completedAt = new Date(2026, 3, 30, 5, 0, 0); // April 30, 05:00 local
  const unlock = PS.computeUnlockInstant(completedAt);
  // Next-calendar-day rule: must be May 1, not April 30
  assert.strictEqual(unlock.getMonth(), 4);
  assert.strictEqual(unlock.getDate(), 1);
  assert.strictEqual(unlock.getHours(), 6);
});

test('derivePathwayState: Day 1 done, current time before unlock = Day 2 locked with unlockAt set', () => {
  const completedAt = new Date(2026, 3, 30, 20, 0, 0); // April 30, 20:00 local
  const progress = {
    lastCompletedStep: 1,
    lastCompletedAt: completedAt.toISOString(),
  };
  const now = new Date(2026, 3, 30, 22, 0, 0); // April 30, 22:00 local (2h later)
  const states = PS.derivePathwayState(progress, 5, now);
  assert.strictEqual(states[0].state, 'completed');
  assert.strictEqual(states[1].state, 'locked');
  // Day 2 should unlock May 1 at 6am local
  assert.strictEqual(states[1].unlockAt.getMonth(), 4);
  assert.strictEqual(states[1].unlockAt.getDate(), 1);
  assert.strictEqual(states[1].unlockAt.getHours(), 6);
  assert.strictEqual(states[2].state, 'locked');
  assert.strictEqual(states[2].unlockAt, null); // only Day N+1 has unlockAt
});

test('derivePathwayState: Day 1 done, current time past unlock = Day 2 available', () => {
  const completedAt = new Date(2026, 3, 30, 20, 0, 0); // April 30, 20:00 local
  const progress = {
    lastCompletedStep: 1,
    lastCompletedAt: completedAt.toISOString(),
  };
  const now = new Date(2026, 4, 1, 7, 0, 0); // May 1, 07:00 local (past 6am unlock)
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

test('formatCountdown: sub-minute remaining shows "1m" not "0m"', () => {
  // Regression: in the last 60s before unlock, Math.floor produced "Opens in 0m".
  // Math.ceil at the minute boundary keeps the display sensible until the unlock fires.
  assert.strictEqual(PS.formatCountdown(30 * 1000), 'Opens in 1m');
  assert.strictEqual(PS.formatCountdown(1), 'Opens in 1m');
  assert.strictEqual(PS.formatCountdown(59 * 1000), 'Opens in 1m');
});

test('derivePathwayState: corrupt lastCompletedAt is treated as no completion', () => {
  const progress = { lastCompletedStep: 1, lastCompletedAt: 'not-a-date' };
  const now = new Date(2026, 4, 1, 10, 0, 0);
  const states = PS.derivePathwayState(progress, 5, now);
  // Day 1 still shows completed (lastCompletedStep is truthy)
  assert.strictEqual(states[0].state, 'completed');
  // Day 2 should fall back to locked-with-no-unlockAt rather than crashing on Invalid Date
  assert.strictEqual(states[1].state, 'locked');
  assert.strictEqual(states[1].unlockAt, null);
});

test('formatUnlockLabel: same calendar day = "today at 6am"', () => {
  const unlockAt = new Date(2026, 4, 1, 6, 0, 0);  // May 1, 06:00 local
  const now = new Date(2026, 4, 1, 2, 0, 0);       // May 1, 02:00 local
  assert.strictEqual(PS.formatUnlockLabel(unlockAt, now), 'today at 6am');
});

test('formatUnlockLabel: next calendar day = "tomorrow at 6am"', () => {
  const unlockAt = new Date(2026, 4, 2, 6, 0, 0); // May 2, 6am local
  const now = new Date(2026, 4, 1, 20, 0, 0); // May 1, 20:00 local
  assert.strictEqual(PS.formatUnlockLabel(unlockAt, now), 'tomorrow at 6am');
});

test('formatUnlockLabel: 2+ days out = "Apr 30 at 6am"', () => {
  const unlockAt = new Date(2026, 3, 30, 6, 0, 0);  // Apr 30, 06:00 local
  const now = new Date(2026, 3, 27, 20, 0, 0);      // Apr 27, 20:00 local
  assert.strictEqual(PS.formatUnlockLabel(unlockAt, now), 'Apr 30 at 6am');
});

test('loadProgress: missing key returns default empty object', () => {
  const fakeStorage = { getItem: () => null };
  const result = PS.loadProgress(fakeStorage, 'Begin Here');
  assert.deepStrictEqual(result, { lastCompletedStep: 0, lastCompletedAt: null, completedAt: null });
});

test('loadProgress: malformed JSON in storage falls back to defaults', () => {
  const fakeStorage = { getItem: () => '{not valid json' };
  const result = PS.loadProgress(fakeStorage, 'Begin Here');
  assert.deepStrictEqual(result, { lastCompletedStep: 0, lastCompletedAt: null, completedAt: null });
});

test('loadProgress: existing entry returns stored values including completedAt', () => {
  const fakeStorage = {
    getItem: () => JSON.stringify({
      'Begin Here': {
        lastCompletedStep: 5,
        lastCompletedAt: '2026-05-04T20:00:00-04:00',
        completedAt: '2026-05-04T20:00:00-04:00',
      },
    }),
  };
  const result = PS.loadProgress(fakeStorage, 'Begin Here');
  assert.strictEqual(result.lastCompletedStep, 5);
  assert.strictEqual(result.lastCompletedAt, '2026-05-04T20:00:00-04:00');
  assert.strictEqual(result.completedAt, '2026-05-04T20:00:00-04:00');
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
