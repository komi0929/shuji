/* ======================================
   CYBER SURVIVOR — Leaderboard (Supabase)
   ====================================== */
const Leaderboard = (() => {
  'use strict';

  const SUPABASE_URL = 'https://mounixlvppmueddrdbxc.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vdW5peGx2cHBtdWVkZHJkYnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NjE0MzMsImV4cCI6MjA4OTAzNzQzM30.Q8m649yPOJzgHqofe89NJ9199fj0FNieST5uvaJbRIQ';

  let db = null;
  let currentTab = 'alltime'; // alltime | today
  let lastScore = 0;

  function init() {
    if (db) return;
    if (typeof supabase === 'undefined') { console.warn('Supabase not loaded'); return; }
    db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }

  // === API ===
  async function fetchTop10() {
    init();
    if (!db) return [];
    const { data, error } = await db
      .from('leaderboard')
      .select('*')
      .order('score', { ascending: false })
      .limit(10);
    return error ? [] : data;
  }

  async function fetchTodayTop10() {
    init();
    if (!db) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data, error } = await db
      .from('leaderboard')
      .select('*')
      .gte('created_at', today.toISOString())
      .order('score', { ascending: false })
      .limit(10);
    return error ? [] : data;
  }

  async function isTop10(score) {
    init();
    if (!db) return true; // fallback: allow entry
    const { data, error } = await db
      .from('leaderboard')
      .select('score')
      .order('score', { ascending: false })
      .limit(10);
    if (error || !data) return true;
    if (data.length < 10) return true;
    return score > data[data.length - 1].score;
  }

  async function submit(name, score, wave, hits) {
    init();
    if (!db) return null;
    const { data, error } = await db
      .from('leaderboard')
      .insert([{ name, score, wave, hits }])
      .select();
    return error ? null : data;
  }

  // === UI ===
  function showPanel() {
    const panel = document.getElementById('leaderboard-panel');
    if (panel) { panel.classList.add('visible'); refreshBoard(); }
  }

  function hidePanel() {
    const panel = document.getElementById('leaderboard-panel');
    if (panel) panel.classList.remove('visible');
  }

  function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.lb-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    refreshBoard();
  }

  async function refreshBoard() {
    const tbody = document.getElementById('lb-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:rgba(255,255,255,0.4)">読み込み中...</td></tr>';

    const data = currentTab === 'today' ? await fetchTodayTop10() : await fetchTop10();

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:rgba(255,255,255,0.4)">まだ記録がありません</td></tr>';
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    tbody.innerHTML = data.map((row, i) => {
      const rank = i < 3 ? medals[i] : `${i + 1}`;
      const isMe = row.score === lastScore;
      const cls = isMe ? 'lb-row lb-me' : 'lb-row';
      const rankCls = i < 3 ? `lb-rank lb-rank-${i + 1}` : 'lb-rank';
      const date = new Date(row.created_at);
      const timeStr = `${date.getMonth() + 1}/${date.getDate()}`;
      return `<tr class="${cls}">
        <td class="${rankCls}">${rank}</td>
        <td class="lb-name">${escapeHtml(row.name)}</td>
        <td class="lb-score">${row.score.toLocaleString()}</td>
        <td class="lb-wave">W${row.wave}</td>
        <td class="lb-date">${timeStr}</td>
      </tr>`;
    }).join('');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Show name input if TOP 10
  async function onGameOver(score, wave, hits) {
    lastScore = score;
    const nameInput = document.getElementById('lb-name-input-area');
    if (!nameInput) return;

    const qualified = await isTop10(score);
    if (qualified && score > 0) {
      nameInput.classList.add('visible');
      const input = document.getElementById('lb-name');
      if (input) { input.value = ''; input.focus(); }
    } else {
      nameInput.classList.remove('visible');
    }
  }

  async function submitFromUI() {
    const input = document.getElementById('lb-name');
    const btn = document.getElementById('lb-submit-btn');
    if (!input || !btn) return;

    const name = input.value.trim();
    if (!name || name.length < 1 || name.length > 8) {
      input.classList.add('shake');
      setTimeout(() => input.classList.remove('shake'), 400);
      return;
    }

    btn.disabled = true;
    btn.textContent = '送信中...';

    const scoreEl = document.getElementById('result-score');
    const waveEl = document.getElementById('result-wave');
    const hitsEl = document.getElementById('result-kills');
    const score = parseInt(scoreEl?.textContent || '0', 10);
    const wave = parseInt(waveEl?.textContent || '1', 10);
    const hits = parseInt(hitsEl?.textContent || '0', 10);

    await submit(name, score, wave, hits);

    btn.textContent = '登録完了！';
    const nameArea = document.getElementById('lb-name-input-area');
    if (nameArea) {
      setTimeout(() => {
        nameArea.classList.remove('visible');
        showPanel();
      }, 600);
    }
  }

  // === INIT LISTENERS ===
  function bindEvents() {
    // Tab switching
    document.querySelectorAll('.lb-tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    // Submit button
    const submitBtn = document.getElementById('lb-submit-btn');
    if (submitBtn) submitBtn.addEventListener('click', submitFromUI);
    // Name input enter key
    const nameInput = document.getElementById('lb-name');
    if (nameInput) nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitFromUI(); });
    // Close button
    const closeBtn = document.getElementById('lb-close');
    if (closeBtn) closeBtn.addEventListener('click', hidePanel);
    // Ranking button on result screen
    const rankBtn = document.getElementById('game-ranking-btn');
    if (rankBtn) rankBtn.addEventListener('click', showPanel);
  }

  // Auto-bind when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }

  return { fetchTop10, fetchTodayTop10, isTop10, submit, showPanel, hidePanel, onGameOver, refreshBoard };
})();
