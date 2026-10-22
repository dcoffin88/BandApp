import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface ChordSelectionChartProps {
  selectionText: string;
  purpose?: 'insert' | 'replace';
  onSelect: (chord: string) => void;
  onClose: () => void;
}

const ROOTS = [
  { label: 'A♭', value: 'Ab' },
  { label: 'A', value: 'A' },
  { label: 'B♭', value: 'Bb' },
  { label: 'B', value: 'B' },
  { label: 'C', value: 'C' },
  { label: 'D♭', value: 'Db' },
  { label: 'D', value: 'D' },
  { label: 'E♭', value: 'Eb' },
  { label: 'E', value: 'E' },
  { label: 'F', value: 'F' },
  { label: 'F♯', value: 'F#' },
  { label: 'G', value: 'G' },
] as const;

const QUALITIES = [
  { label: 'Major', suffix: '' },
  { label: 'Minor', suffix: 'm' },
  { label: '6', suffix: '6' },
  { label: '7', suffix: '7' },
  { label: '9', suffix: '9' },
  { label: 'm6', suffix: 'm6' },
  { label: 'm7', suffix: 'm7' },
  { label: 'maj7', suffix: 'maj7' },
  { label: 'dim', suffix: 'dim' },
  { label: 'aug', suffix: '+' },
  { label: 'sus4', suffix: 'sus4' },
] as const;

export const ChordSelectionChart: React.FC<ChordSelectionChartProps> = ({
  selectionText,
  purpose = 'insert',
  onSelect,
  onClose,
}) => {
  const [bassNote, setBassNote] = useState('');
  const firstChordRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstChordRef.current?.focus();
  }, []);

  const selectChord = (root: string, suffix: string) => {
    const chord = `${root}${suffix}`;
    onSelect(bassNote && bassNote !== root ? `${chord}/${bassNote}` : chord);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={purpose === 'replace' ? 'Replace chord' : 'Select a chord'}
      className="fixed left-1/2 top-1/2 z-[70] flex max-h-[calc(100vh-1.5rem)] w-[min(46rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-amber-500/40 bg-zinc-900 shadow-2xl shadow-black/60"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">
            {purpose === 'replace' ? 'Replace chord' : 'Select a chord'}
          </p>
          <p className="truncate text-[11px] text-zinc-400">
            {purpose === 'replace'
              ? `Replace "${selectionText}"`
              : `Place above "${selectionText || 'selected text'}"`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <label className="flex items-center gap-2 text-[11px] text-zinc-400">
            Bass note
            <select
              value={bassNote}
              onChange={(event) => setBassNote(event.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-amber-200 focus:border-amber-500 focus:outline-none"
              aria-label="Optional bass note for a slash chord"
            >
              <option value="">None</option>
              {ROOTS.map((root) => (
                <option key={root.value} value={root.value}>
                  {root.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
            aria-label="Close chord selection chart"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-auto p-3">
        <table className="w-full min-w-[650px] border-separate border-spacing-1 font-mono text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 bg-zinc-900 p-1 text-left text-zinc-500">
                Root
              </th>
              {QUALITIES.map((quality) => (
                <th
                  key={quality.label}
                  scope="col"
                  className="sticky top-0 z-10 bg-zinc-900 px-1 py-1.5 text-center text-[10px] font-semibold text-zinc-400"
                >
                  {quality.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROOTS.map((root, rootIndex) => (
              <tr key={root.value}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-zinc-900 px-2 text-right text-sm text-zinc-300"
                >
                  {root.label}
                </th>
                {QUALITIES.map((quality, qualityIndex) => {
                  const chord = `${root.value}${quality.suffix}`;
                  return (
                    <td key={quality.label}>
                      <button
                        ref={rootIndex === 0 && qualityIndex === 0 ? firstChordRef : undefined}
                        type="button"
                        onClick={() => selectChord(root.value, quality.suffix)}
                        className="w-full rounded-lg border border-zinc-700/80 bg-zinc-950 px-1.5 py-2 text-center font-semibold text-amber-200 transition hover:border-amber-500 hover:bg-amber-500/15 hover:text-amber-100 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                        aria-label={`${purpose === 'replace' ? 'Replace with' : 'Insert'} ${chord}${bassNote && bassNote !== root.value ? ` over ${bassNote}` : ''}`}
                      >
                        {root.label}
                        {quality.suffix}
                        {bassNote && bassNote !== root.value && (
                          <span className="text-amber-400">/{bassNote}</span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => onSelect('N.C.')}
          className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-amber-500/60 hover:text-white"
        >
          N.C. - No chord
        </button>
      </div>
    </div>
  );
};
