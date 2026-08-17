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
}: SongListProps) => {
  if (songs.length === 0) {
    return (
      <div className="font-inter text-white text-center">
        <p className="text-2xl">There are currently no songs available.</p>
        <p className="text-xs italic">
          Check if any of your existing songs need reimporting via the settings
          screen.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {songs.map((song) => (
        <SongItem
          song={song}
          key={song.id}
          onSongSelected={onSongSelected}
          isSelected={selectedSongId === song.id}
        />
      ))}
    </div>
  );
};
