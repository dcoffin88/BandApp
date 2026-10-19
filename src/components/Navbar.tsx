import React, { useState } from 'react';
import {
  Calendar,
  Check,
  ChevronDown,
  Edit2,
  FileText,
  Guitar,
  KeyRound,
  LogOut,
  Music,
  Palette,
  Plus,
  Settings,
  Shield,
  UserCheck,
  UserCog,
  Users,
} from 'lucide-react';
import { useBand } from '../context/BandContext.tsx';
import { Role } from '../types/band.ts';

interface NavbarProps {
  activeTab: 'songs' | 'lyrics' | 'practice' | 'admin';
  setActiveTab: (tab: 'songs' | 'lyrics' | 'practice' | 'admin') => void;
  onOpenUploadModal: () => void;
  onSelectAdminSubTab?: (subTab: 'users' | 'auth' | 'profile' | 'app' | 'smtp') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenUploadModal,
  onSelectAdminSubTab,
}) => {
  const { band, currentUser, permissions, updateBandName, logout, appSettings } = useBand();
  const [isEditingBandName, setIsEditingBandName] = useState(false);
  const [bandNameInput, setBandNameInput] = useState(band.name);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const handleSaveBandName = (e: React.FormEvent) => {
    e.preventDefault();
    if (bandNameInput.trim()) {
      updateBandName(bandNameInput.trim());
      setIsEditingBandName(false);
    }
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'editor':
        return { label: 'Editor', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'member':
        return { label: 'Band Member', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' };
      case 'guest':
      default:
        return { label: 'Session / Guest', color: 'bg-zinc-700/50 text-zinc-300 border-zinc-600' };
    }
  };

  const roleBadge = getRoleBadge(currentUser.role);

  const getLogoShapeClass = () => {
    switch (appSettings?.headerLogoShape) {
      case 'circle':
        return 'rounded-full';
      case 'square':
        return 'rounded-lg';
      default:
        return 'rounded-2xl';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Top bar with Band Name and Current User */}
        <div className="flex items-center justify-between py-3 border-b border-zinc-800/80 gap-3">
          {/* Band Name & Header Logo Area */}
          <a
            href="/"
            aria-label={`${band.name} — go to demos`}
            onClick={event => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              setActiveTab('songs');
              setShowUserDropdown(false);
            }}
            className="flex items-center gap-3 min-w-0 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500"
          >
            {appSettings?.headerLogoUrl ? (
              <img
                src={appSettings.headerLogoUrl}
                alt={band.name}
                className={`w-10 h-10 object-cover ring-2 ring-amber-500/40 shadow-lg shrink-0 ${getLogoShapeClass()} ${
                  appSettings.accentGlow ? 'theme-glow-accent' : ''
                }`}
              />
            ) : (
              <div
                className={`w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/10 shrink-0 ${
                  appSettings?.accentGlow ? 'theme-glow-accent' : ''
                }`}
              >
                <Guitar className="w-5 h-5 text-zinc-950" />
              </div>
            )}

            <div className="flex flex-col group min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white font-sans truncate">
                  {band.name}
                </h1>
              </div>
              {(appSettings?.headerSubtitle || band.motto) && (
                <span className="text-[11px] text-zinc-400 leading-tight truncate">
                  {appSettings?.headerSubtitle || band.motto}
                </span>
              )}
            </div>
          </a>

          {/* User Profile, Settings, & Logout Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-700/80 transition shadow-sm text-left"
              title="Member account & role settings"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover ring-2 ring-zinc-700 shrink-0"
              />
              <div className="hidden sm:block text-xs">
                <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  {currentUser.name}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-mono ${roleBadge.color}`}
                  >
                    {roleBadge.label}
                  </span>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            </button>

            {/* Dropdown for Role */}
            {showUserDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl z-50 p-2 text-zinc-200 space-y-1">
                  {/* Current User Quick Header */}
                  <div className="p-2.5 border-b border-zinc-800 mb-1 flex items-center gap-2.5">
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-amber-500"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-white text-xs truncate">{currentUser.name}</p>
                      <p className="text-[11px] text-zinc-400 truncate">{currentUser.email}</p>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono uppercase inline-block mt-0.5 ${roleBadge.color}`}>
                        {roleBadge.label}
                      </span>
                    </div>
                  </div>

                  {/* Navigation Links inside Dropdown */}
                  <div className="py-1 border-b border-zinc-800 space-y-0.5 text-xs">
                    <button
                      onClick={() => {
                        setActiveTab('admin');
                        if (onSelectAdminSubTab) onSelectAdminSubTab('profile');
                        setShowUserDropdown(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                    >
                      <UserCog className="w-3.5 h-3.5 text-amber-400" />
                      <span>Profile &amp; Settings</span>
                    </button>

                    {currentUser.role === 'admin' && <button
                      onClick={() => {
                        setActiveTab('admin');
                        if (onSelectAdminSubTab) onSelectAdminSubTab('app');
                        setShowUserDropdown(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                    >
                      <Settings className="w-3.5 h-3.5 text-amber-400" />
                      <span>Admin Settings</span>
                    </button>}
                  </div>

                  {/* Log Out Button */}
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out of Session</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Navigation tabs & Upload CTA */}
        <div className="flex items-center justify-between overflow-x-auto py-2 gap-4">
          <nav className="flex space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('songs')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition whitespace-nowrap ${
                activeTab === 'songs'
                  ? 'bg-zinc-800 text-amber-400 shadow-inner'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Music className="w-4 h-4" />
              <span>Demos &amp; Audio</span>
            </button>
            <button
              onClick={() => setActiveTab('lyrics')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition whitespace-nowrap ${
                activeTab === 'lyrics'
                  ? 'bg-zinc-800 text-amber-400 shadow-inner'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Lyrics Studio</span>
            </button>
            <button
              onClick={() => setActiveTab('practice')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition whitespace-nowrap ${
                activeTab === 'practice'
                  ? 'bg-zinc-800 text-amber-400 shadow-inner'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Practice Schedule</span>
            </button>
          </nav>

          {/* Quick upload trigger */}
          {permissions.canUploadDemo && (
            <button
              onClick={onOpenUploadModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm transition shadow-md shadow-amber-500/20 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Upload Demo</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
