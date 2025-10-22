import type { CombinedJaraokeFiles } from 'jaraoke-shared/types';
import { SongItem } from './song-item';

interface SongListProps {
  songs: CombinedJaraokeFiles[];
  onSongSelected: (song: CombinedJaraokeFiles) => void;
  selectedSongId: string;
}

export const SongList = ({
  songs,
  onSongSelected,
  selectedSongId,
}: SongListProps) => (
  <ul className="w-full flex gap-y-4 flex-col">
    {songs.map((song) => (
      <SongItem
        song={song}
        key={song.id}
        onSongSelected={onSongSelected}
        isSelected={selectedSongId === song.id}
      />
    ))}
  </ul>
);
