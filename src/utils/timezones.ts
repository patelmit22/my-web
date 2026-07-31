import type { NextVisit, TimezoneConfig } from '../types/models';

export const DEFAULT_TIMEZONE_CONFIG: TimezoneConfig = {
  meTz: 'America/Chicago',
  herTz: 'Asia/Kolkata',
  meCity: 'Minneapolis',
  herCity: 'Ahmedabad'
};

export interface ZonedClock {
  timeZone: string;
  hour: number;
  time: string;
  date: string;
  icon: string;
}

export function mergeTimezoneConfig(config?: Partial<TimezoneConfig> | null): TimezoneConfig {
  return {
    meTz: normalizeTimezone(config?.meTz, DEFAULT_TIMEZONE_CONFIG.meTz),
    herTz: normalizeTimezone(config?.herTz, DEFAULT_TIMEZONE_CONFIG.herTz),
    meCity: cleanText(config?.meCity, DEFAULT_TIMEZONE_CONFIG.meCity),
    herCity: cleanText(config?.herCity, DEFAULT_TIMEZONE_CONFIG.herCity)
  };
}

export function normalizeTimezone(value: string | undefined, fallback: string): string {
  const candidate = (value || '').trim();
  if (!candidate) return fallback;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return fallback;
  }
}

export function isValidTimezone(value: string): boolean {
  if (!value.trim()) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value.trim() }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function zonedNow(timeZone: string, now = new Date()): ZonedClock {
  const safeTimeZone = normalizeTimezone(timeZone, 'UTC');
  const hourPart = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTimeZone,
    hour: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now).find(part => part.type === 'hour')?.value;
  const hour = Number(hourPart || '0');
  return {
    timeZone: safeTimeZone,
    hour,
    time: new Intl.DateTimeFormat('en-US', {
      timeZone: safeTimeZone,
      hour: 'numeric',
      minute: '2-digit'
    }).format(now),
    date: new Intl.DateTimeFormat('en-US', {
      timeZone: safeTimeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(now),
    icon: hour >= 7 && hour < 19 ? '☀️' : '🌙'
  };
}

export function partnerStatus(hour: number, displayName: string): string {
  const name = displayName.toLowerCase();
  if (hour >= 23 || hour < 7) return `💤 ${name} is probably asleep`;
  if (hour >= 7 && hour < 9) return `☕ ${name} just woke up`;
  if (hour >= 9 && hour < 17) return `☀️ ${name} is around`;
  return `🌆 ${name} is winding down`;
}

export function visitText(nextVisit?: NextVisit | null, today = new Date()): string {
  if (!nextVisit?.date) return 'set our next visit →';
  const delta = visitDayDelta(nextVisit.date, today);
  if (delta === null || delta < -3) return '';
  if (Math.abs(delta) <= 3) return '💞 together time is here';
  return `✈️ next visit in ${delta} ${delta === 1 ? 'day' : 'days'}`;
}

export function visitDayDelta(dateKey: string, today = new Date()): number | null {
  const target = dateKeyToUtc(dateKey);
  if (!target) return null;
  const current = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.ceil((target.getTime() - current) / 86400000);
}

function dateKeyToUtc(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
}

function cleanText(value: string | undefined, fallback: string): string {
  const clean = (value || '').trim();
  return clean || fallback;
}
