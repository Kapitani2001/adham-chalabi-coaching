(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.PathwayState = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  function derivePathwayState(progress, stepCount, now) {
    const states = [];
    for (let step = 1; step <= stepCount; step++) {
      let state = 'locked';
      if (step <= (progress.lastCompletedStep || 0)) {
        state = 'completed';
      } else if (step === 1 && (progress.lastCompletedStep || 0) === 0) {
        state = 'available';
      }
      states.push({ step, state, unlockAt: null });
    }
    return states;
  }

  return { derivePathwayState };
}));
