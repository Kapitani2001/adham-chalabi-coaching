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
