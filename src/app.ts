import { cleanAuthError, configureAuthPersistence, onAuthChanged, resolveCurrentUser, signIn, signOut } from './api/authApi';
import {
  deleteEntry,
  deleteFunPack as deleteFunPackApi,
  deleteGame,
  deleteTask,
  deleteTransaction,
  getWeekly,
  markQotdSeen,
  markWeeklySeen,
  type DataMap,
  type DataPath,
  removeHerConfig,
  saveEntry as saveEntryApi,
  saveFunPack as saveFunPackApi,
  saveGame as saveGameApi,
  saveHerConfig,
  saveQotdAnswer,
  saveTask,
  saveTransaction,
  saveWeekly,
  subscribeHerConfig,
  subscribeList,
  subscribeQotd,
  updateTaskColumn,
  voteQotd
} from './api/databaseApi';
import { roseChat, roseGreeting, roseWeekly } from './api/rose';
import { ensureWorkoutProgramSeeded, saveWorkoutSession, subscribeWorkoutProgram, subscribeWorkoutSessions } from './api/workoutApi';
import { renderSidebar } from './components/Sidebar';
import { Lightbox } from './components/Lightbox';
import { openModal, closeModal } from './components/Modal';
import { renderModals } from './components/Modals';
import { renderRoseFab } from './components/RoseFab';
import { Toast } from './components/Toast';
import { connectDrive, deleteDriveDoc, driveCacheAge, isDriveConnected, listDriveDocs, loadCachedDriveDocs, uploadDriveDoc, wasDriveConnected } from './api/driveApi';
import { deleteStorageFile, getStorageFileUrl, uploadFunMedia } from './api/storageApi';
import { localDateKey, questionForDate } from './data/qotdQuestions';
import { state } from './state/appState';
import type { AtlasEntry, AtlasSection, DriveOwner, FinanceKind, FunOwner, FunPack, FunSavedMedia, Game, GameStatus, PageId, Transaction, WorkColumn, WorkTask, WorkoutDayType, WorkoutProgramDay, WorkoutSession } from './types/models';
import { checked, formValue, morphHtml, morphNode, qs } from './utils/dom';
import { debounce } from './utils/debounce';
import { compressImageFile, compressImage, fileToPick, releasePicks, serializeMedia, type MediaPick } from './utils/media';
import { isSunday, weekKeyForDate } from './utils/qotdDates';
import { hasQotdAnswer } from './utils/qotdScore';
import { dateFromSessionKey, dayTypeFor, sessionKey } from './utils/workoutSchedule';
import {
  filteredEntries,
  renderAtlasPage,
  renderEntriesList,
  renderFinancePage,
  renderGameCoverPreview,
  renderDocumentsPage,
  renderFunPage,
  renderFunPreviews,
  renderGameMediaPreviews,
  renderGamesPage,
  renderHomePage,
  renderMediaPreviews,
  renderSettingsPage,
  renderTrainPage,
  renderUsPage,
  renderWorkMediaPreviews,
  renderWorkPage,
  renderAuthPage
} from './pages';

export class DashboardApp {
  private readonly toast = new Toast();
  private readonly lightbox = new Lightbox();
  private readonly unsubs: Array<() => void> = [];
  private readonly reportedDataErrors = new Set<string>();
  private readonly funViewerUrls: string[] = [];
  private driveAutoLoadKey = '';

  constructor(private readonly root: HTMLElement) {}

  async start(): Promise<void> {
    await configureAuthPersistence();
    this.bindGlobalEvents();
    onAuthChanged(async user => {
      if (!user) {
        this.disposeDataSubscriptions();
        state.currentUser = null;
        state.weeklyActivity = null;
        state.rosePanelOpen = false;
        state.roseConvo = [];
        state.roseInput = '';
        state.roseBusy = false;
        state.roseError = '';
        state.roseGreeting = '';
        state.roseGreetingDismissed = false;
        this.renderAuth();
        return;
      }
      state.currentUser = await resolveCurrentUser(user.email || '');
      state.activePage = 'home';
      this.resetRoseSession();
      this.hydrateCachedData();
      this.renderApp();
      this.replaceHistory('home');
      this.subscribeToData();
      if (state.currentUser.role === 'me') {
        void ensureWorkoutProgramSeeded().catch(error => this.showDataError('Train program', error));
      }
      void this.loadRoseGreeting();
      void this.ensureWeeklyActivity();
    });
  }

  private renderAuth(): void {
    morphHtml(this.root, renderAuthPage());
  }

  private renderApp(): void {
    if (!state.currentUser) {
      this.renderAuth();
      return;
    }
    morphHtml(this.root, `<div id="app-screen" class="screen active">
      ${renderSidebar(state.activePage, state.currentUser)}
      <main class="main">${this.renderCurrentPage()}</main>
    </div>
    <div id="modal-root">${renderModals(state)}</div>
    <div id="rose-root">${renderRoseFab(state)}</div>`);
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
    morphHtml(main, this.renderCurrentPage());
    morphHtml(modalRoot, renderModals(state));
    this.renderRoseOnly();
  }

  private renderMainOnly(): void {
    const main = document.querySelector<HTMLElement>('.main');
    if (!main) {
      this.renderApp();
      return;
    }
    this.syncSidebarActiveState();
    morphHtml(main, this.renderCurrentPage());
    this.renderRoseOnly();
  }

  private renderModalsOnly(): void {
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) {
      this.renderApp();
      return;
    }
    morphHtml(modalRoot, renderModals(state));
  }

  private renderRoseOnly(focusInput = false): void {
    const roseRoot = document.getElementById('rose-root');
    if (!roseRoot) return;
    morphHtml(roseRoot, renderRoseFab(state));
    const messages = document.getElementById('rose-messages');
    if (messages) messages.scrollTop = messages.scrollHeight;
    if (focusInput) {
      const input = document.getElementById('rose-input') as HTMLTextAreaElement | null;
      if (input) {
        input.focus();
        input.selectionStart = input.value.length;
        input.selectionEnd = input.value.length;
      }
    }
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
      case 'us': return renderUsPage(state);
      case 'train': return renderTrainPage(state);
      case 'documents': return renderDocumentsPage(state);
      case 'fun': return renderFunPage(state);
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
      if (target.id === 'qotd-draft') {
        state.qotdDraft = (target as HTMLTextAreaElement).value;
      }
      if (target.id === 'rose-input') {
        state.roseInput = (target as HTMLTextAreaElement).value;
        const send = document.querySelector<HTMLButtonElement>('.rose-send');
        if (send) send.disabled = state.roseBusy || !state.roseInput.trim();
      }
      if (target instanceof HTMLInputElement && target.classList.contains('doc-rename-input')) {
        const index = Number(target.dataset.docIndex || -1);
        if (index >= 0) state.docFileNames[index] = target.value;
      }
    });

    document.addEventListener('focusout', event => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.dataset.trainLog === 'true') {
        void this.saveTrainLogInput(target);
      }
    });

    document.addEventListener('error', event => {
      const target = event.target as HTMLElement;
      if (target instanceof HTMLImageElement && target.classList.contains('cover-img')) {
        target.hidden = true;
      }
    }, true);

    document.addEventListener('keydown', event => {
      const target = event.target as HTMLElement;
      if (target.id === 'rose-input' && event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void this.sendRose();
        return;
      }
      if (event.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.open').forEach(modal => closeModal(modal.id));
        this.lightbox.close();
        this.closeFunViewer();
        if (state.rosePanelOpen) {
          state.rosePanelOpen = false;
          this.renderRoseOnly();
        }
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
      if (target.id === 'fun-files') this.handleFunFiles(target.files);
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
      case 'save-qotd':
        await this.saveQotd();
        break;
      case 'toggle-rose':
        state.rosePanelOpen = !state.rosePanelOpen;
        state.roseError = '';
        this.renderRoseOnly(state.rosePanelOpen);
        break;
      case 'close-rose':
        state.rosePanelOpen = false;
        this.renderRoseOnly();
        break;
      case 'clear-rose':
        state.roseConvo = [];
        state.roseInput = '';
        state.roseError = '';
        this.renderRoseOnly(true);
        break;
      case 'rose-quick':
        state.roseInput = target.dataset.prompt || '';
        state.rosePanelOpen = true;
        state.roseError = '';
        this.renderRoseOnly(true);
        break;
      case 'send-rose':
        await this.sendRose();
        break;
      case 'dismiss-rose-greeting':
        state.roseGreetingDismissed = true;
        this.renderMainOnly();
        break;
      case 'love-weekly':
        await this.loveWeeklyActivity();
        break;
      case 'qotd-score-view':
        state.qotdScoreView = (target.dataset.view as typeof state.qotdScoreView) || 'week';
        this.renderMainOnly();
        break;
      case 'vote-qotd':
        await this.voteQotd(target.dataset.date || localDateKey(), target.dataset.next === 'true');
        break;
      case 'train-pick-day':
        state.trainSelectedDate = target.dataset.date || sessionKey();
        this.renderMainOnly();
        break;
      case 'train-toggle-overview':
        state.trainShowOverview = !state.trainShowOverview;
        this.renderMainOnly();
        break;
      case 'train-open-log': {
        const id = target.dataset.id || '';
        const key = this.trainExerciseKey(id);
        state.trainExpandedLogs[key] = !state.trainExpandedLogs[key];
        this.renderMainOnly();
        break;
      }
      case 'train-toggle-complete':
        await this.toggleTrainComplete(target.dataset.id || '');
        break;
      case 'train-finish-session':
        await this.finishTrainSession();
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
      case 'select-fun-owner':
        this.selectFunOwner((target.dataset.owner as FunOwner) || 'me');
        break;
      case 'choose-fun-media':
        qs<HTMLInputElement>('#fun-files').click();
        break;
      case 'remove-fun-media':
        this.removeFunMedia(Number(target.dataset.index || 0));
        break;
      case 'save-fun-icloud':
        await this.saveFunToCloudFiles();
        break;
      case 'delete-fun-pack':
        await this.deleteFunPack(target.dataset.id || '');
        break;
      case 'open-fun-pack':
        await this.openFunPack(target.dataset.id || '');
        break;
      case 'close-fun-viewer':
        this.closeFunViewer();
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

  private resolveAllowedPage(page: PageId): PageId {
    if ((page === 'settings' || page === 'train') && state.currentUser?.role !== 'me') return 'home';
    return page;
  }

  private navigate(page: PageId, pushHistory = true): void {
    const nextPage = this.resolveAllowedPage(page);
    const oldPage = state.activePage;
    state.activePage = nextPage;
    if (pushHistory && oldPage !== nextPage) this.pushHistory(nextPage);
    this.preparePage(nextPage);
    this.renderView();
    if (nextPage === 'documents') void this.maybeAutoLoadDriveDocs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private preparePage(page: PageId): void {
    if (page === 'train' && !state.trainSelectedDate) state.trainSelectedDate = sessionKey();
    if (page === 'us') void this.markTodayQotdSeen();
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
    const resolvedPage = this.resolveAllowedPage(pageFromHash || page);
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
    return ['home', 'finance', 'work', 'atlas', 'games', 'us', 'train', 'documents', 'fun', 'settings'].includes(page) ? page : null;
  }

  private subscribeToData(): void {
    this.disposeDataSubscriptions();
    const rerenderSettings = debounce(() => {
      if (state.activePage === 'settings') this.renderMainOnly();
    });
    const rerenderEntries = debounce(() => this.renderActiveDataPage('atlas'));
    const rerenderFinance = debounce(() => this.renderActiveDataPage('finance'));
    const rerenderWork = debounce(() => this.renderActiveDataPage('work'));
    const rerenderGames = debounce(() => this.renderActiveDataPage('games'));
    const rerenderUs = debounce(() => this.renderActiveDataPage('us'));
    const rerenderFun = debounce(() => this.renderActiveDataPage('fun'));
    const rerenderTrain = debounce(() => this.renderActiveDataPage('train'));
    this.unsubs.push(
      subscribeHerConfig(config => {
        state.herConfig = config;
        rerenderSettings();
      }),
      subscribeList('entries', entries => {
        state.entries = entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        saveCachedList('entries', state.entries);
        rerenderEntries();
      }, error => this.showDataError('Atlas entries', error)),
      subscribeList('txns', txns => {
        state.txns = txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        saveCachedList('txns', state.txns);
        rerenderFinance();
      }, error => this.showDataError('Finance', error)),
      subscribeList('tasks', tasks => {
        state.tasks = tasks;
        saveCachedList('tasks', state.tasks);
        rerenderWork();
      }, error => this.showDataError('Work board', error)),
      subscribeList('games', games => {
        state.games = games;
        saveCachedList('games', state.games);
        rerenderGames();
      }, error => this.showDataError('Games', error)),
      subscribeQotd(days => {
        state.qotdDays = days;
        saveCachedList('qotd', state.qotdDays);
        if (state.activePage === 'us') void this.markTodayQotdSeen();
        rerenderUs();
      }, error => this.showDataError('Us questions', error)),
      subscribeList('funPacks', packs => {
        state.funPacks = packs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        saveCachedList('funPacks', state.funPacks);
        rerenderFun();
      }, error => this.showDataError('Fun vault', error))
    );
    if (state.currentUser?.role === 'me') {
      this.unsubs.push(
        subscribeWorkoutProgram(program => {
          state.workoutProgram = program;
          saveCachedValue('workoutProgram', program);
          rerenderTrain();
        }, error => this.showDataError('Train program', error)),
        subscribeWorkoutSessions(sessions => {
          state.workoutSessions = sessions;
          saveCachedValue('workoutSessions', sessions);
          rerenderTrain();
        }, error => this.showDataError('Train sessions', error))
      );
    }
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
    state.qotdDays = loadCachedList('qotd').sort((a, b) => b.date.localeCompare(a.date));
    state.funPacks = loadCachedList('funPacks').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    state.workoutProgram = loadCachedValue<Record<WorkoutDayType, WorkoutProgramDay> | null>('workoutProgram', null);
    state.workoutSessions = loadCachedValue<WorkoutSession[]>('workoutSessions', []);
    state.trainSelectedDate = sessionKey();
    state.trainExpandedLogs = {};
    state.trainShowOverview = true;
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

  private selectFunOwner(owner: FunOwner): void {
    state.funOwner = owner;
    state.funStatus = owner === 'her' ? 'Shrushti fun selected' : 'Mit fun selected';
    this.renderMainOnly();
  }

  private handleFunFiles(files: FileList | null): void {
    if (!files) return;
    Array.from(files)
      .filter(file => file.type.startsWith('image/') || file.type.startsWith('video/'))
      .slice(0, 30 - state.funMediaPicks.length)
      .forEach(file => state.funMediaPicks.push(fileToPick(file)));
    state.funStatus = `${state.funMediaPicks.length} file${state.funMediaPicks.length === 1 ? '' : 's'} ready`;
    const previews = document.getElementById('fun-previews');
    if (previews) morphHtml(previews, renderFunPreviews(state));
    const input = document.querySelector<HTMLInputElement>('#fun-files');
    if (input) input.value = '';
    const save = document.querySelector<HTMLButtonElement>('.fun-save');
    if (save) {
      save.disabled = !state.funMediaPicks.length;
      save.textContent = `save ${state.funMediaPicks.length} to Firebase vault`;
    }
  }

  private removeFunMedia(index: number): void {
    URL.revokeObjectURL(state.funMediaPicks[index]?.prev);
    state.funMediaPicks.splice(index, 1);
    state.funStatus = state.funMediaPicks.length ? `${state.funMediaPicks.length} file${state.funMediaPicks.length === 1 ? '' : 's'} ready` : '';
    const previews = document.getElementById('fun-previews');
    if (previews) morphHtml(previews, renderFunPreviews(state));
    const save = document.querySelector<HTMLButtonElement>('.fun-save');
    if (save) {
      save.disabled = !state.funMediaPicks.length;
      save.textContent = state.funMediaPicks.length ? `save ${state.funMediaPicks.length} to Firebase vault` : 'save to Firebase vault';
    }
  }

  private async deleteFunPack(id: string): Promise<void> {
    const pack = state.funPacks.find(item => item.id === id);
    await Promise.all((pack?.files || []).map(async file => {
      if (file.storageKey) await deleteFunBlob(file.storageKey);
      if (file.storagePath) {
        try {
          await deleteStorageFile(file.storagePath);
        } catch (error) {
          console.warn('Could not delete Firebase Storage file', error);
        }
      }
    }));
    await deleteFunPackApi(id);
    state.funPacks = state.funPacks.filter(item => item.id !== id);
    saveCachedList('funPacks', state.funPacks);
    state.funStatus = 'saved pack deleted';
    this.renderMainOnly();
  }

  private async openFunPack(id: string): Promise<void> {
    const pack = state.funPacks.find(item => item.id === id);
    if (!pack) return;
    this.closeFunViewer();
    const mediaHtml: string[] = [];
    for (const file of pack.files) {
      let url = '';
      if (file.storagePath) {
        try {
          url = await getStorageFileUrl(file.storagePath);
        } catch (error) {
          console.warn('Could not create Firebase media URL', error);
        }
      } else if (file.data) {
        url = file.data;
      } else if (file.dataChunks?.length) {
        url = file.dataChunks.join('');
      } else if (file.url) {
        url = file.url;
      } else if (file.storageKey) {
        const blob = await getFunBlob(file.storageKey);
        if (blob) {
          url = URL.createObjectURL(blob);
          this.funViewerUrls.push(url);
        }
      }
      mediaHtml.push(`<div class="fun-viewer-item">
        <div class="fun-viewer-media">
          ${url
            ? file.type === 'video'
              ? `<video src="${url}" controls playsinline preload="metadata"></video>`
              : `<img src="${url}" alt="${escapeAttr(file.name)}" loading="lazy" decoding="async">`
            : file.preview
              ? `<img src="${file.preview}" alt="${escapeAttr(file.name)}" loading="lazy" decoding="async">`
              : `<div class="fun-viewer-missing">${file.type === 'video' ? '🎥' : '📸'}<span>media link unavailable</span></div>`}
        </div>
        <div class="fun-viewer-name">${escapeHtml(file.name)}</div>
        ${!url ? '<div class="fun-viewer-note">This older item has no Firebase video/photo link yet. Save it again to make it playable everywhere.</div>' : ''}
      </div>`);
    }
    const date = new Date(pack.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const viewer = document.createElement('div');
    viewer.id = 'fun-viewer';
    viewer.className = 'modal-backdrop open fun-viewer-backdrop';
    viewer.innerHTML = `<div class="modal-card fun-viewer-card">
      <button class="modal-x" data-action="close-fun-viewer">×</button>
      <div class="fun-viewer-head">
        <div>
          <h2>${escapeHtml(pack.title)}</h2>
          <p>${pack.owner === 'her' ? 'Shrushti fun' : 'Mit fun'} · ${date} · ${pack.files.length} file${pack.files.length === 1 ? '' : 's'}</p>
        </div>
      </div>
      <div class="fun-viewer-grid">${mediaHtml.join('')}</div>
    </div>`;
    document.body.appendChild(viewer);
  }

  private closeFunViewer(): void {
    document.getElementById('fun-viewer')?.remove();
    while (this.funViewerUrls.length) {
      URL.revokeObjectURL(this.funViewerUrls.pop() || '');
    }
  }

  private async saveFunToCloudFiles(): Promise<void> {
    if (!state.funMediaPicks.length) return this.toast.show('choose photos or videos first', 'err');
    const button = qs<HTMLButtonElement>('.fun-save');
    button.disabled = true;
    try {
      const title = optionalFormValue('#fun-title') || `${state.funOwner === 'her' ? 'shrushti' : 'mit'} fun`;
      const packId = `fun_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const files: File[] = [];
      for (let i = 0; i < state.funMediaPicks.length; i += 1) {
        const pick = state.funMediaPicks[i];
        button.textContent = pick.type === 'image' ? `compressing ${i + 1}/${state.funMediaPicks.length}...` : `preparing ${i + 1}/${state.funMediaPicks.length}...`;
        const safeBase = safeFileBase(`${title}-${i + 1}`);
        if (pick.type === 'image') {
          try {
            files.push(await compressImageFile(pick.file, `${safeBase}.jpg`));
          } catch {
            files.push(new File([pick.file], `${safeBase}-${pick.name}`, { type: pick.file.type, lastModified: Date.now() }));
          }
        } else {
          const ext = pick.name.includes('.') ? pick.name.split('.').pop() : 'mov';
          files.push(new File([pick.file], `${safeBase}.${ext}`, { type: pick.file.type || 'video/quicktime', lastModified: Date.now() }));
        }
      }

      const uploaded: Array<{ storagePath?: string; data?: string; dataChunks?: string[] }> = [];
      for (let i = 0; i < files.length; i += 1) {
        const mb = Math.round((files[i].size / 1024 / 1024) * 10) / 10;
        button.textContent = `uploading ${i + 1}/${files.length} · 0% of ${mb} MB`;
        try {
          uploaded.push(await uploadFunMedia(files[i], state.funOwner, packId, i, percent => {
            button.textContent = `uploading ${i + 1}/${files.length} · ${percent}% of ${mb} MB`;
          }));
        } catch (error) {
          console.warn('Firebase Storage upload failed; saving inline fallback', error);
          button.textContent = `saving ${i + 1}/${files.length} privately...`;
          uploaded.push(await fileToPrivateData(files[i]));
        }
      }

      button.textContent = 'saving pack...';
      const pack = await buildFunPack(packId, title, state.funOwner, state.funMediaPicks, files, uploaded, state.currentUser?.role);
      await saveFunPackApi(pack);
      state.funPacks = [pack, ...state.funPacks].slice(0, 80);
      saveCachedList('funPacks', state.funPacks);
      state.funStatus = 'saved to Firebase vault ✓';
      this.toast.show('saved to Firebase vault ✓', 'ok');
      releasePicks(state.funMediaPicks);
      state.funMediaPicks = [];
    } catch (error) {
      console.error('Firebase Fun vault save failed', error);
      state.funStatus = error instanceof Error ? error.message : 'Firebase save failed';
      this.toast.show(`could not save: ${state.funStatus}`, 'err');
    } finally {
      button.disabled = false;
      button.textContent = `save ${state.funMediaPicks.length || ''} to Firebase vault`;
      this.renderMainOnly();
    }
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

  private trainDateKey(): string {
    return state.trainSelectedDate || sessionKey();
  }

  private trainExerciseKey(exerciseId: string): string {
    return `${this.trainDateKey()}:${exerciseId}`;
  }

  private getWorkoutSession(dateKey = this.trainDateKey()): WorkoutSession {
    const existing = state.workoutSessions.find(item => item.date === dateKey);
    if (existing) {
      return {
        ...existing,
        completed: { ...(existing.completed || {}) },
        logs: Object.fromEntries(
          Object.entries(existing.logs || {}).map(([key, value]) => [key, (value || []).map(row => ({ ...row }))])
        )
      };
    }
    return {
      date: dateKey,
      dayType: dayTypeFor(dateFromSessionKey(dateKey)),
      startedAt: new Date().toISOString(),
      completed: {},
      logs: {}
    };
  }

  private async upsertWorkoutSession(session: WorkoutSession): Promise<void> {
    await saveWorkoutSession(session);
    state.workoutSessions = [
      session,
      ...state.workoutSessions.filter(item => item.date !== session.date)
    ].sort((a, b) => b.date.localeCompare(a.date));
    saveCachedValue('workoutSessions', state.workoutSessions);
  }

  private async toggleTrainComplete(exerciseId: string): Promise<void> {
    if (state.currentUser?.role !== 'me') {
      this.toast.show('owner only', 'err');
      return;
    }
    if (!exerciseId) return;
    const session = this.getWorkoutSession();
    session.completed[exerciseId] = !session.completed[exerciseId];
    try {
      await this.upsertWorkoutSession(session);
      this.renderMainOnly();
    } catch (error) {
      console.error('train complete failed', error);
      this.toast.show(`train did not save: ${error instanceof Error ? error.message : 'check Firebase rules'}`, 'err');
    }
  }

  private async saveTrainLogInput(input: HTMLInputElement): Promise<void> {
    if (state.currentUser?.role !== 'me') return;
    const exerciseId = input.dataset.id || '';
    const field = input.dataset.field;
    const set = Number(input.dataset.set || 0);
    if (!exerciseId || (field !== 'weight' && field !== 'reps') || !set) return;
    const session = this.getWorkoutSession();
    const rows = [...(session.logs[exerciseId] || [])];
    let row = rows.find(item => item.set === set);
    if (!row) {
      row = { set };
      rows.push(row);
    }
    const raw = input.value.trim();
    if (raw) {
      const value = Number(raw);
      if (Number.isFinite(value)) row[field] = value;
    } else {
      delete row[field];
    }
    session.logs[exerciseId] = rows
      .filter(item => item.weight !== undefined || item.reps !== undefined)
      .sort((a, b) => a.set - b.set);
    try {
      await this.upsertWorkoutSession(session);
    } catch (error) {
      console.error('train log save failed', error);
      this.toast.show(`set log did not save: ${error instanceof Error ? error.message : 'check Firebase rules'}`, 'err');
    }
  }

  private async finishTrainSession(): Promise<void> {
    if (state.currentUser?.role !== 'me') {
      this.toast.show('owner only', 'err');
      return;
    }
    const session = this.getWorkoutSession();
    session.finishedAt = new Date().toISOString();
    try {
      await this.upsertWorkoutSession(session);
      this.renderMainOnly();
      this.toast.show('great job', 'ok');
    } catch (error) {
      console.error('train finish failed', error);
      this.toast.show(`session did not save: ${error instanceof Error ? error.message : 'check Firebase rules'}`, 'err');
    }
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
    if (previews) morphHtml(previews, renderMediaPreviews(state));
    qs<HTMLInputElement>('#m-efiles').value = '';
  }

  private removeMedia(index: number): void {
    URL.revokeObjectURL(state.mediaPicks[index]?.prev);
    state.mediaPicks.splice(index, 1);
    const previews = document.getElementById('m-eprev');
    if (previews) morphHtml(previews, renderMediaPreviews(state));
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
    if (previews) morphHtml(previews, renderWorkMediaPreviews(state));
    qs<HTMLInputElement>(`#${inputId}`).value = '';
  }

  private removeWorkMedia(index: number): void {
    URL.revokeObjectURL(state.workMediaPicks[index]?.prev);
    state.workMediaPicks.splice(index, 1);
    const previews = document.getElementById('m-kprev');
    if (previews) morphHtml(previews, renderWorkMediaPreviews(state));
    const detailPreviews = document.getElementById('m-kd-prev');
    if (detailPreviews) morphHtml(detailPreviews, renderWorkMediaPreviews(state));
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
    if (previews) morphHtml(previews, renderGameCoverPreview(state));
    qs<HTMLInputElement>(`#${inputId}`).value = '';
  }

  private removeGameCover(index: number): void {
    URL.revokeObjectURL(state.gameCoverPicks[index]?.prev);
    state.gameCoverPicks.splice(index, 1);
    const previews = document.getElementById('m-gcover-prev');
    if (previews) morphHtml(previews, renderGameCoverPreview(state));
    const detailPreviews = document.getElementById('m-gd-cover-prev');
    if (detailPreviews) morphHtml(detailPreviews, renderGameCoverPreview(state));
  }

  private handleGameMediaFiles(files: FileList | null, previewId = 'm-gprev', inputId = 'm-gfiles'): void {
    if (!files) return;
    Array.from(files).slice(0, 12 - state.gameMediaPicks.length).forEach(file => state.gameMediaPicks.push(fileToPick(file)));
    const previews = document.getElementById(previewId);
    if (previews) morphHtml(previews, renderGameMediaPreviews(state));
    qs<HTMLInputElement>(`#${inputId}`).value = '';
  }

  private removeGameMedia(index: number): void {
    URL.revokeObjectURL(state.gameMediaPicks[index]?.prev);
    state.gameMediaPicks.splice(index, 1);
    const previews = document.getElementById('m-gprev');
    if (previews) morphHtml(previews, renderGameMediaPreviews(state));
    const detailPreviews = document.getElementById('m-gd-prev');
    if (detailPreviews) morphHtml(detailPreviews, renderGameMediaPreviews(state));
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
    morphNode('#entries-list', renderEntriesList(state, filteredEntries(state)));
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
      const coverPick = state.gameCoverPicks[0];
      const uploadedCover = coverPick ? await compressImage(coverPick.file, 900, 0.75) : '';
      const coverThumb = coverPick ? await compressImage(coverPick.file, 480, 0.72) : '';
      button.textContent = 'saving...';
      const game: Game = {
        id: `g_${Date.now()}`,
        name,
        platform: qs<HTMLSelectElement>('#m-gplat').value,
        status: qs<HTMLSelectElement>('#m-gstatus').value as GameStatus,
        cover: uploadedCover || formValue(document, '#m-gcover'),
        coverThumb: coverThumb || undefined,
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
      const coverPick = state.gameCoverPicks[0];
      const uploadedCover = coverPick ? await compressImage(coverPick.file, 900, 0.75) : '';
      const coverThumb = coverPick ? await compressImage(coverPick.file, 480, 0.72) : '';
      button.textContent = 'saving...';
      const updated: Game = {
        ...game,
        platform: qs<HTMLSelectElement>('#m-gd-plat').value,
        status: qs<HTMLSelectElement>('#m-gd-status').value as GameStatus,
        now: checked(document, '#m-gd-now'),
        url: formValue(document, '#m-gd-url'),
        cover: uploadedCover || formValue(document, '#m-gd-cover'),
        coverThumb: coverThumb || game.coverThumb,
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

  private async saveQotd(): Promise<void> {
    const role = state.currentUser?.role;
    if (!role) return this.toast.show('sign in first', 'err');
    const text = state.qotdDraft.trim();
    if (!text) return this.toast.show('write your answer first', 'err');
    const dateKey = localDateKey();
    const existing = state.qotdDays.find(day => day.date === dateKey);
    if (hasQotdAnswer(existing?.[role])) return this.toast.show('your answer is already locked for today', 'err');
    const picked = questionForDate(dateKey);
    const question = existing?.q || picked.q;
    const category = existing?.category || picked.category;
    try {
      await saveQotdAnswer(dateKey, role, text, question, category);
      state.qotdDraft = '';
      this.toast.show('answer locked ✓', 'ok');
    } catch (error) {
      console.error('daily question save failed', error);
      this.toast.show(`answer did not save: ${error instanceof Error ? error.message : 'check Firebase rules'}`, 'err');
    }
  }

  private async voteQotd(dateKey: string, next: boolean): Promise<void> {
    const role = state.currentUser?.role;
    if (!role) return this.toast.show('sign in first', 'err');
    const day = state.qotdDays.find(item => item.date === dateKey);
    if (!day || !hasQotdAnswer(day.me) || !hasQotdAnswer(day.her)) return this.toast.show('both answers need to be saved first', 'err');
    try {
      await voteQotd(dateKey, role, next);
      this.toast.show(next ? '+2 vote saved' : 'vote removed', 'ok');
    } catch (error) {
      console.error('daily question vote failed', error);
      this.toast.show(`vote did not save: ${error instanceof Error ? error.message : 'check Firebase rules'}`, 'err');
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

  private resetRoseSession(): void {
    const display = state.currentUser?.display || 'there';
    state.weeklyActivity = null;
    state.rosePanelOpen = false;
    state.roseConvo = [];
    state.roseInput = '';
    state.roseBusy = false;
    state.roseError = '';
    state.roseGreeting = `hi ${display.toLowerCase()}. good to see you. 🌹`;
    state.roseGreetingDismissed = false;
  }

  private async markTodayQotdSeen(): Promise<void> {
    const role = state.currentUser?.role;
    if (!role) return;
    const dateKey = localDateKey();
    const existing = state.qotdDays.find(day => day.date === dateKey);
    if (existing?.[role]?.seenAt) return;
    const picked = questionForDate(dateKey);
    try {
      await markQotdSeen(dateKey, role, existing?.q || picked.q, existing?.category || picked.category);
    } catch (error) {
      console.warn('Could not mark Us question as seen', error);
    }
  }

  private async loadRoseGreeting(): Promise<void> {
    const user = state.currentUser;
    if (!user) return;
    try {
      const text = await roseGreeting(user.display, user.role);
      if (text.trim()) {
        state.roseGreeting = text.trim();
        if (state.activePage === 'home') this.renderMainOnly();
      }
    } catch (error) {
      console.warn('Rose greeting unavailable', error);
    }
  }

  private async ensureWeeklyActivity(): Promise<void> {
    const weekKey = weekKeyForDate();
    try {
      const existing = await getWeekly(weekKey);
      if (existing) {
        state.weeklyActivity = existing;
      } else if (isSunday()) {
        const suggestion = await roseWeekly();
        await saveWeekly(weekKey, suggestion);
        state.weeklyActivity = {
          weekKey,
          suggestion,
          createdAt: new Date().toISOString(),
          seenBy: { me: false, her: false }
        };
      }
      if (state.activePage === 'home') this.renderMainOnly();
    } catch (error) {
      console.warn('Rose weekly activity unavailable', error);
    }
  }

  private async loveWeeklyActivity(): Promise<void> {
    const role = state.currentUser?.role;
    const week = state.weeklyActivity;
    if (!role || !week) return;
    try {
      await markWeeklySeen(week.weekKey, role);
      state.weeklyActivity = {
        ...week,
        seenBy: { ...(week.seenBy || {}), [role]: true }
      };
      this.renderMainOnly();
    } catch (error) {
      console.error('Could not mark Rose weekly activity seen', error);
      this.toast.show('Rose activity did not save', 'err');
    }
  }

  private async sendRose(): Promise<void> {
    const text = state.roseInput.trim();
    if (!text || state.roseBusy) return;
    state.roseConvo = [...state.roseConvo, { role: 'user', content: text }];
    state.roseInput = '';
    state.roseBusy = true;
    state.roseError = '';
    state.rosePanelOpen = true;
    this.renderRoseOnly();
    try {
      const reply = await roseChat(state.roseConvo, state.activePage);
      state.roseConvo = [...state.roseConvo, { role: 'assistant', content: reply }];
    } catch (error) {
      console.error('Rose chat failed', error);
      state.roseError = error instanceof Error ? error.message : 'rose is unavailable right now';
    } finally {
      state.roseBusy = false;
      this.renderRoseOnly(true);
    }
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

const FUN_DB_NAME = 'mitpatel_fun_vault';
const FUN_DB_STORE = 'media';
const INLINE_FUN_FALLBACK_LIMIT = 18 * 1024 * 1024;
const PRIVATE_DATA_CHUNK_SIZE = 900 * 1024;

async function buildFunPack(
  id: string,
  title: string,
  owner: FunOwner,
  picks: MediaPick[],
  savedFiles: File[],
  uploaded: Array<{ storagePath?: string; data?: string; dataChunks?: string[] }>,
  by?: FunPack['by']
): Promise<FunPack> {
  const files: FunSavedMedia[] = [];
  for (let i = 0; i < picks.length; i += 1) {
    files.push(await mediaPickToSavedMedia(picks[i], savedFiles[i], uploaded[i]));
  }
  return {
    id,
    owner,
    title,
    date: new Date().toISOString(),
    by,
    files
  };
}

async function mediaPickToSavedMedia(
  pick: MediaPick,
  savedFile?: File,
  uploaded?: { storagePath?: string; data?: string; dataChunks?: string[] }
): Promise<FunSavedMedia> {
  const mediaFile = savedFile || pick.file;
  const storageKey = `fun_media_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const base: FunSavedMedia = {
    type: pick.type,
    name: mediaFile.name || pick.name,
    size: mediaFile.size
  };
  if (uploaded?.data) base.data = uploaded.data;
  if (uploaded?.dataChunks?.length) base.dataChunks = uploaded.dataChunks;
  if (uploaded?.storagePath) base.storagePath = uploaded.storagePath;
  try {
    await putFunBlob(storageKey, mediaFile);
    base.storageKey = storageKey;
  } catch {
    // If browser storage refuses the file, still keep the visible history card.
  }
  try {
    const preview = pick.type === 'image'
      ? await imageFileToThumb(mediaFile)
      : await videoFileToThumb(mediaFile);
    return preview ? { ...base, preview } : base;
  } catch {
    return base;
  }
}

async function fileToPrivateData(file: File): Promise<{ data?: string; dataChunks?: string[] }> {
  const dataUrl = await fileToDataUrl(file);
  if (dataUrl.length <= PRIVATE_DATA_CHUNK_SIZE) return { data: dataUrl };
  return { dataChunks: chunkString(dataUrl, PRIVATE_DATA_CHUNK_SIZE) };
}

function fileToDataUrl(file: File): Promise<string> {
  if (file.size > INLINE_FUN_FALLBACK_LIMIT) {
    const mb = Math.round((file.size / 1024 / 1024) * 10) / 10;
    throw new Error(`Firebase Storage did not start and "${file.name}" is ${mb} MB. Try a smaller video or update Firebase Storage rules.`);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(String(event.target?.result || ''));
    reader.onerror = () => reject(reader.error || new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function chunkString(value: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += size) {
    chunks.push(value.slice(i, i + size));
  }
  return chunks;
}

function openFunDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(FUN_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(FUN_DB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open Fun vault storage'));
  });
}

async function putFunBlob(key: string, blob: Blob): Promise<void> {
  const db = await openFunDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FUN_DB_STORE, 'readwrite');
    tx.objectStore(FUN_DB_STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Could not save Fun vault media'));
  });
  db.close();
}

async function getFunBlob(key: string): Promise<Blob | null> {
  const db = await openFunDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(FUN_DB_STORE, 'readonly');
    const request = tx.objectStore(FUN_DB_STORE).get(key);
    request.onsuccess = () => resolve((request.result as Blob | undefined) || null);
    request.onerror = () => reject(request.error || new Error('Could not open Fun vault media'));
  });
  db.close();
  return blob;
}

async function deleteFunBlob(key: string): Promise<void> {
  const db = await openFunDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FUN_DB_STORE, 'readwrite');
    tx.objectStore(FUN_DB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Could not delete Fun vault media'));
  });
  db.close();
}

function imageFileToThumb(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const max = 420;
      let { width, height } = img;
      if (width > max || height > max) {
        if (width > height) {
          height = Math.round((height * max) / width);
          width = max;
        } else {
          width = Math.round((width * max) / height);
          height = max;
        }
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.58));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read ${file.name}`));
    };
    img.src = url;
  });
}

function videoFileToThumb(file: File): Promise<string> {
  return new Promise(resolve => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    let settled = false;
    const finish = (preview = '') => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(preview);
    };
    const draw = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = video.videoWidth || 420;
        const height = video.videoHeight || 260;
        const max = 420;
        const scale = Math.min(1, max / Math.max(width, height));
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL('image/jpeg', 0.58));
      } catch {
        finish();
      }
    };
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.addEventListener('loadeddata', draw, { once: true });
    video.addEventListener('error', () => finish(), { once: true });
    window.setTimeout(() => finish(), 1800);
    video.src = url;
    video.load();
  });
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

function saveCachedValue<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`mitpatel_cache_${key}_v1`, JSON.stringify(value));
  } catch {
    // Cache is only a display fallback; Firebase remains the source of truth.
  }
}

function loadCachedValue<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`mitpatel_cache_${key}_v1`);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function optionalFormValue(selector: string): string {
  return (document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector)?.value || '').trim();
}

function parseMoney(value: string): number {
  return Number.parseFloat(value.replace(/[$,\s]/g, ''));
}

function safeFileBase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'fun-memory';
}

function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function downloadFiles(files: File[]): void {
  files.forEach((file, index) => {
    window.setTimeout(() => downloadFile(file), index * 250);
  });
}
