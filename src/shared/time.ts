import type { AppSettings } from '../types/band.ts';

export type TimeFormat = AppSettings['timeFormat'];

export function formatClockTime(
  time: string,
  timeFormat: TimeFormat,
): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match || timeFormat === '24') return time;
  const hour = Number(match[1]);
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${match[2]} ${hour < 12 ? 'AM' : 'PM'}`;
}

export function timeFormatOptions(
  timeFormat: TimeFormat,
): Intl.DateTimeFormatOptions {
  return { hour12: timeFormat === '12' };
}
