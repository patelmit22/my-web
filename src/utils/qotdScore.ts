import type { QotdAnswer, QotdDay, QotdScoreView, UserRole } from '../types/models';
import { currentMonthRange, currentWeekRange, dateKeyInRange, type DateRange } from './qotdDates';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface QotdScore {
  me: number;
  her: number;
  answered: number;
  fastest: Record<UserRole, number>;
  votes: Record<UserRole, number>;
}

export function scoreQotdDays(days: QotdDay[], view: QotdScoreView, today = new Date()): QotdScore {
  if (view === 'all') return scoreRange(days);
  return scoreRange(days, view === 'month' ? currentMonthRange(today) : currentWeekRange(today));
}

export function scoreRange(days: QotdDay[], range?: DateRange): QotdScore {
  const filtered = days.filter(day => {
    return hasQotdAnswer(day.me) && hasQotdAnswer(day.her) && (!range || dateKeyInRange(day.date, range));
  });

  return filtered.reduce<QotdScore>((score, day) => {
    score.answered += 1;
    const fastest = fastestResponder(day);
    if (fastest) {
      score[fastest] += 1;
      score.fastest[fastest] += 1;
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

export function hasQotdAnswer(answer: QotdAnswer | null | undefined): answer is QotdAnswer {
  return Boolean(answer?.text?.trim() && answer.at);
}

export function fastestResponder(day: QotdDay): UserRole | null {
  if (!hasQotdAnswer(day.me) || !hasQotdAnswer(day.her)) return null;
  const meMs = responseMs(day.me);
  const herMs = responseMs(day.her);

  if (meMs !== null && herMs !== null) {
    if (meMs === herMs) return null;
    return meMs < herMs ? 'me' : 'her';
  }

  return firstResponderByClock(day);
}

export const firstResponder = fastestResponder;

function responseMs(answer: QotdAnswer): number | null {
  if (!answer.seenAt) return null;
  const seen = new Date(answer.seenAt).getTime();
  const answered = new Date(answer.at).getTime();
  const diff = answered - seen;
  if (!Number.isFinite(diff) || diff < 0) return null;
  return Math.min(diff, DAY_MS);
}

function firstResponderByClock(day: QotdDay): UserRole | null {
  if (!hasQotdAnswer(day.me) || !hasQotdAnswer(day.her)) return null;
  const me = new Date(day.me.at).getTime();
  const her = new Date(day.her.at).getTime();
  if (!Number.isFinite(me) || !Number.isFinite(her) || me === her) return null;
  return me < her ? 'me' : 'her';
}

function emptyScore(): QotdScore {
  return {
    me: 0,
    her: 0,
    answered: 0,
    fastest: { me: 0, her: 0 },
    votes: { me: 0, her: 0 }
  };
}
