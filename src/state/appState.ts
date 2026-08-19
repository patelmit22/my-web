import type { AtlasEntry, AtlasSection, CurrentUser, DriveDoc, DriveOwner, FinanceKind, FunOwner, FunPack, Game, HerConfig, NextVisit, PageId, QotdDay, QotdScoreView, RoseMessage, RoseModelChoice, TimezoneConfig, Transaction, WeeklyActivity, WorkTask, WorkoutDayType, WorkoutProgramDay, WorkoutSession } from '../types/models';
import type { MediaPick } from '../utils/media';
import { DEFAULT_TIMEZONE_CONFIG } from '../utils/timezones';

export interface AppState {
  currentUser: CurrentUser | null;
  activePage: PageId;
  atlasSection: AtlasSection;
  atlasSearch: string;
  entryFilter: 'all' | 'me' | 'her';
  txnKind: FinanceKind;
  financeView: 'personal' | 'subway';
  financeExpandedPanels: Record<string, boolean>;
  gameFilter: 'all' | Game['status'];
  selectedMood: string;
  txnType: Transaction['type'];
  mediaPicks: MediaPick[];
  gameMediaPicks: MediaPick[];
  gameCoverPicks: MediaPick[];
  workMediaPicks: MediaPick[];
  selectedGameId: string | null;
  gameDetailEditing: boolean;
  selectedTaskId: string | null;
  driveOwner: DriveOwner;
  driveDocs: DriveDoc[];
  driveConnected: boolean;
  driveBusy: boolean;
  driveStatus: string;
  docFiles: File[];
  docFileNames: string[];
  funOwner: FunOwner;
  funMediaPicks: MediaPick[];
  funPacks: FunPack[];
  funStatus: string;
  qotdDays: QotdDay[];
  qotdDraft: string;
  qotdScoreView: QotdScoreView;
  weeklyActivity: WeeklyActivity | null;
  rosePanelOpen: boolean;
  roseConvo: RoseMessage[];
  roseModel: RoseModelChoice;
  roseInput: string;
  roseBusy: boolean;
  roseError: string;
  roseGreeting: string;
  roseGreetingDismissed: boolean;
  lightboxUrls: string[];
  lightboxIndex: number;
  herConfig: HerConfig | null;
  timezoneConfig: TimezoneConfig;
  nextVisit: NextVisit | null;
  entries: AtlasEntry[];
  txns: Transaction[];
  tasks: WorkTask[];
  games: Game[];
  workoutProgram: Record<WorkoutDayType, WorkoutProgramDay> | null;
  workoutSessions: WorkoutSession[];
  trainSelectedDate: string;
  trainExpandedLogs: Record<string, boolean>;
  trainShowOverview: boolean;
}

export const state: AppState = {
  currentUser: null,
  activePage: 'home',
  atlasSection: 'stories',
  atlasSearch: '',
  entryFilter: 'all',
  txnKind: 'option',
  financeView: 'personal',
  financeExpandedPanels: {},
  gameFilter: 'all',
  selectedMood: '',
  txnType: 'in',
  mediaPicks: [],
  gameMediaPicks: [],
  gameCoverPicks: [],
  workMediaPicks: [],
  selectedGameId: null,
  gameDetailEditing: false,
  selectedTaskId: null,
  driveOwner: 'me_personal',
  driveDocs: [],
  driveConnected: false,
  driveBusy: false,
  driveStatus: '',
  docFiles: [],
  docFileNames: [],
  funOwner: 'me',
  funMediaPicks: [],
  funPacks: [],
  funStatus: '',
  qotdDays: [],
  qotdDraft: '',
  qotdScoreView: 'week',
  weeklyActivity: null,
  rosePanelOpen: false,
  roseConvo: [],
  roseModel: 'fast',
  roseInput: '',
  roseBusy: false,
  roseError: '',
  roseGreeting: '',
  roseGreetingDismissed: false,
  lightboxUrls: [],
  lightboxIndex: 0,
  herConfig: null,
  timezoneConfig: DEFAULT_TIMEZONE_CONFIG,
  nextVisit: null,
  entries: [],
  txns: [],
  tasks: [],
  games: [],
  workoutProgram: null,
  workoutSessions: [],
  trainSelectedDate: '',
  trainExpandedLogs: {},
  trainShowOverview: true
};
