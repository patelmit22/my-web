import type { CurrentUser, PageId } from '../types/models';

function icon(name: PageId | 'settings'): string {
  const icons = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12L12 3l9 9"/><path d="M5 10v10h14V10"/></svg>',
    finance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
    work: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M16 4v16"/></svg>',
    atlas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h12a3 3 0 013 3v13a2 2 0 00-2-2H4z"/><path d="M4 4v16"/></svg>',
    games: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="11" rx="3"/><path d="M7 12h3M8.5 10.5v3M14 11h.01M17 13h.01"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>'
  };
  return icons[name];
}

function navItem(page: PageId | 'settings', label: string, active: PageId, hidden = false): string {
  return `<button class="sb-item ${active === page ? 'active' : ''}" data-action="nav" data-page="${page}" ${hidden ? 'style="display:none"' : ''}>
    ${icon(page)}
    <span class="sb-tooltip">${label}</span>
  </button>`;
}

export function renderSidebar(active: PageId, user: CurrentUser): string {
  return `<aside class="sidebar">
    <div class="sb-logo">mp</div>
    <nav class="sb-nav">
      ${navItem('home', 'Home', active)}
      ${navItem('finance', 'Finance', active)}
      ${navItem('work', 'Work board', active)}
      ${navItem('atlas', 'Atlas', active)}
      ${navItem('games', 'Games', active)}
      ${navItem('settings', 'Settings', active, user.role !== 'me')}
    </nav>
    <div class="sb-bottom">
      <button class="sb-avatar ${user.role === 'her' ? 'her' : ''}" title="sign out" data-action="signout">${user.display[0].toUpperCase()}</button>
    </div>
  </aside>`;
}
