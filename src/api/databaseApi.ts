import type { AtlasEntry, FunPack, Game, HerConfig, QotdCategory, QotdDay, Transaction, UserRole, WorkTask } from '../types/models';
import { db } from './firebaseClient';

export type DataPath = 'entries' | 'txns' | 'tasks' | 'games' | 'funPacks' | 'qotd';
export type DataMap = {
  entries: AtlasEntry;
  txns: Transaction;
  tasks: WorkTask;
  games: Game;
  funPacks: FunPack;
  qotd: QotdDay;
};

export function subscribeList<TPath extends DataPath>(
  path: TPath,
  callback: (items: DataMap[TPath][]) => void,
  onError: (error: Error) => void
): () => void {
  const ref = db.ref(path);
  const listener = ref.on(
    'value',
    snap => {
      const items: DataMap[TPath][] = [];
      snap.forEach(child => {
        items.push(child.val());
      });
      callback(items);
    },
    error => onError(error)
  );
  return () => ref.off('value', listener);
}

export function saveEntry(entry: AtlasEntry): Promise<void> {
  return db.ref(`entries/${entry.id}`).set(entry);
}

export function deleteEntry(id: number | string): Promise<void> {
  return db.ref(`entries/${id}`).remove();
}

export function saveTransaction(transaction: Transaction): Promise<void> {
  return db.ref(`txns/${transaction.id}`).set(transaction);
}

export function deleteTransaction(id: string): Promise<void> {
  return db.ref(`txns/${id}`).remove();
}

export function saveTask(task: WorkTask): Promise<void> {
  return db.ref(`tasks/${task.id}`).set(task);
}

export function updateTaskColumn(id: string, col: WorkTask['col']): Promise<void> {
  return db.ref(`tasks/${id}/col`).set(col);
}

export function deleteTask(id: string): Promise<void> {
  return db.ref(`tasks/${id}`).remove();
}

export async function saveGame(game: Game, existingGames: Game[]): Promise<void> {
  if (game.now) {
    const updates: Record<string, boolean> = {};
    existingGames.filter(g => g.now).forEach(g => {
      updates[`games/${g.id}/now`] = false;
    });
    if (Object.keys(updates).length) await db.ref().update(updates);
  }
  await db.ref(`games/${game.id}`).set(game);
}

export function deleteGame(id: string): Promise<void> {
  return db.ref(`games/${id}`).remove();
}

export function saveFunPack(pack: FunPack): Promise<void> {
  return db.ref(`funPacks/${pack.id}`).set(pack);
}

export function deleteFunPack(id: string): Promise<void> {
  return db.ref(`funPacks/${id}`).remove();
}

export function subscribeQotd(callback: (days: QotdDay[]) => void, onError: (error: Error) => void): () => void {
  const ref = db.ref('qotd');
  const listener = ref.on(
    'value',
    snap => {
      const days: QotdDay[] = [];
      snap.forEach(child => {
        const value = child.val() || {};
        days.push({
          date: child.key || value.date || '',
          q: value.q || '',
          category: value.category || 'sweet',
          me: value.me || null,
          her: value.her || null,
          votes: {
            meVotedHer: value.votes?.meVotedHer ?? null,
            herVotedMe: value.votes?.herVotedMe ?? null
          }
        });
      });
      callback(days.filter(day => day.date).sort((a, b) => b.date.localeCompare(a.date)));
    },
    error => onError(error)
  );
  return () => ref.off('value', listener);
}

export async function saveQotdAnswer(
  dateKey: string,
  role: UserRole,
  text: string,
  question: string,
  category: QotdCategory
): Promise<void> {
  const cleanText = text.trim();
  if (!cleanText) throw new Error('answer is empty');

  const dayRef = db.ref(`qotd/${dateKey}`);
  const snap = await dayRef.once('value');
  const updates: Record<string, unknown> = {
    [`${role}`]: {
      text: cleanText,
      at: new Date().toISOString()
    }
  };

  if (!snap.child('q').exists()) updates.q = question;
  if (!snap.child('category').exists()) updates.category = category;
  await dayRef.update(updates);
}

export function voteQotd(dateKey: string, voter: UserRole, active: boolean): Promise<void> {
  const field = voter === 'me' ? 'meVotedHer' : 'herVotedMe';
  return db.ref(`qotd/${dateKey}/votes/${field}`).set(active);
}

export async function getHerConfig(): Promise<HerConfig | null> {
  const snap = await db.ref('config/her').once('value');
  return snap.val();
}

export function subscribeHerConfig(callback: (config: HerConfig | null) => void): () => void {
  const ref = db.ref('config/her');
  const listener = ref.on('value', snap => callback(snap.val()));
  return () => ref.off('value', listener);
}

export function saveHerConfig(config: HerConfig): Promise<void> {
  return db.ref('config/her').set(config);
}

export function removeHerConfig(): Promise<void> {
  return db.ref('config/her').remove();
}
