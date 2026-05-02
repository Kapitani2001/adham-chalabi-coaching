(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.PathwayState = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  function derivePathwayState(progress, stepCount, now) {
    const lastDone = progress.lastCompletedStep || 0;
    const completedAt = progress.lastCompletedAt ? new Date(progress.lastCompletedAt) : null;
    const unlockInstant = completedAt ? computeUnlockInstant(completedAt) : null;
    const states = [];
    for (let step = 1; step <= stepCount; step++) {
      let state = 'locked';
      let unlockAt = null;
      if (step <= lastDone) {
        state = 'completed';
      } else if (step === lastDone + 1) {
        if (lastDone === 0 || (unlockInstant && now >= unlockInstant)) {
          state = 'available';
        } else {
          state = 'locked';
          unlockAt = unlockInstant;
        }
      }
      states.push({ step, state, unlockAt });
    }
    return states;
  }

  function computeUnlockInstant(completedAt) {
    // Take the calendar date of completedAt in local time, add 1 day, set to 06:00:00 local.
    const d = new Date(completedAt);
    d.setHours(0, 0, 0, 0);  // start of completedAt's local day
    d.setDate(d.getDate() + 1);
    d.setHours(6, 0, 0, 0);
    return d;
  }

  return { derivePathwayState, computeUnlockInstant };
}));
