import type { AppState } from '../state/appState';
import { roseChat } from '../api/rose';
import { morphHtml } from '../utils/dom';
import { esc } from '../utils/sanitize';
import { localDateKey, questionForDate } from '../data/qotdQuestions';
import { dayTypeFor, dateFromSessionKey, sessionKey } from '../utils/workoutSchedule';
import { DEFAULT_WORKOUT_PROGRAM } from '../data/workoutProgram';

let container: HTMLDivElement | null = null;
let draft = '';
let error = '';
let generation = 0;
const heart = '<svg viewBox="0 0 24 24" width="24" height="24" fill="white" aria-hidden="true"><path d="M12 21 3.2 12.4C-2 7.2 5.6-.8 12 5.6 18.4-.8 26 7.2 20.8 12.4Z"/></svg>';
let logoFailed = false;
const logo = () => logoFailed ? heart : '<img class="rose-logo" src="/rose.svg" alt="" width="34" height="34">';

export function mountRoseFab(state: AppState): void {
  if (!state.currentUser) { unmountRoseFab(); return; }
  if (container) { renderRoseFab(state); return; }
  try { state.roseModel = localStorage.getItem('rose.model') === 'sonnet' ? 'sonnet' : 'haiku'; } catch { state.roseModel = 'haiku'; }
  container = document.createElement('div');
  container.id = 'rose-container';
  document.body.append(container);
  container.addEventListener('click', event => {
    const target = (event.target as Element).closest<HTMLElement>('[data-action]');
    if (!target) return;
    if (target instanceof HTMLFormElement) { event.stopPropagation(); return; }
    event.preventDefault();
    event.stopPropagation();
    void handleRoseAction(state, target);
  });
  container.addEventListener('submit', event => {
    event.preventDefault();
    event.stopPropagation();
    void send(state);
  });
  container.addEventListener('input', event => {
    if (!(event.target instanceof HTMLTextAreaElement)) return;
    draft = event.target.value.slice(0, 4000);
    growInput();
    const button = container?.querySelector<HTMLButtonElement>('.rose-send');
    if (button) button.disabled = state.roseBusy || !draft.trim();
  });
  container.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.stopPropagation(); state.rosePanelOpen = false; renderRoseFab(state);
      container?.querySelector<HTMLButtonElement>('.rose-fab')?.focus();
    }
    if (event.target instanceof HTMLTextAreaElement && event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault(); event.stopPropagation(); void send(state);
    }
  });
  container.addEventListener('error', event => {
    if (event.target instanceof HTMLImageElement) { logoFailed = true; renderRoseFab(state); }
  }, true);
  renderRoseFab(state);
}

export function unmountRoseFab(): void {
  generation++;
  container?.remove(); container = null; draft = ''; error = '';
}

export function renderRoseFab(state: AppState): void {
  if (!container) return;
  container.hidden = !state.currentUser;
  const quick = quickAction(state);
  morphHtml(container, `<div id="rose-container" ${state.currentUser ? '' : 'hidden'}>
    <button type="button" class="rose-fab" data-action="${state.rosePanelOpen ? 'close-rose' : 'open-rose'}" aria-label="${state.rosePanelOpen ? 'close' : 'open'} Rose" aria-expanded="${state.rosePanelOpen}" aria-controls="rose-panel">${logo()}</button>
    <aside id="rose-panel" class="rose-panel ${state.rosePanelOpen ? 'open' : ''}" ${state.rosePanelOpen ? '' : 'inert'} aria-hidden="${!state.rosePanelOpen}" aria-label="Rose chat">
      <div class="rose-panel-header">
        <div class="rose-brand">${logo()} <strong>Rose</strong></div>
        <div class="rose-model-toggle" aria-label="answer mode">
          <button type="button" class="${state.roseModel === 'haiku' ? 'active' : ''}" aria-pressed="${state.roseModel === 'haiku'}" data-action="rose-model-toggle" data-value="haiku">⚡ fast</button>
          <button type="button" class="${state.roseModel === 'sonnet' ? 'active' : ''}" aria-pressed="${state.roseModel === 'sonnet'}" data-action="rose-model-toggle" data-value="sonnet">🧠 smart</button>
        </div>
        <button type="button" data-action="clear-rose" aria-label="clear chat">🗑</button>
        <button type="button" data-action="close-rose" aria-label="close Rose">×</button>
      </div>
      <div class="rose-messages" role="log" aria-live="polite">
        ${state.roseConvo.length ? state.roseConvo.map(message => `<div class="rose-msg rose-msg-${message.role}">${esc(message.content)}</div>`).join('') : '<p class="rose-empty">ask me anything — code, ideas, daily life, or a little company.</p>'}
        ${state.roseBusy ? '<div class="rose-msg rose-msg-assistant rose-loading" aria-label="Rose is thinking">...</div>' : ''}
        ${error ? `<div class="rose-error" role="alert">${esc(error)}</div>` : ''}
      </div>
      <div class="rose-quick"><button type="button" data-action="rose-quick" data-prefill="${esc(quick.prompt)}">${esc(quick.label)}</button></div>
      ${state.roseModel === 'sonnet' ? '<div class="rose-smart-note">smart mode uses more credits</div>' : ''}
      <form class="rose-input-row" data-action="send-rose">
        <textarea id="rose-input" aria-label="message Rose" placeholder="ask rose anything..." rows="1" maxlength="4000">${esc(draft)}</textarea>
        <button type="submit" class="rose-send" aria-label="send message" ${state.roseBusy || !draft.trim() ? 'disabled' : ''}>↑</button>
      </form>
    </aside>
  </div>`);
  const messages = container.querySelector<HTMLElement>('.rose-messages');
  if (messages) messages.scrollTop = messages.scrollHeight;
  growInput();
}

export async function handleRoseAction(state: AppState, target: HTMLElement): Promise<void> {
  switch (target.dataset.action) {
    case 'open-rose': state.rosePanelOpen = true; renderRoseFab(state); focusInput(); break;
    case 'close-rose': state.rosePanelOpen = false; renderRoseFab(state); break;
    case 'clear-rose':
      generation++; state.roseConvo = []; state.roseBusy = false; draft = ''; error = '';
      renderRoseFab(state); setInput(''); focusInput(); break;
    case 'rose-model-toggle':
      state.roseModel = target.dataset.value === 'sonnet' ? 'sonnet' : 'haiku';
      try { localStorage.setItem('rose.model', state.roseModel); } catch { /* Session mode still works. */ }
      renderRoseFab(state); break;
    case 'rose-quick': setInput(target.dataset.prefill || ''); focusInput(); break;
    case 'send-rose': await send(state); break;
  }
}

function setInput(value: string): void {
  draft = value.slice(0, 4000);
  const input = container?.querySelector<HTMLTextAreaElement>('#rose-input');
  if (input) { input.value = draft; input.dispatchEvent(new Event('input', { bubbles: true })); }
}
function focusInput(): void { container?.querySelector<HTMLTextAreaElement>('#rose-input')?.focus(); }
function growInput(): void {
  const input = container?.querySelector<HTMLTextAreaElement>('#rose-input');
  if (input) { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 140)}px`; }
}
async function send(state: AppState): Promise<void> {
  const text = draft.trim();
  if (!text || state.roseBusy || !state.currentUser) return;
  const requestGeneration = generation;
  state.roseConvo.push({ role: 'user', content: text });
  state.roseBusy = true; error = ''; setInput(''); renderRoseFab(state);
  try {
    const reply = await roseChat([...state.roseConvo], state.roseModel);
    if (requestGeneration === generation) state.roseConvo.push({ role: 'assistant', content: reply });
  } catch {
    if (requestGeneration === generation) {
      error = 'rose is unavailable right now. please try again.';
      state.roseConvo.pop(); setInput(text);
    }
  } finally {
    if (requestGeneration === generation) { state.roseBusy = false; renderRoseFab(state); focusInput(); }
  }
}

function quickAction(state: AppState): { label: string; prompt: string } {
  const display = state.currentUser?.display || 'me';
  switch (state.activePage as string) {
    case 'us': {
      const key = localDateKey();
      const q = state.qotdDays.find(day => day.date === key)?.q || questionForDate(key).q;
      return { label: "✨ help me answer today's question", prompt: `today's question is: "${q}". help me brainstorm 3 short honest answers from my perspective as ${display}.` };
    }
    case 'atlas': return { label: '✨ help me write this entry', prompt: "help me turn a few notes into a warm atlas entry. i'll paste the notes next." };
    case 'finance': {
      const now = new Date();
      const top = state.txns.filter(t => { const d = new Date(t.date); return t.type === 'out' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
        .sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5).map(t => `${t.name}: $${t.amount}`).join(', ');
      return { label: '✨ what should I cut back on', prompt: `here's this month's spending: ${top || 'none logged'}. what would you cut back?` };
    }
    case 'work': return { label: '✨ prioritize my week', prompt: `here are my open tasks: ${state.tasks.filter(t => t.col === 'todo' || t.col === 'doing').map(t => t.title).join(', ') || 'none'}. help me pick the 3 most important.` };
    case 'games': return { label: "✨ pick tonight's game", prompt: `here's what i'm playing / wishlist: ${state.games.map(g => `${g.name} (${g.status})`).join(', ') || 'none'}. pick one for tonight and say why.` };
    case 'train': {
      const day = dayTypeFor(dateFromSessionKey(sessionKey()));
      const exercises = (state.workoutProgram || DEFAULT_WORKOUT_PROGRAM)[day].exercises.map(e => e.name).join(', ');
      return { label: "✨ how's my form", prompt: `today is a ${day} day, exercises: ${exercises || 'rest'}. what's the most common form mistake to watch out for?` };
    }
    case 'queue': return { label: "✨ pick tonight's watch", prompt: "here's our queue: no items available in this dashboard. we've got ~2 hours tonight. help us pick one and say why in one sentence." };
    case 'roblox': return { label: '✨ pick us a game for tonight', prompt: `our roblox shelf isn't available in this dashboard. it's ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. suggest ONE game for us and say why.` };
    case 'canvas': return { label: '✨ draw something for me', prompt: 'suggest one warm, silly, or thoughtful drawing idea i could do on the canvas in under 2 minutes.' };
    default: return { label: '✨ ask me anything', prompt: '' };
  }
}
