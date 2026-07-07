import { localDateKey, parseDateKey } from '../data/qotdQuestions';

export interface DateRange {
  start: Date;
  end: Date;
}

export function todayKey(date = new Date()): string {
  return localDateKey(date);
}

export function currentWeekRange(today = new Date()): DateRange {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

export function currentMonthRange(today = new Date()): DateRange {
  return {
    start: new Date(today.getFullYear(), today.getMonth(), 1),
    end: new Date(today.getFullYear(), today.getMonth() + 1, 1)
  };
}

export function weekKeyForDate(date = new Date()): string {
  const working = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = working.getUTCDay() || 7;
  working.setUTCDate(working.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(working.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((working.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${working.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function isSunday(date = new Date()): boolean {
  return date.getDay() === 0;
}

export function dateKeyInRange(dateKey: string, range: DateRange): boolean {
  const date = parseDateKey(dateKey);
  return date >= range.start && date < range.end;
}
