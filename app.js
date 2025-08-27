// Simplified breathing timer app
// Behavior: auto-start on load; on finish show done view with two handoff buttons.
(function () {
  'use strict';

  // --- Utilities ---
  function qs(name, href) {
    href = href || window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
    var results = regex.exec(href);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
  }

  function parsePattern(str) {
    if (!str) return [4, 2, 4];
    var parts = String(str).split(/[^0-9]+/).filter(Boolean).map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return [4, 2, 4];
    return parts;
  }

  function isValidUrl(u) {
    try {
      if (!u) return false;
      var url = new URL(u);
      return url.protocol.startsWith('http');
    } catch (e) {
      return false;
    }
  }

  // --- DOM ---
  var root = document;
  var timerEl = root.getElementById('timerValue');
  var circle = root.getElementById('breathingCircle');
  var instruction = root.getElementById('instruction');
  var viewTimer = root.getElementById('view-timer');
  var viewDone = root.getElementById('view-done');
  var backBtn = root.getElementById('backButton');
  var maimeeBtn = root.getElementById('maimeeButton');
  var toast = root.getElementById('toast');

  // --- Params ---
  var totalSec = parseInt(qs('sec')) || 20;
  if (totalSec <= 0) totalSec = 20;
  var pattern = parsePattern(qs('pattern'));
  var back_url = qs('back_url');
  var back_label = qs('back_label') || '戻る';
  var maimee_url = qs('maimee_url') || '/';

  // label
  if (back_label && backBtn) backBtn.textContent = back_label;

  // --- Timer state ---
  var startTime = null;
  var endTime = null;
  var rafId = null;
  var intervalId = null;

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 2400);
  }

  function setViewTimerActive(active) {
    if (active) {
      viewTimer.classList.add('active');
      viewDone.classList.remove('active');
    } else {
      viewTimer.classList.remove('active');
      viewDone.classList.add('active');
    }
  }

  // Compute breathing phase given elapsed and pattern (inhale, hold, exhale)
  function phaseFor(elapsed, total) {
    var p = pattern;
    var cycle = p[0] + p[1] + p[2];
    var cycleMs = (cycle / total) * 1000 * total; // effectively cycle * 1000
    var elapsedMs = elapsed % (cycle * 1000);
    var inhaleMs = p[0] * 1000;
    var holdMs = p[1] * 1000;
    var exhaleMs = p[2] * 1000;
    if (elapsedMs < inhaleMs) return { phase: 'inhale', t: elapsedMs / inhaleMs };
    if (elapsedMs < inhaleMs + holdMs) return { phase: 'hold', t: (elapsedMs - inhaleMs) / holdMs };
    return { phase: 'exhale', t: (elapsedMs - inhaleMs - holdMs) / exhaleMs };
  }

  function updateUI(remainingMs) {
    var remaining = Math.max(0, Math.ceil(remainingMs / 1000));
    if (timerEl) timerEl.textContent = remaining;
    // breathing circle: scale based on phase
    var el = phaseFor((Date.now() - startTime), totalSec * 1000);
    if (!circle) return;
    circle.classList.remove('inhale', 'hold', 'exhale');
    circle.classList.add(el.phase);
    // during hold we keep enlarged via CSS .hold
    if (instruction) instruction.textContent = (el.phase === 'inhale' ? '吸って' : el.phase === 'hold' ? '止める' : '吐いて');
  }

  function tick() {
    var now = Date.now();
    var remainingMs = Math.max(0, endTime - now);
    updateUI(remainingMs);
    if (remainingMs <= 0) {
      finish();
    }
  }

  function start() {
    startTime = Date.now();
    endTime = startTime + totalSec * 1000;
    setViewTimerActive(true);
    // initial UI
    updateUI(totalSec * 1000);
    // use interval for coarse updates to be battery-friendly; 150ms
    intervalId = setInterval(tick, 150);
    // also run one RAF to keep animations smooth at start
    rafId = requestAnimationFrame(function frame() {
      tick();
      rafId = requestAnimationFrame(frame);
    });
  }

  function finish() {
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    setViewTimerActive(false);
    // focus the done heading for accessibility
    var doneHeading = document.getElementById('doneHeading');
    if (doneHeading) doneHeading.focus();
  }

  // --- Button handlers ---
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      if (!isValidUrl(back_url)) {
        showToast('戻るURLが無効です');
        return;
      }
      backBtn.setAttribute('aria-disabled', 'true');
      location.href = back_url;
    });
  }

  if (maimeeBtn) {
    maimeeBtn.addEventListener('click', function () {
      if (!isValidUrl(maimee_url) && maimee_url !== '/') {
        showToast('mai-mee URLが無効です');
        return;
      }
      maimeeBtn.setAttribute('aria-disabled', 'true');
      location.href = maimee_url;
    });
  }

  // Start automatically if the page opened (presence of any query param) OR always start
  function shouldAutoStart() {
    // If Shortcuts calls with params, start; otherwise still auto-start per user preference
    return true;
  }

  // Kick off
  document.addEventListener('DOMContentLoaded', function () {
    // small delay to allow iOS/Shortcuts to stabilize
    if (shouldAutoStart()) {
      setTimeout(start, 120);
    }
  });

})();
document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const views = {
    home: document.getElementById('view-home'),
    timer: document.getElementById('view-timer'),
    done: document.getElementById('view-done'),
  };
  const timerDisplay = document.getElementById('timer');
  const instruction = document.getElementById('instruction');
  const circle = document.getElementById('breathingCircle');
  const startButton = document.getElementById('startButton');
  const backButton = document.getElementById('backButton');
  const maimeeButton = document.getElementById('maimeeButton');
  const doneHeading = document.getElementById('done-heading');
  const toast = document.getElementById('toast');
  const audioToggle = document.getElementById('audioToggle');

  // --- State ---
  let timerInterval;
  let params = {};
  let audioContext;
  let oscillator;
  let gainNode;
  let isAudioEnabled = false;

  // --- Core Functions ---

  /**
   * URLクエリパラメータを解析・検証する
   */
  function parseParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const defaultSec = 20;
    const sec = parseInt(urlParams.get('sec'), 10);
    
    return {
      totalSeconds: (sec > 0 && sec <= 300) ? sec : defaultSec,
      pattern: (urlParams.get('pattern') || '4-2-4').split('-').map(Number),
      back_url: urlParams.get('back_url'),
      back_label: urlParams.get('back_label') || '元のアプリに戻る',
      maimee_url: urlParams.get('maimee_url') || '/',
      autoStart: urlParams.has('sec') || urlParams.has('back_url'),
    };
  }

  /**
   * 指定されたビューを表示する
   * @param {('home'|'timer'|'done')} viewId 
   */
  function showView(viewId) {
    Object.values(views).forEach(view => view.classList.remove('active'));
    if (views[viewId]) {
      views[viewId].classList.add('active');
    }
  }

  /**
   * タイマーを開始する
   */
  function startTimer() {
    showView('timer');
    const { totalSeconds, pattern } = params;
    const cycleLength = pattern.reduce((a, b) => a + b, 0);
    const [inhale, hold, exhale] = pattern;
    const startTime = Date.now();
    
    timerDisplay.textContent = totalSeconds;
    circle.style.transitionDuration = `${inhale}s`;

    timerInterval = setInterval(() => {
      const elapsedTime = (Date.now() - startTime) / 1000;
      const remainingTime = totalSeconds - elapsedTime;
      
      if (remainingTime < 0) {
        onTimerEnd();
        return;
      }
      
      timerDisplay.textContent = Math.ceil(remainingTime);
      
      const phaseTime = elapsedTime % cycleLength;
      
      if (phaseTime < inhale) {
        if (!circle.classList.contains('inhale')) {
          instruction.textContent = '吸って';
          circle.className = 'breathing-circle inhale';
          circle.style.transitionDuration = `${inhale}s`;
        }
      } else if (phaseTime < inhale + hold) {
        if (!circle.classList.contains('hold')) {
          instruction.textContent = '止めて';
          circle.className = 'breathing-circle hold';
        }
      } else {
        if (!circle.classList.contains('exhale')) {
          instruction.textContent = '吐いて';
          circle.className = 'breathing-circle exhale';
          circle.style.transitionDuration = `${exhale}s`;
        }
      }
    }, 100);
  }

  /**
   * タイマー完了時の処理
   */
  function onTimerEnd() {
    clearInterval(timerInterval);
    instruction.textContent = '完了！';
    circle.className = 'breathing-circle';
    document.body.classList.add('completed');
    stopAudio();
    showView('done');
    bindDoneButtons();
    doneHeading.focus();
  }

  /**
   * 完了画面のボタンにイベントをバインドする
   */
  function bindDoneButtons() {
    // 元のアプリに戻るボタン
    if (isValidUrl(params.back_url)) {
      backButton.textContent = params.back_label;
      backButton.disabled = false;
      backButton.onclick = () => {
        backButton.disabled = true;
        maimeeButton.disabled = true;
        window.location.href = params.back_url;
      };
    } else {
      backButton.disabled = true;
      if (params.back_url) showToast('戻り先のURLが無効です');
    }

    // mai-meeに戻るボタン
    maimeeButton.onclick = () => {
      backButton.disabled = true;
      maimeeButton.disabled = true;
      window.location.href = params.maimee_url;
    };
  }

  /**
   * URLが有効か簡易的にチェックする
   * @param {string} urlString 
   */
  function isValidUrl(urlString) {
    if (!urlString) return false;
    // 簡単なチェック。カスタムスキームも許可するため緩めに。
    return urlString.includes(':') || urlString.startsWith('/');
  }

  /**
   * トースト通知を表示する
   * @param {string} message 
   */
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // --- Audio Functions ---
  function setupAudio() {
    if (audioContext) return;
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioContext.createGain();
      gainNode.gain.value = 0.05;
      gainNode.connect(audioContext.destination);
    } catch (e) {
      console.error("Web Audio API is not supported in this browser");
      audioToggle.disabled = true;
    }
  }

  function playAudio() {
    if (!audioContext || oscillator) return;
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(220, audioContext.currentTime + 4);
    oscillator.connect(gainNode);
    oscillator.start();
    isAudioEnabled = true;
    audioToggle.textContent = '🔊';
  }

  function stopAudio() {
    if (oscillator) {
      oscillator.stop();
      oscillator.disconnect();
      oscillator = null;
    }
    isAudioEnabled = false;
    audioToggle.textContent = '🎵';
  }

  audioToggle.addEventListener('click', () => {
    setupAudio();
    isAudioEnabled ? stopAudio() : playAudio();
  });

  // --- Initialization ---
  function init() {
    params = parseParams();
    document.title = `深呼吸 - ${params.totalSeconds}秒`;
    timerDisplay.textContent = params.totalSeconds;

    if (params.autoStart) {
      setTimeout(startTimer, 1000); // 1秒待ってから開始
    } else {
      showView('home');
      startButton.addEventListener('click', (e) => {
        e.preventDefault();
        startTimer();
      });
    }
  }

  init();
});