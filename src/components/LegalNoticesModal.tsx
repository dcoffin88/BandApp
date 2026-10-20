import React, { useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';

interface LegalNoticesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const REPOSITORY_URL = 'https://github.com/dcoffin88/RehearsalHQ';

export const LegalNoticesModal: React.FC<LegalNoticesModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const linkClass =
    'flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-xs font-semibold text-zinc-200 transition hover:border-amber-500/60 hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-notices-title"
        className="w-full max-w-xl rounded-3xl border border-zinc-700 bg-zinc-900 p-6 text-zinc-200 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="legal-notices-title"
              className="text-xl font-bold text-white"
            >
              About RehearsalHQ
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Project attribution, licensing, and source code.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
            aria-label="Close legal notices"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-zinc-300">
          <a
            href={REPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-amber-400 hover:text-amber-300"
          >
            Powered by RehearsalHQ
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <p>
            RehearsalHQ is an open-source band collaboration software. Copyright
            in contributions remains with the respective contributors.
          </p>
          <p>
            This software is licensed under the GNU General Public License,
            version 3. You may redistribute and modify it under those terms. It
            is provided without warranty to the extent permitted by law.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <a
            href={REPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            Source code <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <a
            href={`${REPOSITORY_URL}/blob/main/LICENSE`}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            GPLv3 license <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <a
            href={`${REPOSITORY_URL}/blob/main/CLA.md`}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            Additional terms <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
