import { renderRoseGreeting } from '../components/RoseGreeting';
import type { AppState } from '../state/appState';
import type { FinanceKind, Transaction } from '../types/models';
import { currency, greetingTime } from '../utils/format';
import { esc } from '../utils/sanitize';
import { localDateKey } from '../data/qotdQuestions';

function kindOf(txn: Transaction): FinanceKind {
  return txn.kind || (txn.type === 'out' ? 'spending' : 'general');
}

export function renderHomePage(state: AppState): string {
  const greeting = greetingTime();
  const display = state.currentUser?.display || 'Mit';
  const balance = state.txns
    .filter(txn => ['option', 'spending', 'general'].includes(kindOf(txn)))
    .reduce((sum, txn) => sum + (txn.type === 'in' ? Number(txn.amount) : -Number(txn.amount) || 0), 0);
  const latestStory = state.entries
    .filter(entry => !entry.section || entry.section === 'stories')
    .slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const visit = state.nextVisit && /^\d{4}-\d{2}-\d{2}$/.test(state.nextVisit.date) && state.nextVisit.date >= localDateKey()
    ? state.nextVisit : null;
  const visitDate = visit ? new Date(`${visit.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  return `<section class="page active home-page" id="page-home" data-period="${greeting.label === 'morning' ? 'morning' : 'evening'}">
    <div class="bg-dotgrid" aria-hidden="true"></div>
    <div class="bg-orb bg-orb--a" aria-hidden="true"></div>
    <div class="bg-orb bg-orb--b" aria-hidden="true"></div>
    <div class="bg-grain" aria-hidden="true"></div>
    <header class="home-header">
      <div class="brand"><div class="brand__badge">MP</div><span class="brand__label">mitpatel.family</span></div>
      <div class="header-actions">
        <button type="button" class="glass balance-pill" data-bind="balance" data-action="nav" data-page="finance" aria-label="Balance ${currency(balance)} — open Money">${currency(balance)}</button>
        <button type="button" class="glass icon-btn" data-action="nav" data-page="settings" aria-label="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 0 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 0 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"/></svg>
        </button>
      </div>
    </header>
    ${renderRoseGreeting(state)}
    <section class="hero rise">
      <div class="avatar" aria-hidden="true">${esc(display.charAt(0).toUpperCase())}</div>
      <div class="hero__text">
        <h1 class="hero__title"><span data-bind="greeting">Good ${greeting.label}</span>, <span class="hero__name">${esc(display)}</span>.</h1>
        <p class="hero__subtitle">A quiet home for your days, your people, and everything worth keeping.</p>
        <p class="hero__quote">&quot;Small things, done daily, add up.&quot;</p>
        <div class="hero__meta"><span class="hero__datetime" data-bind="datetime">${esc(greeting.timestamp)}</span></div>
      </div>
    </section>
    <section class="feature-row">
      <div class="glass rise feature-card feature-card--story">
        <div class="feature-card__icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fde68a" stroke-width="1.8" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
        <div class="feature-card__body">
          <div class="feature-card__label">LATEST STORY</div>
          <div class="feature-card__title ${latestStory ? '' : 'feature-card__title--muted'}" data-bind="latest-story-title">${esc(latestStory?.title || 'No stories yet')}</div>
          <a href="#atlas" class="feature-card__link" data-bind="latest-story-link" data-action="home-story" ${latestStory ? `data-id="${latestStory.id}"` : ''}>${latestStory ? 'Read it again →' : '+ Write one →'}</a>
        </div>
      </div>
      <div class="glass rise feature-card feature-card--upcoming">
        <div class="feature-card__icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" stroke-width="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/></svg></div>
        <div class="feature-card__body">
          <div class="feature-card__label">UPCOMING</div>
          <div class="feature-card__title ${visit ? '' : 'feature-card__title--muted'}" data-bind="upcoming-title">${visit ? esc(visit.note?.trim() || 'Next visit') : 'Nothing scheduled yet'}</div>
          ${visit ? `<div class="feature-card__date">${esc(visitDate)}</div>` : ''}
          <a href="#settings" class="feature-card__link feature-card__link--blue" data-bind="upcoming-link" data-action="edit-next-visit">${visit ? 'View plans →' : '+ Add one →'}</a>
        </div>
      </div>
    </section>
    ${renderRoseWeekly(state)}
    <section class="tile-grid" aria-label="Your dashboard">
      <a href="#finance" data-action="nav" data-page="finance" class="glass rise tile tile--money"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#86efac" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 10h6M9.5 14h5"/></svg><span>Money</span></a>
      <a href="#work" data-action="nav" data-page="work" class="glass rise tile tile--work"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" stroke-width="1.8" aria-hidden="true"><rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="16" rx="1.5"/></svg><span>Work</span></a>
      <a href="#games" data-action="nav" data-page="games" class="glass rise tile tile--games"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d8b4fe" stroke-width="1.8" aria-hidden="true"><rect x="2" y="8" width="20" height="8" rx="4"/><path d="M6 12h2m-1-1v2"/><circle cx="16" cy="11" r="0.6" fill="#d8b4fe"/><circle cx="18" cy="13" r="0.6" fill="#d8b4fe"/></svg><span>Games</span></a>
      <a href="#documents" data-action="nav" data-page="documents" class="glass rise tile tile--documents"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5eead4" stroke-width="1.8" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg><span>Documents</span></a>
    </section>
    <div class="bottom-vignette" aria-hidden="true"></div>
  </section>`;
}

/** Refresh the existing greeting and color variant without replaying entrance animations. */
export function mountHomePage(root: ParentNode = document): () => void {
  const update = () => {
    const page = root.querySelector<HTMLElement>('.home-page');
    if (!page) return;
    const greeting = greetingTime();
    page.dataset.period = greeting.label === 'morning' ? 'morning' : 'evening';
    const label = page.querySelector('[data-bind="greeting"]');
    const datetime = page.querySelector('[data-bind="datetime"]');
    if (label) label.textContent = `Good ${greeting.label}`;
    if (datetime) datetime.textContent = greeting.timestamp;
  };
  update();
  const timer = window.setInterval(update, 60000);
  return () => window.clearInterval(timer);
}

function renderRoseWeekly(state: AppState): string {
  const week = state.weeklyActivity;
  if (!week?.suggestion) return '';
  const seen = Boolean(week.seenBy?.[state.currentUser?.role || 'me']);
  return `<div class="weekly-tile"><img class="rose-logo" src="/rose.svg" alt="" width="34" height="34"><div><strong>this week's fun from Rose</strong><p>${esc(week.suggestion)}</p></div><button type="button" data-action="rose-weekly-seen" ${seen ? 'disabled' : ''}>${seen ? 'saved for me' : 'love this'}</button></div>`;
}
