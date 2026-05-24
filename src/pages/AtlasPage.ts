import type { AppState } from '../state/appState';
import type { AtlasEntry } from '../types/models';
import { fmtDate } from '../utils/format';
import { esc } from '../utils/sanitize';

export const moods = ['wild', 'happy', 'soft', 'chaotic', 'cozy', 'sad', 'unreal', 'in love', 'proud', 'grateful'];

export function filteredEntries(state: AppState): AtlasEntry[] {
  const input = document.getElementById('atlas-search') as HTMLInputElement | null;
  const q = (input?.value || '').toLowerCase().trim();
  let list = state.entries.filter(entry => state.entryFilter === 'all' || entry.who === state.entryFilter);
  if (q) {
    list = list.filter(entry =>
      (entry.title || '').toLowerCase().includes(q) ||
      (entry.body || '').toLowerCase().includes(q) ||
      (entry.thought || '').toLowerCase().includes(q) ||
      (entry.tags || []).some(tag => tag.toLowerCase().includes(q))
    );
  }
  return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function renderAtlasPage(state: AppState): string {
  const list = filteredEntries(state);
  return `<section class="page active" id="page-atlas">
    <div class="page-header"><div><div class="page-title">Atlas</div><div class="page-sub">all our crazy little stories, in one place</div></div><button class="btn-accent" data-action="open-entry-modal">+ write</button></div>
    <div class="atlas-wrap">
      <input class="auth-input" id="atlas-search" placeholder="search entries..." value="" data-action="atlas-search" style="margin-bottom:0.8rem">
      <div class="atlas-filter">
        ${(['all', 'me', 'her'] as const).map(filter => `<button class="gtab ${state.entryFilter === filter ? 'active' : ''}" data-action="atlas-filter" data-filter="${filter}">${filter === 'all' ? 'all' : filter === 'me' ? 'mine' : 'hers'}</button>`).join('')}
      </div>
      <div id="entries-list">${renderEntriesList(state, list)}</div>
    </div>
  </section>`;
}

export function renderEntriesList(state: AppState, list = filteredEntries(state)): string {
  if (!list.length) {
    return '<div style="text-align:center;color:var(--ink-mute);padding:3rem 1rem;font-family:var(--font-hand);font-size:1.3rem">nothing yet — hit + write to add the first</div>';
  }
  return list.map(entry => `<div class="entry">
    <div class="e-head"><span class="e-who ${entry.who}">${entry.who === 'me' ? 'Me' : 'Her'}</span><span class="e-date">${fmtDate(entry.date)}</span></div>
    <div class="e-title">${esc(entry.title)}</div><div class="e-body">${esc(entry.body)}</div>
    ${renderMedia(entry)}
    ${entry.thought ? `<div class="e-thought">"${esc(entry.thought)}"</div>` : ''}
    <div class="e-tags">${entry.mood ? `<span class="e-tag">${esc(entry.mood)}</span>` : ''}${(entry.tags || []).map(tag => `<span class="e-tag">${esc(tag)}</span>`).join('')}</div>
    ${entry.who === state.currentUser?.role ? `<button class="e-del" data-action="delete-entry" data-id="${entry.id}">delete</button>` : ''}
  </div>`).join('');
}

function renderMedia(entry: AtlasEntry): string {
  const media = entry.media || [];
  if (!media.length) return '';
  const shown = media.slice(0, 4);
  const extra = media.length - shown.length;
  const cls = media.length === 1 ? 'one' : media.length === 2 ? 'two' : 'many';
  return `<div class="media-grid ${cls}">${shown.map((item, index) => {
    const tag = item.type === 'video'
      ? `<video src="${item.data}" controls playsinline></video>`
      : `<img src="${item.data}" loading="lazy" data-action="open-lightbox" data-id="${entry.id}" data-index="${index}">`;
    return `<div class="m-item">${tag}${index === 3 && extra > 0 ? `<div class="m-more">+${extra + 1}</div>` : ''}</div>`;
  }).join('')}</div>`;
}

export function renderEntryModal(state: AppState): string {
  return `<div class="modal-backdrop" id="modal-entry">
    <div class="modal"><button class="modal-close" data-action="close-modal" data-modal="modal-entry">×</button>
      <div class="modal-title">new entry</div>
      <div class="field"><label class="field-label">title</label><input class="field-input" id="m-et"></div>
      <div class="field"><label class="field-label">the story</label><textarea class="field-ta" id="m-eb" placeholder="write it out..."></textarea></div>
      <div class="field"><label class="field-label">a thought</label><input class="field-input" id="m-eth" placeholder="one line that sums it up"></div>
      <div class="field"><label class="field-label">mood</label><div class="chips" id="m-emood">${moods.map(mood => `<button class="chip ${state.selectedMood === mood ? 'sel' : ''}" data-action="pick-mood" data-mood="${mood}">${mood}</button>`).join('')}</div></div>
      <div class="field"><label class="field-label">photos &amp; videos <span style="color:var(--ink-mute);font-weight:400">(up to 15)</span></label><div class="upload-box" data-action="choose-media">📷 🎥 tap to add</div><input type="file" id="m-efiles" accept="image/*,video/*" multiple style="display:none"><div class="preview-row" id="m-eprev">${renderMediaPreviews(state)}</div></div>
      <div class="field"><label class="field-label">tags <span style="color:var(--ink-mute);font-weight:400">(comma separated)</span></label><input class="field-input" id="m-etg"></div>
      <button class="btn-primary" id="m-save" data-action="save-entry">save entry ✦</button>
    </div>
  </div>`;
}

export function renderMediaPreviews(state: AppState): string {
  return state.mediaPicks.map((pick, index) => `<div class="prev-item">${pick.type === 'video' ? `<video src="${pick.prev}" muted></video>` : `<img src="${pick.prev}">`}<button class="prev-rm" data-action="remove-media" data-index="${index}">×</button></div>`).join('');
}
