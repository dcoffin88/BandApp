import React, { useState } from 'react';
import {
  Clock,
  Download,
  FileText,
  Gauge,
  History,
  MessageSquare,
  MoreVertical,
  Music2,
  Pause,
  Play,
  Plus,
  Send,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext.tsx';
import { useBand } from '../context/BandContext.tsx';
import { AudioVersion, SongIdea } from '../types/band.ts';

interface SongCardProps {
  song: SongIdea;
  onOpenLyrics: (song: SongIdea) => void;
  onOpenNewVersion: (song: SongIdea) => void;
}

export const SongCard: React.FC<SongCardProps> = ({
  song,
  onOpenLyrics,
  onOpenNewVersion,
}) => {
  const {
    currentSong,
    currentVersion,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    playSong,
    togglePlay,
    seekTo,
    cyclePlaybackRate,
    downloadTrack,
  } = useAudioPlayer();

  const { currentUser, permissions, deleteSong, setActiveVersion, addComment } = useBand();
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');

  const isCurrentPlaying = currentSong?.id === song.id;
  const activeVersion =
    song.versions.find(v => v.id === song.activeVersionId) ||
    song.versions[song.versions.length - 1] ||
    song.versions[0];

  const effectiveDuration = isCurrentPlaying ? (duration || activeVersion.duration || 15) : (activeVersion.duration || 15);
  const effectiveCurrentTime = isCurrentPlaying ? currentTime : 0;
  const progressRatio = effectiveDuration > 0 ? effectiveCurrentTime / effectiveDuration : 0;

  const handlePlayToggle = () => {
    playSong(song, activeVersion);
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSeconds = ratio * effectiveDuration;

    if (!isCurrentPlaying) {
      playSong(song, activeVersion);
      setTimeout(() => seekTo(targetSeconds), 80);
    } else {
      seekTo(targetSeconds);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    const timestamp = isCurrentPlaying ? Math.round(currentTime) : undefined;
    addComment(song.id, newCommentText, timestamp);
    setNewCommentText('');
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'riff':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'chorus':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'bass':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'full':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }
  };

  const waveformSamples = activeVersion?.waveformSamples || Array.from({ length: 48 }, () => Math.random() * 0.7 + 0.2);

  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
      isCurrentPlaying && isPlaying
        ? 'bg-zinc-900/90 border-amber-500/50 shadow-xl shadow-amber-500/5 ring-1 ring-amber-500/20'
        : 'bg-zinc-900/60 hover:bg-zinc-900/80 border-zinc-800 hover:border-zinc-700/80'
    }`}>
      <div className="p-4 sm:p-5">
        {/* Top Header Row: Category, Title, Uploaded By, Version Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className={`text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border ${getCategoryTheme(song.category)}`}>
                {song.category}
              </span>

              {song.musicalKey && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                  Key: {song.musicalKey}
                </span>
              )}

              {song.bpm && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                  {song.bpm} BPM
                </span>
              )}

              {/* Version indicator as requested in prompt */}
              <button
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
                title="View version takes history"
              >
                <History className="w-3 h-3 text-amber-400" />
                <span className="font-semibold">{activeVersion.label.split(' - ')[0] || `v${activeVersion.versionNumber}`}</span>
                <span className="text-zinc-400">({song.versions.length} {song.versions.length === 1 ? 'take' : 'takes'})</span>
              </button>
            </div>

            {/* Song Title as sketched in Page 1 */}
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
              {song.title}
            </h3>

            {/* Uploaded by info as sketched on Page 1: "uploaded by ..." */}
            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
              <img
                src={song.createdBy.avatar}
                alt={song.createdBy.name}
                className="w-4 h-4 rounded-full object-cover"
              />
              <span>
                uploaded by <strong className="text-zinc-200 font-medium">{song.createdBy.name}</strong>
              </span>
              <span>•</span>
              <span className="text-zinc-500">
                {new Date(song.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Right Action Menu: Version button & delete */}
          <div className="flex items-center gap-1.5">
            {permissions.canUploadVersion && (
              <button
                onClick={() => onOpenNewVersion(song)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700/80 transition"
                title="Upload a new version or audio take for this track"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Take</span>
              </button>
            )}

            {permissions.canDeleteTracks && (
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${song.title}"?`)) {
                    deleteSong(song.id);
                  }
                }}
                className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                title="Delete track (Leader only)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Description or take notes if any */}
        {song.description && (
          <p className="text-xs text-zinc-400 mb-3.5 line-clamp-2">
            {song.description}
          </p>
        )}

        {/* Audio Player Core Row (Page 2 sketch: Waveform, Play, Lyrics, Playback Speed, Download) */}
        <div className="bg-zinc-950/70 p-3 sm:p-3.5 rounded-xl border border-zinc-800/80 mb-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Big Play / Pause button as sketched on Page 1 & Page 2 */}
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <button
                onClick={handlePlayToggle}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-lg ${
                  isCurrentPlaying && isPlaying
                    ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                }`}
                title={isCurrentPlaying && isPlaying ? 'Pause' : 'Play demo'}
              >
                {isCurrentPlaying && isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              {/* Mobile time display */}
              <div className="sm:hidden font-mono text-xs text-zinc-400">
                <span className="text-amber-400 font-semibold">{formatSeconds(effectiveCurrentTime)}</span>
                <span className="text-zinc-600"> / </span>
                <span>{formatSeconds(effectiveDuration)}</span>
              </div>
            </div>

            {/* Interactive Waveform / Scrubber: "Tracking to skip to certain parts" */}
            <div className="flex-1 min-w-0">
              <div
                onClick={handleWaveformClick}
                className="group relative h-10 flex items-center gap-[2px] cursor-pointer bg-zinc-900/90 rounded-lg px-2 border border-zinc-800/70 hover:border-zinc-700 transition"
                title="Click anywhere to skip / track to that part of the song"
              >
                {/* Waveform bars */}
                {waveformSamples.map((height, idx) => {
                  const barProgress = idx / waveformSamples.length;
                  const isPassed = barProgress <= progressRatio;
                  const isHoverHead = Math.abs(barProgress - progressRatio) < 0.03;

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex items-center justify-center h-full"
                    >
                      <div
                        style={{ height: `${Math.max(15, height * 100)}%` }}
                        className={`w-full max-w-[4px] rounded-full transition-colors duration-100 ${
                          isPassed
                            ? 'bg-amber-400'
                            : 'bg-zinc-700 group-hover:bg-zinc-600'
                        } ${isHoverHead && isCurrentPlaying ? 'brightness-125' : ''}`}
                      />
                    </div>
                  );
                })}

                {/* Progress bar line indicator */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.8)] pointer-events-none transition-all duration-75"
                  style={{ left: `${Math.min(99.5, Math.max(0.5, progressRatio * 100))}%` }}
                />
              </div>

              {/* Time display underneath */}
              <div className="hidden sm:flex items-center justify-between mt-1 text-[11px] font-mono text-zinc-500">
                <span className={isCurrentPlaying && isPlaying ? 'text-amber-400 font-semibold' : ''}>
                  {formatSeconds(effectiveCurrentTime)}
                </span>
                <span>{formatSeconds(effectiveDuration)}</span>
              </div>
            </div>

            {/* Action buttons matching Page 2 sketch: [Lyrics], [Playback Speed], Download */}
            <div className="flex items-center justify-end gap-1.5 pt-2 sm:pt-0 border-t border-zinc-800 sm:border-t-0">
              {/* [Lyrics] button -> "will bring up a pop up to add/edit lyrics" */}
              <button
                onClick={() => onOpenLyrics(song)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 transition"
                title="Open lyrics draft and chord notes"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Lyrics</span>
              </button>

              {/* [Playback Speed] button -> "Playback speed button" */}
              <button
                onClick={() => {
                  if (!isCurrentPlaying) {
                    playSong(song, activeVersion);
                  }
                  cyclePlaybackRate();
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border transition ${
                  isCurrentPlaying && playbackRate !== 1.0
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 border-zinc-700/80'
                }`}
                title="Playback speed (0.5x, 0.75x, 1x, 1.25x, 1.5x) for practice"
              >
                <Gauge className="w-3.5 h-3.5 text-zinc-400" />
                <span>{isCurrentPlaying ? `${playbackRate}x` : '1x'}</span>
              </button>

              {/* Download button -> "maybe a download button? For each track" */}
              <button
                onClick={() => downloadTrack(song, activeVersion)}
                className="p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-800/90 hover:bg-zinc-700 rounded-lg border border-zinc-700/80 transition"
                title="Download this audio take (.wav)"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {/* Comments drawer trigger */}
              <button
                onClick={() => setShowComments(!showComments)}
                className={`relative p-2 rounded-lg border transition ${
                  showComments
                    ? 'bg-zinc-700 text-amber-400 border-amber-500/30'
                    : 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-zinc-700/80'
                }`}
                title="Band feedback & comments"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {song.comments.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-bold flex items-center justify-center">
                    {song.comments.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Version History Drawer (File versioning requested in prompt) */}
        {showVersionHistory && (
          <div className="mt-3 p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
                <History className="w-4 h-4 text-amber-400" />
                <span>Audio Take Version History</span>
              </div>
              <span className="text-[11px] text-zinc-400">
                Select active version or compare takes
              </span>
            </div>

            <div className="space-y-2">
              {song.versions.map(version => {
                const isActive = version.id === song.activeVersionId;
                const isPlayingThisVer = isCurrentPlaying && currentVersion?.id === version.id && isPlaying;

                return (
                  <div
                    key={version.id}
                    className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition ${
                      isActive
                        ? 'bg-zinc-900 border-amber-500/40 text-white'
                        : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => playSong(song, version)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                          isPlayingThisVer
                            ? 'bg-amber-500 text-zinc-950'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                        }`}
                        title="Listen to this take"
                      >
                        {isPlayingThisVer ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-200">{version.label}</span>
                          {isActive && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          Uploaded by {version.uploadedBy.name} • {new Date(version.uploadedAt).toLocaleDateString()} • {version.duration}s {version.fileSize && `• ${version.fileSize}`}
                        </p>
                        {version.notes && (
                          <p className="text-[11px] text-zinc-400 italic mt-0.5">
                            "{version.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {!isActive && (
                        <button
                          onClick={() => setActiveVersion(song.id, version.id)}
                          className="px-2 py-1 text-[11px] font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
                        >
                          Set Active Take
                        </button>
                      )}
                      <button
                        onClick={() => downloadTrack(song, version)}
                        className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition"
                        title="Download this specific take"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Timestamped Band Comments Drawer */}
        {showComments && (
          <div className="mt-3 p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-zinc-300">
              <span className="font-semibold flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                Band Feedback &amp; Ideas ({song.comments.length})
              </span>
              {isCurrentPlaying && (
                <span className="text-[11px] text-amber-400 font-mono">
                  At {formatSeconds(currentTime)}
                </span>
              )}
            </div>

            {/* Comments list */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {song.comments.length === 0 ? (
                <p className="text-zinc-500 italic py-2 text-center">
                  No comments yet. Share notes with the band!
                </p>
              ) : (
                song.comments.map(c => (
                  <div key={c.id} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800/80 flex items-start gap-2.5">
                    <img
                      src={c.userAvatar}
                      alt={c.userName}
                      className="w-5 h-5 rounded-full object-cover mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-200">{c.userName}</span>
                        {c.timestampSeconds !== undefined && (
                          <button
                            onClick={() => {
                              if (!isCurrentPlaying) playSong(song, activeVersion);
                              if (c.timestampSeconds !== undefined) {
                                seekTo(c.timestampSeconds);
                              }
                            }}
                            className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition"
                            title="Jump to this moment in the song"
                          >
                            @{formatSeconds(c.timestampSeconds)}
                          </button>
                        )}
                        <span className="text-[10px] text-zinc-500">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-zinc-300 mt-0.5">{c.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment input form */}
            <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder={isCurrentPlaying ? `Add note at ${formatSeconds(currentTime)}...` : 'Add band feedback or idea...'}
                value={newCommentText}
                onChange={e => setNewCommentText(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-zinc-950 font-bold rounded-lg transition flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
