import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  FileAudio,
  History,
  Mic,
  StopCircle,
  Upload,
  X,
} from 'lucide-react';
import { useBand } from '../context/BandContext.tsx';
import { SongIdea } from '../types/band.ts';
import { useMicrophoneRecorder } from '../hooks/useMicrophoneRecorder.ts';
import { MicrophoneSelector } from './MicrophoneSelector.tsx';

interface NewVersionModalProps {
  song: SongIdea | null;
  isOpen: boolean;
  onClose: () => void;
}

export const NewVersionModal: React.FC<NewVersionModalProps> = ({
  song,
  isOpen,
  onClose,
}) => {
  const { addSongVersion, permissions } = useBand();

  const nextVerNum = (song?.versions.length || 0) + 1;
  const [label, setLabel] = useState(`v${nextVerNum} - New Take`);
  const [notes, setNotes] = useState('');
  const [sourceMode, setSourceMode] = useState<'file' | 'mic'>('file');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const microphone = useMicrophoneRecorder(isOpen && Boolean(song) && sourceMode === 'mic', setErrorMsg);
  const { isRecording, isRequesting, isStopping, recordingSeconds, recordedBlob, recordedAudioUrl, startRecording, stopRecording } = microphone;

  if (!isOpen || !song) return null;


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMsg('');
      if (!label || label === `v${nextVerNum} - New Take`) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setLabel(`v${nextVerNum} - ${cleanName}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceMode === 'mic' && (isRecording || isRequesting || isStopping)) { setErrorMsg('Stop recording and wait for it to finish before uploading.'); return; }
    if (!permissions.canUploadVersion) {
      setErrorMsg('Your current role does not have permission to upload audio versions.');
      return;
    }

    if (sourceMode === 'file' && !selectedFile) {
      setErrorMsg('Please choose an audio file for this take (or switch to "Record Mic").');
      return;
    }

    if (sourceMode === 'mic' && !recordedBlob) {
      setErrorMsg('Please record an audio take with your mic first (or switch to "Audio File").');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const fileToSend = sourceMode === 'file' ? selectedFile : recordedBlob;
      if (!fileToSend) {
        setErrorMsg('Choose an audio file or finish recording before saving.');
        setIsSubmitting(false);
        return;
      }

      await addSongVersion(
        song.id,
        {
          label: label.trim() || `v${nextVerNum} - Take ${nextVerNum}`,
          audioUrl: '',
          duration: 15,
          notes: notes.trim(),
        },
        fileToSend
      );

      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to add version.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Add New Take: {song.title}
              </h2>
              <p className="text-xs text-zinc-400">
                Create version {nextVerNum} with fresh changes or alternate mix
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-sm">
          {errorMsg && (
            <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Audio Source Modes */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSourceMode('file')}
              className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition ${
                sourceMode === 'file'
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                  : 'bg-zinc-800/60 border-zinc-700/80 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileAudio className="w-5 h-5" />
              <span>Audio File</span>
            </button>
            <button
              type="button"
              onClick={() => setSourceMode('mic')}
              className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition ${
                sourceMode === 'mic'
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                  : 'bg-zinc-800/60 border-zinc-700/80 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Mic className="w-5 h-5" />
              <span>Record Mic</span>
            </button>
          </div>

          {sourceMode === 'file' && (
            <div className="p-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac,.webm"
                onChange={handleFileChange}
                className="hidden"
              />
              {selectedFile ? (
                <div className="space-y-1">
                  <p className="font-semibold text-white truncate">{selectedFile.name}</p>
                  <p className="text-xs text-zinc-400">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-amber-400 underline hover:text-amber-300"
                  >
                    Change file
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs border border-zinc-600 transition"
                  >
                    Choose Audio File (.mp3, .wav, .m4a)
                  </button>
                </div>
              )}
            </div>
          )}

          {sourceMode === 'mic' && (
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-center space-y-2">
              <MicrophoneSelector id="version-microphone" devices={microphone.devices} value={microphone.selectedDeviceId} onChange={microphone.setSelectedDeviceId} disabled={isRecording || isRequesting || isStopping} isRequesting={isRequesting} isStopping={isStopping} />
              <div className="flex items-center justify-center gap-3">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={isRequesting || isStopping}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition"
                  >
                    <Mic className="w-4 h-4" />
                    <span>{isRequesting ? 'Requesting access…' : isStopping ? 'Finishing…' : recordedAudioUrl ? 'Re-record Take' : 'Record Mic Take'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-700 text-white font-bold text-xs"
                  >
                    <StopCircle className="w-4 h-4 text-rose-400" />
                    <span>Stop ({recordingSeconds}s)</span>
                  </button>
                )}
              </div>
              {recordedAudioUrl && (
                <audio controls src={recordedAudioUrl} className="w-full h-8 mt-2" />
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              Version Label *
            </label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. v2 - Acoustic with harmonies, v3 - Slower tempo"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
              What changed in this take?
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Adjusted amp EQ, tried singing up one octave on the second bar..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !label.trim() || (sourceMode === 'mic' && (isRecording || isRequesting || isStopping))}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Add Version to Track'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
