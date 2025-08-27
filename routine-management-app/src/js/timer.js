(function () {
  'use strict';

  let timerInterval;
  let totalSeconds = 0;
  let isRunning = false;

  function startTimer(duration) {
    if (isRunning) return;
    totalSeconds = duration;
    isRunning = true;

    const startTime = Date.now();
    timerInterval = setInterval(() => {
      const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
      const remainingTime = totalSeconds - elapsedTime;

      if (remainingTime <= 0) {
        completeTimer();
      } else {
        updateTimerDisplay(remainingTime);
      }
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
    isRunning = false;
  }

  function completeTimer() {
    stopTimer();
    updateTimerDisplay(0);
    // Trigger completion actions, e.g., show completion screen
    alert('タイマーが完了しました！');
  }

  function updateTimerDisplay(remainingTime) {
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
      timerDisplay.textContent = remainingTime > 0 ? remainingTime : '完了';
    }
  }

  // Export functions
  window.timer = {
    startTimer,
    stopTimer,
    completeTimer
  };
})();