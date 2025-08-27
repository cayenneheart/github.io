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