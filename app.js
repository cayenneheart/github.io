// Mai-mee Breathing Timer App with Routines
// Features: auto-start timer, routines management, XP/level system
(function () {
  'use strict';

  // === CONSTANTS ===
  const ROUTINES_KEY = "maimee.routines.v1";
  const STATS_KEY = "maimee.stats.v1";
  
  // === UTILITIES ===
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

  function todayStr() {
    return new Date().toISOString().split('T')[0];
  }

  function isYesterday(dateStr) {
    if (!dateStr) return false;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0] === dateStr;
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // === DOM ELEMENTS ===
  var root = document;
  var timerEl = root.getElementById('timer');
  var circle = root.getElementById('breathingCircle');
  var instruction = root.getElementById('instruction');
  var viewTimer = root.getElementById('view-timer');
  var viewDone = root.getElementById('view-done');
  var viewRoutines = root.getElementById('view-routines');
  var viewAdd = root.getElementById('view-add');
  var backBtn = root.getElementById('backButton');
  var maimeeBtn = root.getElementById('maimeeButton');
  var toast = root.getElementById('toast');

  // === TIMER PARAMS ===
  var totalSec = parseInt(qs('sec')) || 20;
  if (totalSec <= 0) totalSec = 20;
  var pattern = parsePattern(qs('pattern'));
  var back_url = qs('back_url');
  var back_label = qs('back_label') || '戻る';
  var maimee_url = qs('maimee_url') || '/';

  // label
  if (back_label && backBtn) backBtn.textContent = back_label;

  // === TIMER STATE ===
  var startTime = null;
  var endTime = null;
  var rafId = null;
  var intervalId = null;
  var timerRunning = false;

  // === ROUTINES DATA ===
  var routines = [];
  var stats = {};

  // === VIEW MANAGEMENT ===
  function showView(viewName) {
    console.log('showView called with:', viewName); // デバッグログ
    console.log('Available views:', {
      timer: !!viewTimer,
      done: !!viewDone,
      routines: !!viewRoutines
    });
    
  [viewTimer, viewDone, viewRoutines, viewAdd].forEach(function(view) {
      if (view) {
        view.classList.remove('active');
        view.setAttribute('aria-hidden', 'true');
      }
    });
    
    if (viewName === 'timer' && viewTimer) {
      viewTimer.classList.add('active');
      viewTimer.setAttribute('aria-hidden', 'false');
    }
    else if (viewName === 'done' && viewDone) {
      viewDone.classList.add('active');
      viewDone.setAttribute('aria-hidden', 'false');
    }
    else if (viewName === 'routines' && viewRoutines) {
      viewRoutines.classList.add('active');
      viewRoutines.setAttribute('aria-hidden', 'false');
      console.log('Routines view activated');
    }
    else if (viewName === 'add' && viewAdd) {
      viewAdd.classList.add('active');
      viewAdd.setAttribute('aria-hidden', 'false');
      var nt = document.getElementById('new-title');
      if (nt) setTimeout(()=>nt.focus(),50);
    }
    
    console.log('Current active view:', document.querySelector('.view.active')?.id);
  }

  // ハッシュ(#routines など)によるルーティング
  function routeFromLocation() {
    var hash = (location.hash || '').replace('#', '');
  if (hash === 'routines' || hash === '') {
      // データを都度ロード（他タブでの変更反映用）
  stopTimer();
      routines = loadRoutines();
      stats = loadStats();
      checkDateRollover();
      renderRoutines();
      renderStats();
      showView('routines');
      return;
    }
  if (hash === 'add') { showView('add'); return; }
    if (hash === 'done') {
      showView('done');
      return;
    }
    if (hash === 'timer' || hash === '') {
      showView('timer');
    }
  }

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 2400);
  }

  // === TIMER FUNCTIONS ===
  function phaseFor(elapsed) {
    var p = pattern;
    var cycleDuration = p[0] + p[1] + p[2];
    var timeInCycle = elapsed % (cycleDuration * 1000);
    
    var inhaleTime = p[0] * 1000;
    var holdTime = p[1] * 1000;
    var exhaleTime = p[2] * 1000;
    
    if (timeInCycle < inhaleTime) {
      return { phase: 'inhale', progress: timeInCycle / inhaleTime };
    } else if (timeInCycle < inhaleTime + holdTime) {
      return { phase: 'hold', progress: (timeInCycle - inhaleTime) / holdTime };
    } else {
      return { phase: 'exhale', progress: (timeInCycle - inhaleTime - holdTime) / exhaleTime };
    }
  }

  function updateUI(remainingMs) {
    var remaining = Math.max(0, Math.ceil(remainingMs / 1000));
    if (timerEl) timerEl.textContent = remaining;
    
    var elapsed = Date.now() - startTime;
    var phaseInfo = phaseFor(elapsed);
    
    if (circle) {
      circle.classList.remove('inhale', 'hold', 'exhale');
      circle.classList.add(phaseInfo.phase);
    }
    
    if (instruction) {
      var text = phaseInfo.phase === 'inhale' ? '吸って' : 
                 phaseInfo.phase === 'hold' ? '止める' : '吐いて';
      instruction.textContent = text;
    }
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
    showView('timer');
    updateUI(totalSec * 1000);
    intervalId = setInterval(tick, 150);
    rafId = requestAnimationFrame(function frame() {
      tick();
      rafId = requestAnimationFrame(frame);
    });
  timerRunning = true;
  }

  function finish() {
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    showView('done');
    var doneHeading = document.getElementById('done-heading');
    if (doneHeading) doneHeading.focus();
    timerRunning = false;
  }

  function stopTimer() {
    if (!timerRunning) return;
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    timerRunning = false;
  }

  // === STORAGE FUNCTIONS ===
  function loadRoutines() {
    try {
      var stored = localStorage.getItem(ROUTINES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  function saveRoutines() {
    try {
      localStorage.setItem(ROUTINES_KEY, JSON.stringify(routines));
    } catch (e) {
      showToast('保存に失敗しました');
    }
  }

  function loadStats() {
    try {
      var stored = localStorage.getItem(STATS_KEY);
      return stored ? JSON.parse(stored) : {
        xp: 0,
        level: 1,
        streak: 0,
        lastDoneDate: '',
        todayTotal: 0,
        todayDate: todayStr()
      };
    } catch (e) {
      return {
        xp: 0,
        level: 1,
        streak: 0,
        lastDoneDate: '',
        todayTotal: 0,
        todayDate: todayStr()
      };
    }
  }

  function saveStats() {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (e) {
      showToast('統計の保存に失敗しました');
    }
  }

  // === ROUTINES FUNCTIONS ===
  function getSeedRoutines() {
    return [
      {
        id: generateId(),
        title: "深呼吸",
        durationSec: 30,
        emoji: "",
        category: "休憩",
        pinned: false,
        counts: { total: 0, today: 0, todayDate: todayStr() },
        lastDoneAt: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: generateId(),
        title: "水を飲む",
        durationSec: 60,
        emoji: "",
        category: "健康",
        pinned: false,
        counts: { total: 0, today: 0, todayDate: todayStr() },
        lastDoneAt: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: generateId(),
        title: "肩回し",
        durationSec: 180,
        emoji: "",
        category: "運動",
        pinned: false,
        counts: { total: 0, today: 0, todayDate: todayStr() },
        lastDoneAt: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];
  }

  function addRoutine(title, durationSec) {
    var routine = {
      id: generateId(),
      title: title.trim(),
      durationSec: parseInt(durationSec) || 20,
  emoji: "",
      category: "",
      pinned: false,
      counts: { total: 0, today: 0, todayDate: todayStr() },
      lastDoneAt: 0,
      createdAt: Date.now(),
  updatedAt: Date.now(),
  xp: 0,
  level: 1
    };
    
    routines.unshift(routine);
    saveRoutines();
    renderRoutines();
    return routine;
  }

  function getRandomEmoji() { return ""; }

  function completeRoutine(id) {
    var routine = routines.find(function(r) { return r.id === id; });
    if (!routine) return;
    
    var today = todayStr();
    
    // 日付ロールオーバー処理
    if (routine.counts.todayDate !== today) {
      routine.counts.today = 0;
      routine.counts.todayDate = today;
    }
    
    if (stats.todayDate !== today) {
      stats.todayTotal = 0;
      stats.todayDate = today;
    }
    
    // カウント更新
    routine.counts.total++;
    routine.counts.today++;
    routine.lastDoneAt = Date.now();
    
    // XP計算・付与
  var xpGain = Math.max(5, Math.round(routine.durationSec / 10) * 5);
    stats.xp += xpGain;
    stats.level = Math.floor(stats.xp / 100) + 1;
  routine.xp = (routine.xp || 0) + xpGain;
  routine.level = Math.floor((routine.xp || 0) / 100) + 1;
    
    // ストリーク更新
    if (stats.lastDoneDate === today) {
      // 今日既にやった → 変更なし
    } else if (isYesterday(stats.lastDoneDate)) {
      stats.streak++; // 継続
    } else {
      stats.streak = 1; // リセット
    }
    stats.lastDoneDate = today;
    stats.todayTotal++;
    
    // 保存・UI更新
    saveRoutines();
    saveStats();
    renderRoutines();
    renderStats();
    showToast('+' + xpGain + 'XP！ ' + routine.title + ' 完了');
    
    // ボタンアニメーション
    var checkBtn = document.querySelector('[data-routine-id="' + id + '"] .check-btn');
    if (checkBtn) {
      checkBtn.classList.add('completed');
      setTimeout(function() {
        checkBtn.classList.remove('completed');
      }, 600);
    }
  }

  function deleteRoutine(id) {
    if (confirm('このルーティーンを削除しますか？')) {
      routines = routines.filter(function(r) { return r.id !== id; });
      saveRoutines();
      renderRoutines();
      closeModal();
    }
  }

  function editRoutine(id, title, durationSec) {
    var routine = routines.find(function(r) { return r.id === id; });
    if (routine) {
      routine.title = title.trim();
      routine.durationSec = parseInt(durationSec) || 20;
      routine.updatedAt = Date.now();
      saveRoutines();
      renderRoutines();
      closeModal();
    }
  }

  function togglePin(id) {
    var routine = routines.find(function(r) { return r.id === id; });
    if (routine) {
      routine.pinned = !routine.pinned;
      routine.updatedAt = Date.now();
      saveRoutines();
      renderRoutines();
    }
  }

  // === RENDERING FUNCTIONS ===
  function renderRoutines() {
    console.log('renderRoutines called, routines.length:', routines.length); // デバッグログ
    
    var container = document.getElementById('routines-container');
    var emptyState = document.getElementById('empty-state');
    var routinesList = document.getElementById('routines-list');
    
    console.log('DOM elements:', {
      container: !!container,
      emptyState: !!emptyState,
      routinesList: !!routinesList
    });
    
    if (!container || !routinesList) {
      console.warn('Required DOM elements not found');
      return;
    }
    
    if (routines.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      routinesList.style.display = 'none';
      console.log('Showing empty state');
      return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    routinesList.style.display = 'block';
    
    // ソート: pinned → updatedAt降順
    var sorted = routines.slice().sort(function(a, b) {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
    
    routinesList.innerHTML = '';
    
    sorted.forEach(function(routine) {
      var li = document.createElement('li');
      li.className = 'routine-item' + (routine.pinned ? ' pinned' : '');
      li.setAttribute('data-routine-id', routine.id);
      
      var xp = routine.xp || 0;
      var level = routine.level || 1;
      var xpPct = xp % 100;
      li.innerHTML = [
  '<div class="routine-emoji">' + (routine.emoji || '•') + '</div>',
        '<div class="routine-info">',
        '  <h3 class="routine-title">' + escapeHtml(routine.title) + '</h3>',
        '  <div class="routine-meta">',
        '    <span>Lv.' + level + '</span>',
        '    <span>' + xp + 'XP</span>',
        '    <span>' + routine.durationSec + '秒</span>',
        '    <span>今日:' + routine.counts.today + '</span>',
        '  </div>',
        '  <div class="mini-bar"><div class="mini-fill" style="width:'+xpPct+'%"></div></div>',
        '</div>',
        '<div class="routine-actions">',
        '  <button class="check-btn" data-action="complete" aria-label="完了">✓</button>',
        '  <button class="menu-btn" data-action="menu" aria-label="メニュー">⋯</button>',
        '</div>'
      ].join('');
      
      routinesList.appendChild(li);
    });
    
    console.log('Rendered', sorted.length, 'routines');
  }

  function renderStats() {
    var todayCount = document.getElementById('today-count');
    var streakCount = document.getElementById('streak-count');
    var levelCount = document.getElementById('level-count');
    var xpBar = document.getElementById('xp-bar');
    var xpText = document.getElementById('xp-text');
    
    if (todayCount) todayCount.textContent = stats.todayTotal + '回';
    if (streakCount) streakCount.textContent = stats.streak + '日';
    if (levelCount) levelCount.textContent = stats.level;
    
    var xpInLevel = stats.xp % 100;
    var xpToNext = 100 - xpInLevel;
    
    if (xpBar) xpBar.style.width = xpInLevel + '%';
    if (xpText) xpText.textContent = '次まで ' + xpToNext + 'XP';
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // === MODAL FUNCTIONS ===
  var currentEditId = null;
  
  function openModal(routineId) {
    var modal = document.getElementById('edit-modal');
  var titleInput = document.getElementById('edit-title');
  var durationSelect = document.getElementById('edit-duration');
    
    if (!modal) return;
    
    currentEditId = routineId;
    var routine = routines.find(function(r) { return r.id === routineId; });
    
    if (routine) {
      titleInput.value = routine.title;
      var opts = [30,60,180,300,600,900];
      if(!opts.includes(routine.durationSec)) opts.push(routine.durationSec);
      opts.sort(function(a,b){return a-b;});
      durationSelect.innerHTML = opts.map(v=>'<option value="'+v+'">'+(v<60? v+'秒': (v/60)+'分')+'</option>').join('');
      durationSelect.value = routine.durationSec;
    }
    
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    titleInput.focus();
  }

  function closeModal() {
    var modal = document.getElementById('edit-modal');
    if (modal) {
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      currentEditId = null;
    }
  }

  // === EVENT HANDLERS ===
  function handleRoutineClick(e) {
    var routineItem = e.target.closest('.routine-item');
    if (!routineItem) return;
    
    var routineId = routineItem.getAttribute('data-routine-id');
    var action = e.target.getAttribute('data-action');
    
    if (action === 'complete') {
      e.target.disabled = true;
      setTimeout(function() { e.target.disabled = false; }, 1000);
      completeRoutine(routineId);
    } else if (action === 'menu') {
      openModal(routineId);
    }
  }

  function handleAddRoutine() {
  // deprecated (inline form removed)
  }

  function handleSeedClick(e) {
    if (!e.target.classList.contains('seed-btn')) return;
    
    var title = e.target.getAttribute('data-title');
    var duration = parseInt(e.target.getAttribute('data-duration'));
  addRoutine(title, duration);
  }

  function handleEditSubmit(e) {
    e.preventDefault();
    
    var titleInput = document.getElementById('edit-title');
  var durationSelect = document.getElementById('edit-duration');
    
    var title = titleInput.value.trim();
  var duration = parseInt(durationSelect.value) || 30;
    
    if (!title || title.length < 1 || title.length > 40) {
      showToast('1〜40文字で入力してください');
      return;
    }
    
    if (duration < 30 || duration > 900) {
      showToast('30〜900秒で入力してください');
      return;
    }
    
    editRoutine(currentEditId, title, duration);
  }

  function handleDeleteClick() {
    if (currentEditId) {
      deleteRoutine(currentEditId);
    }
  }

  // === BUTTON HANDLERS (TIMER) ===
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
      console.log('mai-mee button clicked');
      // 直接遷移ではなくハッシュを更新（履歴/再読込対応）
      if (location.hash !== '#routines') {
  stopTimer();
        location.hash = 'routines';
      } else {
        // 既にハッシュがある場合も再ルーティング
  stopTimer();
        routeFromLocation();
      }
    });
  }

  // === ADD VIEW EVENTS ===
  var fab = document.getElementById('fab-add');
  if (fab) {
    fab.addEventListener('click', function(){ location.hash = 'add'; });
  }
  var addForm = document.getElementById('add-task-form');
  if (addForm) {
    addForm.addEventListener('submit', function(e){
      e.preventDefault();
      var title = document.getElementById('new-title').value.trim();
  var dur = parseInt(document.getElementById('new-duration').value) || 30;
  if(!title){ showToast('タイトル必須'); return; }
  if(dur<30||dur>900){ showToast('30〜900秒'); return; }
  addRoutine(title,dur);
      location.hash='routines';
    });
  }
  var cancelAdd = document.getElementById('cancel-add');
  if (cancelAdd) {
    cancelAdd.addEventListener('click', function(){ location.hash='routines'; });
  }

  // === INITIALIZATION ===
  function checkDateRollover() {
    var today = todayStr();
    
    // 各ルーティーンの日付チェック
    routines.forEach(function(routine) {
      if (routine.counts.todayDate !== today) {
        routine.counts.today = 0;
        routine.counts.todayDate = today;
      }
    });
    
    // 統計の日付チェック
    if (stats.todayDate !== today) {
      stats.todayTotal = 0;
      stats.todayDate = today;
    }
  }

  function initializeRoutines() {
    routines = loadRoutines();
    stats = loadStats();
    
    checkDateRollover();
    
    // 初回起動時のシード
    if (routines.length === 0) {
      // シードはまだ追加しない（空状態で3つのボタンを表示）
    }
    
    renderRoutines();
    renderStats();
  }

  // === AUTO START LOGIC ===
  function shouldAutoStart() {
  // ルーティーン画面を直接開いている場合は自動スタートしない
  if (location.hash === '#routines') return false;
  return true; // それ以外は自動スタート
  }

  // === DOCUMENT READY ===
  document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM loaded, initializing...'); // デバッグログ
    
    // ルーティーン機能を初期化
    initializeRoutines();
    
    // DOM要素の存在確認
    console.log('DOM elements check:', {
      viewRoutines: !!viewRoutines,
      routinesContainer: !!document.getElementById('routines-container'),
      maimeeBtn: !!maimeeBtn
    });
    
    // イベントリスナーを設定
    var routinesContainer = document.getElementById('routines-container');
    if (routinesContainer) {
      routinesContainer.addEventListener('click', handleRoutineClick);
      routinesContainer.addEventListener('click', handleSeedClick);
      console.log('Routines container event listeners added');
    }
    
    var addBtn = document.getElementById('add-routine-btn');
    if (addBtn) {
      addBtn.addEventListener('click', handleAddRoutine);
      console.log('Add button event listener added');
    }
    
    var titleInput = document.getElementById('routine-title');
    if (titleInput) {
      titleInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleAddRoutine();
      });
    }
    
    var editForm = document.getElementById('edit-form');
    if (editForm) {
      editForm.addEventListener('submit', handleEditSubmit);
    }
    
    var deleteBtn = document.getElementById('delete-routine');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', handleDeleteClick);
    }
    
    var modalClose = document.getElementById('modal-close');
    if (modalClose) {
      modalClose.addEventListener('click', closeModal);
    }
    
    var modal = document.getElementById('edit-modal');
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
      });
    }
    
    // ルート適用（デフォルトは routines）
    routeFromLocation();
    window.addEventListener('hashchange', function(){
      routeFromLocation();
      if(location.hash==='#timer' && !timerRunning){ setTimeout(start,120); }
    });
    // 初回 #timer の場合のみスタート
    if (location.hash==='#timer') setTimeout(start,120);
    
    console.log('Initialization complete');
  });

})();