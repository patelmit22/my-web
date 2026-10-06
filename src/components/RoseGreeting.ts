import type { AppState } from '../state/appState';
import { esc } from '../utils/sanitize';

let timer: ReturnType<typeof setTimeout> | undefined;
let shown = false;

export function resetRoseGreeting(): void {
  clearTimeout(timer); timer = undefined; shown = false;
}

export function mountRoseGreeting(state: AppState, dismiss: () => void): void {
  if (shown || !state.roseGreeting || !document.querySelector('.rose-greeting-toast')) return;
  shown = true;
  timer = setTimeout(() => { state.roseGreeting = ''; dismiss(); }, 8000);
}

export function renderRoseGreeting(state: AppState): string {
  if (!state.currentUser || !state.roseGreeting) return '';
  return `<div class="rose-greeting-toast"><img class="rose-logo" src="/rose.svg" alt="" width="34" height="34"><p>${esc(state.roseGreeting)}</p><button type="button" data-action="dismiss-greeting" aria-label="dismiss greeting">×</button></div>`;
}
