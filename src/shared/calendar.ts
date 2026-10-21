import type { PracticeSession } from '../types/band.ts';

type CalendarPractice = Pick<
  PracticeSession,
  | 'id'
  | 'title'
  | 'date'
  | 'startTime'
  | 'endTime'
  | 'location'
  | 'notes'
  | 'goals'
>;

const calendarDateTime = (date: string, time: string) =>
  `${date.replaceAll('-', '')}T${time.replace(':', '')}00`;

const descriptionFor = (practice: CalendarPractice) =>
  [
    practice.notes,
    practice.goals.length
      ? `Rehearsal goals:\n${practice.goals.map((goal) => `- ${goal}`).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

const escapeIcsText = (value: string) =>
  value
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;');

export function googleCalendarUrl(practice: CalendarPractice): string {
  const parameters = new URLSearchParams({
    action: 'TEMPLATE',
    text: practice.title,
    dates: `${calendarDateTime(practice.date, practice.startTime)}/${calendarDateTime(practice.date, practice.endTime)}`,
    location: practice.location,
    details: descriptionFor(practice),
  });
  return `https://calendar.google.com/calendar/render?${parameters.toString()}`;
}

export function outlookCalendarUrl(practice: CalendarPractice): string {
  const parameters = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: practice.title,
    startdt: `${practice.date}T${practice.startTime}:00`,
    enddt: `${practice.date}T${practice.endTime}:00`,
    location: practice.location,
    body: descriptionFor(practice),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${parameters.toString()}`;
}

export function yahooCalendarUrl(practice: CalendarPractice): string {
  const parameters = new URLSearchParams({
    v: '60',
    view: 'd',
    type: '20',
    title: practice.title,
    st: calendarDateTime(practice.date, practice.startTime),
    et: calendarDateTime(practice.date, practice.endTime),
    desc: descriptionFor(practice),
    in_loc: practice.location,
  });
  return `https://calendar.yahoo.com/?${parameters.toString()}`;
}

export function practiceCalendarFilename(practice: CalendarPractice): string {
  const safeTitle = practice.title
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'practice';
  return `${practice.date}-${safeTitle}.ics`;
}

export function practiceCalendarIcs(
  practice: CalendarPractice,
  generatedAt = new Date(),
): string {
  const stamp = generatedAt
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RehearsalHQ//Practice Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(practice.id)}@rehearsalhq`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${calendarDateTime(practice.date, practice.startTime)}`,
    `DTEND:${calendarDateTime(practice.date, practice.endTime)}`,
    `SUMMARY:${escapeIcsText(practice.title)}`,
    `LOCATION:${escapeIcsText(practice.location)}`,
    `DESCRIPTION:${escapeIcsText(descriptionFor(practice))}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
