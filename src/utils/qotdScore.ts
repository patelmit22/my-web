import { parseDateKey } from '../data/qotdQuestions';
import type { QotdDay, QotdScoreView, UserRole } from '../types/models';

export interface QotdScore {
  me: number;
  her: number;
  answered: number;
  first: Record<UserRole, number>;
  votes: Record<UserRole, number>;
}

export function scoreQotdDays(days: QotdDay[], view: QotdScoreView, today = new Date()): QotdScore {
  const filtered = days.filter(day => day.me && day.her && inView(day.date, view, today));
  return filtered.reduce<QotdScore>((score, day) => {
    score.answered += 1;
    const first = firstResponder(day);
    if (first) {
      score[first] += 1;
      score.first[first] += 1;
    }
    if (day.votes?.meVotedHer) {
      score.her += 2;
      score.votes.her += 1;
    }
    if (day.votes?.herVotedMe) {
      score.me += 2;
      score.votes.me += 1;
    }
    return score;
  }, emptyScore());
}

export function firstResponder(day: QotdDay): UserRole | null {
  if (!day.me?.at || !day.her?.at) return null;
  return new Date(day.me.at).getTime() <= new Date(day.her.at).getTime() ? 'me' : 'her';
}

function emptyScore(): QotdScore {
  return {
    me: 0,
    her: 0,
    answered: 0,
    first: { me: 0, her: 0 },
    votes: { me: 0, her: 0 }
  };
}

function inView(dateKey: string, view: QotdScoreView, today: Date): boolean {
  if (view === 'all') return true;
  const date = parseDateKey(dateKey);
  if (view === 'month') {
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
  }
  const start = startOfWeek(today);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return date >= start && date < end;
}

function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}
