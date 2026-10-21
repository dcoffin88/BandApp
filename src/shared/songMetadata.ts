import type { SongIdea } from '../types/band.ts';

export const SONG_CATEGORY_OPTIONS: ReadonlyArray<{
  value: SongIdea['category'];
  label: string;
}> = [
  { value: 'idea', label: 'Song Idea (Acoustic / Full)' },
  { value: 'chorus', label: 'Chorus Idea (Anthem / Hook)' },
  { value: 'riff', label: 'Riff (Guitar / Heavy)' },
  { value: 'bass', label: 'Bass Idea (Groove / Pocket)' },
  { value: 'verse', label: 'Verse Idea' },
  { value: 'bridge', label: 'Bridge Idea' },
  { value: 'full', label: 'Full Arrangement' },
];

export const KEY_ROOTS = [
  'C',
  'C♯ / D♭',
  'D',
  'D♯ / E♭',
  'E',
  'F',
  'F♯ / G♭',
  'G',
  'G♯ / A♭',
  'A',
  'A♯ / B♭',
  'B',
] as const;
