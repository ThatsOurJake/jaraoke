import type { CombinedJaraokeFiles } from 'jaraoke-shared/types';
import { useCallback } from 'preact/hooks';
import { TypeChip } from './type-chip';

interface OutdatedSongItemProps {
  song: CombinedJaraokeFiles;
  onClick: (song: CombinedJaraokeFiles) => void;
}

export const OutdatedSongItem = ({ song, onClick }: OutdatedSongItemProps) => {
  const {
    id,
    type,
    metadata: { title, artist },
  } = song;

  const _onClick = useCallback(() => onClick(song), [id]);

  return (
    <div
      onClick={_onClick}
      className="w-full border rounded-sm p-2 cursor-pointer border-indigo-200 bg-background-secondary/60 font-inter space-y-1"
    >
      <p>{title}</p>
      <p className="text-sm">{artist || 'Unknown'}</p>
      <TypeChip type={type} />
    </div>
  );
};
