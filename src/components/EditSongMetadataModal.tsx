import React, { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';
import { useBand } from '../context/BandContext.tsx';
import { KEY_ROOTS, SONG_CATEGORY_OPTIONS } from '../shared/songMetadata.ts';
import type { SongIdea } from '../types/band.ts';

interface EditSongMetadataModalProps {
  song: SongIdea;
  onClose: () => void;
}

const knownKeys = ['major', 'minor'].flatMap((mode) =>
  KEY_ROOTS.map((root) => `${root} ${mode}`),
);

export const EditSongMetadataModal: React.FC<EditSongMetadataModalProps> = ({
  song,
  onClose,
}) => {
  const { updateSongMetadata } = useBand();
  const [title, setTitle] = useState(song.title);
  const [category, setCategory] = useState<SongIdea['category']>(song.category);
  const [bpm, setBpm] = useState(song.bpm?.toString() ?? '');
  const [musicalKey, setMusicalKey] = useState(song.musicalKey ?? '');
  const [description, setDescription] = useState(song.description ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isSaving, onClose]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    const parsedBpm = bpm === '' ? undefined : Number(bpm);
    if (!cleanTitle) {
      setError('Enter a title for this demo.');
      return;
    }
    if (
      parsedBpm !== undefined &&
      (!Number.isInteger(parsedBpm) || parsedBpm < 40 || parsedBpm > 260)
    ) {
      setError('Tempo must be a whole number from 40 to 260 BPM.');
      return;
    }

    setIsSaving(true);
    setError('');
    const saved = await updateSongMetadata(song.id, {
      title: cleanTitle,
      category,
      bpm: parsedBpm,
      musicalKey: musicalKey.trim() || undefined,
      description: description.trim() || undefined,
    });
    setIsSaving(false);
    if (saved) onClose();
    else setError('Unable to save the demo details. Please try again.');
  };

  const inputClass =
    'w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500';
  const labelClass =
    'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-song-metadata-title"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/50 px-5 py-4">
          <div>
            <h2 id="edit-song-metadata-title" className="font-bold text-white">
              Edit Demo Details
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              Update the information shown with this recording.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white disabled:opacity-50"
            aria-label="Close edit demo details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </div>
          )}

          <div>
            <label htmlFor={`edit-song-title-${song.id}`} className={labelClass}>
              Title
            </label>
            <input
              id={`edit-song-title-${song.id}`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              className={inputClass}
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`edit-song-category-${song.id}`} className={labelClass}>
                Category
              </label>
              <select
                id={`edit-song-category-${song.id}`}
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as SongIdea['category'])
                }
                className={inputClass}
              >
                {SONG_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={`edit-song-bpm-${song.id}`} className={labelClass}>
                Tempo (BPM)
              </label>
              <input
                id={`edit-song-bpm-${song.id}`}
                type="number"
                min="40"
                max="260"
                step="1"
                value={bpm}
                onChange={(event) => setBpm(event.target.value)}
                className={`${inputClass} font-mono`}
                placeholder="Not specified"
              />
            </div>
          </div>

          <div>
            <label htmlFor={`edit-song-key-${song.id}`} className={labelClass}>
              Key
            </label>
            <select
              id={`edit-song-key-${song.id}`}
              value={musicalKey}
              onChange={(event) => setMusicalKey(event.target.value)}
              className={`${inputClass} font-mono`}
            >
              <option value="">Not specified</option>
              {musicalKey && !knownKeys.includes(musicalKey) && (
                <option value={musicalKey}>{musicalKey}</option>
              )}
              {['major', 'minor'].map((mode) => (
                <optgroup
                  key={mode}
                  label={mode === 'major' ? 'Major keys' : 'Minor keys'}
                >
                  {KEY_ROOTS.map((root) => (
                    <option key={root} value={`${root} ${mode}`}>
                      {root} {mode}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={`edit-song-notes-${song.id}`} className={labelClass}>
              Notes
            </label>
            <textarea
              id={`edit-song-notes-${song.id}`}
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={10000}
              className={`${inputClass} resize-y`}
              placeholder="Add notes for the band"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-zinc-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-400 transition hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim()}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2 text-sm font-bold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving…' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
