import { cleanAuthError, configureAuthPersistence, onAuthChanged, resolveCurrentUser, signIn, signOut } from './api/authApi';
import {
  deleteEntry,
  deleteGame,
  deleteTask,
  deleteTransaction,
  type DataMap,
  type DataPath,
  removeHerConfig,
  saveEntry as saveEntryApi,
  saveGame as saveGameApi,
  saveHerConfig,
  saveTask,
  saveTransaction,
  subscribeHerConfig,
  subscribeList,
  updateTaskColumn
} from './api/databaseApi';
import { renderSidebar } from './components/Sidebar';
import { Lightbox } from './components/Lightbox';
import { openModal, closeModal } from './components/Modal';
import { renderModals } from './components/Modals';
import { Toast } from './components/Toast';
import { connectDrive, deleteDriveDoc, driveCacheAge, isDriveConnected, listDriveDocs, loadCachedDriveDocs, uploadDriveDoc, wasDriveConnected } from './api/driveApi';
import { state } from './state/appState';
import type { AtlasEntry, AtlasSection, DriveOwner, FinanceKind, Game, GameStatus, PageId, Transaction, WorkColumn, WorkTask } from './types/models';
import { checked, formValue, qs } from './utils/dom';
import { fileToPick, releasePicks, serializeMedia } from './utils/media';
import {
  filteredEntries,
  renderAtlasPage,
  renderEntriesList,
  renderFinancePage,
  renderGameCoverPreview,
  renderDocumentsPage,
  renderGameMediaPreviews,
  renderGamesPage,
  renderHomePage,
  renderMediaPreviews,
  renderSettingsPage,
  renderWorkMediaPreviews,
  renderWorkPage,
  renderAuthPage
} from './pages';

export class DashboardApp {
  private readonly toast = new Toast();
  private readonly lightbox = new Lightbox();
  private readonly unsubs: Array<() => void> = [];
  private readonly reportedDataErrors = new Set<string>();
  private driveAutoLoadKey = '';

  constructor(private readonly root: HTMLElement) {}

  async start(): Promise<void> {
    await configureAuthPersistence();
    this.bindGlobalEvents();
    onAuthChanged(async user => {
      if (!user) {
        this.disposeDataSubscriptions();
        state.currentUser = null;
        this.renderAuth();
        return;
      }
      state.currentUser = await resolveCurrentUser(user.email || '');
      state.activePage = 'home';
      this.hydrateCachedData();
      this.renderApp();
      this.replaceHistory('home');
      this.subscribeToData();
    });
  }

  private renderAuth(): void {
    this.root.innerHTML = renderAuthPage();
  }

  private renderApp(): void {
    if (!state.currentUser) {
      this.renderAuth();
      return;
    }
    this.root.innerHTML = `<div id="app-screen" class="screen active">
      ${renderSidebar(state.activePage, state.currentUser)}
      <main class="main">${this.renderCurrentPage()}</main>
    </div>
    <div id="modal-root">${renderModals(state)}</div>`;
  }

  private renderView(): void {
    if (!state.currentUser) {
      this.renderAuth();
      return;
    }
    const main = document.querySelector<HTMLElement>('.main');
    const modalRoot = document.getElementById('modal-root');
    if (!main || !modalRoot) {
      this.renderApp();
      return;
    }
    this.syncSidebarActiveState();
    main.innerHTML = this.renderCurrentPage();
    modalRoot.innerHTML = renderModals(state);
  }

  private renderMainOnly(): void {
    const main = document.querySelector<HTMLElement>('.main');
    if (!main) {
      this.renderApp();
      return;
    }
    this.syncSidebarActiveState();
    main.innerHTML = this.renderCurrentPage();
  }

  private renderModalsOnly(): void {
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) {
      this.renderApp();
      return;
    }
    modalRoot.innerHTML = renderModals(state);
  }

  private syncSidebarActiveState(): void {
    document.querySelectorAll<HTMLElement>('.sb-item[data-page]').forEach(item => {
      item.classList.toggle('active', item.dataset.page === state.activePage);
    });
  }

  private renderCurrentPage(): string {
    switch (state.activePage) {
      case 'finance': return renderFinancePage(state);
      case 'work': return renderWorkPage(state);
      case 'atlas': return renderAtlasPage(state);
      case 'games': return renderGamesPage(state);
      case 'documents': return renderDocumentsPage(state);
      case 'settings': return renderSettingsPage(state);
      case 'home':
      default: return renderHomePage(state);
    }
  }

  private bindGlobalEvents(): void {
    document.addEventListener('submit', event => {
      if ((event.target as HTMLElement).id === 'auth-form') {
        event.preventDefault();
        void this.handleSignIn();
      }
    });

    document.addEventListener('click', event => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!target) return;
      event.preventDefault();
      void this.handleAction(target, event);
    });

    document.addEventListener('input', event => {
      const target = event.target as HTMLElement;
      if (target.id === 'atlas-search') {
        state.atlasSearch = (target as HTMLInputElement).value;
        this.refreshEntriesList();
      }
      if (target instanceof HTMLInputElement && target.classList.contains('doc-rename-input')) {
        const index = Number(target.dataset.docIndex || -1);
        if (index >= 0) state.docFileNames[index] = target.value;
      }
    });

    document.addEventListener('error', event => {
      const target = event.target as HTMLElement;
      if (target instanceof HTMLImageElement && target.classList.contains('cover-img')) {
        target.hidden = true;
      }
    }, true);

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.open').forEach(modal => closeModal(modal.id));
        this.lightbox.close();
      }
    });

    window.addEventListener('popstate', () => {
      if (!state.currentUser) return;
      const page = this.pageFromHash() || 'home';
      this.navigate(page, false);
    });

    window.addEventListener('hashchange', () => {
      if (!state.currentUser) return;
      const page = this.pageFromHash() || 'home';
      this.navigate(page, false);
    });

    document.addEventListener('change', event => {
      const target = event.target as HTMLInputElement;
      if (target.id === 'm-efiles') this.handleMediaFiles(target.files);
      if (target.id === 'm-gfiles') this.handleGameMediaFiles(target.files);
      if (target.id === 'm-gd-files') this.handleGameMediaFiles(target.files, 'm-gd-prev', 'm-gd-files');
      if (target.id === 'm-gcover-file') this.handleGameCoverFiles(target.files);
      if (target.id === 'm-gd-cover-file') this.handleGameCoverFiles(target.files, 'm-gd-cover-prev', 'm-gd-cover-file');
      if (target.id === 'm-kfiles') this.handleWorkMediaFiles(target.files);
      if (target.id === 'm-kd-files') this.handleWorkMediaFiles(target.files, 'm-kd-prev', 'm-kd-files');
      if (target.id === 'doc-files') this.handleDocumentFiles(target.files);
    });
  }

  private async handleSignIn(): Promise<void> {
    const email = formValue(document, '#email-input').toLowerCase();
    const password = qs<HTMLInputElement>('#password-input').value;
    const button = qs<HTMLButtonElement>('#email-btn');
    const msg = qs<HTMLElement>('#auth-msg');
    msg.className = 'auth-msg';
    if (!email || !email.includes('@')) {
      msg.textContent = 'enter a valid email';
      msg.classList.add('err');
      return;
    }
    if (!password) {
      msg.textContent = 'enter your password';
      msg.classList.add('err');
      return;
    }
    button.disabled = true;
    button.textContent = 'signing in...';
    try {
      await signIn(email, password);
    } catch (error) {
      msg.textContent = cleanAuthError(error);
      msg.classList.add('err');
      button.disabled = false;
      button.textContent = 'sign in →';
    }
  }

  private async handleAction(target: HTMLElement, event: Event): Promise<void> {
    const action = target.dataset.action;
    switch (action) {
      case 'nav':
        this.navigate(target.dataset.page as PageId);
        break;
      case 'signout':
        if (confirm('sign out?')) await signOut();
        break;
      case 'open-entry-modal':
        this.resetEntryModal();
        openModal('modal-entry');
        break;
      case 'open-txn-modal':
        state.txnKind = (target.dataset.kind as FinanceKind) || 'option';
        state.txnType = this.txnTypeForKind(state.txnKind);
        this.renderModalsOnly();
        openModal('modal-txn');
        break;
      case 'finance-view':
        state.financeView = target.dataset.view === 'subway' ? 'subway' : 'personal';
        this.renderMainOnly();
        break;
      case 'toggle-finance-panel': {
        const panel = target.dataset.panel || '';
        state.financeExpandedPanels[panel] = !state.financeExpandedPanels[panel];
        this.renderMainOnly();
        break;
      }
      case 'select-txn-kind':
        state.txnKind = target.dataset.kind as FinanceKind;
        state.txnType = this.txnTypeForKind(state.txnKind);
        this.renderModalsOnly();
        openModal('modal-txn');
        break;
      case 'open-task-modal':
        this.resetWorkModal();
        openModal('modal-task');
        qs<HTMLSelectElement>('#m-kcol').value = (target.dataset.col as WorkColumn) || 'todo';
        break;
      case 'open-game-modal':
        this.resetGameModal();
        openModal('modal-game');
        break;
      case 'connect-drive':
        await this.connectDriveAndLoad();
        break;
      case 'refresh-drive-docs':
        await this.refreshDriveDocs();
        break;
      case 'select-doc-owner':
        await this.selectDocumentOwner((target.dataset.owner as DriveOwner) || 'me_personal');
        break;
      case 'choose-doc-files':
        qs<HTMLInputElement>('#doc-files').click();
        break;
      case 'remove-doc-file':
        this.removeDocumentFile(Number(target.dataset.index || 0));
        break;
      case 'clear-doc-files':
        this.clearDocumentFiles();
        break;
      case 'upload-docs':
        await this.uploadDocuments();
        break;
      case 'delete-drive-doc':
        if (confirm('delete this document from Google Drive?')) await this.deleteDocument(target.dataset.id || '');
        break;
      case 'close-modal':
        closeModal(target.dataset.modal || '');
        break;
      case 'select-txn-type':
        state.txnType = target.dataset.value as Transaction['type'];
        document.querySelectorAll('#m-ttype .chip').forEach(chip => chip.classList.remove('sel'));
        target.classList.add('sel');
        break;
      case 'save-txn':
        await this.saveTxn();
        break;
      case 'delete-txn':
        if (confirm('delete this transaction?')) await deleteTransaction(target.dataset.id || '');
        break;
      case 'save-task':
        await this.saveWorkTask();
        break;
      case 'open-task-detail':
        releasePicks(state.workMediaPicks);
        state.workMediaPicks = [];
        state.selectedTaskId = target.dataset.id || null;
        this.renderModalsOnly();
        openModal('modal-task-detail');
        break;
      case 'choose-work-media':
        qs<HTMLInputElement>('#m-kfiles').click();
        break;
      case 'choose-work-detail-media':
        qs<HTMLInputElement>('#m-kd-files').click();
        break;
      case 'remove-work-media':
        this.removeWorkMedia(Number(target.dataset.index || 0));
        break;
      case 'save-task-detail':
        await this.saveWorkTaskDetail();
        break;
      case 'set-task-column':
        await updateTaskColumn(target.dataset.id || '', target.dataset.col as WorkColumn);
        break;
      case 'move-task':
        await this.moveTask(target.dataset.id || '', Number(target.dataset.dir || 0));
        break;
      case 'delete-task':
        if (confirm('delete this task?')) await deleteTask(target.dataset.id || '');
        break;
      case 'atlas-filter':
        state.entryFilter = target.dataset.filter as typeof state.entryFilter;
        this.renderMainOnly();
        break;
      case 'atlas-section':
        state.atlasSection = target.dataset.section as AtlasSection;
        this.renderMainOnly();
        break;
      case 'choose-media':
        qs<HTMLInputElement>('#m-efiles').click();
        break;
      case 'remove-media':
        this.removeMedia(Number(target.dataset.index || 0));
        break;
      case 'pick-mood':
        state.selectedMood = target.dataset.mood || '';
        document.querySelectorAll('#m-emood .chip').forEach(chip => chip.classList.remove('sel'));
        target.classList.add('sel');
        break;
      case 'save-entry':
        await this.saveAtlasEntry();
        break;
      case 'delete-entry':
        if (confirm('delete this story?')) await deleteEntry(target.dataset.id || '');
        break;
      case 'export-atlas-pdf':
        this.exportAtlasPdf();
        break;
      case 'open-lightbox': {
        const entry = state.entries.find(item => String(item.id) === target.dataset.id);
        if (entry) this.lightbox.open(entry, Number(target.dataset.index || 0));
        break;
      }
      case 'close-lightbox':
        this.lightbox.close();
        break;
      case 'lightbox-nav':
        this.lightbox.nav(Number(target.dataset.dir || 0));
        break;
      case 'game-filter':
        state.gameFilter = target.dataset.filter as typeof state.gameFilter;
        this.renderMainOnly();
        break;
      case 'open-game-detail':
        releasePicks(state.gameMediaPicks);
        releasePicks(state.gameCoverPicks);
        state.gameMediaPicks = [];
        state.gameCoverPicks = [];
        state.selectedGameId = target.dataset.id || null;
        state.gameDetailEditing = false;
        this.renderModalsOnly();
        openModal('modal-game-detail');
        break;
      case 'edit-game-detail':
        state.gameDetailEditing = true;
        this.renderModalsOnly();
        openModal('modal-game-detail');
        break;
      case 'choose-game-media':
        qs<HTMLInputElement>('#m-gfiles').click();
        break;
      case 'choose-game-cover':
        qs<HTMLInputElement>('#m-gcover-file').click();
        break;
      case 'choose-game-detail-media':
        qs<HTMLInputElement>('#m-gd-files').click();
        break;
      case 'choose-game-detail-cover':
        qs<HTMLInputElement>('#m-gd-cover-file').click();
        break;
      case 'remove-game-media':
        this.removeGameMedia(Number(target.dataset.index || 0));
        break;
      case 'remove-game-cover':
        this.removeGameCover(Number(target.dataset.index || 0));
        break;
      case 'save-game-detail':
        await this.saveGameDetail();
        break;
      case 'save-game':
        await this.saveGame();
        break;
      case 'delete-game':
        if (confirm('remove this game?')) await deleteGame(target.dataset.id || '');
        break;
      case 'save-her':
        await this.saveHer();
        break;
      case 'remove-her':
        if (confirm('remove her access? she will not be able to sign in until added again.')) await removeHerConfig();
        break;
    }
  }

  private navigate(page: PageId, pushHistory = true): void {
    const oldPage = state.activePage;
    state.activePage = page;
    if (pushHistory && oldPage !== page) this.pushHistory(page);
    this.preparePage(page);
    this.renderView();
    if (page === 'documents') void this.maybeAutoLoadDriveDocs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private preparePage(page: PageId): void {
    if (page !== 'documents') return;
    state.driveDocs = loadCachedDriveDocs(state.driveOwner);
    state.driveConnected = isDriveConnected() || wasDriveConnected();
    state.driveStatus = state.driveDocs.length
      ? `showing saved ${driveOwnerLabel(state.driveOwner)} document list`
      : wasDriveConnected()
        ? 'reconnecting to Google Drive...'
        : 'connect Google Drive to load documents';
  }

  private pushHistory(page: PageId): void {
    const hash = page === 'home' ? '' : `#${page}`;
    history.pushState({ page }, '', `${window.location.pathname}${hash}`);
  }

  private replaceHistory(page: PageId): void {
    const pageFromHash = this.pageFromHash();
    const resolvedPage = pageFromHash || page;
    state.activePage = resolvedPage;
    this.preparePage(resolvedPage);
    if (resolvedPage === 'home') {
      history.replaceState({ page: 'home' }, '', window.location.pathname);
    } else {
      history.replaceState({ page: 'home' }, '', window.location.pathname);
      history.pushState({ page: resolvedPage }, '', `${window.location.pathname}#${resolvedPage}`);
    }
    this.renderView();
    if (resolvedPage === 'documents') void this.maybeAutoLoadDriveDocs();
  }

  private pageFromHash(): PageId | null {
    const page = window.location.hash.replace('#', '') as PageId;
    return ['home', 'finance', 'work', 'atlas', 'games', 'documents', 'settings'].includes(page) ? page : null;
  }

  private subscribeToData(): void {
    this.disposeDataSubscriptions();
    this.unsubs.push(
      subscribeHerConfig(config => {
        state.herConfig = config;
        if (state.activePage === 'settings') this.renderMainOnly();
      }),
      subscribeList('entries', entries => {
        state.entries = entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        saveCachedList('entries', state.entries);
        this.renderActiveDataPage('atlas');
      }, error => this.showDataError('Atlas entries', error)),
      subscribeList('txns', txns => {
        state.txns = txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        saveCachedList('txns', state.txns);
        this.renderActiveDataPage('finance');
      }, error => this.showDataError('Finance', error)),
      subscribeList('tasks', tasks => {
        state.tasks = tasks;
        saveCachedList('tasks', state.tasks);
        this.renderActiveDataPage('work');
      }, error => this.showDataError('Work board', error)),
      subscribeList('games', games => {
        state.games = games;
        saveCachedList('games', state.games);
        this.renderActiveDataPage('games');
      }, error => this.showDataError('Games', error))
    );
  }

  private disposeDataSubscriptions(): void {
    while (this.unsubs.length) this.unsubs.pop()?.();
  }

  private renderActiveDataPage(page: PageId): void {
    if (state.activePage === page || state.activePage === 'home') this.renderMainOnly();
  }

  private hydrateCachedData(): void {
    state.entries = loadCachedList('entries').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    state.txns = loadCachedList('txns').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    state.tasks = loadCachedList('tasks');
    state.games = loadCachedList('games');
  }

  private showDataError(area: string, error: Error): void {
    console.error(`${area} sync failed`, error);
    if (this.reportedDataErrors.has(area)) return;
    this.reportedDataErrors.add(area);
    const message = error.message?.includes('permission_denied')
      ? `${area} blocked by Firebase rules. Your saved data is still in Firebase; update Realtime Database rules.`
      : `${area} sync failed: ${error.message || 'check Firebase rules'}`;
    this.toast.show(message, 'err');
  }

  private handleDocumentFiles(files: FileList | null): void {
    const added = files ? Array.from(files) : [];
    state.docFiles = [...state.docFiles, ...added];
    state.docFileNames = [...state.docFileNames, ...added.map(file => file.name)];
    state.driveStatus = state.docFiles.length ? `${state.docFiles.length} file${state.docFiles.length === 1 ? '' : 's'} ready for ${driveOwnerLabel(state.driveOwner)}` : '';
    const input = document.getElementById('doc-files') as HTMLInputElement | null;
    if (input) input.value = '';
    this.renderMainOnly();
  }

  private removeDocumentFile(index: number): void {
    state.docFiles.splice(index, 1);
    state.docFileNames.splice(index, 1);
    state.driveStatus = state.docFiles.length ? `${state.docFiles.length} file${state.docFiles.length === 1 ? '' : 's'} ready for ${driveOwnerLabel(state.driveOwner)}` : '';
    this.renderMainOnly();
  }

  private clearDocumentFiles(): void {
    state.docFiles = [];
    state.docFileNames = [];
    state.driveStatus = '';
    this.renderMainOnly();
  }

  private async selectDocumentOwner(owner: DriveOwner): Promise<void> {
    state.driveOwner = owner;
    state.docFiles = [];
    state.docFileNames = [];
    state.driveDocs = loadCachedDriveDocs(owner);
    state.driveStatus = state.driveDocs.length
      ? `showing saved ${driveOwnerLabel(owner)} document list`
      : `${driveOwnerLabel(owner)} selected`;
    this.renderMainOnly();
    if (state.driveConnected || wasDriveConnected()) await this.maybeAutoLoadDriveDocs(true);
  }

  private async connectDriveAndLoad(): Promise<void> {
    state.driveBusy = true;
    state.driveStatus = 'connecting to Google Drive...';
    try {
      await connectDrive({ interactive: true });
      state.driveConnected = true;
      state.driveStatus = 'Google Drive connected';
      state.driveDocs = await listDriveDocs(state.driveOwner);
      this.toast.show('Drive connected ✓', 'ok');
    } catch (error) {
      console.error('Drive connect failed', error);
      state.driveStatus = error instanceof Error ? error.message : 'Drive connection failed';
      this.toast.show(`Drive failed: ${state.driveStatus}`, 'err');
    } finally {
      state.driveBusy = false;
      this.renderMainOnly();
    }
  }

  private async refreshDriveDocs(): Promise<void> {
    state.driveBusy = true;
    state.driveStatus = 'loading Drive documents...';
    this.renderMainOnly();
    try {
      state.driveDocs = await listDriveDocs(state.driveOwner);
      state.driveConnected = true;
      state.driveStatus = `loaded ${state.driveDocs.length} ${driveOwnerLabel(state.driveOwner)} document${state.driveDocs.length === 1 ? '' : 's'}`;
    } catch (error) {
      console.error('Drive refresh failed', error);
      state.driveStatus = error instanceof Error ? error.message : 'Drive refresh failed';
      this.toast.show(`Drive failed: ${state.driveStatus}`, 'err');
    } finally {
      state.driveBusy = false;
      this.renderMainOnly();
    }
  }

  private async autoLoadDriveDocs(): Promise<void> {
    if (!wasDriveConnected() && !isDriveConnected()) return;
    state.driveBusy = true;
    if (!state.driveDocs.length) state.driveStatus = 'loading Drive documents...';
    this.renderMainOnly();
    try {
      if (!isDriveConnected()) await connectDrive({ interactive: false });
      state.driveDocs = await listDriveDocs(state.driveOwner);
      state.driveConnected = true;
      state.driveStatus = `loaded ${state.driveDocs.length} ${driveOwnerLabel(state.driveOwner)} document${state.driveDocs.length === 1 ? '' : 's'}`;
    } catch (error) {
      console.warn('Silent Drive reconnect failed', error);
      state.driveConnected = false;
      state.driveStatus = state.driveDocs.length
        ? `showing saved list — tap connect Google Drive to refresh`
        : 'tap connect Google Drive to load documents';
    } finally {
      state.driveBusy = false;
      this.renderMainOnly();
    }
  }

  private async maybeAutoLoadDriveDocs(force = false): Promise<void> {
    const freshEnough = driveCacheAge(state.driveOwner) < 5 * 60 * 1000;
    if (!force && state.driveDocs.length && freshEnough) {
      state.driveStatus = `showing saved ${driveOwnerLabel(state.driveOwner)} document list`;
      this.renderMainOnly();
      return;
    }
    const key = `${state.driveOwner}:${Math.floor(Date.now() / 60000)}`;
    if (!force && this.driveAutoLoadKey === key) return;
    this.driveAutoLoadKey = key;
    await this.autoLoadDriveDocs();
  }

  private async uploadDocuments(): Promise<void> {
    if (!state.docFiles.length) return this.toast.show('choose documents first', 'err');
    state.driveBusy = true;
    this.renderMainOnly();
    try {
      const total = state.docFiles.length;
      for (let i = 0; i < total; i += 1) {
        const uploadName = normalizedDocName(state.docFileNames[i], state.docFiles[i].name);
        state.driveStatus = `uploading ${i + 1}/${total} to ${driveOwnerLabel(state.driveOwner)}: ${uploadName}`;
        this.renderMainOnly();
        await uploadDriveDoc(state.docFiles[i], state.driveOwner, uploadName);
      }
      state.docFiles = [];
      state.docFileNames = [];
      state.driveDocs = await listDriveDocs(state.driveOwner);
      state.driveConnected = true;
      state.driveStatus = `uploaded to ${driveOwnerLabel(state.driveOwner)} Drive folder ✓`;
      this.toast.show('documents uploaded ✓', 'ok');
    } catch (error) {
      console.error('Drive upload failed', error);
      state.driveStatus = error instanceof Error ? error.message : 'Drive upload failed';
      this.toast.show(`upload failed: ${state.driveStatus}`, 'err');
    } finally {
      state.driveBusy = false;
      this.renderMainOnly();
    }
  }

  private async deleteDocument(id: string): Promise<void> {
    if (!id) return;
    state.driveBusy = true;
    state.driveStatus = 'deleting document...';
    this.renderMainOnly();
    try {
      await deleteDriveDoc(id);
      state.driveDocs = await listDriveDocs(state.driveOwner);
      state.driveStatus = 'document deleted ✓';
      this.toast.show('document deleted ✓', 'ok');
    } catch (error) {
      console.error('Drive delete failed', error);
      state.driveStatus = error instanceof Error ? error.message : 'Drive delete failed';
      this.toast.show(`delete failed: ${state.driveStatus}`, 'err');
    } finally {
      state.driveBusy = false;
      this.renderMainOnly();
    }
  }

  private exportAtlasPdf(): void {
    const entries = filteredEntries(state);
    if (!entries.length) {
      this.toast.show('no stories to export', 'err');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.toast.show('allow popups to create the PDF', 'err');
      return;
    }
    const title = state.atlasSection === 'protected' ? 'Our relation with protection' : 'Our stories';
    const stories = entries.map(entry => {
      const media = (entry.media || []).map(item => {
        if (item.type === 'image') return `<img src="${escapeAttr(item.data)}" alt="${escapeHtml(item.name || 'photo')}">`;
        return `<p class="video-note">Video attached: ${escapeHtml(item.name || 'video')}</p>`;
      }).join('');
      const tags = [entry.mood, ...(entry.tags || [])]
        .filter(Boolean)
        .map(tag => `<span>${escapeHtml(tag || '')}</span>`)
        .join('');
      return `<article class="story-block">
        <div class="meta">${entry.who === 'me' ? 'Mit' : 'Shrushti'} · ${formatPdfDate(entry.date)}</div>
        <h2>${escapeHtml(entry.title)}</h2>
        <div class="story">${escapeHtml(entry.body)}</div>
        ${entry.thought ? `<div class="thought">"${escapeHtml(entry.thought)}"</div>` : ''}
        ${media ? `<div class="media">${media}</div>` : ''}
        ${tags ? `<div class="tags">${tags}</div>` : ''}
      </article>`;
    }).join('');
    printWindow.document.write(`<!doctype html>
      <html><head><meta charset="utf-8"><title>${escapeHtml(title)} PDF</title>
      <style>
        body{font-family:Georgia,serif;color:#1f2937;margin:0;padding:36px;line-height:1.7}
        .cover{border-bottom:2px solid #e5e7eb;margin-bottom:28px;padding-bottom:18px}
        .cover h1{font-family:Arial,sans-serif;font-size:34px;line-height:1.1;margin:0 0 8px;color:#111827}
        .cover p{font:14px Arial,sans-serif;color:#6b7280;margin:0}
        .story-block{break-inside:avoid;margin:0 0 36px;padding-bottom:24px;border-bottom:1px solid #e5e7eb}
        .meta{font:12px Arial,sans-serif;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;margin-bottom:18px}
        h2{font-family:Arial,sans-serif;font-size:28px;line-height:1.15;margin:0 0 18px;color:#111827}
        .story{white-space:pre-wrap;font-size:16px}
        .thought{margin:24px 0;padding:14px 18px;border-left:4px solid #7c5cff;background:#f5f3ff;font-style:italic}
        .tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:22px}
        .tags span{font:12px Arial,sans-serif;background:#eef2ff;border:1px solid #c7d2fe;border-radius:999px;padding:4px 10px}
        .media{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:22px 0}
        .media img{width:100%;max-height:420px;object-fit:contain;border:1px solid #e5e7eb;border-radius:10px}
        .video-note{font:13px Arial,sans-serif;color:#6b7280;border:1px dashed #cbd5e1;border-radius:10px;padding:12px}
        @media print{body{padding:22mm}.media img{break-inside:avoid}}
      </style></head>
      <body>
        <section class="cover"><h1>${escapeHtml(title)}</h1><p>${entries.length} stories · exported ${formatPdfDate(new Date().toISOString())}</p></section>
        ${stories}
        <script>window.onload=()=>setTimeout(()=>window.print(),250);</script>
      </body></html>`);
    printWindow.document.close();
  }

  private async saveTxn(): Promise<void> {
    const amount = parseMoney(formValue(document, '#m-tamt'));
    if (!amount || amount <= 0) return this.toast.show('add an amount', 'err');
    const kind = state.txnKind;
    const symbol = optionalFormValue('#m-tsymbol').toUpperCase();
    const store = optionalFormValue('#m-tstore') as Transaction['store'];
    const optionType = optionalFormValue('#m-toption') as Transaction['optionType'];
    const fallbackName = kind === 'option'
      ? `${symbol || 'OPTION'} ${optionType === 'put' ? 'put' : 'covered call'}`
      : kind === 'subway_cash'
        ? `${storeLabel(store)} cash collection`
        : kind === 'subway_expense'
          ? `${storeLabel(store)} expense`
          : 'Spending';
    const name = optionalFormValue('#m-tname') || fallbackName;
    if (kind === 'option' && !symbol) return this.toast.show('add the stock symbol', 'err');
    const button = document.querySelector<HTMLButtonElement>('#m-tsave');
    if (button) {
      button.disabled = true;
      button.textContent = 'saving...';
    }
    try {
      const transaction: Transaction = {
        id: `t_${Date.now()}`,
        type: this.txnTypeForKind(kind),
        kind,
        name,
        amount,
        cat: optionalFormValue('#m-tcat'),
        note: optionalFormValue('#m-tnote'),
        date: new Date().toISOString(),
        by: state.currentUser!.role
      };
      if (symbol) transaction.symbol = symbol;
      if (optionType) transaction.optionType = optionType;
      if (store) transaction.store = store;
      await saveTransaction(transaction);
      closeModal('modal-txn');
      this.toast.show('saved ✓', 'ok');
    } catch (error) {
      console.error('finance save failed', error);
      this.toast.show(`finance did not save: ${error instanceof Error ? error.message : 'check Firebase rules'}`, 'err');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'save';
      }
    }
  }

  private async saveWorkTask(): Promise<void> {
    const title = formValue(document, '#m-ktitle');
    if (!title) return this.toast.show('add a title', 'err');
    const button = qs<HTMLButtonElement>('#m-ksave');
    button.disabled = true;
    try {
      const media = await serializeMedia(state.workMediaPicks, label => { button.textContent = label; });
      await saveTask({
        id: `k_${Date.now()}`,
        title,
        note: formValue(document, '#m-knote'),
        media,
        col: qs<HTMLSelectElement>('#m-kcol').value as WorkColumn,
        date: new Date().toISOString(),
        by: state.currentUser!.display
      });
      releasePicks(state.workMediaPicks);
      state.workMediaPicks = [];
      closeModal('modal-task');
      this.toast.show('added', 'ok');
    } catch (error) {
      console.error('work save failed', error);
      this.toast.show(`work did not save: ${error instanceof Error ? error.message : 'check Firebase rules'}`, 'err');
    } finally {
      button.disabled = false;
      button.textContent = 'add work';
    }
  }

  private async saveWorkTaskDetail(): Promise<void> {
    const task = state.tasks.find(item => item.id === state.selectedTaskId);
    if (!task) return this.toast.show('work not found', 'err');
    const title = formValue(document, '#m-kd-title');
    if (!title) return this.toast.show('add a title', 'err');
    const button = qs<HTMLButtonElement>('#m-kd-save');
    button.disabled = true;
    try {
      const addedMedia = await serializeMedia(state.workMediaPicks, label => { button.textContent = label; });
      await saveTask({
        ...task,
        title,
        col: qs<HTMLSelectElement>('#m-kd-col').value as WorkColumn,
        note: formValue(document, '#m-kd-note'),
        media: [...(task.media || []), ...addedMedia]
      });
      releasePicks(state.workMediaPicks);
      state.workMediaPicks = [];
      closeModal('modal-task-detail');
      this.renderMainOnly();
      this.toast.show('work updated ✓', 'ok');
    } catch (error) {
      console.error('work update failed', error);
      this.toast.show(`work did not update: ${error instanceof Error ? error.message : 'check Firebase rules'}`, 'err');
    } finally {
      button.disabled = false;
      button.textContent = 'save work changes';
    }
  }

  private async moveTask(id: string, dir: number): Promise<void> {
    const task = state.tasks.find(item => item.id === id);
    if (!task) return;
    const order: WorkColumn[] = ['todo', 'doing', 'done'];
    const index = order.indexOf(task.col);
    const nextIndex = Math.max(0, Math.min(order.length - 1, index + dir));
    await updateTaskColumn(id, order[nextIndex]);
  }

  private resetEntryModal(): void {
    releasePicks(state.mediaPicks);
    state.mediaPicks = [];
    state.selectedMood = '';
    this.renderModalsOnly();
  }

  private handleMediaFiles(files: FileList | null): void {
    if (!files) return;
    Array.from(files).slice(0, 15 - state.mediaPicks.length).forEach(file => state.mediaPicks.push(fileToPick(file)));
    const previews = document.getElementById('m-eprev');
    if (previews) previews.innerHTML = renderMediaPreviews(state);
    qs<HTMLInputElement>('#m-efiles').value = '';
  }

  private removeMedia(index: number): void {
    URL.revokeObjectURL(state.mediaPicks[index]?.prev);
    state.mediaPicks.splice(index, 1);
    const previews = document.getElementById('m-eprev');
    if (previews) previews.innerHTML = renderMediaPreviews(state);
  }

  private resetWorkModal(): void {
    releasePicks(state.workMediaPicks);
    state.workMediaPicks = [];
    this.renderModalsOnly();
  }

  private handleWorkMediaFiles(files: FileList | null, previewId = 'm-kprev', inputId = 'm-kfiles'): void {
    if (!files) return;
    Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .slice(0, 8 - state.workMediaPicks.length)
      .forEach(file => state.workMediaPicks.push(fileToPick(file)));
    const previews = document.getElementById(previewId);
    if (previews) previews.innerHTML = renderWorkMediaPreviews(state);
    qs<HTMLInputElement>(`#${inputId}`).value = '';
  }

  private removeWorkMedia(index: number): void {
    URL.revokeObjectURL(state.workMediaPicks[index]?.prev);
    state.workMediaPicks.splice(index, 1);
    const previews = document.getElementById('m-kprev');
    if (previews) previews.innerHTML = renderWorkMediaPreviews(state);
    const detailPreviews = document.getElementById('m-kd-prev');
    if (detailPreviews) detailPreviews.innerHTML = renderWorkMediaPreviews(state);
  }

  private resetGameModal(): void {
    releasePicks(state.gameMediaPicks);
    releasePicks(state.gameCoverPicks);
    state.gameMediaPicks = [];
    state.gameCoverPicks = [];
    this.renderModalsOnly();
  }

  private handleGameCoverFiles(files: FileList | null, previewId = 'm-gcover-prev', inputId = 'm-gcover-file'): void {
    if (!files?.[0]) return;
    releasePicks(state.gameCoverPicks);
    state.gameCoverPicks = [fileToPick(files[0])];
    const previews = document.getElementById(previewId);
    if (previews) previews.innerHTML = renderGameCoverPreview(state);
    qs<HTMLInputElement>(`#${inputId}`).value = '';
  }

  private removeGameCover(index: number): void {
    URL.revokeObjectURL(state.gameCoverPicks[index]?.prev);
    state.gameCoverPicks.splice(index, 1);
    const previews = document.getElementById('m-gcover-prev');
    if (previews) previews.innerHTML = renderGameCoverPreview(state);
    const detailPreviews = document.getElementById('m-gd-cover-prev');
    if (detailPreviews) detailPreviews.innerHTML = renderGameCoverPreview(state);
  }

  private handleGameMediaFiles(files: FileList | null, previewId = 'm-gprev', inputId = 'm-gfiles'): void {
    if (!files) return;
    Array.from(files).slice(0, 12 - state.gameMediaPicks.length).forEach(file => state.gameMediaPicks.push(fileToPick(file)));
    const previews = document.getElementById(previewId);
    if (previews) previews.innerHTML = renderGameMediaPreviews(state);
    qs<HTMLInputElement>(`#${inputId}`).value = '';
  }

  private removeGameMedia(index: number): void {
    URL.revokeObjectURL(state.gameMediaPicks[index]?.prev);
    state.gameMediaPicks.splice(index, 1);
    const previews = document.getElementById('m-gprev');
    if (previews) previews.innerHTML = renderGameMediaPreviews(state);
    const detailPreviews = document.getElementById('m-gd-prev');
    if (detailPreviews) detailPreviews.innerHTML = renderGameMediaPreviews(state);
  }

  private async saveAtlasEntry(): Promise<void> {
    const title = formValue(document, '#m-et');
    const body = formValue(document, '#m-eb');
    if (!title) return this.toast.show('add a title', 'err');
    if (!body) return this.toast.show('write something', 'err');
    const button = qs<HTMLButtonElement>('#m-save');
    button.disabled = true;
    try {
      const media = await serializeMedia(state.mediaPicks, label => { button.textContent = label; });
      button.textContent = 'saving...';
      const entry: AtlasEntry = {
        id: Date.now(),
        who: state.currentUser!.role,
        section: qs<HTMLSelectElement>('#m-esection').value as AtlasSection,
        title,
        body,
        thought: formValue(document, '#m-eth'),
        media,
        mood: state.selectedMood,
        tags: formValue(document, '#m-etg').split(',').map(tag => tag.trim()).filter(Boolean),
        date: new Date().toISOString()
      };
      await saveEntryApi(entry);
      const existing = state.entries.findIndex(item => String(item.id) === String(entry.id));
      if (existing >= 0) state.entries.splice(existing, 1, entry);
      else state.entries.unshift(entry);
      releasePicks(state.mediaPicks);
      state.mediaPicks = [];
      closeModal('modal-entry');
      state.activePage = 'atlas';
      this.renderMainOnly();
      this.toast.show('saved ✓', 'ok');
    } catch (error) {
      console.error('entry save failed', error);
      this.toast.show(`entry did not save: ${error instanceof Error ? error.message : 'check Firebase rules'}`, 'err');
    } finally {
      button.disabled = false;
      button.textContent = 'save entry ✦';
    }
  }

  private refreshEntriesList(): void {
    const root = document.getElementById('entries-list');
    if (root) root.innerHTML = renderEntriesList(state, filteredEntries(state));
  }

  private async saveGame(): Promise<void> {
    const name = formValue(document, '#m-gname');
    if (!name) return this.toast.show('add a name', 'err');
    const button = qs<HTMLButtonElement>('#m-gsave');
    button.disabled = true;
    const palette = [['#7c3aed', '#22d3ee'], ['#f472b6', '#7c3aed'], ['#22c55e', '#0ea5e9'], ['#f59e0b', '#ef4444'], ['#06b6d4', '#3b82f6']];
    const colors = palette[Math.floor(Math.random() * palette.length)];
    try {
      const media = await serializeMedia(state.gameMediaPicks, label => { button.textContent = label; });
      const coverMedia = await serializeMedia(state.gameCoverPicks, label => { button.textContent = label; });
      button.textContent = 'saving...';
      const game: Game = {
        id: `g_${Date.now()}`,
        name,
        platform: qs<HTMLSelectElement>('#m-gplat').value,
        status: qs<HTMLSelectElement>('#m-gstatus').value as GameStatus,
        cover: coverMedia[0]?.data || formValue(document, '#m-gcover'),
        url: formValue(document, '#m-gurl'),
        clips: this.parseLines(formValue(document, '#m-gclips')),
        story: formValue(document, '#m-gstory'),
        media,
        now: checked(document, '#m-gnow'),
        c1: colors[0],
        c2: colors[1],
        date: new Date().toISOString(),
        by: state.currentUser!.role
      };
      await saveGameApi(game, state.games);
      releasePicks(state.gameMediaPicks);
      releasePicks(state.gameCoverPicks);
      state.gameMediaPicks = [];
      state.gameCoverPicks = [];
      closeModal('modal-game');
      this.toast.show('game added ✓', 'ok');
    } catch (error) {
      console.error('game save failed', error);
      this.toast.show(`game did not save: ${error instanceof Error ? error.message : 'check Firebase rules'}`, 'err');
    } finally {
      button.disabled = false;
      button.textContent = 'add game';
    }
  }

  private async saveGameDetail(): Promise<void> {
    const game = state.games.find(item => item.id === state.selectedGameId);
    if (!game) return this.toast.show('game not found', 'err');
    const button = qs<HTMLButtonElement>('#m-gd-save');
    button.disabled = true;
    try {
      const addedMedia = await serializeMedia(state.gameMediaPicks, label => { button.textContent = label; });
      const coverMedia = await serializeMedia(state.gameCoverPicks, label => { button.textContent = label; });
      button.textContent = 'saving...';
      const updated: Game = {
        ...game,
        platform: qs<HTMLSelectElement>('#m-gd-plat').value,
        status: qs<HTMLSelectElement>('#m-gd-status').value as GameStatus,
        now: checked(document, '#m-gd-now'),
        url: formValue(document, '#m-gd-url'),
        cover: coverMedia[0]?.data || formValue(document, '#m-gd-cover'),
        clips: this.parseLines(formValue(document, '#m-gd-clips')),
        story: formValue(document, '#m-gd-story'),
        media: [...(game.media || []), ...addedMedia]
      };
      await saveGameApi(updated, state.games);
      releasePicks(state.gameMediaPicks);
      releasePicks(state.gameCoverPicks);
      state.gameMediaPicks = [];
      state.gameCoverPicks = [];
      state.selectedGameId = updated.id;
      state.gameDetailEditing = false;
      closeModal('modal-game-detail');
      this.renderMainOnly();
      this.toast.show('game updated ✓', 'ok');
    } catch (error) {
      console.error('game update failed', error);
      this.toast.show(`game did not update: ${error instanceof Error ? error.message : 'check Firebase rules'}`, 'err');
    } finally {
      button.disabled = false;
      button.textContent = 'save game changes';
    }
  }

  private async saveHer(): Promise<void> {
    if (state.currentUser?.role !== 'me') return this.toast.show('owner only', 'err');
    const email = formValue(document, '#her-email').toLowerCase();
    const display = formValue(document, '#her-name') || 'Her';
    if (!email || !email.includes('@')) return this.toast.show('enter a valid email', 'err');
    if (email === state.currentUser.email) return this.toast.show("that's your own email", 'err');
    await saveHerConfig({ email, display, addedBy: state.currentUser.email, addedAt: new Date().toISOString() });
    this.toast.show('saved — she can sign in now', 'ok');
  }

  private parseLines(value: string): string[] {
    return value.split(/\n|,/).map(line => line.trim()).filter(Boolean);
  }

  private txnTypeForKind(kind: FinanceKind): Transaction['type'] {
    return kind === 'spending' || kind === 'subway_expense' ? 'out' : 'in';
  }
}

function storeLabel(store?: Transaction['store']): string {
  if (store === 'walmart') return 'Walmart';
  if (store === 'maple_grove') return 'Maple Grove';
  if (store === 'brooklyn_park') return 'Brooklyn Park';
  return 'Subway';
}

function driveOwnerLabel(owner: DriveOwner): string {
  if (owner === 'me_work') return 'Mit work';
  if (owner === 'parents') return 'Parents';
  if (owner === 'her') return 'Shrushti';
  return 'Mit personal';
}

function normalizedDocName(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function formatPdfDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#096;');
}

function saveCachedList<TPath extends DataPath>(path: TPath, items: DataMap[TPath][]): void {
  try {
    localStorage.setItem(`mitpatel_cache_${path}_v1`, JSON.stringify(items));
  } catch {
    // Cache is only a display fallback; Firebase remains the source of truth.
  }
}

function loadCachedList<TPath extends DataPath>(path: TPath): DataMap[TPath][] {
  try {
    return JSON.parse(localStorage.getItem(`mitpatel_cache_${path}_v1`) || '[]') as DataMap[TPath][];
  } catch {
    return [];
  }
}

function optionalFormValue(selector: string): string {
  return (document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector)?.value || '').trim();
}

function parseMoney(value: string): number {
  return Number.parseFloat(value.replace(/[$,\s]/g, ''));
}
