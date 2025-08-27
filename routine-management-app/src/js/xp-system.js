// xp-system.js
(function () {
  'use strict';

  // --- XP System ---
  const XP_PER_SECOND = 1; // XP gained per second of task completion

  function calculateXP(durationSec) {
    return durationSec * XP_PER_SECOND;
  }

  function levelFromXP(xp) {
    return Math.floor(xp / 100); // Level up every 100 XP
  }

  function getCurrentXP() {
    return parseInt(localStorage.getItem('currentXP')) || 0;
  }

  function addXP(durationSec) {
    const xpGained = calculateXP(durationSec);
    const currentXP = getCurrentXP();
    const newXP = currentXP + xpGained;
    localStorage.setItem('currentXP', newXP);
    return newXP;
  }

  function getLevel() {
    const currentXP = getCurrentXP();
    return levelFromXP(currentXP);
  }

  // Expose functions
  window.XPSystem = {
    calculateXP,
    levelFromXP,
    addXP,
    getCurrentXP,
    getLevel
  };
})();