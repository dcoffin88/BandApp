import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  CircleHelp,
  Copy,
  Download,
  FileUp,
  Guitar,
  Lock,
  Maximize2,
  Minimize2,
  Music,
  Printer,
  Save,
  Search,
} from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext.tsx';
import { useBand } from '../context/BandContext.tsx';
import { useFullscreenEditor } from '../hooks/useFullscreenEditor.ts';
import { printStudioDocument } from '../shared/printStudioDocument.ts';
import { nextSongSectionHeading } from '../shared/songSections.ts';
import { categoryLabel } from '../shared/songMetadata.ts';
import {
  DEFAULT_TAB_TUNING,
  importedTabTuningToStaff,
  TAB_TUNINGS,
  tabTuningName,
} from '../shared/tabs.ts';

interface TabsStudioViewProps {
  initialSongId?: string;
}

const TAB_NOTATIONS = [
  {
    description: 'g   Grace note',
    pattern: /(?:\d+g\d+|(?:^|[-\s])g(?=[-\s\d]|$))/m,
  },
  { description: '(n) Ghost note', pattern: /\(\d+\)/ },
  {
    description: 'h   Hammer-on',
    pattern: /(?:\d+h\d+|(?:^|[-\s])h(?=[-\s\d]|$))/m,
  },
  {
    description: 'p   Pull-off',
    pattern: /(?:\d+p\d+|(?:^|[-\s])p(?=[-\s\d]|$))/m,
  },
  {
    description: 'r   Release',
    pattern: /(?:\d+r\d*|(?:^|[-\s])r(?=[-\s\d]|$))/m,
  },
  { description: '>   Accented note', pattern: />/ },
  {
    description: 't   Tapping',
    pattern: /(?:\d+t\d+|(?:^|[-\s])t(?=[-\s\d]|$))/m,
  },
  {
    description: 'b   Bend',
    pattern: /(?:\d+b(?!r)\d*|(?:^|[-\s])b(?=[-\s\d]|$))/m,
  },
  {
    description: 'br  Bend release',
    pattern: /(?:\d+br\d*|(?:^|[-\s])br(?=[-\s\d]|$))/m,
  },
  {
    description: 'pb  Pre-bend',
    pattern: /(?:\d+pb(?!r)\d*|(?:^|[-\s])pb(?=[-\s\d]|$))/m,
  },
  {
    description: 'pbr Pre-bend release',
    pattern: /(?:\d+pbr\d*|(?:^|[-\s])pbr(?=[-\s\d]|$))/m,
  },
  { description: '/   Slide up', pattern: /\// },
  { description: '\\   Slide down', pattern: /\\/ },
  { description: '~   Vibrato', pattern: /~/ },
  {
    description: 's   Slap',
    pattern: /(?:\d+s\d+|(?:^|[-\s])s(?=[-\s\d]|$))/m,
  },
  {
    description: 'P   Pop',
    pattern: /(?:\d+P\d+|(?:^|[-\s])P(?=[-\s\d]|$))/m,
  },
  { description: 'PM  Palm mute', pattern: /(?:^|[-\s])PM(?=[-.\s\d]|$)/m },
  { description: 'TR  Trill', pattern: /(?:^|[-\s])TR(?=[-\s\d]|$)/m },
  { description: 'N   Tremolo', pattern: /(?:^|[-\s])N(?=[-\s\d]|$)/m },
  {
    description: '* or x   Muted',
    pattern: /\*|(?:^|[-\s])x(?=[-\sx\d]|$)/m,
  },
] as const;

const removeNotationLegends = (tabContent: string) =>
  tabContent.replace(
    /(?:^|\r?\n)\*{36}\r?\n[\s\S]*?\r?\n\*{36}(?=\r?\n|$)/g,
    '',
  );

const notationLegend = (tabContent: string) => {
  const notationSource = removeNotationLegends(tabContent)
    .split(/\r?\n/)
    .filter(
      (line) =>
        !/^\s*\[(?:Intro|Verse|Chorus|Bridge|Outro)(?:\s+\d+)?\]\s*$/.test(
          line,
        ),
    )
    .map((line) => {
      const staffSeparator = line.indexOf('|');
      return staffSeparator >= 0 ? line.slice(staffSeparator + 1) : line;
    })
    .join('\n');
  const used: string[] = TAB_NOTATIONS.filter(({ pattern }) =>
    pattern.test(notationSource),
  ).map(({ description }) => description);
  return used.length
    ? `************************************\n\n${used.join('\n')}\n\n************************************`
    : '';
};

const safeFilename = (title: string) =>
  title.trim().replace(/[^a-zA-Z0-9_-]+/g, '_') || 'song';

const guitarStaff = (tuning: string) =>
  tuning
    .trim()
    .split(/\s+/)
    .map((stringName) => `${stringName}|----------------------------------------------------------------|`)
    .join('\n');

export const TabsStudioView: React.FC<TabsStudioViewProps> = ({
  initialSongId,
}) => {
  const { songs, permissions, updateTabs, appSettings } = useBand();
  const { playSong } = useAudioPlayer();
  const [selectedSongId, setSelectedSongId] = useState(
    initialSongId || songs[0]?.id || '',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [tuning, setTuning] = useState('');
  const [content, setContent] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const { isFullscreen, setIsFullscreen } = useFullscreenEditor();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedSong =
    songs.find((song) => song.id === selectedSongId) || songs[0];
  const isArchived = selectedSong?.category === 'archived';
  const canEdit = permissions.canEditLyrics && !isArchived;
  const isDirty = Boolean(
    selectedSong &&
      (tuning !== (selectedSong.tabs?.tuning || DEFAULT_TAB_TUNING) ||
        content !== (selectedSong.tabs?.content || '')),
  );

  useEffect(() => {
    if (initialSongId) {
      setSelectedSongId(initialSongId);
    }
  }, [initialSongId]);

  useEffect(() => {
    if (!selectedSong) return;
    setTuning(selectedSong.tabs?.tuning || DEFAULT_TAB_TUNING);
    setContent(selectedSong.tabs?.content || '');
    setError('');
    setSaveSuccess(false);
  }, [selectedSong?.id, selectedSong?.tabs?.versionNumber]);

  const filteredSongs = songs.filter(
    (song) =>
      song.category !== 'archived' &&
      (song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        categoryLabel(appSettings.demoCategories, song.category)
          .toLowerCase()
          .includes(searchQuery.toLowerCase())),
  );
  const usedNotationLegend = notationLegend(content);

  const insertAtCursor = (snippet: string) => {
    if (!canEdit) return;
    const editor = textareaRef.current;
    const hadLegend = removeNotationLegends(content) !== content;
    const body = removeNotationLegends(content).trimEnd();
    const start = Math.min(editor?.selectionStart ?? body.length, body.length);
    const end = Math.min(editor?.selectionEnd ?? body.length, body.length);
    const prefix = start > 0 && body[start - 1] !== '\n' ? '\n\n' : '';
    const insertion = `${prefix}${snippet}\n`;
    const nextBody = `${body.slice(0, start)}${insertion}${body.slice(end)}`;
    const refreshedLegend = hadLegend ? notationLegend(nextBody) : '';
    setContent(
      refreshedLegend
        ? `${nextBody.trimEnd()}\n\n${refreshedLegend}`
        : nextBody,
    );
    requestAnimationFrame(() => {
      editor?.focus();
      const cursor = start + insertion.length;
      editor?.setSelectionRange(cursor, cursor);
    });
  };

  const replaceContentAndFocusEnd = (nextContent: string) => {
    setContent(nextContent);
    requestAnimationFrame(() => {
      const editor = textareaRef.current;
      editor?.focus();
      editor?.setSelectionRange(nextContent.length, nextContent.length);
    });
  };

  const insertSection = (section: string) => {
    if (!canEdit) return;
    const hadLegend = removeNotationLegends(content) !== content;
    const body = removeNotationLegends(content).trim();
    const sectionBlock = `${nextSongSectionHeading(body, section)}\n\n${guitarStaff(tuning)}`;
    const hasSection = /^\[(?:Intro|Verse|Chorus|Bridge|Outro)(?:\s+\d+)?\]\s*$/m.test(body);
    let nextContent = hasSection
      ? `${body}\n\n${sectionBlock}`
      : body
        ? `${sectionBlock}\n\n${body}`
        : sectionBlock;

    if (hadLegend) {
      const refreshedLegend = notationLegend(nextContent);
      if (refreshedLegend) {
        nextContent = `${nextContent}\n\n${refreshedLegend}`;
      }
    }
    replaceContentAndFocusEnd(nextContent);
  };

  const insertLegend = () => {
    if (!canEdit) return;
    const body = removeNotationLegends(content).trim();
    const legend = notationLegend(body);
    if (!legend) return;
    replaceContentAndFocusEnd(body ? `${body}\n\n${legend}` : legend);
  };

  const handleSave = async () => {
    if (!selectedSong || !canEdit) return;
    setError('');
    if (!await updateTabs(selectedSong.id, tuning.trim(), content)) {
      setError('Unable to save this tab sheet. Please try again.');
      return;
    }
    setSaveSuccess(true);
    window.setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleCopy = async () => {
    if (!selectedSong) return;
    const text = `${selectedSong.title} Tab\n\nTuning: ${tuning ? tabTuningName(tuning) : 'Not specified'}\n\n${content}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Your browser could not copy the tab to the clipboard.');
    }
  };

  const handleDownload = () => {
    if (!selectedSong) return;
    const text = `${selectedSong.title} Tab\n\nTuning: ${tuning ? tabTuningName(tuning) : 'Not specified'}\n\n${content}`;
    const url = URL.createObjectURL(
      new Blob([text], { type: 'text/plain;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${safeFilename(selectedSong.title)}_Tab.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!selectedSong) return;
    const opened = printStudioDocument({
      title: selectedSong.title,
      documentLabel: 'Guitar Tab',
      content,
      avoidSectionBreaks: true,
      details: [
        `Tuning: ${tuning ? tabTuningName(tuning) : 'Not specified'}`,
        selectedSong.musicalKey ? `Key: ${selectedSong.musicalKey}` : '',
        selectedSong.bpm ? `Tempo: ${selectedSong.bpm} BPM` : '',
      ].filter(Boolean),
    });
    if (!opened) {
      setError('Allow pop-ups to print or download this tab as a PDF.');
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 100_000) {
      setError('Tab files must be 100 KB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const imported = String(reader.result || '');
      const importedTuning = imported.match(/^Tuning:\s*(.+)$/im)?.[1]?.trim();
      if (importedTuning) setTuning(importedTabTuningToStaff(importedTuning));
      setContent(imported);
      setError('');
    };
    reader.onerror = () => setError('Unable to read that tab file.');
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Guitar className="h-5 w-5 text-cyan-400" />
            <h2 className="text-xl font-bold tracking-tight text-white">
              Tabs Studio
            </h2>
          </div>
        </div>
        {selectedSong && (
          <button
            type="button"
            onClick={() => playSong(selectedSong)}
            className="flex items-center gap-1.5 self-start rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-zinc-700 sm:self-auto"
          >
            <Music className="h-3.5 w-3.5" />
            <span>Play Track Audio Demo</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="search"
              placeholder="Search songs or ideas..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div className="max-h-[650px] space-y-1.5 overflow-y-auto pr-1">
            {filteredSongs.map((song) => {
              const isSelected = song.id === selectedSong?.id;
              return (
                <button
                  key={song.id}
                  type="button"
                  onClick={() => setSelectedSongId(song.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border p-3 text-left transition ${
                    isSelected
                      ? 'border-cyan-500/50 bg-zinc-800/90 text-white shadow-md'
                      : 'border-zinc-800/80 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-zinc-200 sm:text-sm">
                      {song.title}
                    </p>
                    <p className="mt-0.5 text-[11px] font-mono uppercase text-zinc-500">
                      {categoryLabel(appSettings.demoCategories, song.category)}
                      {song.musicalKey && ` · ${song.musicalKey}`}
                      {song.bpm && ` · ${song.bpm} BPM`}
                    </p>
                  </div>
                  <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
                    {song.tabs?.versionNumber
                      ? `v${song.tabs.versionNumber}`
                      : 'No tab'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          className={
            isFullscreen
              ? 'fixed inset-0 z-50 bg-zinc-950 p-3 sm:p-6'
              : 'lg:col-span-8'
          }
        >
          <div
            role={isFullscreen ? 'dialog' : undefined}
            aria-modal={isFullscreen || undefined}
            aria-label={isFullscreen ? 'Tabs editor' : undefined}
            className={`flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 ${
              isFullscreen ? 'h-full' : 'min-h-[600px]'
            }`}
          >
          {selectedSong ? (
            <>
              <div className="space-y-3 border-b border-zinc-800 bg-zinc-950/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-white">
                      {selectedSong.title}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      {selectedSong.tabs?.versionNumber
                        ? `Tab revision ${selectedSong.tabs.versionNumber} · Last edited by ${selectedSong.tabs.lastEditedBy}`
                        : 'No tab sheet has been saved yet.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-700"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-700"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-700"
                      title="Print or save as a Letter-size PDF"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Print / PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
                      title={
                        isFullscreen
                          ? 'Close full-screen editor'
                          : 'Open full-screen editor'
                      }
                    >
                      {isFullscreen ? (
                        <Minimize2 className="h-3.5 w-3.5" />
                      ) : (
                        <Maximize2 className="h-3.5 w-3.5" />
                      )}
                      <span>{isFullscreen ? 'Close' : 'Full Screen'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <div>
                    <label
                      htmlFor="tabs-studio-tuning"
                      className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400"
                    >
                      Tuning
                    </label>
                    <select
                      id="tabs-studio-tuning"
                      value={tuning}
                      onChange={(event) => setTuning(event.target.value)}
                      disabled={!canEdit}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 font-mono text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                      {tuning &&
                        !TAB_TUNINGS.some((option) => option.value === tuning) && (
                          <option value={tuning}>
                            Custom — {tabTuningName(tuning)}
                          </option>
                        )}
                      {TAB_TUNINGS.map((option) => (
                        <option key={option.label} value={option.value}>
                          {option.label} — {tabTuningName(option.value)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {canEdit && (
                  <div className="flex flex-wrap items-center gap-1.5 border-t border-zinc-800 pt-3">
                    <span className="mr-1 text-[11px] text-zinc-500">Insert:</span>
                    <div className="group relative">
                      <button
                        type="button"
                        aria-label="Show tab notation help"
                        aria-describedby="tab-notation-help"
                        className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      >
                        <CircleHelp className="h-4 w-4" />
                      </button>
                      <div
                        id="tab-notation-help"
                        role="tooltip"
                        className="invisible absolute left-0 top-7 z-20 w-52 rounded-lg border border-zinc-700 bg-zinc-950 p-3 font-mono text-[11px] text-zinc-300 opacity-0 shadow-xl transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
                      >
                        <div className="mb-2 font-sans font-semibold text-white">
                          Tab notations
                        </div>
                        <div className="grid grid-cols-[52px_1fr] gap-x-2 gap-y-1">
                          <span>h</span>
                          <span>Hammer-on</span>
                          <span>p</span>
                          <span>Pull-off</span>
                          <span>/</span>
                          <span>Slide</span>
                          <span>PM</span>
                          <span>Palm mute</span>
                          <span>* or x</span>
                          <span>Muted</span>
                        </div>
                      </div>
                    </div>
                    {['Intro', 'Verse', 'Chorus', 'Bridge', 'Outro'].map((section) => (
                      <button
                        key={section}
                        type="button"
                        onClick={() => insertSection(section)}
                        className="rounded bg-zinc-800 px-2 py-1 text-[11px] font-mono text-zinc-300 hover:bg-zinc-700"
                      >
                        + {section}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => insertAtCursor(guitarStaff(tuning))}
                      className="rounded bg-zinc-800 px-2 py-1 text-[11px] font-mono text-zinc-300 hover:bg-zinc-700"
                    >
                      + 6-string staff
                    </button>
                    <button
                      type="button"
                      onClick={insertLegend}
                      disabled={!usedNotationLegend}
                      title={
                        usedNotationLegend
                          ? 'Insert the notation symbols used in this tab'
                          : 'Use a notation symbol in the tab before adding a legend'
                      }
                      className="rounded bg-zinc-800 px-2 py-1 text-[11px] font-mono text-zinc-300 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-zinc-800"
                    >
                      + Legend
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,text/plain"
                      onChange={handleImport}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="ml-auto flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700"
                    >
                      <FileUp className="h-3.5 w-3.5" />
                      Import .txt
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-4">
                {!canEdit && (
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/60 p-2.5 text-xs text-zinc-300">
                    <Lock className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>
                      {isArchived
                        ? 'Archived demos are read-only. Restore this demo to edit it.'
                        : 'Read-only mode.'}
                    </span>
                  </div>
                )}
                {error && (
                  <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                    {error}
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  readOnly={!canEdit}
                  maxLength={100_000}
                  wrap="off"
                  spellCheck={false}
                  placeholder={`[Intro] - starts at 0:05\n\n${guitarStaff(DEFAULT_TAB_TUNING)}`}
                  className="min-h-[420px] w-full flex-1 resize-y overflow-auto whitespace-pre rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-cyan-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 sm:text-sm"
                />
              </div>

              <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950/60 p-4 text-xs">
                <span className="text-zinc-500">
                  {content.length.toLocaleString()} characters
                  {isDirty ? ' · Unsaved changes' : ''}
                </span>
                <div className="flex items-center gap-2">
                  {saveSuccess && (
                    <span className="flex items-center gap-1 font-medium text-emerald-400">
                      <Check className="h-3.5 w-3.5" />
                      Saved
                    </span>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={!isDirty}
                      className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 font-bold text-white shadow-md shadow-cyan-600/20 transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save Tab</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-xs text-zinc-500">
              Upload an audio demo before creating a tab sheet.
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};
