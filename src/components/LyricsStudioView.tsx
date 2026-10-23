import React from 'react';
import { SongDocumentStudioView } from './SongDocumentStudioView.tsx';

interface LyricsStudioViewProps {
  initialSongId?: string;
}

export const LyricsStudioView: React.FC<LyricsStudioViewProps> = ({
  initialSongId,
}) => (
  <SongDocumentStudioView mode="lyrics" initialSongId={initialSongId} />
);
