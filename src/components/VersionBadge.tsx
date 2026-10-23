import React from 'react';
import { ArrowUpCircle, Check, RefreshCw, Tag } from 'lucide-react';
import { AppVersionInfo } from '../utils/versionService.ts';

interface VersionBadgeProps {
  versionInfo: AppVersionInfo;
  isLoading?: boolean;
  onClick?: () => void;
  className?: string;
}

export const VersionBadge: React.FC<VersionBadgeProps> = ({
  versionInfo,
  isLoading = false,
  onClick,
  className = '',
}) => {
  const { currentVersion, latestTag, latestVersion, updateAvailable } = versionInfo;

  if (updateAvailable) {
    return (
      <button
        onClick={onClick}
        type="button"
        title={`Update available: ${latestTag || `v${latestVersion}`} (Click for details)`}
        className={`group relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 hover:border-amber-400 transition shadow-sm cursor-pointer ${className}`}
      >
        {/* Pulsing indicator */}
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>

        <span className="font-mono font-medium text-[11px] text-zinc-300">
          <span className="hidden sm:inline">RehearsalHQ v{currentVersion}</span>
          <span className="sm:hidden">v{currentVersion}</span>
        </span>

        <span className="text-zinc-500 text-[10px]">
          <span className="hidden sm:inline">•</span>
        </span>

        <span className="flex items-center gap-1 text-[11px] text-amber-300 font-bold tracking-tight">
          <span className="hidden sm:inline">Update Available</span>
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      type="button"
      title={`RehearsalHQ v${currentVersion} - Up to date.`}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono text-zinc-400 bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200 transition shadow-sm cursor-pointer ${className}`}
    >
      {isLoading ? (
        <RefreshCw className="w-3 h-3 text-amber-400 animate-spin shrink-0" />
      ) : (
        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
      )}
      <span className="hidden sm:inline">RehearsalHQ v{currentVersion}</span>
      <span className="sm:hidden">v{currentVersion}</span>
    </button>
  );
};
