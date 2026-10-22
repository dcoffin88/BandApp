import React, { useState } from 'react';
import { AdminSettingsView } from './components/AdminSettingsView.tsx';
import { AuthView } from './components/AuthView.tsx';
import { ChordsStudioView } from './components/ChordsStudioView.tsx';
import { GlobalAudioPlayer } from './components/GlobalAudioPlayer.tsx';
import { LyricsModal } from './components/LyricsModal.tsx';
import { LyricsStudioView } from './components/LyricsStudioView.tsx';
import { Navbar } from './components/Navbar.tsx';
import { NewVersionModal } from './components/NewVersionModal.tsx';
import { PracticeScheduleView } from './components/PracticeScheduleView.tsx';
import { ProfileSettingsView } from './components/ProfileSettingsView.tsx';
import { SongListMainView } from './components/SongListMainView.tsx';
import { TabsStudioView } from './components/TabsStudioView.tsx';
import { UploadDemoModal } from './components/UploadDemoModal.tsx';
import { AudioPlayerProvider, useAudioPlayer } from './context/AudioPlayerContext.tsx';
import { BandProvider, useBand } from './context/BandContext.tsx';
import { AppTab, SongIdea } from './types/band.ts';

const AppContent: React.FC = () => {
  const { isAuthenticated, currentUser } = useBand();
  const [activeTab, setActiveTab] = useState<AppTab>('songs');
  const [adminSubTab, setAdminSubTab] = useState<'users' | 'auth' | 'app' | 'smtp'>('app');

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [lyricsModalSong, setLyricsModalSong] = useState<SongIdea | null>(null);
  const [newVersionModalSong, setNewVersionModalSong] = useState<SongIdea | null>(null);
  const [lyricsStudioSongId, setLyricsStudioSongId] = useState('');
  const [tabsStudioSongId, setTabsStudioSongId] = useState('');
  const [chordsStudioSongId, setChordsStudioSongId] = useState('');

  const { currentSong } = useAudioPlayer();

  // If user is logged out, show the Auth screen
  if (!isAuthenticated) {
    return <AuthView />;
  }

  const handleSelectAdminSubTab = (subTab: 'users' | 'auth' | 'app' | 'smtp') => {
    setAdminSubTab(subTab);
    setActiveTab('admin');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onSelectAdminSubTab={handleSelectAdminSubTab}
      />

      {/* Main Container */}
      <main className={`flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 ${
        currentSong ? 'pb-32' : 'pb-16'
      }`}>
        {activeTab === 'songs' && (
          <SongListMainView
            onOpenUploadModal={() => setIsUploadModalOpen(true)}
            onOpenLyricsModal={(song) => setLyricsModalSong(song)}
            onOpenTabsStudio={(song) => {
              setTabsStudioSongId(song.id);
              setActiveTab('tabs');
            }}
            onOpenChordsStudio={(song) => {
              setChordsStudioSongId(song.id);
              setActiveTab('chords');
            }}
            onOpenNewVersionModal={(song) => setNewVersionModalSong(song)}
          />
        )}

        {activeTab === 'lyrics' && (
          <LyricsStudioView initialSongId={lyricsStudioSongId} />
        )}

        {activeTab === 'chords' && (
          <ChordsStudioView initialSongId={chordsStudioSongId} />
        )}

        {activeTab === 'tabs' && (
          <TabsStudioView initialSongId={tabsStudioSongId} />
        )}

        {activeTab === 'practice' && <PracticeScheduleView />}

        {activeTab === 'profile' && <ProfileSettingsView />}

        {activeTab === 'admin' && currentUser.role === 'admin' && (
          <AdminSettingsView
            key={adminSubTab}
            initialTab={adminSubTab}
          />
        )}
      </main>

      {/* Persistent Bottom Audio Player Bar */}
      <GlobalAudioPlayer
        onOpenLyrics={(song) => {
          setLyricsStudioSongId(song.id);
          setActiveTab('lyrics');
        }}
        onOpenChords={(song) => {
          setChordsStudioSongId(song.id);
          setActiveTab('chords');
        }}
        onOpenTabs={(song) => {
          setTabsStudioSongId(song.id);
          setActiveTab('tabs');
        }}
      />

      {/* Modals */}
      {isUploadModalOpen && <UploadDemoModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />}

      <LyricsModal
        song={lyricsModalSong}
        isOpen={!!lyricsModalSong}
        onClose={() => setLyricsModalSong(null)}
      />

      {newVersionModalSong && <NewVersionModal
        song={newVersionModalSong}
        isOpen={!!newVersionModalSong}
        onClose={() => setNewVersionModalSong(null)}
      />}
    </div>
  );
};

const SessionContent: React.FC = () => {
  const { currentUser, isAuthenticated } = useBand();
  return <AudioPlayerProvider key={isAuthenticated ? currentUser.id : 'signed-out'}><AppContent /></AudioPlayerProvider>;
};
export default function App() {
  return (
    <BandProvider>
      <SessionContent />
    </BandProvider>
  );
}
