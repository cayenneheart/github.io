(function () {
  'use strict';

  function loadRoutines() {
    const routines = localStorage.getItem('routines');
    return routines ? JSON.parse(routines) : [];
  }

  function saveRoutines(routines) {
    localStorage.setItem('routines', JSON.stringify(routines));
  }

  function loadStats() {
    const stats = localStorage.getItem('stats');
    return stats ? JSON.parse(stats) : { xp: 0, level: 1 };
  }

  function saveStats(stats) {
    localStorage.setItem('stats', JSON.stringify(stats));
  }

  // Export functions
  window.storage = {
    loadRoutines,
    saveRoutines,
    loadStats,
    saveStats
  };
})();