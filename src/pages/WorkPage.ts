import type { AppState } from '../state/appState';
import type { WorkColumn } from '../types/models';
import { fmtDate } from '../utils/format';
import { esc } from '../utils/sanitize';

const columns: Array<{ key: WorkColumn; name: string }> = [
  { key: 'todo', name: 'to do' },
  { key: 'doing', name: 'doing' },
  { key: 'done', name: 'done' }
];

export function renderWorkPage(state: AppState): string {
  return `<section class="page active" id="page-work">
    <div class="page-header"><div><div class="page-title">Work board</div><div class="page-sub">drag tasks across columns as you make progress</div></div></div>
    <div class="board">${columns.map(column => {
      const tasks = state.tasks.filter(task => task.col === column.key);
      return `<div class="col"><div class="col-header"><div class="col-name"><span class="col-dot ${column.key}"></span>${column.name}</div><div class="col-count">${tasks.length}</div></div>
        <div class="cards">${tasks.map(task => `<div class="task">
          <div class="task-actions">
            ${column.key !== 'todo' ? `<button class="task-act" title="move left" data-action="move-task" data-id="${esc(task.id)}" data-dir="-1">←</button>` : ''}
            ${column.key !== 'done' ? `<button class="task-act" title="move right" data-action="move-task" data-id="${esc(task.id)}" data-dir="1">→</button>` : ''}
            <button class="task-act" title="delete" data-action="delete-task" data-id="${esc(task.id)}">×</button>
          </div>
          <div class="task-title">${esc(task.title)}</div><div class="task-meta">${fmtDate(task.date)} · ${esc(task.by || '')}</div>
        </div>`).join('')}</div>
        <button class="col-add" data-action="open-task-modal" data-col="${column.key}">+ add</button>
      </div>`;
    }).join('')}</div>
  </section>`;
}

export function renderTaskModal(): string {
  return `<div class="modal-backdrop" id="modal-task">
    <div class="modal"><button class="modal-close" data-action="close-modal" data-modal="modal-task">×</button>
      <div class="modal-title">new task</div>
      <div class="field"><label class="field-label">what needs doing?</label><input class="field-input" id="m-ktitle"></div>
      <div class="field"><label class="field-label">column</label><select class="field-sel" id="m-kcol"><option value="todo">to do</option><option value="doing">doing</option><option value="done">done</option></select></div>
      <button class="btn-primary" data-action="save-task">add</button>
    </div>
  </div>`;
}
