import type { DemoCategory } from '../types/band.ts';

export const DEFAULT_DEMO_CATEGORIES: DemoCategory[] = [
  { id: 'all', label: 'All Demos' },
  { id: 'idea', label: 'Song Ideas' },
  { id: 'chorus', label: 'Chorus Ideas' },
  { id: 'riff', label: 'Riffs' },
  { id: 'bass', label: 'Bass Ideas' },
  { id: 'verse', label: 'Verse Ideas' },
  { id: 'bridge', label: 'Bridge Ideas' },
  { id: 'full', label: 'Full Arrangements' },
  { id: 'archived', label: 'Archived' },
];

export const selectableDemoCategories = (categories: DemoCategory[]) =>
  categories.filter(
    (category) => category.id !== 'all' && category.id !== 'archived',
  );

export const categoryLabel = (categories: DemoCategory[], id: string) =>
  categories.find((category) => category.id === id)?.label ||
  id.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

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
