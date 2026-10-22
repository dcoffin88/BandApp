export const TAB_TUNINGS = [
  { label: 'Standard', value: 'e B G D A E' },
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
