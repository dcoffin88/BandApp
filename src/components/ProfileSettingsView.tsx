import React, { useState } from 'react';
import {
  Check,
  Crop,
  Lock,
  Palette,
  Save,
  Upload,
  UserCog,
  LogOut,
} from 'lucide-react';
import { useBand } from '../context/BandContext.tsx';
import type { UserAppearance } from '../types/band.ts';
import { appearanceFrom } from '../shared/defaults.ts';
import { AppearanceSettings } from './AppearanceSettings.tsx';
import { ImageCropModal } from './ImageCropModal.tsx';

export const ProfileSettingsView: React.FC = () => {
  const {
    currentUser,
    appSettings,
    updateUserProfile,
    updateAppearance,
    changePassword,
    logout,
  } = useBand();
  const [localAppearance, setLocalAppearance] = useState<UserAppearance>(() =>
    appearanceFrom(currentUser.appearanceSettings ?? appSettings),
  );
  const [appearanceSaveSuccess, setAppearanceSaveSuccess] = useState(false);
  const [customColorInvalid, setCustomColorInvalid] = useState(false);
  // Profile Management State
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profileStageName, setProfileStageName] = useState(
    currentUser.stageName || '',
  );
  const [profileEmail, setProfileEmail] = useState(currentUser.email);
  const [profileInstrument, setProfileInstrument] = useState(
    currentUser.instrument,
  );
  const [profileBio, setProfileBio] = useState(currentUser.bio || '');
  const [profileGear, setProfileGear] = useState(currentUser.gearList || '');
  const [profilePhone, setProfilePhone] = useState(currentUser.phone || '');
  const [profileAvatar, setProfileAvatar] = useState(currentUser.avatar);
  const [isProfileCropModalOpen, setIsProfileCropModalOpen] = useState(false);
  const [profile2FA, setProfile2FA] = useState(
    currentUser.twoFactorEnabled || false,
  );
  const [profileNotifs, setProfileNotifs] = useState(
    currentUser.notifications || {
      newDemos: true,
      newVersions: true,
      lyricEdits: true,
      practiceReminders: true,
      comments: true,
    },
  );

  // Password change state
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);

  const handleSaveAppearance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customColorInvalid) return;
    setAppearanceSaveSuccess(false);
    if (!(await updateAppearance(localAppearance))) return;
    setAppearanceSaveSuccess(true);
    setTimeout(() => setAppearanceSaveSuccess(false), 2500);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const saved = await updateUserProfile(currentUser.id, {
      name: profileName.trim(),
      stageName: profileStageName.trim(),
      email: profileEmail.trim(),
      instrument: profileInstrument.trim(),
      bio: profileBio.trim(),
      gearList: profileGear.trim(),
      phone: profilePhone.trim(),
      avatar: profileAvatar.trim(),
      notifications: profileNotifs,
    });
    if (!saved) return;
    setProfileSaveSuccess(true);
    setTimeout(() => setProfileSaveSuccess(false), 2500);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError('');
    setPasswordChangeSuccess(false);

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordChangeError('New passwords do not match.');
      return;
    }

    const result = await changePassword(currentPasswordInput, newPasswordInput);
    if (!result.success) {
      setPasswordChangeError(result.message || 'Password change failed.');
      return;
    }
    setPasswordChangeSuccess(true);
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setTimeout(() => setPasswordChangeSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl sm:text-2xl font-black text-white">
            <UserCog className="w-6 h-6 text-amber-400" />
            Profile Management
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Manage your profile, appearance, notifications, and password.
          </p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-400 text-xs font-semibold"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Personal Profile Details */}
        <div className="lg:col-span-8 p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <img
                src={profileAvatar}
                alt={profileName}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-500/40"
              />
              <div>
                <h3 className="font-bold text-white text-base">Your Profile</h3>
                <p className="text-xs text-zinc-400">
                  Update your name, instruments, bio, and contact info
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Stage Name / Moniker
                </label>
                <input
                  type="text"
                  value={profileStageName}
                  onChange={(e) => setProfileStageName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Phone / Text
                </label>
                <input
                  type="tel"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Primary Instrument &amp; Vocal Role
                </label>
                <input
                  type="text"
                  value={profileInstrument}
                  onChange={(e) => setProfileInstrument(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Profile Image
                </label>
                <div className="flex items-center gap-4">
                  <img
                    src={profileAvatar}
                    alt="Profile image preview"
                    className="w-16 h-16 rounded-full object-cover border border-zinc-700"
                  />
                  <button
                    type="button"
                    onClick={() => setIsProfileCropModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md transition"
                  >
                    <Crop className="w-4 h-4" />
                    <span>Upload &amp; Crop Profile Image</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 mt-2">
                  Upload a photo, adjust the crop, then select Update Profile to
                  save.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Musician Bio &amp; Style Notes
                </label>
                <textarea
                  rows={3}
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  placeholder="Influences, tone preferences, songwriting strengths..."
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Gear List &amp; Live Rig
                </label>
                <textarea
                  rows={2}
                  value={profileGear}
                  onChange={(e) => setProfileGear(e.target.value)}
                  placeholder="Guitars, amps, pedals, synthesizers, microphones..."
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-white text-xs"
                />
              </div>
            </div>

            {/* Notification Toggles */}
            <div className="pt-3 border-t border-zinc-800 space-y-2">
              <p className="font-semibold text-zinc-300 uppercase tracking-wider">
                Band Notifications
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileNotifs.newDemos}
                    onChange={(e) =>
                      setProfileNotifs({
                        ...profileNotifs,
                        newDemos: e.target.checked,
                      })
                    }
                    className="accent-amber-500 rounded"
                  />
                  <span>Notify on new audio demo ideas</span>
                </label>
                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileNotifs.newVersions}
                    onChange={(e) =>
                      setProfileNotifs({
                        ...profileNotifs,
                        newVersions: e.target.checked,
                      })
                    }
                    className="accent-amber-500 rounded"
                  />
                  <span>Notify on new audio take versions</span>
                </label>
                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileNotifs.practiceReminders}
                    onChange={(e) =>
                      setProfileNotifs({
                        ...profileNotifs,
                        practiceReminders: e.target.checked,
                      })
                    }
                    className="accent-amber-500 rounded"
                  />
                  <span>Upcoming rehearsal reminders</span>
                </label>
                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileNotifs.comments}
                    onChange={(e) =>
                      setProfileNotifs({
                        ...profileNotifs,
                        comments: e.target.checked,
                      })
                    }
                    className="accent-amber-500 rounded"
                  />
                  <span>Band feedback &amp; comments</span>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
              {profileSaveSuccess && (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  <span>Profile saved!</span>
                </span>
              )}
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition flex items-center gap-1.5 shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>Update Profile</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Password Change & Security */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Change Password</span>
            </h3>

            {passwordChangeError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {passwordChangeError}
              </div>
            )}

            {passwordChangeSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>Password changed successfully!</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">New Password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-white"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition mt-2"
              >
                Update Password
              </button>
            </form>
          </div>

          {/* Quick Account Summary */}
          <div className="p-5 rounded-3xl bg-zinc-950/60 border border-zinc-800 text-xs space-y-3">
            <p className="font-semibold text-zinc-400 uppercase tracking-wider">
              Account Information
            </p>
            <div className="space-y-2 text-zinc-300">
              <div className="flex justify-between">
                <span className="text-zinc-500">Current Role:</span>
                <span className="font-semibold uppercase text-amber-400">
                  {currentUser.role}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">2FA Status:</span>
                <span
                  className={profile2FA ? 'text-emerald-400' : 'text-zinc-500'}
                >
                  {profile2FA ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* App Colors & Theme Palette */}
        <div className="lg:col-span-12 p-6 rounded-3xl bg-zinc-900/70 border border-zinc-800 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">Appearance</h3>
            </div>
          </div>

          <p className="text-xs text-zinc-400">
            Personalize your view. These settings are saved to your account.
          </p>

          <AppearanceSettings
            settings={localAppearance}
            onChange={setLocalAppearance}
            onInvalidColorChange={setCustomColorInvalid}
          />

          {/* Ambient Glow Toggle */}
          <div className="pt-3 border-t border-zinc-800">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localAppearance.accentGlow}
                onChange={(e) =>
                  setLocalAppearance({
                    ...localAppearance,
                    accentGlow: e.target.checked,
                  })
                }
                className="rounded accent-amber-500 w-4 h-4"
              />
              <div>
                <p className="font-semibold text-zinc-200 text-xs">
                  Enable Ambient Lighting &amp; Glow
                </p>
                <p className="text-[11px] text-zinc-500">
                  Adds glowing accents to active playback, waveforms, and
                  navigation badges.
                </p>
              </div>
            </label>
          </div>

          {/* Save Button */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3 text-xs">
            {appearanceSaveSuccess && (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-4 h-4" />
                <span>Your appearance saved!</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveAppearance}
              disabled={customColorInvalid}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>Save Appearance</span>
            </button>
          </div>
        </div>
      </div>
      {isProfileCropModalOpen && (
        <ImageCropModal
          isOpen={isProfileCropModalOpen}
          onClose={() => setIsProfileCropModalOpen(false)}
          initialImageUrl={profileAvatar}
          imageType="profile"
          onCropComplete={setProfileAvatar}
        />
      )}
    </div>
  );
};
