import type { AppState } from '../state/appState';
import { renderEntryModal } from '../pages/AtlasPage';
import { renderTxnModal } from '../pages/FinancePage';
import { renderTaskModal } from '../pages/WorkPage';
import { renderGameDetailModal, renderGameModal } from '../pages/GamesPage';

export function renderModals(state: AppState): string {
  return `${renderEntryModal(state)}${renderTxnModal(state.txnType)}${renderTaskModal()}${renderGameModal(state)}${renderGameDetailModal(state)}
    <div class="lb" id="lb" data-action="close-lightbox"><button class="lb-x" data-action="close-lightbox">×</button><button class="lb-nav lb-p" data-action="lightbox-nav" data-dir="-1">‹</button><img class="lb-img" id="lb-img"><button class="lb-nav lb-n" data-action="lightbox-nav" data-dir="1">›</button></div>
    <div class="toast" id="toast"></div>`;
}
