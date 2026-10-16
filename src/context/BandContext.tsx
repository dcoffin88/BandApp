import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AppSettings,
  AudioVersion,
  AuthSettings,
  BandMember,
  BandProfile,
  EmailEventType,
  EmailNotificationLog,
  LoginAuditEntry,
  PracticeSession,
  Role,
  SmtpSettings,
  SongComment,
  SongIdea,
  UserRolePermissions,
  UserStatus,
} from '../types/band.ts';
import { createSynthesizedAudioDemo } from '../utils/audioGenerator.ts';
import { buildBandEmailHtml, sendBandNotification } from '../utils/notificationService.ts';
import {
  loadAppSettings,
  loadAuditLogs,
  loadAuthSettings,
  loadBandProfile,
  loadCurrentUserId,
  loadEmailLogs,
  loadIsAuthenticated,
  loadPractices,
  loadSmtpSettings,
  loadSongs,
  ROLE_PERMISSIONS,
  saveAppSettings,
  saveAuditLogs,
  saveAuthSettings,
  saveBandProfile,
  saveCurrentUserId,
  saveEmailLogs,
  saveIsAuthenticated,
  savePractices,
  saveSmtpSettings,
  saveSongs,
} from '../utils/storage.ts';

interface AuthResponse {
  success: boolean;
  message?: string;
}

interface BandContextType {
  band: BandProfile;
  currentUser: BandMember;
  permissions: UserRolePermissions;
  songs: SongIdea[];
  practices: PracticeSession[];
  isAudioInitialized: boolean;
  isAuthenticated: boolean;
  authSettings: AuthSettings;
  auditLogs: LoginAuditEntry[];
  appSettings: AppSettings;
  smtpSettings: SmtpSettings;
  emailLogs: EmailNotificationLog[];
  updateAppSettings: (newSettings: Partial<AppSettings>) => void;
  updateSmtpSettings: (settings: SmtpSettings) => void;
  sendTestEmail: (toEmail: string, templateType?: string) => Promise<{ success: boolean; message: string; log?: EmailNotificationLog }>;
  resendEmail: (logId: string) => Promise<{ success: boolean; message: string }>;
  clearEmailLogs: () => void;
  login: (email: string, password: string) => AuthResponse;
  quickLoginAs: (memberId: string) => void;
  logout: () => void;
  registerUser: (data: Omit<BandMember, 'id' | 'status'> & { password: string }) => AuthResponse;
  switchUser: (memberId: string) => void;
  updateUserRole: (memberId: string, newRole: Role) => void;
  updateUserStatus: (memberId: string, status: UserStatus) => void;
  updateUserProfile: (userId: string, updates: Partial<BandMember>) => void;
  deleteUserAccount: (userId: string) => void;
  updateAuthSettings: (settings: AuthSettings) => void;
  clearAuditLogs: () => void;
  updateBandName: (name: string, motto?: string, genre?: string, foundedYear?: string) => void;
  addSongIdea: (song: Omit<SongIdea, 'id' | 'createdAt' | 'createdBy' | 'activeVersionId'>, initialVersionFile?: File | Blob) => Promise<SongIdea>;
  addSongVersion: (songId: string, newVersion: Omit<AudioVersion, 'id' | 'versionNumber' | 'uploadedAt' | 'uploadedBy'>, audioFile?: File | Blob) => Promise<void>;
  updateLyrics: (songId: string, draft: string, chordsSheet?: string) => void;
  addComment: (songId: string, text: string, timestampSeconds?: number) => void;
  deleteSong: (songId: string) => void;
  setActiveVersion: (songId: string, versionId: string) => void;
  addPracticeSession: (session: Omit<PracticeSession, 'id' | 'createdAt' | 'createdBy' | 'rsvps'>) => void;
  updateRsvp: (practiceId: string, status: 'attending' | 'tentative' | 'declined') => void;
  deletePracticeSession: (practiceId: string) => void;
  addBandMember: (member: Omit<BandMember, 'id'>) => void;
}

const BandContext = createContext<BandContextType | null>(null);

export const BandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [band, setBand] = useState<BandProfile>(loadBandProfile);
  const [currentUserId, setCurrentUserId] = useState<string>(loadCurrentUserId);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(loadIsAuthenticated);
  const [authSettings, setAuthSettings] = useState<AuthSettings>(loadAuthSettings);
  const [auditLogs, setAuditLogs] = useState<LoginAuditEntry[]>(loadAuditLogs);
  const [appSettings, setAppSettings] = useState<AppSettings>(loadAppSettings);
  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings>(loadSmtpSettings);
  const [emailLogs, setEmailLogs] = useState<EmailNotificationLog[]>(loadEmailLogs);
  const [songs, setSongs] = useState<SongIdea[]>(loadSongs);
  const [practices, setPractices] = useState<PracticeSession[]>(loadPractices);
  const [isAudioInitialized, setIsAudioInitialized] = useState<boolean>(false);

  // Synchronize dynamic color theme attribute to document
  useEffect(() => {
    if (appSettings?.primaryColor) {
      document.documentElement.setAttribute('data-theme', appSettings.primaryColor);
    }
  }, [appSettings?.primaryColor]);

  // Initialize synthetic audio blobs for pre-seeded tracks if URLs are empty
  useEffect(() => {
    let mounted = true;

    async function initSeedAudio() {
      const updatedSongs = [...songs];
      let hasChanges = false;

      for (let sIdx = 0; sIdx < updatedSongs.length; sIdx++) {
        const song = updatedSongs[sIdx];
        const newVersions = [...song.versions];

        for (let vIdx = 0; vIdx < newVersions.length; vIdx++) {
          const ver = newVersions[vIdx];
          if (!ver.audioUrl) {
            hasChanges = true;
            try {
              const demoType = (song.category === 'bass' ? 'bass' :
                song.category === 'riff' ? 'riff' :
                song.category === 'chorus' ? 'chorus' : 'idea');
              const { blobUrl, duration, samples } = await createSynthesizedAudioDemo(demoType, ver.duration || 14);
              newVersions[vIdx] = {
                ...ver,
                audioUrl: blobUrl,
                duration,
                waveformSamples: samples,
              };
            } catch (err) {
              console.error('Error synthesizing demo audio:', err);
            }
          }
        }
        updatedSongs[sIdx] = { ...song, versions: newVersions };
      }

      if (mounted && hasChanges) {
        setSongs(updatedSongs);
        saveSongs(updatedSongs);
      }
      if (mounted) {
        setIsAudioInitialized(true);
      }
    }

    initSeedAudio();

    return () => {
      mounted = false;
    };
  }, []);

  const currentUser =
    band.members.find(m => m.id === currentUserId) ||
    band.members[0] || {
      id: 'mem-1',
      name: 'Dave Coffin',
      email: 'dave@bandjam.app',
      role: 'leader',
      status: 'active',
      instrument: 'Lead Vocals & Rhythm Guitar',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    };

  const permissions = ROLE_PERMISSIONS[currentUser.role] || ROLE_PERMISSIONS.member;

  const login = (email: string, password: string): AuthResponse => {
    const member = band.members.find(m => m.email.toLowerCase() === email.trim().toLowerCase());
    if (!member) {
      // Record failed audit log
      const failLog: LoginAuditEntry = {
        id: `log-${Date.now()}`,
        userName: email,
        timestamp: new Date().toISOString(),
        ipAddress: '192.168.1.100',
        status: 'failed',
        method: 'Email & Password',
        deviceInfo: navigator.userAgent.substring(0, 40),
      };
      const updatedLogs = [failLog, ...auditLogs];
      setAuditLogs(updatedLogs);
      saveAuditLogs(updatedLogs);
      return { success: false, message: 'Invalid email address or band member account not found.' };
    }

    if (member.status === 'suspended') {
      return { success: false, message: 'This account has been suspended by the Band Leader. Please contact Dave Coffin.' };
    }

    const expectedPass = member.password || 'password123';
    if (password !== expectedPass) {
      const failLog: LoginAuditEntry = {
        id: `log-${Date.now()}`,
        userId: member.id,
        userName: member.name,
        timestamp: new Date().toISOString(),
        ipAddress: '192.168.1.100',
        status: 'failed',
        method: 'Email & Password',
        deviceInfo: navigator.userAgent.substring(0, 40),
      };
      const updatedLogs = [failLog, ...auditLogs];
      setAuditLogs(updatedLogs);
      saveAuditLogs(updatedLogs);
      return { success: false, message: 'Incorrect password. (Default password for all demo accounts is password123)' };
    }

    // Success
    setCurrentUserId(member.id);
    saveCurrentUserId(member.id);
    setIsAuthenticated(true);
    saveIsAuthenticated(true);

    // Update lastLogin
    const updatedMembers = band.members.map(m =>
      m.id === member.id ? { ...m, lastLogin: new Date().toISOString(), status: 'active' as UserStatus } : m
    );
    const updatedBand = { ...band, members: updatedMembers };
    setBand(updatedBand);
    saveBandProfile(updatedBand);

    const successLog: LoginAuditEntry = {
      id: `log-${Date.now()}`,
      userId: member.id,
      userName: `${member.name} (${member.role})`,
      timestamp: new Date().toISOString(),
      ipAddress: '192.168.1.100',
      status: 'success',
      method: 'Email & Password',
      deviceInfo: navigator.userAgent.substring(0, 40),
    };
    const updatedLogs = [successLog, ...auditLogs];
    setAuditLogs(updatedLogs);
    saveAuditLogs(updatedLogs);

    return { success: true };
  };

  const quickLoginAs = (memberId: string) => {
    const member = band.members.find(m => m.id === memberId);
    if (!member) return;

    setCurrentUserId(member.id);
    saveCurrentUserId(member.id);
    setIsAuthenticated(true);
    saveIsAuthenticated(true);

    const log: LoginAuditEntry = {
      id: `log-${Date.now()}`,
      userId: member.id,
      userName: `${member.name} (Quick Auth)`,
      timestamp: new Date().toISOString(),
      ipAddress: '127.0.0.1 (Local)',
      status: 'success',
      method: 'Quick Band Switcher',
      deviceInfo: 'Band Portal Session',
    };
    const updatedLogs = [log, ...auditLogs];
    setAuditLogs(updatedLogs);
    saveAuditLogs(updatedLogs);
  };

  const logout = () => {
    setIsAuthenticated(false);
    saveIsAuthenticated(false);
  };

  const registerUser = (data: Omit<BandMember, 'id' | 'status'> & { password: string }): AuthResponse => {
    const exists = band.members.some(m => m.email.toLowerCase() === data.email.trim().toLowerCase());
    if (exists) {
      return { success: false, message: 'A band member with this email address already exists.' };
    }

    const newMemberId = `mem-${Date.now()}`;
    const newMember: BandMember = {
      ...data,
      id: newMemberId,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      notifications: {
        newDemos: true,
        newVersions: true,
        lyricEdits: true,
        practiceReminders: true,
        comments: true,
      },
    };

    const updatedMembers = [...band.members, newMember];
    const updatedBand = { ...band, members: updatedMembers };
    setBand(updatedBand);
    saveBandProfile(updatedBand);

    setCurrentUserId(newMemberId);
    saveCurrentUserId(newMemberId);
    setIsAuthenticated(true);
    saveIsAuthenticated(true);

    const log: LoginAuditEntry = {
      id: `log-${Date.now()}`,
      userId: newMemberId,
      userName: `${newMember.name} (Registered)`,
      timestamp: new Date().toISOString(),
      ipAddress: '192.168.1.100',
      status: 'success',
      method: 'New Registration',
      deviceInfo: navigator.userAgent.substring(0, 40),
    };
    const updatedLogs = [log, ...auditLogs];
    setAuditLogs(updatedLogs);
    saveAuditLogs(updatedLogs);

    return { success: true };
  };

  const switchUser = (memberId: string) => {
    setCurrentUserId(memberId);
    saveCurrentUserId(memberId);
  };

  const updateUserRole = (memberId: string, newRole: Role) => {
    if (!permissions.canManageMembers && currentUser.id !== memberId) {
      alert('Only Band Leaders can manage roles.');
      return;
    }
    const updatedMembers = band.members.map(m => (m.id === memberId ? { ...m, role: newRole } : m));
    const updatedBand = { ...band, members: updatedMembers };
    setBand(updatedBand);
    saveBandProfile(updatedBand);
  };

  const updateUserStatus = (memberId: string, status: UserStatus) => {
    if (!permissions.canManageMembers) {
      alert('Only Band Leaders can update account status.');
      return;
    }
    const updatedMembers = band.members.map(m => (m.id === memberId ? { ...m, status } : m));
    const updatedBand = { ...band, members: updatedMembers };
    setBand(updatedBand);
    saveBandProfile(updatedBand);
  };

  const updateUserProfile = (userId: string, updates: Partial<BandMember>) => {
    const updatedMembers = band.members.map(m => {
      if (m.id === userId) {
        return { ...m, ...updates };
      }
      return m;
    });
    const updatedBand = { ...band, members: updatedMembers };
    setBand(updatedBand);
    saveBandProfile(updatedBand);
  };

  const deleteUserAccount = (userId: string) => {
    if (!permissions.canManageMembers && currentUser.id !== userId) {
      alert('Only Band Leaders can delete member accounts.');
      return;
    }
    if (band.members.length <= 1) {
      alert('Cannot delete the only member in the band.');
      return;
    }
    const updatedMembers = band.members.filter(m => m.id !== userId);
    const updatedBand = { ...band, members: updatedMembers };
    setBand(updatedBand);
    saveBandProfile(updatedBand);

    if (currentUserId === userId) {
      const nextUser = updatedMembers[0];
      setCurrentUserId(nextUser.id);
      saveCurrentUserId(nextUser.id);
    }
  };

  const updateAuthSettings = (settings: AuthSettings) => {
    setAuthSettings(settings);
    saveAuthSettings(settings);
  };

  const clearAuditLogs = () => {
    setAuditLogs([]);
    saveAuditLogs([]);
  };

  const updateAppSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...appSettings, ...newSettings };
    setAppSettings(updated);
    saveAppSettings(updated);
  };

  const updateSmtpSettings = (settings: SmtpSettings) => {
    setSmtpSettings(settings);
    saveSmtpSettings(settings);
  };

  const clearEmailLogs = () => {
    setEmailLogs([]);
    saveEmailLogs([]);
  };

  const sendTestEmail = async (toEmail: string, templateType: string = 'test_probe') => {
    const dummyRecipient: BandMember = {
      id: 'test-recip',
      name: currentUser.name,
      email: toEmail,
      role: currentUser.role,
      status: 'active',
      instrument: currentUser.instrument,
      avatar: currentUser.avatar,
    };

    const html = buildBandEmailHtml({
      band,
      title: 'BandJam SMTP Diagnostic Probe',
      badge: 'SMTP Probe Successful',
      headline: 'Your SMTP Notification System is Ready!',
      bodyText: `This diagnostic probe was dispatched from your BandJam Admin & Settings console.\n\nAutomated email notifications are configured to keep the band in sync whenever song ideas, audio takes, lyrics, or practice schedules are updated.`,
      details: [
        { label: 'SMTP Host', value: smtpSettings.host || 'smtp.custom' },
        { label: 'Port & Encryption', value: `${smtpSettings.port} (${smtpSettings.encryption.toUpperCase()})` },
        { label: 'Sender From', value: `"${smtpSettings.fromName}" <${smtpSettings.fromEmail}>` },
        { label: 'Recipient Probe', value: toEmail },
        { label: 'Dispatched At', value: new Date().toLocaleString() },
      ],
      actionLabel: 'Open BandJam App',
      actionUrl: '#',
    });

    try {
      const log = await sendBandNotification({
        recipient: dummyRecipient,
        subject: `[${band.name}] SMTP Diagnostic Test Probe (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
        eventType: 'test_probe',
        htmlContent: html,
        smtpSettings,
      });

      setEmailLogs(prev => {
        const updated = [log, ...prev];
        saveEmailLogs(updated);
        return updated;
      });

      if (log.status === 'failed') {
        return {
          success: false,
          message: log.errorMessage || 'Failed to deliver test email. Check your SMTP host, port, and credentials.',
          log,
        };
      }

      return {
        success: true,
        message: log.status === 'sent'
          ? `Test email sent successfully via ${smtpSettings.host} to ${toEmail}!`
          : `Test email dispatched to band outbox log for ${toEmail}. (Live relay active when backend SMTP server is online).`,
        log,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Error executing SMTP test.',
      };
    }
  };

  const resendEmail = async (logId: string) => {
    const existing = emailLogs.find(l => l.id === logId);
    if (!existing) return { success: false, message: 'Email log not found.' };

    const dummyRecipient: BandMember = {
      id: 'resend-recip',
      name: existing.recipientName,
      email: existing.recipientEmail,
      role: 'member',
      status: 'active',
      instrument: '',
      avatar: '',
    };

    const newLog = await sendBandNotification({
      recipient: dummyRecipient,
      subject: `[Resent] ${existing.subject}`,
      eventType: existing.eventType,
      htmlContent: existing.htmlContent,
      smtpSettings,
    });

    setEmailLogs(prev => {
      const updated = [newLog, ...prev];
      saveEmailLogs(updated);
      return updated;
    });

    return {
      success: newLog.status !== 'failed',
      message: newLog.status === 'sent'
        ? `Email successfully resent to ${existing.recipientEmail}!`
        : `Email queued and dispatched to outbox for ${existing.recipientEmail}.`,
    };
  };

  const updateBandName = (name: string, motto?: string, genre?: string, foundedYear?: string) => {
    const updatedBand: BandProfile = {
      ...band,
      name: name.trim() || band.name,
      motto: motto !== undefined ? motto : band.motto,
      genre: genre !== undefined ? genre : band.genre,
      foundedYear: foundedYear !== undefined ? foundedYear : band.foundedYear,
    };
    setBand(updatedBand);
    saveBandProfile(updatedBand);
  };

  const addSongIdea = async (
    songData: Omit<SongIdea, 'id' | 'createdAt' | 'createdBy' | 'activeVersionId'>,
    audioFile?: File | Blob
  ): Promise<SongIdea> => {
    const songId = `song-${Date.now()}`;
    const versionId = `v-${Date.now()}-1`;

    let audioUrl = '';
    let duration = 14;
    let format = 'audio/wav';
    let fileSize = '2.1 MB';

    if (audioFile) {
      audioUrl = URL.createObjectURL(audioFile);
      format = audioFile.type || 'audio/wav';
      fileSize = `${(audioFile.size / (1024 * 1024)).toFixed(1)} MB`;
      try {
        const tempAudio = new Audio(audioUrl);
        await new Promise(resolve => {
          tempAudio.onloadedmetadata = () => {
            if (tempAudio.duration && !isNaN(tempAudio.duration) && tempAudio.duration !== Infinity) {
              duration = Math.round(tempAudio.duration);
            }
            resolve(true);
          };
          tempAudio.onerror = () => resolve(true);
          setTimeout(resolve, 1200);
        });
      } catch (e) {
        console.warn('Could not determine audio duration', e);
      }
    } else {
      const demoType = songData.category === 'bass' ? 'bass' :
        songData.category === 'riff' ? 'riff' :
        songData.category === 'chorus' ? 'chorus' : 'idea';
      const synth = await createSynthesizedAudioDemo(demoType, 14);
      audioUrl = synth.blobUrl;
      duration = synth.duration;
    }

    const initialVersion: AudioVersion = {
      id: versionId,
      versionNumber: 1,
      label: 'v1 - Initial Demo',
      audioUrl,
      duration,
      uploadedBy: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
      },
      uploadedAt: new Date().toISOString(),
      notes: songData.description || 'Initial recorded demo take.',
      fileSize,
      format,
      waveformSamples: songData.versions?.[0]?.waveformSamples || Array.from({ length: 48 }, () => Math.random() * 0.7 + 0.2),
    };

    const newSong: SongIdea = {
      ...songData,
      id: songId,
      activeVersionId: versionId,
      versions: [initialVersion],
      createdAt: new Date().toISOString(),
      createdBy: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
      },
    };

    const updatedSongs = [newSong, ...songs];
    setSongs(updatedSongs);
    saveSongs(updatedSongs);

    // Trigger SMTP email notifications if enabled
    if (smtpSettings.isEnabled && smtpSettings.notificationTriggers.newDemos) {
      const recipients = band.members.filter(m => m.id !== currentUser.id && m.status === 'active');
      for (const member of recipients) {
        if (member.notifications?.newDemos !== false) {
          const html = buildBandEmailHtml({
            band,
            title: `New Demo Uploaded: ${newSong.title}`,
            badge: 'New Demo Sketch',
            headline: `${currentUser.name} uploaded a new song demo!`,
            bodyText: `A fresh musical idea has been uploaded to the band vault. Give it a listen, review the tempo and chords, and add your feedback or record a new take.`,
            details: [
              { label: 'Track Title', value: newSong.title },
              { label: 'Category', value: newSong.category.toUpperCase() },
              { label: 'Tempo', value: newSong.bpm ? `${newSong.bpm} BPM` : 'Unspecified' },
              { label: 'Key', value: newSong.musicalKey || 'Standard' },
              { label: 'Uploaded By', value: currentUser.name },
            ],
            actionLabel: 'Listen in Demo Vault',
            actionUrl: '#',
          });

          sendBandNotification({
            recipient: member,
            subject: `[${band.name} Vault] New Demo: ${newSong.title}`,
            eventType: 'new_demo',
            htmlContent: html,
            smtpSettings,
          }).then(log => {
            setEmailLogs(prev => {
              const updated = [log, ...prev];
              saveEmailLogs(updated);
              return updated;
            });
          });
        }
      }
    }

    return newSong;
  };

  const addSongVersion = async (
    songId: string,
    versionData: Omit<AudioVersion, 'id' | 'versionNumber' | 'uploadedAt' | 'uploadedBy'>,
    audioFile?: File | Blob
  ) => {
    const song = songs.find(s => s.id === songId);
    if (!song) return;

    const nextVerNumber = song.versions.length + 1;
    const versionId = `v-${Date.now()}-${nextVerNumber}`;

    let audioUrl = versionData.audioUrl;
    let duration = versionData.duration || 15;
    let format = versionData.format || 'audio/wav';
    let fileSize = versionData.fileSize || '2.0 MB';

    if (audioFile) {
      audioUrl = URL.createObjectURL(audioFile);
      format = audioFile.type || 'audio/wav';
      fileSize = `${(audioFile.size / (1024 * 1024)).toFixed(1)} MB`;
      try {
        const tempAudio = new Audio(audioUrl);
        await new Promise(resolve => {
          tempAudio.onloadedmetadata = () => {
            if (tempAudio.duration && !isNaN(tempAudio.duration) && tempAudio.duration !== Infinity) {
              duration = Math.round(tempAudio.duration);
            }
            resolve(true);
          };
          tempAudio.onerror = () => resolve(true);
          setTimeout(resolve, 1000);
        });
      } catch (e) {
        console.warn('Audio check error', e);
      }
    } else if (!audioUrl) {
      const demoType = song.category === 'bass' ? 'bass' :
        song.category === 'riff' ? 'riff' :
        song.category === 'chorus' ? 'chorus' : 'idea';
      const synth = await createSynthesizedAudioDemo(demoType, 14);
      audioUrl = synth.blobUrl;
      duration = synth.duration;
    }

    const newVersion: AudioVersion = {
      ...versionData,
      id: versionId,
      versionNumber: nextVerNumber,
      audioUrl,
      duration,
      format,
      fileSize,
      uploadedBy: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
      },
      uploadedAt: new Date().toISOString(),
      waveformSamples: versionData.waveformSamples || Array.from({ length: 48 }, () => Math.random() * 0.7 + 0.2),
    };

    const updated = songs.map(s => {
      if (s.id === songId) {
        return {
          ...s,
          activeVersionId: versionId,
          versions: [...s.versions, newVersion],
        };
      }
      return s;
    });

    setSongs(updated);
    saveSongs(updated);

    // Trigger SMTP email notifications for new take / version if enabled
    if (smtpSettings.isEnabled && smtpSettings.notificationTriggers.newVersions) {
      const recipients = band.members.filter(m => m.id !== currentUser.id && m.status === 'active');
      for (const member of recipients) {
        if (member.notifications?.newVersions !== false) {
          const html = buildBandEmailHtml({
            band,
            title: `New Audio Take Added: ${song.title} (${newVersion.label})`,
            badge: 'New Audio Take',
            headline: `${currentUser.name} uploaded a new take for "${song.title}"`,
            bodyText: `A new version (${newVersion.label}) has been added to the track. Audition it now to compare with previous takes.`,
            details: [
              { label: 'Song Idea', value: song.title },
              { label: 'Take Version', value: newVersion.label },
              { label: 'Duration', value: `${newVersion.duration}s` },
              { label: 'Notes', value: newVersion.notes || 'No take notes provided' },
              { label: 'Recorded By', value: currentUser.name },
            ],
            actionLabel: 'Audition Take',
            actionUrl: '#',
          });

          sendBandNotification({
            recipient: member,
            subject: `[${band.name}] New Take: ${song.title} (${newVersion.label})`,
            eventType: 'new_version',
            htmlContent: html,
            smtpSettings,
          }).then(log => {
            setEmailLogs(prev => {
              const updatedLog = [log, ...prev];
              saveEmailLogs(updatedLog);
              return updatedLog;
            });
          });
        }
      }
    }
  };

  const setActiveVersion = (songId: string, versionId: string) => {
    const updated = songs.map(s => {
      if (s.id === songId) {
        return { ...s, activeVersionId: versionId };
      }
      return s;
    });
    setSongs(updated);
    saveSongs(updated);
  };

  const updateLyrics = (songId: string, draft: string, chordsSheet?: string) => {
    const song = songs.find(s => s.id === songId);

    const updated = songs.map(s => {
      if (s.id === songId) {
        return {
          ...s,
          lyrics: {
            draft,
            chordsSheet: chordsSheet !== undefined ? chordsSheet : s.lyrics.chordsSheet,
            lastEditedBy: currentUser.name,
            lastEditedAt: new Date().toISOString(),
            versionNumber: (s.lyrics.versionNumber || 1) + 1,
          },
        };
      }
      return s;
    });
    setSongs(updated);
    saveSongs(updated);

    // Trigger SMTP email notifications for lyrics update
    if (song && smtpSettings.isEnabled && smtpSettings.notificationTriggers.lyricEdits) {
      const recipients = band.members.filter(m => m.id !== currentUser.id && m.status === 'active');
      for (const member of recipients) {
        if (member.notifications?.lyricEdits !== false) {
          const previewText = draft.substring(0, 140).trim() + (draft.length > 140 ? '...' : '');
          const html = buildBandEmailHtml({
            band,
            title: `Lyrics Draft Updated: ${song.title}`,
            badge: 'Lyric Draft Edit',
            headline: `${currentUser.name} updated the lyrics/chords for "${song.title}"`,
            bodyText: `The songwriting draft and chord progression have been revised in the Lyrics Studio.`,
            details: [
              { label: 'Song', value: song.title },
              { label: 'Edited By', value: currentUser.name },
              { label: 'Draft Preview', value: previewText || '(Empty lyrics draft)' },
            ],
            actionLabel: 'Open Lyrics Studio',
            actionUrl: '#',
          });

          sendBandNotification({
            recipient: member,
            subject: `[${band.name} Lyrics] Updated Draft: ${song.title}`,
            eventType: 'lyric_edit',
            htmlContent: html,
            smtpSettings,
          }).then(log => {
            setEmailLogs(prev => {
              const updatedLog = [log, ...prev];
              saveEmailLogs(updatedLog);
              return updatedLog;
            });
          });
        }
      }
    }
  };

  const addComment = (songId: string, text: string, timestampSeconds?: number) => {
    const song = songs.find(s => s.id === songId);
    const newComment: SongComment = {
      id: `c-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      text: text.trim(),
      timestampSeconds,
      createdAt: new Date().toISOString(),
    };

    const updated = songs.map(s => {
      if (s.id === songId) {
        return {
          ...s,
          comments: [...s.comments, newComment],
        };
      }
      return s;
    });
    setSongs(updated);
    saveSongs(updated);

    // Trigger SMTP email notification for new comment
    if (song && smtpSettings.isEnabled && smtpSettings.notificationTriggers.comments) {
      const recipients = band.members.filter(m => m.id !== currentUser.id && m.status === 'active');
      for (const member of recipients) {
        if (member.notifications?.comments !== false) {
          const timeBadge = timestampSeconds !== undefined ? ` at ${Math.floor(timestampSeconds / 60)}:${(timestampSeconds % 60).toString().padStart(2, '0')}` : '';
          const html = buildBandEmailHtml({
            band,
            title: `New Comment on ${song.title}`,
            badge: 'Track Feedback',
            headline: `${currentUser.name} commented on "${song.title}"${timeBadge}`,
            bodyText: `A new feedback comment was added to the audio timeline: "${text.trim()}"`,
            details: [
              { label: 'Track', value: song.title },
              { label: 'Commenter', value: currentUser.name },
              { label: 'Timeline Marker', value: timestampSeconds !== undefined ? `${timestampSeconds}s` : 'General Feedback' },
            ],
            actionLabel: 'View in Vault',
            actionUrl: '#',
          });

          sendBandNotification({
            recipient: member,
            subject: `[${band.name} Feedback] ${currentUser.name} on ${song.title}`,
            eventType: 'comment',
            htmlContent: html,
            smtpSettings,
          }).then(log => {
            setEmailLogs(prev => {
              const updatedLog = [log, ...prev];
              saveEmailLogs(updatedLog);
              return updatedLog;
            });
          });
        }
      }
    }
  };

  const deleteSong = (songId: string) => {
    if (!permissions.canDeleteTracks) {
      alert('Only Band Leaders have permission to delete song ideas.');
      return;
    }
    const updated = songs.filter(s => s.id !== songId);
    setSongs(updated);
    saveSongs(updated);
  };

  const addPracticeSession = (sessionData: Omit<PracticeSession, 'id' | 'createdAt' | 'createdBy' | 'rsvps'>) => {
    const newPractice: PracticeSession = {
      ...sessionData,
      id: `prac-${Date.now()}`,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.name,
      rsvps: [
        {
          userId: currentUser.id,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          status: 'attending',
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    const updated = [newPractice, ...practices];
    setPractices(updated);
    savePractices(updated);

    // Trigger SMTP email notifications for practice schedule
    if (smtpSettings.isEnabled && smtpSettings.notificationTriggers.practiceSchedule) {
      const recipients = band.members.filter(m => m.id !== currentUser.id && m.status === 'active');
      for (const member of recipients) {
        if (member.notifications?.practiceReminders !== false) {
          const html = buildBandEmailHtml({
            band,
            title: `Practice Scheduled: ${newPractice.title}`,
            badge: 'Rehearsal Notice',
            headline: `New Practice Scheduled for ${newPractice.date}`,
            bodyText: `Mark your calendar! ${currentUser.name} scheduled a rehearsal session. Please check the setlist and confirm your attendance in the app.`,
            details: [
              { label: 'Session', value: newPractice.title },
              { label: 'Date', value: newPractice.date },
              { label: 'Time', value: `${newPractice.startTime} – ${newPractice.endTime}` },
              { label: 'Location', value: newPractice.location },
              { label: 'Goals', value: newPractice.goals.join(', ') || 'Run full set' },
            ],
            actionLabel: 'Confirm RSVP',
            actionUrl: '#',
          });

          sendBandNotification({
            recipient: member,
            subject: `[${band.name} Practice] ${newPractice.title} on ${newPractice.date}`,
            eventType: 'practice_schedule',
            htmlContent: html,
            smtpSettings,
          }).then(log => {
            setEmailLogs(prev => {
              const updatedLog = [log, ...prev];
              saveEmailLogs(updatedLog);
              return updatedLog;
            });
          });
        }
      }
    }
  };

  const updateRsvp = (practiceId: string, status: 'attending' | 'tentative' | 'declined') => {
    const updated = practices.map(p => {
      if (p.id === practiceId) {
        const otherRsvps = p.rsvps.filter(r => r.userId !== currentUser.id);
        const myRsvp = {
          userId: currentUser.id,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          status,
          updatedAt: new Date().toISOString(),
        };
        return {
          ...p,
          rsvps: [...otherRsvps, myRsvp],
        };
      }
      return p;
    });
    setPractices(updated);
    savePractices(updated);
  };

  const deletePracticeSession = (practiceId: string) => {
    const updated = practices.filter(p => p.id !== practiceId);
    setPractices(updated);
    savePractices(updated);
  };

  const addBandMember = (memberData: Omit<BandMember, 'id'>) => {
    const newMember: BandMember = {
      ...memberData,
      id: `mem-${Date.now()}`,
      status: 'active',
      password: memberData.password || 'password123',
      createdAt: new Date().toISOString(),
    };
    const updatedMembers = [...band.members, newMember];
    const updatedBand = { ...band, members: updatedMembers };
    setBand(updatedBand);
    saveBandProfile(updatedBand);
  };

  return (
    <BandContext.Provider
      value={{
        band,
        currentUser,
        permissions,
        songs,
        practices,
        isAudioInitialized,
        isAuthenticated,
        authSettings,
        auditLogs,
        appSettings,
        smtpSettings,
        emailLogs,
        updateAppSettings,
        updateSmtpSettings,
        sendTestEmail,
        resendEmail,
        clearEmailLogs,
        login,
        quickLoginAs,
        logout,
        registerUser,
        switchUser,
        updateUserRole,
        updateUserStatus,
        updateUserProfile,
        deleteUserAccount,
        updateAuthSettings,
        clearAuditLogs,
        updateBandName,
        addSongIdea,
        addSongVersion,
        updateLyrics,
        addComment,
        deleteSong,
        setActiveVersion,
        addPracticeSession,
        updateRsvp,
        deletePracticeSession,
        addBandMember,
      }}
    >
      {children}
    </BandContext.Provider>
  );
};

export const useBand = () => {
  const context = useContext(BandContext);
  if (!context) {
    throw new Error('useBand must be used within a BandProvider');
  }
  return context;
};
