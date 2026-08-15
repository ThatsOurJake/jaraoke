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
  <>
    <div className="grid grid-cols-4 xl:grid-cols-8">
      {songs.map((song) => (
        <SongItem
          song={song}
          key={song.id}
          onSongSelected={onSongSelected}
          isSelected={selectedSongId === song.id}
        />
      ))}
    </div>
  </>
);
