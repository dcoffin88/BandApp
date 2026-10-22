const chordToken = /^(?:[A-G](?:#|b)?[A-Za-z0-9+#().-]*(?:\/[A-G](?:#|b)?)?|N\.C\.)$/;

const isChordLine = (line: string) => {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => chordToken.test(token));
};

export interface ChordTokenRange {
  start: number;
  end: number;
  chord: string;
}

export const findChordAtPosition = (
  content: string,
  position: number,
): ChordTokenRange | null => {
  const lineStart = content.lastIndexOf('\n', Math.max(0, position - 1)) + 1;
  const nextLineBreak = content.indexOf('\n', position);
  const lineEnd = nextLineBreak === -1 ? content.length : nextLineBreak;
  const line = content.slice(lineStart, lineEnd);
  if (!isChordLine(line)) return null;

  for (const match of line.matchAll(/\S+/g)) {
    const start = lineStart + (match.index || 0);
    const end = start + match[0].length;
    if (position >= start && position <= end) {
      return { start, end, chord: match[0] };
    }
  }
  return null;
};

const placeChordAtColumn = (line: string, column: number, chord: string) => {
  const padded = line.padEnd(column, ' ');
  const prefix = padded.slice(0, column);
  const suffix = padded.slice(column);
  if (!suffix) return `${prefix}${chord}`;
  if (/^\S+/.test(suffix)) {
    return `${prefix}${suffix.replace(/^\S+/, chord)}`;
  }
  const availableSpace = suffix.match(/^\s*/)?.[0].length || 0;
  if (availableSpace >= chord.length) {
    return `${prefix}${chord}${suffix.slice(chord.length)}`.trimEnd();
  }
  return `${prefix}${chord} ${suffix.trimStart()}`.trimEnd();
};

export const insertChordAboveSelection = (
  content: string,
  selectionStart: number,
  chord: string,
) => {
  const cleanChord = chord.trim().replace(/\s+/g, ' ');
  if (!cleanChord) return content;
  const lyricLineStart = content.lastIndexOf('\n', selectionStart - 1) + 1;
  const column = selectionStart - lyricLineStart;
  const previousLineEnd = lyricLineStart - 1;

  if (previousLineEnd >= 0) {
    const previousLineStart = content.lastIndexOf('\n', previousLineEnd - 1) + 1;
    const previousLine = content.slice(previousLineStart, previousLineEnd);
    if (isChordLine(previousLine)) {
      const updatedLine = placeChordAtColumn(previousLine, column, cleanChord);
      return `${content.slice(0, previousLineStart)}${updatedLine}${content.slice(previousLineEnd)}`;
    }
  }

  const chordLine = `${' '.repeat(column)}${cleanChord}`;
  return `${content.slice(0, lyricLineStart)}${chordLine}\n${content.slice(lyricLineStart)}`;
};
