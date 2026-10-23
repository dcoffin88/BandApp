export const TAB_TUNINGS = [
  { label: 'Standard', value: 'E B G D A E' },
  { label: 'Half-Step Down', value: 'Eb Bb Gb Db Ab Eb' },
  { label: 'Perfect Fourth Tuning', value: 'F C G D A E' },
  { label: 'A Tuning', value: 'A E C G D A' },
  { label: 'B Tuning', value: 'B F# D A E B' },
  { label: 'C Tuning', value: 'C G Eb Bb F C' },
  { label: 'C# Tuning', value: 'C# G# E B F# C#' },
  { label: 'D Tuning', value: 'D A F C G D' },
  { label: 'Drop A', value: 'B F# D A E A' },
  { label: 'Drop Bb', value: 'C G Eb Bb F Bb' },
  { label: 'Drop B', value: 'C# G# E B F# B' },
  { label: 'Drop C', value: 'D A F C G C' },
  { label: 'Drop Db', value: 'Eb Bb Gb Db Ab Db' },
  { label: 'Drop D', value: 'E B G D A D' },
  { label: 'Open C', value: 'E C G C G C' },
  { label: 'Open D', value: 'D A F# D A D' },
  { label: 'Open E', value: 'E B G# E B E' },
  { label: 'Open G', value: 'D B G D G D' },
  { label: 'Celtic', value: 'D A G D A D' },
] as const;

export const DEFAULT_TAB_TUNING = TAB_TUNINGS[0].value;

const normalizeNote = (note: string) =>
  note ? `${note[0].toUpperCase()}${note.slice(1)}` : note;

export const tabTuningName = (staffTuning: string) =>
  staffTuning
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .reverse()
    .map(normalizeNote)
    .join(' ');

export const importedTabTuningToStaff = (importedTuning: string) => {
  const normalized = importedTuning
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(normalizeNote)
    .join(' ');
  const knownByName = TAB_TUNINGS.find(
    (option) => tabTuningName(option.value) === normalized,
  );
  if (knownByName) return knownByName.value;
  const knownStaff = TAB_TUNINGS.find((option) => option.value === normalized);
  return knownStaff?.value || tabTuningName(normalized);
};
