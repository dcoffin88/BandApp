import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AudioVersion, SongIdea } from '../types/band.ts';

interface AudioPlayerContextType {
  currentSong: SongIdea | null;
  currentVersion: AudioVersion | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  isLooping: boolean;
  playSong: (song: SongIdea, version?: AudioVersion) => void;
  togglePlay: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleLoop: () => void;
  cyclePlaybackRate: () => void;
  downloadTrack: (song: SongIdea, version?: AudioVersion) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

const PLAYBACK_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5];

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentSong, setCurrentSong] = useState<SongIdea | null>(null);
  const [currentVersion, setCurrentVersion] = useState<AudioVersion | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRateState] = useState<number>(1.0);
  const [volume, setVolumeState] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(false);

  // Initialize audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    };

    const onEnded = () => {
      if (!audio.loop) {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    const onError = (e: Event) => {
      console.warn('Audio element error or source reset', e);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
      audio.src = '';
    };
  }, []);

  const playSong = (song: SongIdea, version?: AudioVersion) => {
    const targetVersion =
      version ||
      song.versions.find(v => v.id === song.activeVersionId) ||
      song.versions[0];

    if (!targetVersion || !audioRef.current) return;

    const isSameVersion = currentVersion?.id === targetVersion.id && currentSong?.id === song.id;

    if (isSameVersion) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(err => console.error(err));
      }
      return;
    }

    // Switch track / version
    setCurrentSong(song);
    setCurrentVersion(targetVersion);
    setDuration(targetVersion.duration || 15);
    setCurrentTime(0);

    const audio = audioRef.current;
    audio.src = targetVersion.audioUrl;
    audio.playbackRate = playbackRate;
    audio.volume = isMuted ? 0 : volume;
    audio.loop = isLooping;

    audio.play()
      .then(() => setIsPlaying(true))
      .catch(err => {
        console.warn('Playback start error (e.g. user gesture or audio format)', err);
        // Still toggle playing status so UI shows player
        setIsPlaying(true);
      });
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentVersion) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(err => console.error(err));
    }
  };

  const pause = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const seekTo = (seconds: number) => {
    if (!audioRef.current) return;
    const clamped = Math.max(0, Math.min(seconds, duration || 100));
    audioRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const setPlaybackRate = (rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const cyclePlaybackRate = () => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    const nextRate = PLAYBACK_SPEEDS[nextIndex];
    setPlaybackRate(nextRate);
  };

  const setVolume = (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : clamped;
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audioRef.current) {
      audioRef.current.volume = nextMuted ? 0 : volume;
    }
  };

  const toggleLoop = () => {
    const nextLoop = !isLooping;
    setIsLooping(nextLoop);
    if (audioRef.current) {
      audioRef.current.loop = nextLoop;
    }
  };

  const downloadTrack = (song: SongIdea, version?: AudioVersion) => {
    const targetVersion = version || song.versions.find(v => v.id === song.activeVersionId) || song.versions[0];
    if (!targetVersion || !targetVersion.audioUrl) return;

    const safeTitle = `${song.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${targetVersion.label.replace(/[^a-zA-Z0-9_-]/g, '_')}.wav`;
    const anchor = document.createElement('a');
    anchor.href = targetVersion.audioUrl;
    anchor.download = safeTitle;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  return (
    <AudioPlayerContext.Provider
      value={{
        currentSong,
        currentVersion,
        isPlaying,
        currentTime,
        duration,
        playbackRate,
        volume,
        isMuted,
        isLooping,
        playSong,
        togglePlay,
        pause,
        seekTo,
        setPlaybackRate,
        setVolume,
        toggleMute,
        toggleLoop,
        cyclePlaybackRate,
        downloadTrack,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};
