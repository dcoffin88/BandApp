import React from 'react';
import { SongDocumentStudioView } from './SongDocumentStudioView.tsx';

interface ChordsStudioViewProps {
  initialSongId?: string;
}

export const ChordsStudioView: React.FC<ChordsStudioViewProps> = ({
  initialSongId,
}) => (
  <SongDocumentStudioView mode="chords" initialSongId={initialSongId} />
);
