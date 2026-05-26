export type UserRole = 'me' | 'her';

export interface CurrentUser {
  email: string;
  role: UserRole;
  display: string;
}

export interface HerConfig {
  email: string;
  display?: string;
  addedBy?: string;
  addedAt?: string;
}

export interface AtlasMedia {
  type: 'image' | 'video';
  data: string;
  name?: string;
}

export interface AtlasEntry {
  id: number;
  who: UserRole;
  section?: AtlasSection;
  title: string;
  body: string;
  thought?: string;
  media?: AtlasMedia[];
  mood?: string;
  tags?: string[];
  date: string;
}

export type AtlasSection = 'stories' | 'protected';

export interface Transaction {
  id: string;
  type: 'in' | 'out';
  kind?: FinanceKind;
  name: string;
  amount: number;
  cat?: string;
  note?: string;
  symbol?: string;
  optionType?: 'covered_call' | 'put';
  store?: SubwayStore;
  date: string;
  by: UserRole;
}

export type FinanceKind = 'general' | 'option' | 'spending' | 'subway_cash' | 'subway_expense';
export type SubwayStore = 'walmart' | 'maple_grove' | 'brooklyn_park';

export type WorkColumn = 'todo' | 'doing' | 'done';

export interface WorkTask {
  id: string;
  title: string;
  col: WorkColumn;
  note?: string;
  media?: AtlasMedia[];
  date: string;
  by: string;
}

export type GameStatus = 'playing' | 'finished' | 'wishlist' | 'dropped';

export interface Game {
  id: string;
  name: string;
  platform?: string;
  status: GameStatus;
  cover?: string;
  url?: string;
  clips?: string[];
  story?: string;
  media?: AtlasMedia[];
  now?: boolean;
  c1?: string;
  c2?: string;
  date: string;
  by: UserRole;
}

export type PageId = 'home' | 'finance' | 'work' | 'atlas' | 'games' | 'settings';
