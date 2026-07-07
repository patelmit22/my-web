import type { AppState } from '../state/appState';
import { esc } from '../utils/sanitize';

export function renderRoseGreeting(state: AppState): string {
  if (!state.currentUser || !state.roseGreeting || state.roseGreetingDismissed) return '';
  return `<div class="rose-greeting-toast">
    <div class="rose-greeting-avatar">🌹</div>
    <div>
      <strong>Rose</strong>
      <p>${esc(state.roseGreeting)}</p>
    </div>
    <button data-action="dismiss-rose-greeting" aria-label="dismiss Rose greeting">×</button>
  </div>`;
}
