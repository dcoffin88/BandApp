interface StudioPrintOptions {
  title: string;
  documentLabel: string;
  content: string;
  details?: string[];
  avoidSectionBreaks?: boolean;
}

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const sectionHeading = /^\s*\[(?:intro|verse|pre-chorus|chorus|refrain|hook|bridge|breakdown|interlude|solo|outro)(?:\s+\d+)?\]\s*$/i;

const printableSections = (content: string) => {
  const sections: string[][] = [];
  let current: string[] = [];
  for (const line of content.split(/\r?\n/)) {
    if (sectionHeading.test(line) && current.length) {
      sections.push(current);
      current = [];
    }
    current.push(line);
  }
  if (current.length) sections.push(current);
  return sections
    .map(
      (section) =>
        `<section class="document-section"><pre>${escapeHtml(section.join('\n'))}</pre></section>`,
    )
    .join('');
};

export const printStudioDocument = ({
  title,
  documentLabel,
  content,
  details = [],
  avoidSectionBreaks = false,
}: StudioPrintOptions) => {
  const longestLine = Math.max(
    1,
    ...content.split(/\r?\n/).map((line) => line.length),
  );
  // Letter paper with 0.5-inch margins leaves 540 points of printable width.
  const fontSize = Math.min(10, 540 / (longestLine * 0.6));
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  printWindow.opener = null;
  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)} - ${escapeHtml(documentLabel)}</title>
  <style>
    @page { size: Letter portrait; margin: 0.5in; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; }
    body { font-family: Arial, sans-serif; }
    header { margin-bottom: 18pt; border-bottom: 1px solid #999; padding-bottom: 9pt; }
    h1 { margin: 0 0 4pt; font-size: 16pt; line-height: 1.2; }
    .label { font-size: 9pt; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    .details { margin-top: 5pt; color: #444; font-size: 8pt; }
    pre {
      width: 100%;
      margin: 0;
      overflow: visible;
      white-space: pre;
      overflow-wrap: normal;
      word-break: normal;
      tab-size: 4;
      font-family: "Courier New", Courier, monospace;
      font-size: ${fontSize.toFixed(3)}pt;
      line-height: 1.35;
    }
    .document-section {
      break-inside: avoid-page;
      page-break-inside: avoid;
    }
    .document-section + .document-section { margin-top: 0; }
  </style>
</head>
<body>
  <header>
    <div class="label">${escapeHtml(documentLabel)}</div>
    <h1>${escapeHtml(title)}</h1>
    ${details.length ? `<div class="details">${details.map(escapeHtml).join(' &bull; ')}</div>` : ''}
  </header>
  ${
    avoidSectionBreaks
      ? printableSections(content)
      : `<pre>${escapeHtml(content)}</pre>`
  }
</body>
</html>`);
  printWindow.document.close();
  printWindow.addEventListener('afterprint', () => printWindow.close());
  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 100);
  return true;
};
