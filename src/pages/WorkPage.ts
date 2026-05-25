import type { AppState } from '../state/appState';
import type { AtlasMedia, WorkColumn } from '../types/models';
import { fmtDate } from '../utils/format';
import { esc } from '../utils/sanitize';

const columns: Array<{ key: WorkColumn; name: string }> = [
  { key: 'todo', name: 'to do' },
  { key: 'doing', name: 'doing' },
  { key: 'done', name: 'done' }
];

export function renderWorkPage(state: AppState): string {
  return `<section class="page active" id="page-work">
    <div class="page-header"><div><div class="page-title">Work board</div><div class="page-sub">add work, attach photos, and move it from to do → doing → done</div></div><button class="btn-accent" data-action="open-task-modal" data-col="todo">+ add work</button></div>
    <div class="board">${columns.map(column => {
      const tasks = state.tasks.filter(task => task.col === column.key);
      return `<div class="col"><div class="col-header"><div class="col-name"><span class="col-dot ${column.key}"></span>${column.name}</div><div class="col-count">${tasks.length}</div></div>
        <div class="cards">${tasks.map(task => `<article class="task" data-action="open-task-detail" data-id="${esc(task.id)}" tabindex="0">
          <div class="task-actions">
            <button class="task-act" title="edit" data-action="open-task-detail" data-id="${esc(task.id)}">edit</button>
            ${column.key !== 'todo' ? `<button class="task-act" title="move left" data-action="move-task" data-id="${esc(task.id)}" data-dir="-1">←</button>` : ''}
            ${column.key !== 'done' ? `<button class="task-act" title="move right" data-action="move-task" data-id="${esc(task.id)}" data-dir="1">→</button>` : ''}
            ${column.key !== 'done' ? `<button class="task-act done" title="mark done" data-action="set-task-column" data-id="${esc(task.id)}" data-col="done">done</button>` : ''}
            <button class="task-act" title="delete" data-action="delete-task" data-id="${esc(task.id)}">×</button>
          </div>
          <div class="task-title">${esc(task.title)}</div>
          ${task.note ? `<div class="task-note">${esc(task.note).slice(0, 110)}${task.note.length > 110 ? '...' : ''}</div>` : ''}
          ${task.media?.length ? `<div class="task-photo-strip">${renderTaskMedia(task.media)}</div>` : ''}
          <div class="task-meta">${fmtDate(task.date)} · ${esc(task.by || '')}</div>
        </article>`).join('')}</div>
        <button class="col-add" data-action="open-task-modal" data-col="${column.key}">+ add</button>
      </div>`;
    }).join('')}</div>
  </section>`;
}

export function renderTaskModal(state: AppState): string {
  return `<div class="modal-backdrop" id="modal-task">
    <div class="modal work-modal"><button class="modal-close" data-action="close-modal" data-modal="modal-task">×</button>
      <div class="modal-title">new work</div>
      <div class="modal-sub">write the job, add notes, and attach pictures from your Mac or camera.</div>
      <div class="field"><label class="field-label">what needs doing?</label><input class="field-input" id="m-ktitle"></div>
      <div class="field"><label class="field-label">details / notes</label><textarea class="field-ta work-note-ta" id="m-knote" placeholder="what is broken, what to check, parts needed, next step..."></textarea></div>
      <div class="field"><label class="field-label">column</label><select class="field-sel" id="m-kcol"><option value="todo">to do</option><option value="doing">doing</option><option value="done">done</option></select></div>
      <div class="field">
        <label class="field-label">pictures</label>
        <button class="media-drop" data-action="choose-work-media">take or upload pictures</button>
        <input type="file" id="m-kfiles" accept="image/*" capture="environment" multiple hidden>
        <div class="media-help">pictures compress automatically before saving.</div>
        <div class="mprev" id="m-kprev">${renderWorkMediaPreviews(state)}</div>
      </div>
      <button class="btn-primary" id="m-ksave" data-action="save-task">add work</button>
    </div>
  </div>`;
}

export function renderTaskDetailModal(state: AppState): string {
  const task = state.tasks.find(item => item.id === state.selectedTaskId);
  if (!task) {
    return `<div class="modal-backdrop" id="modal-task-detail"><div class="modal"><button class="modal-close" data-action="close-modal" data-modal="modal-task-detail">×</button><div class="modal-title">work not found</div></div></div>`;
  }
  return `<div class="modal-backdrop" id="modal-task-detail">
    <div class="modal work-modal"><button class="modal-close" data-action="close-modal" data-modal="modal-task-detail">×</button>
      <div class="modal-title">edit work</div>
      <div class="field"><label class="field-label">work title</label><input class="field-input" id="m-kd-title" value="${esc(task.title)}"></div>
      <div class="field"><label class="field-label">status</label><select class="field-sel" id="m-kd-col">
        ${columns.map(col => `<option value="${col.key}" ${task.col === col.key ? 'selected' : ''}>${col.name}</option>`).join('')}
      </select></div>
      <div class="field"><label class="field-label">details / notes</label><textarea class="field-ta work-note-ta" id="m-kd-note">${esc(task.note || '')}</textarea></div>
      ${task.media?.length ? `<div class="work-detail-media">${renderTaskMedia(task.media)}</div>` : '<div class="game-detail-empty">no pictures attached yet.</div>'}
      <div class="field">
        <label class="field-label">add more pictures</label>
        <button class="media-drop" data-action="choose-work-detail-media">take or upload pictures</button>
        <input type="file" id="m-kd-files" accept="image/*" capture="environment" multiple hidden>
        <div class="media-help">new pictures compress automatically before saving.</div>
        <div class="mprev" id="m-kd-prev">${renderWorkMediaPreviews(state)}</div>
      </div>
      <div class="detail-actions"><button class="btn-ghost" data-action="close-modal" data-modal="modal-task-detail">close</button><button class="btn-primary" id="m-kd-save" data-action="save-task-detail">save work changes</button></div>
    </div>
  </div>`;
}

export function renderWorkMediaPreviews(state: AppState): string {
  if (!state.workMediaPicks.length) return '';
  return state.workMediaPicks.map((pick, index) => `<div class="preview">
    <img src="${pick.prev}" alt="">
    <button data-action="remove-work-media" data-index="${index}">×</button>
  </div>`).join('');
}

function renderTaskMedia(media: AtlasMedia[]): string {
  return media.filter(item => item.type === 'image').map(item => `<img src="${item.data}" alt="${esc(item.name || 'work photo')}">`).join('');
}
