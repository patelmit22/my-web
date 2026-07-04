import type { AppState } from '../state/appState';
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
      ? `<video src="${pick.prev}" muted playsinline controls></video>`
      : `<img src="${pick.prev}" alt="${esc(pick.name)}">`}
    <div class="fun-preview-name">${esc(pick.name)}</div>
    <button class="fun-remove" data-action="remove-fun-media" data-index="${index}" title="remove">×</button>
  </div>`).join('');
}

export function renderFunPage(state: AppState): string {
  const owner = ownerLabel(state.funOwner);
  return `<section class="page active" id="page-fun">
    <div class="page-header">
      <div>
        <div class="page-title">Fun vault</div>
        <div class="page-sub">crazy photos and funny videos for you and Shrushti, saved through iCloud/Files instead of Firebase.</div>
      </div>
    </div>

    <div class="fun-panel">
      <div class="fun-hero">
        <div>
          <div class="fun-kicker">iCloud handoff</div>
          <h2>Pick memories, then save them to Files.</h2>
          <p>Photos are compressed before saving. Videos stay as the original file so Firebase storage is never used.</p>
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
          <div class="fun-help">When the share sheet opens, choose <strong>Save to Files</strong>, then pick iCloud Drive. That is the Apple-approved path.</div>
        </div>
      </div>

      <input id="fun-files" type="file" accept="image/*,video/*" multiple hidden>
      <div id="fun-previews" class="fun-previews">${renderFunPreviews(state)}</div>

      <button class="btn-primary fun-save" data-action="save-fun-icloud" ${!state.funMediaPicks.length ? 'disabled' : ''}>
        save ${state.funMediaPicks.length || ''} to iCloud / Files
      </button>
      ${state.funStatus ? `<div class="drive-status">${esc(state.funStatus)}</div>` : ''}
    </div>
  </section>`;
}
