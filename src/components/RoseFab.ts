import type { AppState } from '../state/appState';
import type { PageId, RoseMessage, Transaction, WorkTask } from '../types/models';
import { renderRoseLogo } from './RoseLogo';
import { localDateKey, questionForDate } from '../data/qotdQuestions';
import { esc } from '../utils/sanitize';

interface QuickAction {
  label: string;
  prompt: string;
}

export function renderRoseFab(state: AppState): string {
  if (!state.currentUser) return '';
  const quick = quickActionForPage(state);
  const panelClass = state.rosePanelOpen ? 'open' : '';
  return `<div class="rose-widget ${panelClass}">
    <button class="rose-fab" data-action="toggle-rose" aria-label="ask Rose">
      ${renderRoseLogo('rose-logo rose-logo-fab', 'Rose')}
      <em>ask rose</em>
    </button>
    <aside class="rose-panel ${panelClass}" aria-hidden="${state.rosePanelOpen ? 'false' : 'true'}">
      <div class="rose-panel-head">
        <div><span class="rose-avatar">${renderRoseLogo()}</span><strong>Rose</strong></div>
        <div class="rose-head-actions">
          <button data-action="clear-rose">clear</button>
          <button data-action="close-rose" aria-label="close Rose">×</button>
        </div>
      </div>
      <div class="rose-messages" id="rose-messages">
        ${state.roseConvo.length ? state.roseConvo.map(renderRoseMessage).join('') : renderEmptyRose()}
        ${state.roseBusy ? '<div class="rose-thinking"><span></span><span></span><span></span> rose is thinking...</div>' : ''}
        ${state.roseError ? `<div class="rose-error">${esc(state.roseError)}</div>` : ''}
      </div>
      <div class="rose-composer">
        <button class="rose-quick" data-action="rose-quick" data-prompt="${esc(quick.prompt)}">${esc(quick.label)}</button>
        <div class="rose-input-row">
          <textarea id="rose-input" maxlength="4000" placeholder="ask rose anything...">${esc(state.roseInput)}</textarea>
          <button class="rose-send" data-action="send-rose" ${state.roseBusy || !state.roseInput.trim() ? 'disabled' : ''}>send</button>
        </div>
      </div>
    </aside>
  </div>`;
}

function renderRoseMessage(message: RoseMessage): string {
  const mine = message.role === 'user';
  return `<div class="rose-msg ${mine ? 'user' : 'assistant'}">
    ${mine ? '' : `<span class="rose-msg-avatar">${renderRoseLogo()}</span>`}
    <p>${esc(message.content)}</p>
  </div>`;
}

function renderEmptyRose(): string {
  return `<div class="rose-empty">
    <span class="rose-empty-mark">${renderRoseLogo('rose-logo rose-logo-empty')}</span>
    <p>i'm here when you want a little help, a soft idea, or a better sentence.</p>
  </div>`;
}

function quickActionForPage(state: AppState): QuickAction {
  const page = state.activePage;
  if (page === 'us') {
    const todayKey = localDateKey();
    const today = state.qotdDays.find(day => day.date === todayKey);
    const picked = questionForDate(todayKey);
    const question = today?.q || picked.q;
    return {
      label: "✨ help me answer today's question",
      prompt: `help me think of a sweet, honest answer to today's Us question: "${question}". give me 3 options in my voice.`
    };
  }
  if (page === 'atlas') {
    return {
      label: '✨ help me write this entry',
      prompt: 'help me turn my rough notes into a warm atlas entry. ask me two tiny questions first, then help me write it.'
    };
  }
  if (page === 'finance') {
    return {
      label: '✨ what should I cut back on',
      prompt: `look at my recent personal spending and give me a short, practical cut-back idea: ${topExpenses(state.txns)}`
    };
  }
  if (page === 'work') {
    return {
      label: '✨ prioritize my week',
      prompt: `help me prioritize these open work tasks in a calm order: ${openTasks(state.tasks)}`
    };
  }
  if (page === 'games') {
    return {
      label: "✨ pick tonight's game",
      prompt: `pick one game for tonight from this list and tell me why: ${state.games.map(game => `${game.name} (${game.status})`).join(', ') || 'no games added yet'}`
    };
  }
  return {
    label: '✨ surprise me',
    prompt: 'give me one thoughtful tiny thing I could do for Shrushti today.'
  };
}

function topExpenses(txns: Transaction[]): string {
  const now = new Date();
  return txns
    .filter(txn => txn.type === 'out' && ['spending', 'general', undefined].includes(txn.kind))
    .filter(txn => {
      const date = new Date(txn.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5)
    .map(txn => `${txn.name}: $${Number(txn.amount || 0).toFixed(2)}`)
    .join(', ') || 'no personal spending logged this month';
}

function openTasks(tasks: WorkTask[]): string {
  return tasks
    .filter(task => task.col !== 'done')
    .slice(0, 8)
    .map(task => `${task.title} (${task.col})`)
    .join(', ') || 'no open work tasks';
}
