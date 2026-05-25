import type { AppState } from '../state/appState';
import type { AtlasMedia, GameStatus } from '../types/models';
import { esc } from '../utils/sanitize';

const filters: Array<'all' | GameStatus> = ['all', 'playing', 'finished', 'wishlist', 'dropped'];

export function renderGamesPage(state: AppState): string {
  const now = state.games.find(game => game.now);
  const list = state.gameFilter === 'all' ? state.games : state.games.filter(game => game.status === state.gameFilter);
  return `<section class="page active" id="page-games">
    <div class="page-header"><div><div class="page-title">Games</div><div class="page-sub">your library, your way</div></div><button class="btn-accent" data-action="open-game-modal">+ add game</button></div>
    ${now ? `<button class="game-now" data-action="open-game-detail" data-id="${esc(now.id)}"><div class="game-now-icon">🎮</div><div class="game-now-text"><div class="game-now-label">currently playing</div><div class="game-now-title">${esc(now.name)}</div><div class="game-now-platform">${esc(now.platform || '')}</div>${now.story ? `<div class="game-now-story">${esc(now.story).slice(0, 140)}${now.story.length > 140 ? '...' : ''}</div>` : ''}</div></button>` : ''}
    <div class="game-tabs">${filters.map(filter => `<button class="gtab ${state.gameFilter === filter ? 'active' : ''}" data-action="game-filter" data-filter="${filter}">${filter}</button>`).join('')}</div>
    <div class="games-grid">${list.length ? list.map(game => `<article class="game-card" data-action="open-game-detail" data-id="${esc(game.id)}" tabindex="0">
      <div class="game-cover" style="--g1:${game.c1 || '#4338ca'};--g2:${game.c2 || '#7c3aed'}">${game.cover ? `<img src="${esc(game.cover)}" onerror="this.style.display='none'">` : '🎮'}</div>
      <div class="game-name">${esc(game.name)}</div><div class="game-platform">${esc(game.platform || '')}</div>
      ${game.story ? `<div class="game-card-story">${esc(game.story).slice(0, 90)}${game.story.length > 90 ? '...' : ''}</div>` : ''}
      <div class="game-card-meta">${game.media?.length ? `<span>${game.media.length} media</span>` : '<span>open details</span>'}${game.url ? '<span>link</span>' : ''}</div>
      <div class="game-status ${game.status}">${game.status}</div>
      <button class="game-del" data-action="delete-game" data-id="${esc(game.id)}">×</button>
    </article>`).join('') : '<div class="empty-inline">no games here yet</div>'}</div>
  </section>`;
}

export function renderGameModal(state: AppState): string {
  return `<div class="modal-backdrop" id="modal-game">
    <div class="modal game-modal"><button class="modal-close" data-action="close-modal" data-modal="modal-game">×</button>
      <div class="modal-title">add a game</div>
      <div class="modal-sub">save the game, what it means to you, links, photos, and small videos. Photos are compressed before saving.</div>
      <div class="field"><label class="field-label">title</label><input class="field-input" id="m-gname"></div>
      <div class="field-row"><div class="field"><label class="field-label">platform</label><select class="field-sel" id="m-gplat"><option>PS5</option><option>PC</option><option>Switch</option><option>Xbox</option><option>Mobile</option><option>Other</option></select></div><div class="field"><label class="field-label">status</label><select class="field-sel" id="m-gstatus"><option value="playing">playing</option><option value="finished">finished</option><option value="wishlist">wishlist</option><option value="dropped">dropped</option></select></div></div>
      <div class="field"><label class="field-label">cover image URL (optional)</label><input class="field-input" id="m-gcover" placeholder="https://..."></div>
      <div class="field">
        <label class="field-label">or upload cover / icon</label>
        <button class="media-drop" data-action="choose-game-cover">upload game picture</button>
        <input type="file" id="m-gcover-file" accept="image/*" hidden>
        <div class="media-help">uploaded cover is compressed automatically.</div>
        <div class="mprev" id="m-gcover-prev">${renderGameCoverPreview(state)}</div>
      </div>
      <div class="field"><label class="field-label">game / PS store / trailer URL (optional)</label><input class="field-input" id="m-gurl" placeholder="https://..."></div>
      <div class="field"><label class="field-label">PS5 clip URLs <span style="color:var(--ink-mute);font-weight:400">(one per line, no storage used)</span></label><textarea class="field-ta clip-url-ta" id="m-gclips" placeholder="paste PS App clip links here..."></textarea></div>
      <div class="field"><label class="field-label">game story / notes</label><textarea class="field-ta game-story-ta" id="m-gstory" placeholder="write what happened, why you liked it, where you are in the story, trophies, memories..."></textarea></div>
      <div class="field">
        <label class="field-label">photos & short videos</label>
        <button class="media-drop" data-action="choose-game-media">add photos or videos</button>
        <input type="file" id="m-gfiles" accept="image/*,video/*" multiple hidden>
        <div class="media-help">images compress automatically. videos are protected with an 8 MB limit so Firebase does not fill up.</div>
        <div class="mprev" id="m-gprev">${renderGameMediaPreviews(state)}</div>
      </div>
      <div class="field"><label class="field-label" style="display:flex;align-items:center;gap:0.5rem"><input type="checkbox" id="m-gnow" style="width:auto"> mark as currently playing</label></div>
      <button class="btn-primary" id="m-gsave" data-action="save-game">add game</button>
    </div>
  </div>`;
}

export function renderGameDetailModal(state: AppState): string {
  const game = state.games.find(item => item.id === state.selectedGameId);
  if (!game) {
    return `<div class="modal-backdrop" id="modal-game-detail"><div class="modal"><button class="modal-close" data-action="close-modal" data-modal="modal-game-detail">×</button><div class="modal-title">game not found</div></div></div>`;
  }
  return `<div class="modal-backdrop" id="modal-game-detail">
    <div class="modal game-detail-modal"><button class="modal-close" data-action="close-modal" data-modal="modal-game-detail">×</button>
      <div class="game-detail-hero">
        <div class="game-detail-cover" style="--g1:${game.c1 || '#4338ca'};--g2:${game.c2 || '#7c3aed'}">${game.cover ? `<img src="${esc(game.cover)}" onerror="this.style.display='none'">` : '🎮'}</div>
        <div class="game-detail-copy">
          <div class="game-status ${game.status} static">${game.status}</div>
          <div class="modal-title">${esc(game.name)}</div>
          <div class="game-detail-meta">${esc(game.platform || 'No platform')} ${game.now ? '· currently playing' : ''}</div>
          ${game.url ? `<a class="game-link" href="${esc(game.url)}" target="_blank" rel="noopener">open saved link ↗</a>` : ''}
        </div>
      </div>
      ${game.story ? `<div class="game-detail-story">${esc(game.story)}</div>` : '<div class="game-detail-empty">no story added yet.</div>'}
      ${renderClipLinks(game.clips || [])}
      ${renderGameMedia(game.media || [])}
      <div class="game-detail-edit">
        <div class="field"><label class="field-label">update game URL</label><input class="field-input" id="m-gd-url" value="${esc(game.url || '')}" placeholder="https://..."></div>
        <div class="field"><label class="field-label">cover image URL</label><input class="field-input" id="m-gd-cover" value="${esc(game.cover || '')}" placeholder="https://..."></div>
        <div class="field">
          <label class="field-label">replace cover / icon with upload</label>
          <button class="media-drop" data-action="choose-game-detail-cover">upload game picture</button>
          <input type="file" id="m-gd-cover-file" accept="image/*" hidden>
          <div class="media-help">uploaded cover is compressed automatically.</div>
          <div class="mprev" id="m-gd-cover-prev">${renderGameCoverPreview(state)}</div>
        </div>
        <div class="field"><label class="field-label">PS5 clip URLs <span style="color:var(--ink-mute);font-weight:400">(one per line, no storage used)</span></label><textarea class="field-ta clip-url-ta" id="m-gd-clips">${esc((game.clips || []).join('\n'))}</textarea></div>
        <div class="field"><label class="field-label">add or edit story</label><textarea class="field-ta game-story-ta" id="m-gd-story">${esc(game.story || '')}</textarea></div>
        <div class="field">
          <label class="field-label">add more photos or short videos</label>
          <button class="media-drop" data-action="choose-game-detail-media">add media to this game</button>
          <input type="file" id="m-gd-files" accept="image/*,video/*" multiple hidden>
          <div class="media-help">new images compress automatically. videos must stay under 8 MB.</div>
          <div class="mprev" id="m-gd-prev">${renderGameMediaPreviews(state)}</div>
        </div>
      </div>
      <div class="detail-actions"><button class="btn-ghost" data-action="close-modal" data-modal="modal-game-detail">close</button><button class="btn-primary" id="m-gd-save" data-action="save-game-detail">save game changes</button></div>
    </div>
  </div>`;
}

export function renderGameMediaPreviews(state: AppState): string {
  if (!state.gameMediaPicks.length) return '';
  return state.gameMediaPicks.map((pick, index) => `<div class="preview">
    ${pick.type === 'video' ? `<video src="${pick.prev}" muted></video>` : `<img src="${pick.prev}" alt="">`}
    <button data-action="remove-game-media" data-index="${index}">×</button>
  </div>`).join('');
}

export function renderGameCoverPreview(state: AppState): string {
  if (!state.gameCoverPicks.length) return '';
  return state.gameCoverPicks.map((pick, index) => `<div class="preview">
    <img src="${pick.prev}" alt="">
    <button data-action="remove-game-cover" data-index="${index}">×</button>
  </div>`).join('');
}

function renderClipLinks(clips: string[]): string {
  if (!clips.length) return '';
  return `<div class="clip-links">${clips.map((clip, index) => `<a href="${esc(clip)}" target="_blank" rel="noopener">watch PS5 clip ${index + 1} ↗</a>`).join('')}</div>`;
}

function renderGameMedia(media: AtlasMedia[]): string {
  if (!media.length) return '';
  return `<div class="game-detail-media">${media.map(item => `<div class="game-media-item">
    ${item.type === 'video' ? `<video src="${item.data}" controls playsinline></video>` : `<img src="${item.data}" alt="${esc(item.name || 'game photo')}">`}
  </div>`).join('')}</div>`;
}
