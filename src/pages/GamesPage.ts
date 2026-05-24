import type { AppState } from '../state/appState';
import type { GameStatus } from '../types/models';
import { esc } from '../utils/sanitize';

const filters: Array<'all' | GameStatus> = ['all', 'playing', 'finished', 'wishlist', 'dropped'];

export function renderGamesPage(state: AppState): string {
  const now = state.games.find(game => game.now);
  const list = state.gameFilter === 'all' ? state.games : state.games.filter(game => game.status === state.gameFilter);
  return `<section class="page active" id="page-games">
    <div class="page-header"><div><div class="page-title">Games</div><div class="page-sub">your library, your way</div></div><button class="btn-accent" data-action="open-game-modal">+ add game</button></div>
    ${now ? `<div class="game-now"><div class="game-now-icon">🎮</div><div class="game-now-text"><div class="game-now-label">currently playing</div><div class="game-now-title">${esc(now.name)}</div><div class="game-now-platform">${esc(now.platform || '')}</div></div></div>` : ''}
    <div class="game-tabs">${filters.map(filter => `<button class="gtab ${state.gameFilter === filter ? 'active' : ''}" data-action="game-filter" data-filter="${filter}">${filter}</button>`).join('')}</div>
    <div class="games-grid">${list.length ? list.map(game => `<div class="game-card">
      <div class="game-cover" style="--g1:${game.c1 || '#4338ca'};--g2:${game.c2 || '#7c3aed'}">${game.cover ? `<img src="${esc(game.cover)}" onerror="this.style.display='none'">` : '🎮'}</div>
      <div class="game-name">${esc(game.name)}</div><div class="game-platform">${esc(game.platform || '')}</div><div class="game-status ${game.status}">${game.status}</div>
      <button class="game-del" data-action="delete-game" data-id="${esc(game.id)}">×</button>
    </div>`).join('') : '<div style="color:var(--ink-mute);font-size:0.9rem;padding:1rem">no games here yet</div>'}</div>
  </section>`;
}

export function renderGameModal(): string {
  return `<div class="modal-backdrop" id="modal-game">
    <div class="modal"><button class="modal-close" data-action="close-modal" data-modal="modal-game">×</button>
      <div class="modal-title">add a game</div>
      <div class="field"><label class="field-label">title</label><input class="field-input" id="m-gname"></div>
      <div class="field-row"><div class="field"><label class="field-label">platform</label><select class="field-sel" id="m-gplat"><option>PS5</option><option>PC</option><option>Switch</option><option>Xbox</option><option>Mobile</option><option>Other</option></select></div><div class="field"><label class="field-label">status</label><select class="field-sel" id="m-gstatus"><option value="playing">playing</option><option value="finished">finished</option><option value="wishlist">wishlist</option><option value="dropped">dropped</option></select></div></div>
      <div class="field"><label class="field-label">cover image URL (optional)</label><input class="field-input" id="m-gcover" placeholder="https://..."></div>
      <div class="field"><label class="field-label" style="display:flex;align-items:center;gap:0.5rem"><input type="checkbox" id="m-gnow" style="width:auto"> mark as currently playing</label></div>
      <button class="btn-primary" data-action="save-game">add game</button>
    </div>
  </div>`;
}
