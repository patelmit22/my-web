import { cleanAuthError, configureAuthPersistence, onAuthChanged, resolveCurrentUser, signIn, signOut } from './api/authApi';
import {
  deleteEntry,
  deleteGame,
  deleteTask,
  deleteTransaction,
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
import { connectDrive, deleteDriveDoc, listDriveDocs, uploadDriveDoc } from './api/driveApi';
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
      this.renderApp();
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
    ${renderModals(state)}`;
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
      if (target.id === 'atlas-search') this.refreshEntriesList();
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
        this.renderApp();
        openModal('modal-txn');
        break;
      case 'select-txn-kind':
        state.txnKind = target.dataset.kind as FinanceKind;
        state.txnType = this.txnTypeForKind(state.txnKind);
        this.renderApp();
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
        await this.selectDocumentOwner((target.dataset.owner as DriveOwner) || 'me');
        break;
      case 'choose-doc-files':
        qs<HTMLInputElement>('#doc-files').click();
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
        this.renderApp();
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
        this.renderApp();
        break;
      case 'atlas-section':
        state.atlasSection = target.dataset.section as AtlasSection;
        this.renderApp();
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
        this.renderApp();
        break;
      case 'open-game-detail':
        releasePicks(state.gameMediaPicks);
        releasePicks(state.gameCoverPicks);
        state.gameMediaPicks = [];
        state.gameCoverPicks = [];
        state.selectedGameId = target.dataset.id || null;
        this.renderApp();
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

  private navigate(page: PageId): void {
    state.activePage = page;
    this.renderApp();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private subscribeToData(): void {
    this.disposeDataSubscriptions();
    this.unsubs.push(
      subscribeHerConfig(config => {
        state.herConfig = config;
        if (state.activePage === 'settings') this.renderApp();
      }),
      subscribeList('entries', entries => {
        state.entries = entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        this.renderActiveDataPage('atlas');
      }, error => this.showDataError('Atlas entries', error)),
      subscribeList('txns', txns => {
        state.txns = txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        this.renderActiveDataPage('finance');
      }, error => this.showDataError('Finance', error)),
      subscribeList('tasks', tasks => {
        state.tasks = tasks;
        this.renderActiveDataPage('work');
      }, error => this.showDataError('Work board', error)),
      subscribeList('games', games => {
        state.games = games;
        this.renderActiveDataPage('games');
      }, error => this.showDataError('Games', error))
    );
  }

  private disposeDataSubscriptions(): void {
    while (this.unsubs.length) this.unsubs.pop()?.();
  }

  private renderActiveDataPage(page: PageId): void {
    if (state.activePage === page || state.activePage === 'home') this.renderApp();
  }

  private showDataError(area: string, error: Error): void {
    console.error(`${area} sync failed`, error);
    this.toast.show(`${area} sync failed: ${error.message || 'check Firebase rules'}`, 'err');
  }

  private handleDocumentFiles(files: FileList | null): void {
    state.docFiles = files ? Array.from(files) : [];
    state.driveStatus = state.docFiles.length ? `${state.docFiles.length} file${state.docFiles.length === 1 ? '' : 's'} ready for ${driveOwnerLabel(state.driveOwner)}` : '';
    this.renderApp();
  }

  private async selectDocumentOwner(owner: DriveOwner): Promise<void> {
    state.driveOwner = owner;
    state.docFiles = [];
    state.driveDocs = [];
    state.driveStatus = `${driveOwnerLabel(owner)} selected`;
    this.renderApp();
    if (state.driveConnected) await this.refreshDriveDocs();
  }

  private async connectDriveAndLoad(): Promise<void> {
    state.driveBusy = true;
    state.driveStatus = 'connecting to Google Drive...';
    try {
      await connectDrive();
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
      this.renderApp();
    }
  }

  private async refreshDriveDocs(): Promise<void> {
    state.driveBusy = true;
    state.driveStatus = 'loading Drive documents...';
    this.renderApp();
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
      this.renderApp();
    }
  }

  private async uploadDocuments(): Promise<void> {
    if (!state.docFiles.length) return this.toast.show('choose documents first', 'err');
    state.driveBusy = true;
    this.renderApp();
    try {
      const total = state.docFiles.length;
      for (let i = 0; i < total; i += 1) {
        state.driveStatus = `uploading ${i + 1}/${total} to ${driveOwnerLabel(state.driveOwner)}: ${state.docFiles[i].name}`;
        await uploadDriveDoc(state.docFiles[i], state.driveOwner);
      }
      state.docFiles = [];
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
      this.renderApp();
    }
  }

  private async deleteDocument(id: string): Promise<void> {
    if (!id) return;
    state.driveBusy = true;
    state.driveStatus = 'deleting document...';
    this.renderApp();
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
      this.renderApp();
    }
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
      this.renderApp();
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
    this.renderApp();
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
    this.renderApp();
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
    this.renderApp();
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
      this.renderApp();
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
      closeModal('modal-game-detail');
      this.renderApp();
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
  return owner === 'her' ? 'Shrushti' : 'Mit';
}

function optionalFormValue(selector: string): string {
  return (document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector)?.value || '').trim();
}

function parseMoney(value: string): number {
  return Number.parseFloat(value.replace(/[$,\s]/g, ''));
}
