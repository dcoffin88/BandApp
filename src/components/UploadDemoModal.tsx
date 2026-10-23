import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  FileAudio,
  Mic,
  StopCircle,
  Upload,
  X,
} from 'lucide-react';
import { useBand } from '../context/BandContext.tsx';
import { SongIdea } from '../types/band.ts';
import { useMicrophoneRecorder } from '../hooks/useMicrophoneRecorder.ts';
import { MicrophoneSelector } from './MicrophoneSelector.tsx';
import { memberDisplayName } from '../shared/member.ts';
import { KEY_ROOTS, selectableDemoCategories } from '../shared/songMetadata.ts';

interface UploadDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSongCreated?: (song: SongIdea) => void;
}

export const UploadDemoModal: React.FC<UploadDemoModalProps> = ({
  isOpen,
  onClose,
  onSongCreated,
}) => {
  const { addSongIdea, currentUser, permissions, appSettings } = useBand();
  const categoryOptions = selectableDemoCategories(appSettings.demoCategories);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<SongIdea['category']>(
    categoryOptions[0]?.id || 'idea',
  );
  const [bpm, setBpm] = useState<string>('120');
  const [musicalKey, setMusicalKey] = useState('E minor');
  const [description, setDescription] = useState('');
  const [initialLyrics, setInitialLyrics] = useState('');

  // Audio source mode: 'file' | 'mic'
  const [sourceMode, setSourceMode] = useState<'file' | 'mic'>('file');

  // File selection
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const microphone = useMicrophoneRecorder(isOpen && sourceMode === 'mic', setErrorMsg);
  const { isRecording, isRequesting, isStopping, recordingSeconds, recordedBlob, recordedAudioUrl, startRecording, stopRecording } = microphone;


  if (!isOpen) return null;

  // File handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMsg('');
      if (!title) {
        // Auto populate title from file name without extension
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(cleanName);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceMode === 'mic' && (isRecording || isRequesting || isStopping)) { setErrorMsg('Stop recording and wait for it to finish before uploading.'); return; }
    if (!title.trim()) {
      setErrorMsg('Please enter a title for this demo (e.g. "Song Idea", "Chorus Idea", "Riff").');
      return;
    }

    if (!permissions.canUploadDemo) {
      setErrorMsg('Your current role does not have permission to upload new demos.');
      return;
    }

    if (sourceMode === 'file' && !selectedFile) {
      setErrorMsg('Please choose an audio file to upload (or switch to "Record with Mic").');
      return;
    }

    if (sourceMode === 'mic' && !recordedBlob) {
      setErrorMsg('Please record an audio take with your mic first (or switch to "Upload Audio File").');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const audioBlobToSend = sourceMode === 'file' ? selectedFile : recordedBlob;
      if (!audioBlobToSend) {
        setErrorMsg('Choose an audio file or finish recording before uploading.');
        setIsSubmitting(false);
        return;
      }

      const newSong = await addSongIdea(
        {
          title: title.trim(),
          category,
          bpm: bpm ? parseInt(bpm, 10) : undefined,
          musicalKey: musicalKey.trim() || undefined,
          description: description.trim() || 'New recorded demo idea.',
          tags: [category.toUpperCase(), musicalKey, bpm ? `${bpm} BPM` : ''].filter(Boolean),
          lyrics: {
            draft: initialLyrics.trim() || ``,
            lastEditedBy: memberDisplayName(currentUser),
            lastEditedAt: new Date().toISOString(),
            versionNumber: 1,
          },
          versions: [],
          comments: [],
        },
        audioBlobToSend
      );

      setIsSubmitting(false);
      if (onSongCreated) onSongCreated(newSong);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save demo. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Upload New Demo
              </h2>
              <p className="text-xs text-zinc-400">
                Share song sketches, riffs, or chorus hooks with the band
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

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-sm">
          {errorMsg && (
            <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Audio Source Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Audio Source
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSourceMode('file')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition ${
                  sourceMode === 'file'
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                    : 'bg-zinc-800/60 border-zinc-700/80 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileAudio className="w-5 h-5" />
                <span>Upload Audio File</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceMode('mic')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition ${
                  sourceMode === 'mic'
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                    : 'bg-zinc-800/60 border-zinc-700/80 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Mic className="w-5 h-5" />
                <span>Record with Mic</span>
              </button>
            </div>
          </div>

          {/* File Upload */}
          {sourceMode === 'file' && (
            <div className="p-4 rounded-xl border-2 border-dashed border-zinc-700/80 bg-zinc-950/40 text-center hover:border-amber-500/50 transition">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac,.webm"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-amber-400">
                  <FileAudio className="w-5 h-5" />
                </div>

                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="font-semibold text-white truncate max-w-sm">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'audio'}
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-amber-400 underline hover:text-amber-300 mt-1 inline-block"
                    >
                      Choose a different file
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs border border-zinc-600 transition shadow-sm"
                    >
                      Choose Audio File
                    </button>

                    <p className="text-[11px] text-zinc-400 mt-2">
                      <strong className="text-zinc-300">Supported formats:</strong> MP3, WAV, M4A, OGG, AAC, FLAC, WebM
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Live Mic Recording */}
          {sourceMode === 'mic' && (
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-center space-y-3">
              <MicrophoneSelector id="demo-microphone" devices={microphone.devices} value={microphone.selectedDeviceId} onChange={microphone.setSelectedDeviceId} disabled={isRecording || isRequesting || isStopping} isRequesting={isRequesting} isStopping={isStopping} />
              <div className="flex items-center justify-center gap-2">
                {isRecording ? (
                  <div className="flex items-center gap-2 text-rose-400 font-semibold animate-pulse">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span>Recording in progress ({recordingSeconds}s)...</span>
                  </div>
                ) : recordedAudioUrl ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <Check className="w-4 h-4" />
                    <span>Demo take recorded successfully!</span>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400">
                    Record an acoustic riff or vocal voice memo directly from your mic.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-center gap-3">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={isRequesting || isStopping}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition"
                  >
                    <Mic className="w-4 h-4" />
                    <span>{isRequesting ? 'Requesting access…' : isStopping ? 'Finishing…' : recordedAudioUrl ? 'Record Retake' : 'Start Recording'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white font-bold text-xs transition"
                  >
                    <StopCircle className="w-4 h-4 text-rose-400" />
                    <span>Stop Recording</span>
                  </button>
                )}
              </div>

              {recordedAudioUrl && (
                <div className="pt-2">
                  <audio controls src={recordedAudioUrl} className="w-full h-8 mx-auto" />
                </div>
              )}
            </div>
          )}



          {/* Song Details Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Demo Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Song Idea, Chorus Idea, Riff, Bass Idea..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              >
                {categoryOptions.map(option => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Tempo (BPM)
                </label>
                <input
                  type="number"
                  min="40"
                  max="260"
                  value={bpm}
                  onChange={e => setBpm(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-mono"
                />
              </div>
              <div>
                <label htmlFor="upload-demo-key" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Key
                </label>
                <select
                  id="upload-demo-key"
                  value={musicalKey}
                  onChange={e => setMusicalKey(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-mono"
                >
                  <option value="">Not specified</option>
                  {['major', 'minor'].map(mode => (
                    <optgroup key={mode} label={mode === 'major' ? 'Major keys' : 'Minor keys'}>
                      {KEY_ROOTS.map(root => (
                        <option key={root} value={`${root} ${mode}`}>{root} {mode}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Notes for the Band
              </label>
              <textarea
                rows={2}
                placeholder="What was the vibe? What parts need tightening in practice?"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white font-medium text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || (sourceMode === 'mic' && (isRecording || isRequesting || isStopping))}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Uploading...</span>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Publish Demo to Band</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
