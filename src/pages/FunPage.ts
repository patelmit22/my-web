import type { AppState } from '../state/appState';
import type { FunPack } from '../types/models';
import { esc } from '../utils/sanitize';

function ownerLabel(owner: AppState['funOwner']): string {
  return owner === 'her' ? 'Shrushti' : 'Mit';
}

export function renderFunPreviews(state: AppState): string {
  if (!state.funMediaPicks.length) {
    return '<div class="fun-empty">no funny photos or videos selected yet</div>';
  }

  return state.funMediaPicks.map((pick, index) => `<div class="fun-preview">
    ${pick.type === 'video'
      ? `<video src="${pick.prev}" muted playsinline controls preload="metadata"></video>`
      : `<img src="${pick.prev}" alt="${esc(pick.name)}" loading="lazy" decoding="async">`}
    <div class="fun-preview-name">${esc(pick.name)}</div>
    <button class="fun-remove" data-action="remove-fun-media" data-index="${index}" title="remove">×</button>
  </div>`).join('');
}

function renderPackIcon(pack: FunPack): string {
  const first = pack.files.find(file => file.preview);
  if (first?.preview) {
    return `<img src="${first.preview}" alt="${esc(pack.title)} preview" loading="lazy" decoding="async">`;
  }
  const hasVideo = pack.files.some(file => file.type === 'video');
  const hasImage = pack.files.some(file => file.type === 'image');
  if (hasVideo && hasImage) return '<span>🎞️</span>';
  if (hasVideo) return '<span>🎥</span>';
  if (hasImage) return '<span>📸</span>';
  return '<span>✨</span>';
}

function renderFunPack(pack: FunPack): string {
  const date = new Date(pack.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const mediaLabel = `${pack.files.length} file${pack.files.length === 1 ? '' : 's'}`;
  const owner = ownerLabel(pack.owner);
  const visibleFiles = pack.files.slice(0, 4);

  return `<article class="fun-pack-card" data-action="open-fun-pack" data-id="${esc(pack.id)}" tabindex="0" role="button" aria-label="open ${esc(pack.title)}">
    <div class="fun-pack-cover ${pack.files.some(file => file.type === 'video') ? 'video' : ''}">
      ${renderPackIcon(pack)}
    </div>
    <div class="fun-pack-body">
      <div class="fun-pack-title">${esc(pack.title)}</div>
      <div class="fun-pack-meta">${owner} · ${date} · ${mediaLabel}</div>
      <div class="fun-pack-files">
        ${visibleFiles.map(file => `<span class="fun-pack-file">${file.type === 'video' ? '🎥' : '📸'} ${esc(file.name)}</span>`).join('')}
        ${pack.files.length > visibleFiles.length ? `<span class="fun-pack-file">+${pack.files.length - visibleFiles.length} more</span>` : ''}
      </div>
    </div>
    <button class="fun-pack-delete" data-action="delete-fun-pack" data-id="${esc(pack.id)}" title="remove saved preview">×</button>
  </article>`;
}

export function renderFunPacks(state: AppState): string {
  const packs = state.funPacks
    .filter(pack => pack.owner === state.funOwner)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (!packs.length) {
    return `<div class="fun-pack-empty">no saved ${ownerLabel(state.funOwner)} packs yet. save one and it will show here.</div>`;
  }

  return `<div class="fun-pack-grid">${packs.map(renderFunPack).join('')}</div>`;
}

export function renderFunPage(state: AppState): string {
  const owner = ownerLabel(state.funOwner);
  return `<section class="page active" id="page-fun">
    <div class="page-header">
      <div>
        <div class="page-title">Fun vault</div>
        <div class="page-sub">crazy photos and funny videos for you and Shrushti, saved in Firebase so you can open them anytime.</div>
      </div>
    </div>

    <div class="fun-panel">
      <div class="fun-hero">
        <div>
          <div class="fun-kicker">Firebase vault</div>
          <h2>Pick memories, then save them to the cloud.</h2>
          <p>Photos are compressed before saving. Videos upload to Firebase Storage so you can play them again from the saved cards.</p>
        </div>
        <div class="fun-orbit">
          <span>📸</span><span>🎥</span><span>☁️</span>
        </div>
      </div>

      <div class="fun-owner-tabs">
        <button class="fun-owner-tab ${state.funOwner === 'me' ? 'active' : ''}" data-action="select-fun-owner" data-owner="me">Mit fun</button>
        <button class="fun-owner-tab ${state.funOwner === 'her' ? 'active' : ''}" data-action="select-fun-owner" data-owner="her">Shrushti fun</button>
      </div>

      <div class="fun-form-grid">
        <button class="fun-drop" data-action="choose-fun-media">
          <span>+</span>
          choose ${owner} photos / videos
        </button>
        <div class="fun-fields">
          <label class="field-label" for="fun-title">folder / pack name</label>
          <input id="fun-title" class="field-input" type="text" placeholder="e.g. random funny night, beach clips, crazy day">
          <div class="fun-help">Saved packs show below as cards. Tap a card later to open the photos and videos.</div>
        </div>
      </div>

      <input id="fun-files" type="file" accept="image/*,video/*" multiple hidden>
      <div id="fun-previews" class="fun-previews">${renderFunPreviews(state)}</div>

      <button class="btn-primary fun-save" data-action="save-fun-icloud" ${!state.funMediaPicks.length ? 'disabled' : ''}>
        save ${state.funMediaPicks.length || ''} to Firebase vault
      </button>
      ${state.funStatus ? `<div class="drive-status">${esc(state.funStatus)}</div>` : ''}

      <div class="fun-saved-head">
        <div>
          <h3>saved in this vault</h3>
          <p>tap a card to open saved photos and videos from Firebase.</p>
        </div>
      </div>
      ${renderFunPacks(state)}
    </div>
  </section>`;
}
