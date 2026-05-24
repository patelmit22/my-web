import type { AppState } from '../state/appState';
import { greetingTime } from '../utils/format';

export function renderHomePage(state: AppState): string {
  const greeting = greetingTime();
  const month = new Date().getMonth();
  const year = new Date().getFullYear();
  const monthTxns = state.txns.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() === month && date.getFullYear() === year;
  });
  const balance = state.txns.reduce((sum, txn) => sum + (txn.type === 'in' ? Number(txn.amount) : -Number(txn.amount) || 0), 0);
  const openTasks = state.tasks.filter(task => task.col !== 'done').length;
  const doneTasks = state.tasks.filter(task => task.col === 'done').length;
  const playing = state.games.filter(game => game.status === 'playing').length;
  void monthTxns;

  return `<section class="page active" id="page-home">
    <div class="hero">
      <div class="hero-greet">good <span id="tod">${greeting.label}</span>, <span class="name" id="hello-name">${state.currentUser?.display.toLowerCase() || 'mit'}</span></div>
      <div class="hero-sub">your little command center — track money, work, memories, and games all in one place.</div>
      <div class="hero-time" id="now-time">${greeting.timestamp}</div>
    </div>
    <div class="tiles">
      <button class="tile" data-action="nav" data-page="finance" style="--tile-bg:linear-gradient(135deg,#22c55e,#16a34a);--tile-glow:rgba(34,197,94,0.25)">
        <div class="tile-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 0 010 7H6"/></svg></div>
        <div class="tile-name">Finance</div><div class="tile-desc">income, spend, balance</div><div class="tile-stat">$${balance.toFixed(0)} balance</div>
      </button>
      <button class="tile" data-action="nav" data-page="work" style="--tile-bg:linear-gradient(135deg,#22d3ee,#0891b2);--tile-glow:rgba(34,211,238,0.25)">
        <div class="tile-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M16 4v16"/></svg></div>
        <div class="tile-name">Work board</div><div class="tile-desc">to-do, doing, done</div><div class="tile-stat">${openTasks} open · ${doneTasks} done</div>
      </button>
      <button class="tile" data-action="nav" data-page="atlas" style="--tile-bg:linear-gradient(135deg,#f472b6,#db2777);--tile-glow:rgba(244,114,182,0.3)">
        <div class="tile-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 4h12a3 3 0 013 3v13a2 2 0 00-2-2H4z"/><path d="M4 4v16"/></svg></div>
        <div class="tile-name">Atlas</div><div class="tile-desc">our stories &amp; memories</div><div class="tile-stat">${state.entries.length} ${state.entries.length === 1 ? 'entry' : 'entries'}</div>
      </button>
      <button class="tile" data-action="nav" data-page="games" style="--tile-bg:linear-gradient(135deg,#7c5cff,#4f46e5);--tile-glow:rgba(124,92,255,0.3)">
        <div class="tile-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="7" width="20" height="11" rx="3"/><path d="M7 12h3M8.5 10.5v3M14 11h.01M17 13h.01"/></svg></div>
        <div class="tile-name">Games</div><div class="tile-desc">what i'm playing</div><div class="tile-stat">${state.games.length} total · ${playing} playing</div>
      </button>
    </div>
  </section>`;
}
