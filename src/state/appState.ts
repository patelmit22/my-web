import type { AtlasEntry, AtlasSection, CurrentUser, DriveDoc, DriveOwner, FinanceKind, FunOwner, FunPack, Game, HerConfig, PageId, Transaction, WorkTask } from '../types/models';
import type { MediaPick } from '../utils/media';

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
  lightboxUrls: string[];
  lightboxIndex: number;
  herConfig: HerConfig | null;
  entries: AtlasEntry[];
  txns: Transaction[];
  tasks: WorkTask[];
  games: Game[];
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
  lightboxUrls: [],
  lightboxIndex: 0,
  herConfig: null,
  entries: [],
  txns: [],
  tasks: [],
  games: []
};
