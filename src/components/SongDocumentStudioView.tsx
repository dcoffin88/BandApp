import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  FileText,
  Lock,
  Maximize2,
  Minimize2,
  Music,
  Music2,
  Printer,
  Save,
  Search,
} from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext.tsx';
import { useBand } from '../context/BandContext.tsx';
import { useFullscreenEditor } from '../hooks/useFullscreenEditor.ts';
import { printStudioDocument } from '../shared/printStudioDocument.ts';

interface SongDocumentStudioViewProps {
  mode: 'lyrics' | 'chords';
  initialSongId?: string;
}

const hasLyricsDraft = (draft?: string) => {
  const value = draft?.trim() || '';
  return Boolean(
    value &&
      !/^\[Draft Lyrics for .+\]\s*\(Add lyrics here\.\.\.\)$/s.test(value),
  );
};

export const SongDocumentStudioView: React.FC<
  SongDocumentStudioViewProps
> = ({ mode, initialSongId }) => {
  const { songs, updateLyrics, updateChords, permissions } = useBand();
  const { playSong } = useAudioPlayer();
  const [selectedSongId, setSelectedSongId] = useState(
    initialSongId || songs[0]?.id || '',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [content, setContent] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const { isFullscreen, setIsFullscreen } = useFullscreenEditor();

  const selectedSong =
    songs.find((song) => song.id === selectedSongId) || songs[0];
  const canEdit = permissions.canEditLyrics;
  const isChords = mode === 'chords';
  const lyricsAreReady = hasLyricsDraft(selectedSong?.lyrics?.draft);
  const canEditDocument = canEdit && (!isChords || lyricsAreReady);

  useEffect(() => {
    if (initialSongId) setSelectedSongId(initialSongId);
  }, [initialSongId]);

  useEffect(() => {
    if (!selectedSong) return;
    setContent(
      isChords
        ? selectedSong.lyrics?.chordsSheet ||
            (hasLyricsDraft(selectedSong.lyrics?.draft)
              ? selectedSong.lyrics.draft
              : '')
        : selectedSong.lyrics?.draft || '',
    );
    setError('');
    setSaveSuccess(false);
  }, [isChords, selectedSong?.id]);

  const filteredSongs = songs.filter(
    (song) =>
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSave = async () => {
    if (!selectedSong || !canEditDocument) return;
    setError('');
    const saved = isChords
      ? await updateChords(selectedSong.id, content)
      : await updateLyrics(selectedSong.id, content);
    if (!saved) {
      setError(`Unable to save this ${isChords ? 'chord chart' : 'lyrics draft'}.`);
      return;
    }
    setSaveSuccess(true);
    window.setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Your browser could not copy this document.');
    }
  };

  const handlePrint = () => {
    if (!selectedSong) return;
    const opened = printStudioDocument({
      title: selectedSong.title,
      documentLabel: isChords ? 'Chord Chart' : 'Lyrics',
      content,
      details: [
        selectedSong.musicalKey ? `Key: ${selectedSong.musicalKey}` : '',
        selectedSong.bpm ? `Tempo: ${selectedSong.bpm} BPM` : '',
      ].filter(Boolean),
    });
    if (!opened) {
      setError('Allow pop-ups to print or download this document as a PDF.');
    }
  };

  const insertSection = (section: string) => {
    if (!canEditDocument) return;
    setContent((current) =>
      current.trimEnd()
        ? `${current.trimEnd()}\n\n[${section}]\n`
        : `[${section}]\n`,
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            {isChords ? (
              <Music2 className="h-5 w-5 text-amber-400" />
            ) : (
              <FileText className="h-5 w-5 text-purple-400" />
            )}
            <h2 className="text-xl font-bold tracking-tight text-white">
              {isChords ? 'Chords Studio' : 'Lyrics Studio'}
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
            Play Track Audio Demo
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search songs or ideas..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className={`w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 ${
                isChords ? 'focus:ring-amber-500' : 'focus:ring-purple-500'
              }`}
            />
          </div>

          <div className="max-h-[600px] space-y-1.5 overflow-y-auto pr-1">
            {filteredSongs.map((song) => {
              const isSelected = song.id === selectedSong?.id;
              return (
                <button
                  key={song.id}
                  type="button"
                  onClick={() => setSelectedSongId(song.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border p-3 text-left transition ${
                    isSelected
                      ? isChords
                        ? 'border-amber-500/50 bg-zinc-800/90 text-white shadow-md'
                        : 'border-purple-500/50 bg-zinc-800/90 text-white shadow-md'
                      : 'border-zinc-800/80 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-zinc-200 sm:text-sm">
                      {song.title}
                    </p>
                    <p className="mt-0.5 text-[11px] font-mono uppercase text-zinc-500">
                      {song.category}
                      {song.musicalKey && ` · ${song.musicalKey}`}
                      {song.bpm && ` · ${song.bpm} BPM`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                      v{song.lyrics?.versionNumber || 1}
                    </span>
                    {isChords && !hasLyricsDraft(song.lyrics?.draft) && (
                      <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-400">
                        Lyrics required
                      </span>
                    )}
                  </div>
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
            aria-label={isFullscreen ? `${isChords ? 'Chords' : 'Lyrics'} editor` : undefined}
            className={`flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 ${
              isFullscreen ? 'h-full' : 'min-h-[500px]'
            }`}
          >
          {selectedSong ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950/40 p-4">
                <div className="text-xs font-semibold text-zinc-300">
                  {isChords ? 'Chord & Structure Chart' : 'Lyrics & Vocal Notes'}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!isChords && canEditDocument && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="mr-1 hidden text-[11px] text-zinc-500 sm:inline">
                        Add:
                      </span>
                      {['Intro', 'Verse', 'Chorus', 'Bridge', 'Outro'].map(
                        (section) => (
                          <button
                            key={section}
                            type="button"
                            onClick={() => insertSection(section)}
                            className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-[11px] text-zinc-300 hover:bg-zinc-700"
                          >
                            +{section}
                          </button>
                        ),
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
                    title={isFullscreen ? 'Close full-screen editor' : 'Open full-screen editor'}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-3.5 w-3.5" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" />
                    )}
                    {isFullscreen ? 'Close' : 'Full screen'}
                  </button>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-4">
                {!canEdit && (
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/60 p-2.5 text-xs text-zinc-300">
                    <Lock className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>Read-only mode.</span>
                  </div>
                )}
                {isChords && !lyricsAreReady && (
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span>
                      Add and save lyrics in Lyrics Studio before creating this
                      chord chart.
                    </span>
                  </div>
                )}
                {error && (
                  <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                    {error}
                  </div>
                )}
                <textarea
                  value={content}
                  readOnly={!canEditDocument}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder={
                    isChords
                      ? '[Verse]\n[Em]               [G]\nEnter chords and lyrics here...'
                      : 'Type lyrics draft here...'
                  }
                  className={`min-h-[360px] w-full flex-1 resize-y rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs leading-relaxed focus:outline-none focus:ring-1 sm:text-sm ${
                    isChords
                      ? 'text-amber-200 focus:ring-amber-500/50'
                      : 'text-zinc-200 focus:ring-purple-500/50'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950/60 p-4 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-zinc-300 transition hover:bg-zinc-700"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-zinc-300 transition hover:bg-zinc-700"
                    title="Print or save as a Letter-size PDF"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print / PDF
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {saveSuccess && (
                    <span className="flex items-center gap-1 font-medium text-emerald-400">
                      <Check className="h-3.5 w-3.5" /> Saved!
                    </span>
                  )}
                  {canEditDocument && (
                    <button
                      type="button"
                      onClick={handleSave}
                      className={`flex items-center gap-1.5 rounded-xl px-4 py-2 font-bold text-white shadow-md transition ${
                        isChords
                          ? 'bg-amber-600 shadow-amber-600/20 hover:bg-amber-500'
                          : 'bg-purple-600 shadow-purple-600/20 hover:bg-purple-500'
                      }`}
                    >
                      <Save className="h-4 w-4" />
                      Save {isChords ? 'Chord Chart' : 'Lyrics'}
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-xs text-zinc-500">
              Select a song idea from the left.
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};
