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

  function formatCountdown(msRemaining) {
    if (msRemaining <= 0) return null;
    const totalMin = Math.floor(msRemaining / 60000);
    const totalHr = Math.floor(totalMin / 60);
    const totalDays = Math.floor(totalHr / 24);
    if (totalHr < 1) return `Opens in ${totalMin}m`;
    if (totalDays < 1) {
      const h = totalHr;
      const m = totalMin - h * 60;
      return `Opens in ${h}h ${m}m`;
    }
    const d = totalDays;
    const h = totalHr - d * 24;
    return `Opens in ${d}d ${h}h`;
  }

  function formatUnlockLabel(unlockAt, now) {
    const a = new Date(unlockAt);
    const n = new Date(now);
    const sameDay = a.getFullYear() === n.getFullYear() && a.getMonth() === n.getMonth() && a.getDate() === n.getDate();
    if (sameDay) return 'today at 6am';
    const tomorrow = new Date(n);
    tomorrow.setDate(n.getDate() + 1);
    const isTomorrow = a.getFullYear() === tomorrow.getFullYear() && a.getMonth() === tomorrow.getMonth() && a.getDate() === tomorrow.getDate();
    if (isTomorrow) return 'tomorrow at 6am';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[a.getMonth()]} ${a.getDate()} at 6am`;
  }

  const STORAGE_KEY = 'pathwayProgress';

  function loadProgress(storage, pathwayName) {
    const raw = storage.getItem(STORAGE_KEY);
    let all = {};
    if (raw) {
      try { all = JSON.parse(raw) || {}; } catch (_) { all = {}; }
    }
    const p = all[pathwayName] || {};
    return {
      lastCompletedStep: p.lastCompletedStep || 0,
      lastCompletedAt: p.lastCompletedAt || null,
      completedAt: p.completedAt || null,
    };
  }

  function saveProgress(storage, pathwayName, progress) {
    const raw = storage.getItem(STORAGE_KEY);
    let all = {};
    if (raw) {
      try { all = JSON.parse(raw) || {}; } catch (_) { all = {}; }
    }
    all[pathwayName] = progress;
    storage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  function markStepCompleted(storage, pathwayName, stepNumber, totalSteps, now) {
    const current = loadProgress(storage, pathwayName);
    if (stepNumber <= current.lastCompletedStep) return current;  // no regress
    const next = {
      lastCompletedStep: stepNumber,
      lastCompletedAt: now.toISOString(),
      completedAt: stepNumber === totalSteps ? now.toISOString() : (current.completedAt || null),
    };
    saveProgress(storage, pathwayName, next);
    return next;
  }

  return {
    derivePathwayState,
    computeUnlockInstant,
    formatCountdown,
    formatUnlockLabel,
    loadProgress,
    saveProgress,
    markStepCompleted,
    STORAGE_KEY,
  };
}));
