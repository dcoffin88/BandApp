import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  Edit3,
  FileText,
  Lock,
  Music,
  Plus,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import { useBand } from '../context/BandContext.tsx';
import { SongIdea } from '../types/band.ts';

interface LyricsModalProps {
  song: SongIdea | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LyricsModal: React.FC<LyricsModalProps> = ({
  song,
  isOpen,
  onClose,
}) => {
  const { updateLyrics, permissions, currentUser } = useBand();

  if (!isOpen || !song) return null;

  const [draft, setDraft] = useState(song.lyrics?.draft || '');
  const [chordsSheet, setChordsSheet] = useState(song.lyrics?.chordsSheet || '');
  const [activeTab, setActiveTab] = useState<'lyrics' | 'chords'>('lyrics');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const canEdit = permissions.canEditLyrics;

  const handleSave = () => {
    if (!canEdit) return;
    updateLyrics(song.id, draft, chordsSheet);
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

  const handleDownloadText = () => {
    const textToSave = `=== ${song.title} - Lyrics & Chords ===\nCategory: ${song.category.toUpperCase()}\nKey: ${song.musicalKey || 'N/A'}\nBPM: ${song.bpm || 'N/A'}\nLast Edited By: ${song.lyrics.lastEditedBy || currentUser.name}\n\n${draft}\n\n=== Chords Chart ===\n${chordsSheet || '(None specified)'}`;
    const blob = new Blob([textToSave], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${song.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Lyrics.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header: Title and Note from Sketch Page 2 */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Lyrics Draft: {song.title}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono border border-zinc-700">
                  v{song.lyrics?.versionNumber || 1}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Last edited by <strong className="text-zinc-200">{song.lyrics?.lastEditedBy || song.createdBy.name}</strong> • {new Date(song.lyrics?.lastEditedAt || song.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Tabs */}
        <div className="px-6 py-2.5 bg-zinc-950/40 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('lyrics')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'lyrics'
                  ? 'bg-zinc-800 text-purple-300 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              Lyrics Draft
            </button>
            <button
              onClick={() => setActiveTab('chords')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'chords'
                  ? 'bg-zinc-800 text-purple-300 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              Chords &amp; Lead Sheet
            </button>
          </div>

          {/* Quick section insert buttons for songwriters */}
          {canEdit && (
            <div className="flex items-center gap-1">
              <span className="text-zinc-500 mr-1 hidden sm:inline">Add:</span>
              {['Verse', 'Chorus', 'Bridge', 'Pre-Chorus', 'Outro'].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertSection(tag)}
                  className="px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-[11px] font-mono text-zinc-300 border border-zinc-700 transition"
                >
                  +{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Editor Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col space-y-3">
          {!canEdit && (
            <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700 text-zinc-300 text-xs flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Read-Only Mode:</strong> Your current role (<em>{currentUser.role}</em>) does not have edit permissions. Switch to Leader or Songwriter to edit.
              </span>
            </div>
          )}

          {activeTab === 'lyrics' ? (
            <div className="flex-1 flex flex-col">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Lyrics Text &amp; Vocal Notes
              </label>
              <textarea
                value={draft}
                readOnly={!canEdit}
                onChange={e => setDraft(e.target.value)}
                placeholder="Type or paste lyric drafts here... (e.g. [Verse 1], [Chorus])"
                rows={14}
                className="w-full flex-1 bg-zinc-950 border border-zinc-700/80 rounded-xl p-4 text-zinc-100 placeholder-zinc-600 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-y"
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Chords &amp; Structure Sheet</span>
                <span className="text-[11px] font-normal text-zinc-500">
                  Tip: Put chords in brackets above lines, e.g. [Em] [G]
                </span>
              </label>
              <textarea
                value={chordsSheet}
                readOnly={!canEdit}
                onChange={e => setChordsSheet(e.target.value)}
                placeholder="[Em]                [G]&#10;Walking down the neon road at 2 AM..."
                rows={14}
                className="w-full flex-1 bg-zinc-950 border border-zinc-700/80 rounded-xl p-4 text-amber-200 placeholder-zinc-600 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-y"
              />
            </div>
          )}
        </div>

        {/* Footer: Save Option as sketched on Page 2 ("must have save option") */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
            </button>

            <button
              onClick={handleDownloadText}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export as .txt</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-emerald-400 font-medium flex items-center gap-1 animate-in fade-in">
                <Check className="w-4 h-4" />
                <span>Saved successfully!</span>
              </span>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white font-medium transition"
            >
              Close
            </button>

            {canEdit && (
              <button
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-md shadow-purple-600/20 transition flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Save Lyrics</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
