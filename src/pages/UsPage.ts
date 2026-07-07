import type { AppState } from '../state/appState';
import type { QotdCategory, QotdDay, UserRole } from '../types/models';
import { fmtDate } from '../utils/format';
import { esc } from '../utils/sanitize';
import { localDateKey, questionForDate } from '../data/qotdQuestions';
import { fastestResponder, hasQotdAnswer, scoreQotdDays } from '../utils/qotdScore';

const CATEGORY_META: Record<QotdCategory, { label: string; icon: string }> = {
  sweet: { label: 'sweet', icon: '✿' },
  silly: { label: 'silly', icon: '🎲' },
  memory: { label: 'memory', icon: '🕰' },
  future: { label: 'future', icon: '⭐' },
  deep: { label: 'deep', icon: '🌊' },
  romantic: { label: 'romantic', icon: '💗' },
  spicy: { label: 'spicy', icon: '🔥' },
  task: { label: 'task', icon: '🎯' }
};

export function renderUsPage(state: AppState): string {
  const todayKey = localDateKey();
  const picked = questionForDate(todayKey);
  const storedToday = state.qotdDays.find(day => day.date === todayKey);
  const today: QotdDay = storedToday || {
    date: todayKey,
    q: picked.q,
    category: picked.category,
    me: null,
    her: null,
    votes: { meVotedHer: null, herVotedMe: null }
  };
  const userRole = state.currentUser?.role || 'me';
  const score = scoreQotdDays(state.qotdDays, state.qotdScoreView);
  const history = state.qotdDays
    .filter(day => day.date !== todayKey && hasQotdAnswer(day.me) && hasQotdAnswer(day.her))
    .sort((a, b) => b.date.localeCompare(a.date));

  return `<section class="page active us-page" id="page-us">
    <div class="page-header us-header">
      <div>
        <div class="page-title">Us</div>
        <div class="page-sub">one question, two answers, reveal after both of you write.</div>
      </div>
      <div class="us-streak">${score.answered}<span>answered together</span></div>
    </div>

    <div class="us-hero">
      <div class="us-question-card">
        ${categoryChip(today.category)}
        <div class="us-date">${fmtDate(`${today.date}T12:00:00`)}</div>
        <h2>${esc(today.q || picked.q)}</h2>
        ${renderTodayAnswerArea(today, state, userRole)}
      </div>
      ${renderScoreboard(state)}
    </div>

    <div class="us-history-head">
      <div>
        <h2>history</h2>
        <p>days only move here after both answers are in.</p>
      </div>
    </div>
    <div class="us-history">
      ${history.length ? history.map(renderHistoryDay).join('') : '<div class="empty-state">no finished days yet.</div>'}
    </div>
  </section>`;
}

function renderTodayAnswerArea(day: QotdDay, state: AppState, userRole: UserRole): string {
  const myAnswer = hasQotdAnswer(day[userRole]) ? day[userRole] : null;
  const bothAnswered = hasQotdAnswer(day.me) && hasQotdAnswer(day.her);
  if (!myAnswer) {
    return `<div class="us-answer-form">
      <textarea class="field-ta us-answer-ta" id="qotd-draft" placeholder="write your answer here...">${esc(state.qotdDraft)}</textarea>
      <button class="btn-primary us-save" data-action="save-qotd">lock in my answer</button>
    </div>`;
  }

  if (!bothAnswered) {
    return `<div class="us-waiting">
      <div class="us-locked-answer">
        <span>your answer is locked</span>
        <p>${esc(myAnswer.text)}</p>
      </div>
      <div class="us-hidden-card">
        <strong>${roleLabel(otherRole(userRole))}'s answer is still private</strong>
        <span>it opens here when both answers are saved.</span>
      </div>
    </div>`;
  }

  return `<div class="us-reveal-grid">
    ${renderAnswerCard(day, 'me', userRole)}
    ${renderAnswerCard(day, 'her', userRole)}
  </div>
  ${renderFirstBadge(day)}`;
}

function renderAnswerCard(day: QotdDay, role: UserRole, viewer: UserRole): string {
  const answer = day[role];
  if (!hasQotdAnswer(answer)) return '';
  const other = role !== viewer;
  const voteField = viewer === 'me' ? 'meVotedHer' : 'herVotedMe';
  const hasVotedForThis = other && Boolean(day.votes?.[voteField]);
  return `<article class="us-answer-card ${role}">
    <div class="us-answer-name">${roleLabel(role)}</div>
    <p>${esc(answer?.text || '')}</p>
    ${other ? `<button class="us-vote ${hasVotedForThis ? 'active' : ''}" data-action="vote-qotd" data-date="${esc(day.date)}" data-next="${hasVotedForThis ? 'false' : 'true'}">${hasVotedForThis ? 'favorite saved' : '❤️ your favorite'}</button>` : ''}
  </article>`;
}

function renderHistoryDay(day: QotdDay): string {
  return `<article class="us-history-day">
    <div class="us-history-top">
      <div>
        ${categoryChip(day.category)}
        <h3>${esc(day.q)}</h3>
      </div>
      <span>${fmtDate(`${day.date}T12:00:00`)}</span>
    </div>
    <div class="us-history-grid">
      <div class="us-history-answer me"><strong>Mit</strong><p>${esc(day.me?.text || '')}</p></div>
      <div class="us-history-answer her"><strong>Shrushti</strong><p>${esc(day.her?.text || '')}</p></div>
    </div>
    ${renderFirstBadge(day)}
  </article>`;
}

function renderScoreboard(state: AppState): string {
  const score = scoreQotdDays(state.qotdDays, state.qotdScoreView);
  const winner = score.me === score.her ? 'tied' : score.me > score.her ? 'Mit leads' : 'Shrushti leads';
  return `<aside class="us-score-card">
    <div class="us-score-head">
      <span>couple scoreboard</span>
      <strong>${winner}</strong>
    </div>
    <div class="us-score-tabs">
      ${scoreTab('week', state.qotdScoreView)}
      ${scoreTab('month', state.qotdScoreView)}
      ${scoreTab('all', state.qotdScoreView)}
    </div>
    <div class="us-score-row">
      <div><span>Mit</span><strong>${score.me}</strong><small>${score.fastest.me} fastest · ${score.votes.me} favorites</small></div>
      <div><span>Shrushti</span><strong>${score.her}</strong><small>${score.fastest.her} fastest · ${score.votes.her} favorites</small></div>
    </div>
    <div class="us-score-note">+1 for fastest after opening the question · +2 when the other person picks your favorite answer</div>
  </aside>`;
}

function scoreTab(view: AppState['qotdScoreView'], active: AppState['qotdScoreView']): string {
  return `<button class="${view === active ? 'active' : ''}" data-action="qotd-score-view" data-view="${view}">${view === 'all' ? 'all time' : view}</button>`;
}

function renderFirstBadge(day: QotdDay): string {
  const fastest = fastestResponder(day);
  return fastest ? `<div class="us-first-badge">⚡ ${roleLabel(fastest)} answered fastest</div>` : '';
}

function categoryChip(category: QotdCategory): string {
  const meta = CATEGORY_META[category] || CATEGORY_META.sweet;
  return `<span class="us-category">${meta.icon} ${meta.label}</span>`;
}

function otherRole(role: UserRole): UserRole {
  return role === 'me' ? 'her' : 'me';
}

function roleLabel(role: UserRole): string {
  return role === 'me' ? 'Mit' : 'Shrushti';
}
