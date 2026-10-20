import React, { useState } from 'react';
import {
  Calendar,
  Filter,
  History,
  Music,
  Plus,
  Search,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useBand } from '../context/BandContext.tsx';
import { SongIdea } from '../types/band.ts';
import { SongCard } from './SongCard.tsx';

interface SongListMainViewProps {
  onOpenUploadModal: () => void;
  onOpenLyricsModal: (song: SongIdea) => void;
  onOpenNewVersionModal: (song: SongIdea) => void;
}

export const SongListMainView: React.FC<SongListMainViewProps> = ({
  onOpenUploadModal,
  onOpenLyricsModal,
  onOpenNewVersionModal,
}) => {
  const { songs, permissions, practices } = useBand();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const nextPractice = practices[0];

  const filteredSongs = songs.filter(song => {
    const matchesCategory = selectedCategory === 'all' || song.category === selectedCategory;
    const matchesSearch =
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.createdBy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (song.tags && song.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Quick Band Status & Next Rehearsal Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Demo Vault</p>
            <p className="text-base font-bold text-white">
              {songs.length} Track Ideas &amp; Takes
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/30 shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Recorded Takes</p>
            <p className="text-base font-bold text-white">
              {songs.reduce((acc, s) => acc + s.versions.length, 0)} Versions Stored
            </p>
          </div>
        </div>

        {nextPractice ? (
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Next Rehearsal</p>
              <p className="text-sm font-bold text-white truncate">
                {new Date(nextPractice.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} • {nextPractice.startTime}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Rehearsal</p>
              <p className="text-sm font-bold text-zinc-300">No session scheduled</p>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Filters (matching Page 1 tracks: Song Idea, Chorus Idea, Riff, Bass Idea) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Demos' },
            { id: 'idea', label: 'Song Ideas' },
            { id: 'chorus', label: 'Chorus Ideas' },
            { id: 'riff', label: 'Riffs' },
            { id: 'bass', label: 'Bass Ideas' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap border ${
                selectedCategory === cat.id
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                  : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 border-zinc-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search titles, members, tags..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Main Track List Container as sketched on Page 1 */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-3 sm:p-5 shadow-2xl">
        <div className="flex items-center justify-between px-2 pb-3 mb-2 border-b border-zinc-800/80">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
            Recorded Demos &amp; Song Sketches ({filteredSongs.length})
          </h2>
        </div>

        {filteredSongs.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 space-y-3">
            <Music className="w-10 h-10 mx-auto text-zinc-700" />
            <p className="text-sm font-medium text-zinc-300">No song demos found in this filter.</p>
            {permissions.canUploadDemo && (
              <button
                onClick={onOpenUploadModal}
                className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs"
              >
                Upload a Demo
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredSongs.map(song => (
              <SongCard
                key={song.id}
                song={song}
                onOpenLyrics={onOpenLyricsModal}
                onOpenNewVersion={onOpenNewVersionModal}
              />
            ))}
          </div>
        )}

        {/* Bottom Upload Section as sketched on Page 1: "upload new demo (see page 2)" */}
        <div className="mt-6 pt-5 border-t border-zinc-800/90 text-center">
          {permissions.canUploadDemo ? (
            <button
              onClick={onOpenUploadModal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black text-sm tracking-wide shadow-xl shadow-amber-500/15 hover:shadow-amber-500/25 transition active:scale-[0.99] border border-amber-300/40"
            >
              <Upload className="w-5 h-5 stroke-[2.5]" />
              <span>Upload New Demo</span>
              <span className="text-xs font-semibold text-zinc-800 ml-1">
                (MP3, WAV, Mic &amp; Presets)
              </span>
            </button>
          ) : (
            <div className="p-3 text-xs text-zinc-500 italic">
              Guest role: Uploading demos is reserved for Admins and Members.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
