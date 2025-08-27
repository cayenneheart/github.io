// 深呼吸アプリ - バージョン1
class BreathingApp {
  constructor() {
    this.params = this.parseParams();
    this.totalSeconds = this.params.sec;
    this.pattern = this.params.pattern;
    this.startTime = null;
    this.isCompleted = false;
    
    this.elements = {
      timer: document.getElementById('timer'),
      circle: document.getElementById('breathingCircle'),
      instruction: document.getElementById('instruction')
    };
    
    this.phases = ['inhale', 'hold', 'exhale'];
    this.phaseTexts = {
      inhale: '吸って',
      hold: '止めて',
      exhale: '吐いて'
    };
    
    this.init();
  }
  
  parseParams() {
    const params = new URLSearchParams(window.location.search);
    
    // 合計秒数の取得（デフォルト60秒）
    let sec = parseInt(params.get('sec')) || 60;
    if (sec < 10 || sec > 600) sec = 60; // 10秒〜10分の範囲制限
    
    // パターンの取得（デフォルト4-2-4）
    let pattern = params.get('pattern') || '4-2-4';
    const patternMatch = pattern.match(/^(\d+)-(\d+)-(\d+)$/);
    if (!patternMatch) {
      pattern = [4, 2, 4]; // デフォルト
    } else {
      pattern = patternMatch.slice(1).map(n => parseInt(n));
      // パターン検証（1-30秒の範囲）
      if (pattern.some(n => n < 1 || n > 30)) {
        pattern = [4, 2, 4]; // デフォルトにフォールバック
      }
    }
    
    return { sec, pattern };
  }
  
  init() {
    // 初期状態の設定
    this.elements.timer.textContent = this.totalSeconds;
    this.elements.instruction.textContent = '準備中...';
    
    // 1秒後に自動開始
    setTimeout(() => {
      this.start();
    }, 1000);
  }
  
  start() {
    this.startTime = Date.now();
    this.elements.instruction.textContent = this.phaseTexts.inhale;
    this.updateAnimation();
    
    // メインループ（100ms間隔で更新）
    this.intervalId = setInterval(() => {
      this.updateAnimation();
    }, 100);
  }
  
  updateAnimation() {
    const elapsed = Date.now() - this.startTime;
    const elapsedSeconds = elapsed / 1000;
    const remainingSeconds = Math.max(0, this.totalSeconds - elapsedSeconds);
    
    // タイマー更新
    this.elements.timer.textContent = Math.ceil(remainingSeconds);
    
    // 終了チェック
    if (remainingSeconds <= 0) {
      this.complete();
      return;
    }
    
    // 現在のフェーズ計算
    const cycleLength = this.pattern[0] + this.pattern[1] + this.pattern[2];
    const cyclePosition = elapsedSeconds % cycleLength;
    
    let currentPhase;
    let phaseProgress;
    
    if (cyclePosition < this.pattern[0]) {
      // 吸う
      currentPhase = 'inhale';
      phaseProgress = cyclePosition / this.pattern[0];
    } else if (cyclePosition < this.pattern[0] + this.pattern[1]) {
      // 止める
      currentPhase = 'hold';
      phaseProgress = (cyclePosition - this.pattern[0]) / this.pattern[1];
    } else {
      // 吐く
      currentPhase = 'exhale';
      phaseProgress = (cyclePosition - this.pattern[0] - this.pattern[1]) / this.pattern[2];
    }
    
    // フェーズ変更時の処理
    if (this.currentPhase !== currentPhase) {
      this.currentPhase = currentPhase;
      this.updatePhase(currentPhase);
      
      // バイブレーション（対応デバイスのみ）
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  }
  
  updatePhase(phase) {
    // CSSクラス更新
    this.elements.circle.className = `breathing-circle ${phase}`;
    
    // テキスト更新
    this.elements.instruction.textContent = this.phaseTexts[phase];
  }
  
  complete() {
    clearInterval(this.intervalId);
    this.isCompleted = true;
    
    this.elements.timer.textContent = '0';
    this.elements.instruction.textContent = '完了！';
    this.elements.circle.className = 'breathing-circle';
    document.body.classList.add('completed');
    
    // バイブレーション（完了時）
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  }
}

// ページ読み込み時に自動開始
document.addEventListener('DOMContentLoaded', () => {
  new BreathingApp();
});
