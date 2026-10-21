import React, { useEffect, useState } from 'react';
import {
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { PracticeSession } from '../types/band.ts';
import {
  googleCalendarUrl,
  outlookCalendarUrl,
  practiceCalendarFilename,
  practiceCalendarIcs,
  yahooCalendarUrl,
} from '../shared/calendar.ts';
import {
  AppleCalendarIcon,
  GoogleCalendarIcon,
  OutlookCalendarIcon,
  YahooCalendarIcon,
} from './CalendarProviderIcons.tsx';

interface AddToCalendarMenuProps {
  practice: PracticeSession;
}

export const AddToCalendarMenu: React.FC<AddToCalendarMenuProps> = ({
  practice,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  const downloadIcs = () => {
    const url = URL.createObjectURL(
      new Blob([practiceCalendarIcs(practice)], {
        type: 'text/calendar;charset=utf-8',
      }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = practiceCalendarFilename(practice);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setIsOpen(false);
  };

  const itemClass =
    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-200 transition hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70';

  return (
    <div className="relative z-20">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:border-amber-500/50 hover:text-amber-300"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <CalendarPlus className="h-3.5 w-3.5" />
        <span>Add to Calendar</span>
        {isOpen ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setIsOpen(false)}
            aria-label="Close calendar menu"
          />
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-zinc-700 bg-zinc-900 p-2 shadow-2xl"
          >
            <button type="button" role="menuitem" onClick={downloadIcs} className={itemClass}>
              <AppleCalendarIcon className="h-5 w-5 box-content rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700/80 transition" />
              <span>Apple</span>
            </button>
            <a
              role="menuitem"
              href={googleCalendarUrl(practice)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className={itemClass}
            >
              <GoogleCalendarIcon className="h-5 w-5 box-content rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700/80 transition" />
              <span>Google</span>
            </a>
            <a
              role="menuitem"
              href={outlookCalendarUrl(practice)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className={itemClass}
            >
              <OutlookCalendarIcon className="h-5 w-5 box-content rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700/80 transition" />
              <span>Outlook.com</span>
            </a>
            <a
              role="menuitem"
              href={yahooCalendarUrl(practice)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className={itemClass}
            >
              <YahooCalendarIcon className="h-5 w-5 box-content rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700/80 transition" />
              <span>Yahoo Calendar</span>
            </a>
            <button type="button" role="menuitem" onClick={downloadIcs} className={itemClass}>
              <CalendarDays className="h-5 w-5 box-content rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700/80 transition" />
              <span>iCal File</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
