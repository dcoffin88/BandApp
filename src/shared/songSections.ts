const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const nextSongSectionHeading = (content: string, section: string) => {
  const normalizedSection = section.trim();
  if (/^(?:intro|outro)$/i.test(normalizedSection)) {
    return `[${normalizedSection}]`;
  }

  const existingHeading = new RegExp(
    `^\\[${escapeRegExp(normalizedSection)}(?:\\s+(\\d+))?\\]\\s*$`,
    'gim',
  );
  let highestNumber = 0;
  for (const match of content.matchAll(existingHeading)) {
    highestNumber = Math.max(highestNumber, Number(match[1] || 1));
  }
  return `[${normalizedSection} ${highestNumber + 1}]`;
};
