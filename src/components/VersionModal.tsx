import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  Github,
  RefreshCw,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { RehearsalHQLogo } from './RehearsalHQLogo.tsx';
import { AppVersionInfo } from '../utils/versionService.ts';

interface VersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  versionInfo: AppVersionInfo;
  isLoading: boolean;
  onCheckUpdates: (force?: boolean) => Promise<void>;
}

export const VersionModal: React.FC<VersionModalProps> = ({
  isOpen,
  onClose,
  versionInfo,
  isLoading,
  onCheckUpdates,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const formattedDate = versionInfo.publishedAt
    ? new Date(versionInfo.publishedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const formattedCheckedTime = versionInfo.checkedAt
    ? new Date(versionInfo.checkedAt).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl max-h-[80dvh] bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden z-10 text-zinc-100 divide-y divide-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <RehearsalHQLogo className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                RehearsalHQ
              </h3>
              <p className="text-[11px] text-zinc-400">Version &amp; Release Info</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Status Message */}
          {versionInfo.updateAvailable ? (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-300 text-xs">
                    Update Available: {versionInfo.latestTag}
                  </div>
                  <p className="text-[11px] text-amber-200/80 mt-0.5">
                    A newer release has been published to GitHub ({versionInfo.releaseName}).
                  </p>
                </div>
              </div>

              {versionInfo.body && (
                <div className="mt-2 pt-2 border-t border-amber-500/20 text-[11px] text-zinc-300 font-mono bg-zinc-950/60 p-2.5 rounded-lg max-h-96 overflow-y-auto whitespace-pre-wrap break-words">
                  {versionInfo.body}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-emerald-400 text-xs">
                    RehearsalHQ is up to date
                  </div>
                  <p className="text-[11px] text-emerald-300/80 mt-0.5">
                    You are running the latest version.
                  </p>
                </div>
              </div>

              {versionInfo.body && (
                <div className="mt-2 pt-2 border-t border-amber-500/20 text-[11px] text-zinc-300 font-mono bg-zinc-950/60 p-2.5 rounded-lg max-h-96 overflow-y-auto whitespace-pre-wrap break-words">
                  {versionInfo.body}
                </div>
              )}
            </div>
          )}

          {/* Repository & Release links */}
          <div className="space-y-1.5 pt-1">
            <a
              href={versionInfo.releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-amber-500/20"
            >
              <span className="flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5" />
                <span>View Latest Release on GitHub</span>
              </span>
              <ArrowUpRight className="w-4 h-4" />
            </a>

            <a
              href={versionInfo.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-zinc-300 hover:text-white text-xs transition"
            >
              <span className="flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5 text-zinc-400" />
                <span>dcoffin88 / RehearsalHQ Repository</span>
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-zinc-950/50 text-[11px] text-zinc-400">
          <span>
            {formattedCheckedTime ? `Checked at ${formattedCheckedTime}` : 'Checked recently'}
          </span>
          <button
            onClick={() => onCheckUpdates(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-zinc-300 hover:text-white transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            <span>{isLoading ? 'Checking...' : 'Check now'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
