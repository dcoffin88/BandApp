import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Edit3,
  FileText,
  Lock,
  Music,
  Plus,
  Save,
  Search,
} from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext.tsx';
import { useBand } from '../context/BandContext.tsx';
import { SongIdea } from '../types/band.ts';

export const LyricsStudioView: React.FC = () => {
  const { songs, updateLyrics, permissions, currentUser } = useBand();
  const { playSong } = useAudioPlayer();

  const [selectedSongId, setSelectedSongId] = useState<string>(songs[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'lyrics' | 'chords'>('lyrics');
  const [draft, setDraft] = useState<string>('');
  const [chordsSheet, setChordsSheet] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedSong = songs.find(s => s.id === selectedSongId) || songs[0];

  // Sync draft when selected song changes
  React.useEffect(() => {
    if (selectedSong) {
      setDraft(selectedSong.lyrics?.draft || '');
      setChordsSheet(selectedSong.lyrics?.chordsSheet || '');
    }
  }, [selectedSong?.id]);

  const canEdit = permissions.canEditLyrics;

  const handleSave = async () => {
    if (!selectedSong || !canEdit) return;
    if (!await updateLyrics(selectedSong.id, draft, chordsSheet)) return;
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const insertSection = (tag: string) => {
    const addition = `\n\n[${tag}]\n`;
    if (activeTab === 'lyrics') {
      setDraft(prev => prev + addition);
    } else {
      setChordsSheet(prev => prev + addition);
    }
  };

  const handleCopy = () => {
    const textToCopy = activeTab === 'lyrics' ? draft : (chordsSheet || draft);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredSongs = songs.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Lyrics &amp; Chords Studio
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Write verses, craft chorus rhymes, and maintain chord charts for your band's catalog.
          </p>
        </div>

        {selectedSong && (
          <button
            onClick={() => playSong(selectedSong)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700 font-semibold text-xs transition self-start sm:self-auto"
          >
            <Music className="w-3.5 h-3.5" />
            <span>Play Track Audio Demo</span>
          </button>
        )}
      </div>

      {/* Two column layout: song list on left, editor on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Song Selector Column */}
        <div className="lg:col-span-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search songs or ideas..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredSongs.map(song => {
              const isSelected = song.id === selectedSong?.id;
              return (
                <button
                  key={song.id}
                  onClick={() => setSelectedSongId(song.id)}
                  className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-zinc-800/90 border-purple-500/50 shadow-md text-white'
                      : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700 text-zinc-400'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-200 text-xs sm:text-sm truncate">
                      {song.title}
                    </p>
                    <p className="text-[11px] text-zinc-500 uppercase font-mono mt-0.5">
                      {song.category} {song.musicalKey && `• Key: ${song.musicalKey}`}
                    </p>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono shrink-0">
                    v{song.lyrics?.versionNumber || 1}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor Column */}
        <div className="lg:col-span-8 flex flex-col rounded-2xl bg-zinc-900/70 border border-zinc-800 overflow-hidden min-h-[500px]">
          {selectedSong ? (
            <>
              {/* Toolbar */}
              <div className="p-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-950/40">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('lyrics')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      activeTab === 'lyrics'
                        ? 'bg-zinc-800 text-purple-300'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Lyrics Draft
                  </button>
                  <button
                    onClick={() => setActiveTab('chords')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      activeTab === 'chords'
                        ? 'bg-zinc-800 text-purple-300'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Chords Chart
                  </button>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1">
                    <span className="text-zinc-500 text-[11px] mr-1 hidden sm:inline">Add:</span>
                    {['Verse', 'Chorus', 'Bridge', 'Outro'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => insertSection(t)}
                        className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 font-mono"
                      >
                        +{t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Editor */}
              <div className="p-4 flex-1 flex flex-col">
                {!canEdit && (
                  <div className="p-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700 text-zinc-300 text-xs flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Read-Only mode. Switch to Editor or Admin to edit.</span>
                  </div>
                )}

                <textarea
                  value={activeTab === 'lyrics' ? draft : chordsSheet}
                  readOnly={!canEdit}
                  onChange={e => {
                    if (activeTab === 'lyrics') setDraft(e.target.value);
                    else setChordsSheet(e.target.value);
                  }}
                  placeholder={activeTab === 'lyrics' ? 'Type lyrics draft here...' : '[Em]               [G]\nEnter chords and lyrics here...'}
                  className={`w-full flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs sm:text-sm font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-y min-h-[360px] ${
                    activeTab === 'chords' ? 'text-amber-200' : 'text-zinc-200'
                  }`}
                />
              </div>

              {/* Footer Save Row */}
              <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between text-xs">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <div className="flex items-center gap-2">
                  {saveSuccess && (
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Saved!</span>
                    </span>
                  )}
                  {canEdit && (
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition flex items-center gap-1.5 shadow-md shadow-purple-600/20"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Draft</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-zinc-500 text-xs">
              Select a song idea from the left to view lyrics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
