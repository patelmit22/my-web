import type { WorkoutDayType } from '../types/models';

export function sessionKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateFromSessionKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function dayTypeFor(date: Date): WorkoutDayType {
  switch (date.getDay()) {
    case 1:
    case 4:
      return 'push';
    case 2:
    case 5:
      return 'pull';
    case 3:
    case 6:
      return 'legs';
    default:
      return 'rest';
  }
}

export function startOfWeek(date = new Date()): Date {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + diff);
  return next;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function weekRange(date = new Date()): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function shortDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

export function formatTrainDate(key: string): string {
  return dateFromSessionKey(key).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
}

export function dayTypeLabel(type: WorkoutDayType): string {
  return type === 'rest' ? 'Rest' : type[0].toUpperCase() + type.slice(1);
}
