import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronUp,
  Download,
  FileText,
  Guitar,
  ListMusic,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext.tsx';
import { SongIdea } from '../types/band.ts';

interface GlobalAudioPlayerProps {
  onOpenLyrics: (song: SongIdea) => void;
  onOpenChords: (song: SongIdea) => void;
  onOpenTabs: (song: SongIdea) => void;
}

export const GlobalAudioPlayer: React.FC<GlobalAudioPlayerProps> = ({
  onOpenLyrics,
  onOpenChords,
  onOpenTabs,
}) => {
  const {
    currentSong,
    currentVersion,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    isLooping,
    closePlayer,
    togglePlay,
    seekTo,
    cyclePlaybackRate,
    setVolume,
    toggleMute,
    toggleLoop,
    downloadTrack,
  } = useAudioPlayer();
  const [isDocumentsMenuOpen, setIsDocumentsMenuOpen] = useState(false);
  const documentsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsDocumentsMenuOpen(false);
  }, [currentSong?.id]);

  useEffect(() => {
    if (!isDocumentsMenuOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!documentsMenuRef.current?.contains(event.target as Node)) {
        setIsDocumentsMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsDocumentsMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isDocumentsMenuOpen]);

  if (!currentSong || !currentVersion) return null;

  const effectiveDuration = duration || currentVersion.duration || 15;
  const progressRatio = effectiveDuration > 0 ? currentTime / effectiveDuration : 0;

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    seekTo(ratio * effectiveDuration);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800 text-zinc-200 shadow-2xl py-2.5 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-2">
        {/* Scrubber Tracking Bar at top of player */}
        <div
          onClick={handleScrubberClick}
          className="group relative h-2 bg-zinc-800 rounded-full cursor-pointer overflow-hidden hover:h-2.5 transition-all"
          title="Click to track & skip to position"
        >
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full relative"
            style={{ width: `${Math.min(100, Math.max(0, progressRatio * 100))}%` }}
          />
        </div>

        {/* Player Controls Row */}
        <div className="flex items-center justify-between gap-3">
          {/* Song Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial">
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0 transition"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-white text-sm truncate">
                  {currentSong.title}
                </h4>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-amber-300 font-mono border border-zinc-700 hidden sm:inline-block">
                  {currentVersion.label.split(' - ')[0] || `v${currentVersion.versionNumber}`}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate">
                {currentVersion.uploadedBy.name} • {currentVersion.label}
              </p>
            </div>
          </div>

          {/* Center Transport & Speed Controls */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => seekTo(currentTime - 5)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
              title="Rewind 5 seconds"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="font-mono text-xs text-zinc-400 min-w-[85px] text-center">
              <span className="text-amber-400 font-semibold">{formatSeconds(currentTime)}</span>
              <span className="text-zinc-600"> / </span>
              <span>{formatSeconds(effectiveDuration)}</span>
            </div>

            <button
              onClick={() => seekTo(currentTime + 5)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
              title="Skip forward 5 seconds"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              onClick={toggleLoop}
              className={`p-1.5 rounded-lg transition ${
                isLooping ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
              title="Loop track repeat"
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* Right Action buttons: Lyrics, Playback Speed, Download, Volume */}
          <div className="flex items-center gap-2">
            {/* Playback speed button */}
            <button
              onClick={cyclePlaybackRate}
              className={`px-2 py-1 text-xs font-mono font-bold rounded-lg border transition ${
                playbackRate !== 1.0
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 border-zinc-700'
              }`}
              title="Playback Speed (0.5x, 0.75x, 1x, 1.25x, 1.5x)"
            >
              {playbackRate}x
            </button>

            {/* Lyrics, chords, and tabs menu */}
            <div ref={documentsMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsDocumentsMenuOpen((open) => !open)}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700"
                title="Open lyrics, chords, or tabs"
                aria-haspopup="menu"
                aria-expanded={isDocumentsMenuOpen}
              >
                <BookOpen className="h-3.5 w-3.5 text-purple-400" />
                <span className="hidden sm:inline">Song Docs</span>
                <ChevronUp
                  className={`h-3 w-3 transition-transform ${
                    isDocumentsMenuOpen ? '' : 'rotate-180'
                  }`}
                />
              </button>

              {isDocumentsMenuOpen && (
                <div
                  role="menu"
                  className="absolute bottom-full right-0 z-50 mb-2 w-44 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 p-1.5 text-xs shadow-2xl"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsDocumentsMenuOpen(false);
                      onOpenLyrics(currentSong);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-200 transition hover:bg-zinc-800"
                  >
                    <FileText className="h-4 w-4 text-purple-400" />
                    Lyrics
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsDocumentsMenuOpen(false);
                      onOpenChords(currentSong);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-200 transition hover:bg-zinc-800"
                  >
                    <Guitar className="h-4 w-4 text-amber-400" />
                    Chords
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsDocumentsMenuOpen(false);
                      onOpenTabs(currentSong);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-200 transition hover:bg-zinc-800"
                  >
                    <ListMusic className="h-4 w-4 text-cyan-400" />
                    Tabs
                  </button>
                </div>
              )}
            </div>

            {/* Download track */}
            <button
              onClick={() => downloadTrack(currentSong, currentVersion)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
              title="Download audio take"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Volume control */}
            <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-zinc-800">
              <button
                onClick={toggleMute}
                className="p-1 text-zinc-400 hover:text-white"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                className="w-16 h-1 bg-zinc-700 rounded-lg accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center pl-2 border-l border-zinc-700">
              <button
                type="button"
                onClick={closePlayer}
                className="w-8 h-8 flex items-center justify-center shrink-0 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300 shadow-sm transition hover:border-rose-500/70 hover:bg-rose-500/15 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70"
                title="Close audio player"
                aria-label="Close audio player"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
