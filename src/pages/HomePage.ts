import type { AppState } from '../state/appState';
import type { FinanceKind, Transaction } from '../types/models';
import { renderRoseLogo } from '../components/RoseLogo';
import { renderRoseGreeting } from '../components/RoseGreeting';
import { currency, greetingTime } from '../utils/format';
import { localDateKey, questionForDate } from '../data/qotdQuestions';
import { hasQotdAnswer } from '../utils/qotdScore';
import { DEFAULT_WORKOUT_PROGRAM } from '../data/workoutProgram';
import { dateFromSessionKey, dayTypeFor, sessionKey } from '../utils/workoutSchedule';

function kindOf(txn: Transaction): FinanceKind {
  return txn.kind || (txn.type === 'out' ? 'spending' : 'general');
}

export function renderHomePage(state: AppState): string {
  const greeting = greetingTime();
  const month = new Date().getMonth();
  const year = new Date().getFullYear();
  const monthTxns = state.txns.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() === month && date.getFullYear() === year;
  });
  const personalTxns = state.txns.filter(txn => {
    const kind = kindOf(txn);
    return kind === 'option' || kind === 'spending' || kind === 'general';
  });
  const personalBalance = personalTxns.reduce((sum, txn) => sum + (txn.type === 'in' ? Number(txn.amount) : -Number(txn.amount) || 0), 0);
  const monthIn = monthTxns
    .filter(txn => txn.type === 'in' && (kindOf(txn) === 'option' || kindOf(txn) === 'general'))
    .reduce((sum, txn) => sum + Number(txn.amount || 0), 0);
  const monthOut = monthTxns
    .filter(txn => txn.type === 'out' && (kindOf(txn) === 'spending' || kindOf(txn) === 'general'))
    .reduce((sum, txn) => sum + Number(txn.amount || 0), 0);
  const openTasks = state.tasks.filter(task => task.col !== 'done').length;
  const doneTasks = state.tasks.filter(task => task.col === 'done').length;
  const playing = state.games.filter(game => game.status === 'playing').length;
  const latestStory = state.entries[0]?.title || 'no story yet';
  const currentGame = state.games.find(game => game.now)?.name || state.games.find(game => game.status === 'playing')?.name || 'pick a game';
  const storyCount = state.entries.length;
  const driveCount = state.driveDocs.length;
  const todayKey = localDateKey();
  const todayUs = state.qotdDays.find(day => day.date === todayKey);
  const usAnswered = Boolean(todayUs && hasQotdAnswer(todayUs.me) && hasQotdAnswer(todayUs.her));
  const usQuestion = todayUs?.q || questionForDate(todayKey).q;
  const workoutDateKey = sessionKey();
  const workoutType = dayTypeFor(dateFromSessionKey(workoutDateKey));
  const workoutDay = (state.workoutProgram || DEFAULT_WORKOUT_PROGRAM)[workoutType];
  const workoutSession = state.workoutSessions.find(item => item.date === workoutDateKey);
  const workoutTotal = workoutType === 'rest' ? 0 : (workoutDay.exercises || []).length;
  const workoutDone = workoutSession ? Object.values(workoutSession.completed || {}).filter(Boolean).length : 0;
  const workoutStat = workoutType === 'rest' ? 'rest day today' : `${workoutDone}/${workoutTotal} done today`;
  const vibe = monthIn > 0
    ? 'money day'
    : openTasks > 0
      ? 'mission mode'
      : playing > 0
        ? 'game night'
        : 'quiet dashboard';
  const vibeLine = monthIn > 0
    ? `${currency(monthIn)} personal income logged this month`
    : openTasks > 0
      ? `${openTasks} work ${openTasks === 1 ? 'task' : 'tasks'} waiting`
      : playing > 0
        ? `${playing} game${playing === 1 ? '' : 's'} in progress`
        : 'write a story, add a game, or save a document';

  return `<section class="page active" id="page-home">
    ${renderRoseGreeting(state)}
    <div class="hero home-hero">
      <div class="home-hero-copy">
        <div class="home-kicker">mitpatel.family dashboard</div>
        <div class="hero-greet">good <span id="tod">${greeting.label}</span>, <span class="name" id="hello-name">${state.currentUser?.display.toLowerCase() || 'mit'}</span></div>
        <div class="hero-sub">your command center for money, work, memories, games, and Drive documents.</div>
        <div class="hero-time" id="now-time">${greeting.timestamp}</div>
      </div>
      <div class="home-orbit" aria-hidden="true">
        <span class="orbit-card orbit-money">${currency(personalBalance)}</span>
        <span class="orbit-core">mp</span>
        <span class="orbit-card orbit-work">${openTasks} work open</span>
      </div>
    </div>
    <div class="home-status-grid" id="home-status-grid">
      <div class="home-status"><span>personal income</span><strong id="home-personal-income">${currency(monthIn)}</strong></div>
      <div class="home-status"><span>personal spent</span><strong id="home-personal-spent" class="danger">${currency(monthOut)}</strong></div>
      <div class="home-status"><span>latest story</span><strong id="home-latest-story">${latestStory}</strong></div>
      <div class="home-status"><span>now playing</span><strong id="home-now-playing">${currentGame}</strong></div>
    </div>
    <div class="home-focus-strip">
      <div class="home-focus-card">
        <span>today's pulse</span>
        <strong>${vibe}</strong>
        <small>${vibeLine}</small>
      </div>
      <div class="home-focus-actions">
        <button data-action="nav" data-page="atlas">write story</button>
        <button data-action="nav" data-page="work">open work</button>
        <button data-action="nav" data-page="games">game shelf</button>
      </div>
      <div class="home-mini-stats">
        <span>${storyCount} stories</span>
        <span>${usAnswered ? 'us answered' : 'us waiting'}</span>
        <span>${driveCount} docs</span>
        <span>${doneTasks} done</span>
      </div>
    </div>
    ${renderWeeklyActivity(state)}
    <div class="tiles">
      <button class="tile tile-finance" data-action="nav" data-page="finance">
        <div class="tile-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 0 010 7H6"/></svg></div>
        <div class="tile-name">Finance</div><div class="tile-desc">income, spend, balance</div><div class="tile-stat" id="tile-finance-summary">${currency(personalBalance)} personal balance</div>
      </button>
      <button class="tile tile-work" data-action="nav" data-page="work">
        <div class="tile-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M16 4v16"/></svg></div>
        <div class="tile-name">Work board</div><div class="tile-desc">to-do, doing, done</div><div class="tile-stat" id="tile-work-summary">${openTasks} open · ${doneTasks} done</div>
      </button>
      <button class="tile tile-atlas" data-action="nav" data-page="atlas">
        <div class="tile-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 4h12a3 3 0 013 3v13a2 2 0 00-2-2H4z"/><path d="M4 4v16"/></svg></div>
        <div class="tile-name">Atlas</div><div class="tile-desc">our stories &amp; memories</div><div class="tile-stat" id="tile-atlas-count">${state.entries.length} ${state.entries.length === 1 ? 'entry' : 'entries'}</div>
      </button>
      <button class="tile tile-games" data-action="nav" data-page="games">
        <div class="tile-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="7" width="20" height="11" rx="3"/><path d="M7 12h3M8.5 10.5v3M14 11h.01M17 13h.01"/></svg></div>
        <div class="tile-name">Games</div><div class="tile-desc">what i'm playing</div><div class="tile-stat" id="tile-games-summary">${state.games.length} total · ${playing} playing</div>
      </button>
      <button class="tile tile-us" data-action="nav" data-page="us">
        <div class="tile-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z"/></svg></div>
        <div class="tile-name">Us</div><div class="tile-desc">daily question together</div><div class="tile-stat" id="tile-us-summary">${usAnswered ? 'revealed today' : usQuestion}</div>
      </button>
      ${state.currentUser?.role === 'me' ? `<button class="tile tile-train" data-action="nav" data-page="train">
        <div class="tile-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 7v10M18 7v10M3 10v4M21 10v4M7 12h10"/></svg></div>
        <div class="tile-name">Train</div><div class="tile-desc">push, pull, legs</div><div class="tile-stat" id="tile-train-summary">${workoutStat}</div>
      </button>` : ''}
      <button class="tile tile-documents" data-action="nav" data-page="documents">
        <div class="tile-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/></svg></div>
        <div class="tile-name">Documents</div><div class="tile-desc">Google Drive locker</div><div class="tile-stat" id="tile-documents-summary">${state.driveDocs.length} loaded</div>
      </button>
      <button class="tile tile-fun" data-action="nav" data-page="fun">
        <div class="tile-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M8 13l2.5-3 2 2.5 1.5-1.8L18 16H6z"/><circle cx="8" cy="9" r="1"/></svg></div>
        <div class="tile-name">Fun vault</div><div class="tile-desc">photos, videos, Firebase</div><div class="tile-stat" id="tile-fun-summary">${state.funPacks.length} saved</div>
      </button>
    </div>
  </section>`;
}

function renderWeeklyActivity(state: AppState): string {
  const week = state.weeklyActivity;
  if (!week?.suggestion) return '';
  const role = state.currentUser?.role || 'me';
  const seen = Boolean(week.seenBy?.[role]);
  return `<div class="weekly-tile">
    <div class="weekly-rose">${renderRoseLogo()}</div>
    <div>
      <span>this week from Rose</span>
      <p>${week.suggestion}</p>
    </div>
    <button data-action="love-weekly" ${seen ? 'disabled' : ''}>${seen ? 'saved for me' : 'love this'}</button>
  </div>`;
}
