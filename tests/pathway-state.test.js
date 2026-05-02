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
