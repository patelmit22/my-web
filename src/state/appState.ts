import type { AtlasEntry, CurrentUser, Game, HerConfig, PageId, Transaction, WorkTask } from '../types/models';
import type { MediaPick } from '../utils/media';

export interface AppState {
  currentUser: CurrentUser | null;
  activePage: PageId;
  entryFilter: 'all' | 'me' | 'her';
  gameFilter: 'all' | Game['status'];
  selectedMood: string;
  txnType: Transaction['type'];
  mediaPicks: MediaPick[];
  gameMediaPicks: MediaPick[];
  selectedGameId: string | null;
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
  entryFilter: 'all',
  gameFilter: 'all',
  selectedMood: '',
  txnType: 'in',
  mediaPicks: [],
  gameMediaPicks: [],
  selectedGameId: null,
  lightboxUrls: [],
  lightboxIndex: 0,
  herConfig: null,
  entries: [],
  txns: [],
  tasks: [],
  games: []
};
