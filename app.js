// 深呼吸アプリ - バージョン1
class BreathingApp {
  constructor() {
    this.params = this.parseParams();
    this.totalSeconds = this.params.sec;
    this.pattern = this.params.pattern;
    this.startTime = null;
    this.isCompleted = false;
    this.audioContext = null;
    this.audioPlaying = false;
    this.audioNodes = {};
    
    this.elements = {
      timer: document.getElementById('timer'),
      circle: document.getElementById('breathingCircle'),
      instruction: document.getElementById('instruction'),
      audioToggle: document.getElementById('audioToggle')
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
    
  // 合計秒数の取得（デフォルト20秒）
  let sec = parseInt(params.get('sec'));
  if (isNaN(sec)) sec = 20;
  if (sec < 5 || sec > 600) sec = 20; // 5秒〜10分の範囲制限
    
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
    
    // 音声コントロールの設定
    this.elements.audioToggle.addEventListener('click', () => {
      this.toggleAudio();
    });
    
    // 1秒後に自動開始
    setTimeout(() => {
      this.start();
    }, 1000);
  }
  
  start() {
    this.startTime = Date.now();
    this.elements.instruction.textContent = this.phaseTexts.inhale;
    this.updateAnimation();
    
    // 音楽を開始（ユーザー操作済みの場合）
    this.initAudio();
    
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
    
    // 音楽を停止
    this.stopAudio();
    
    // バイブレーション（完了時）
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  }
  
  // 音声関連メソッド
  async initAudio() {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // リラックス音楽を生成・再生
      this.createRelaxingSound();
      this.elements.audioToggle.disabled = false;
    } catch (error) {
      console.log('Audio initialization failed:', error);
      this.elements.audioToggle.disabled = true;
    }
  }
  
  createRelaxingSound() {
    if (!this.audioContext || this.audioPlaying) return;
    
    try {
      // 低音の波音のような音を生成
      const oscillator1 = this.audioContext.createOscillator();
      const oscillator2 = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      const filterNode = this.audioContext.createBiquadFilter();
      
      // 設定
      oscillator1.type = 'sine';
      oscillator1.frequency.value = 200;
      oscillator2.type = 'sine';
      oscillator2.frequency.value = 300;
      
      filterNode.type = 'lowpass';
      filterNode.frequency.value = 800;
      
      gainNode.gain.value = 0.05;
      
      // 周波数を微細に変動させてナチュラルに
      oscillator1.frequency.setValueAtTime(200, this.audioContext.currentTime);
      oscillator1.frequency.linearRampToValueAtTime(220, this.audioContext.currentTime + 4);
      oscillator1.frequency.linearRampToValueAtTime(180, this.audioContext.currentTime + 8);
      
      oscillator2.frequency.setValueAtTime(300, this.audioContext.currentTime);
      oscillator2.frequency.linearRampToValueAtTime(280, this.audioContext.currentTime + 6);
      oscillator2.frequency.linearRampToValueAtTime(320, this.audioContext.currentTime + 10);
      
      // 接続
      oscillator1.connect(filterNode);
      oscillator2.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // 再生
      oscillator1.start();
      oscillator2.start();
      
      // 保存（停止用）
      this.audioNodes = {
        oscillator1,
        oscillator2,
        gainNode,
        filterNode
      };
      
      this.audioPlaying = true;
      this.elements.audioToggle.textContent = '🔊';
      
      // 自動で音楽をループ
      setTimeout(() => {
        if (this.audioPlaying && !this.isCompleted) {
          this.stopAudio();
          setTimeout(() => this.createRelaxingSound(), 100);
        }
      }, this.totalSeconds * 1000);
      
    } catch (error) {
      console.log('Audio creation failed:', error);
    }
  }
  
  stopAudio() {
    if (this.audioNodes.oscillator1) {
      try {
        this.audioNodes.oscillator1.stop();
        this.audioNodes.oscillator2.stop();
      } catch (e) {
        // Already stopped
      }
    }
    this.audioNodes = {};
    this.audioPlaying = false;
    this.elements.audioToggle.textContent = '🎵';
  }
  
  toggleAudio() {
    if (this.audioPlaying) {
      this.stopAudio();
    } else {
      this.initAudio();
    }
  }
}

// ページ読み込み時に自動開始
document.addEventListener('DOMContentLoaded', () => {
  new BreathingApp();
});
