// 小さくシンプルなカウントダウンタイマー
(function(){
  'use strict';

  function getParams(){
    const p = new URLSearchParams(location.search);
    let sec = parseInt(p.get('sec')) || 60;
    if(isNaN(sec)) sec = 60;
    sec = Math.max(1, Math.min(3600, Math.floor(sec)));
    let label = p.get('label') || '';
    if(label.length>32) label = label.slice(0,32);
    return {sec, label};
  }

  const el = document.getElementById('timer');
  let total = 60;
  let startAt = null;
  let rafId = null;

  function updateTitle(label, remaining){
    if(label) document.title = `${label} — ${remaining}s`;
    else document.title = `${remaining}s`;
  }

  function render(remaining){
    const n = Math.max(0, Math.ceil(remaining));
    el.textContent = String(n);
    updateTitle(params.label, n);
  }

  function finish(){
    render(0);
    // 簡易フラッシュ（背景反転）
    const origBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = params && params.label ? '#ffeb3b' : '#ffeb3b';
    if(navigator.vibrate) navigator.vibrate([200,100,200]);
    setTimeout(()=>{ document.body.style.backgroundColor = origBg; }, 500);
  }

  function tick(){
    const now = Date.now();
    const elapsed = (now - startAt)/1000;
    const remaining = total - elapsed;
    if(remaining <= 0){
      cancelAnimationFrame(rafId);
      finish();
      return;
    }
    render(remaining);
    rafId = requestAnimationFrame(tick);
  }

  function start(totalSec){
    total = totalSec;
    startAt = Date.now();
    if(rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  function handleVisibility(){
    if(document.visibilityState === 'visible'){
      // 再計算は tick が行う（startAt 基準なので自動補正される）
      // ただし即時レンダリング
      const now = Date.now();
      const elapsed = (now - startAt)/1000;
      const remaining = total - elapsed;
      if(remaining<=0){ finish(); }
      else render(remaining);
    }
  }

  const params = getParams();

  document.addEventListener('visibilitychange', handleVisibility);

  document.addEventListener('DOMContentLoaded', () => {
    const timerEl = document.getElementById('timer');
    const startBtn = document.getElementById('start');
    const stopBtn = document.getElementById('stop');
    const resetBtn = document.getElementById('reset');

    let total = parseInt(timerEl.textContent, 10) || 60;
    let remaining = total;
    let interval = null;

    const format = (sec) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : String(s);
    };

    function render() {
      timerEl.textContent = format(remaining);
    }

    startBtn.addEventListener('click', () => {
      if (interval) return;
      interval = setInterval(() => {
        if (remaining <= 0) {
          clearInterval(interval);
          interval = null;
          return;
        }
        remaining--;
        render();
      }, 1000);
    });

    stopBtn.addEventListener('click', () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    });

    resetBtn.addEventListener('click', () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      remaining = total;
      render();
    });

    // タイマーをクリックすると秒数を入力してセットできます
    timerEl.addEventListener('click', () => {
      const v = prompt('秒数を入力してください（例: 90）', String(total));
      const n = parseInt(v, 10);
      if (!isNaN(n) && n >= 0) {
        total = n;
        remaining = n;
        render();
      }
    });

    // タイトルにラベル反映
    if(params.label) document.title = params.label;
    // 初回表示
    render(params.sec);
    // 自動開始
    start(params.sec);
  });

})();
