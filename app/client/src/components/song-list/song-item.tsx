import classNames from 'classnames';
import type { CombinedJaraokeFiles } from 'jaraoke-shared/types';
import { formatTime } from '../../utils/format-time';

interface SongItemProps {
  isSelected?: boolean;
  song: CombinedJaraokeFiles;
  onSongSelected: (song: CombinedJaraokeFiles) => void;
}

export const SongItem = ({
  isSelected = false,
  song,
  onSongSelected,
}: SongItemProps) => {
  const classes = classNames(
    'p-2',
    'rounded',
    'cursor-pointer',
    'flex',
    'flex-row',
    'drop-shadow',
    'justify-between',
    'border-2',
    isSelected ? 'bg-purple-200' : 'bg-white',
  );

  const {
    metadata: { title, artist, year, duration },
    id,
  } = song;

  return (
    <li className={classes} data-id={id} onClick={() => onSongSelected(song)}>
      <img
        src="/album.png"
        alt="placeholder album"
        className="h-12 aspect-square border-2"
      />
      <div className="grow px-4">
        <p>{title}</p>
        <p className="text-sm">
          {artist || 'Unknown'} - {year || 'Unknown'}
        </p>
      </div>
      <div className="flex items-center px-3">
        {duration && duration > 0 && <p>{formatTime(duration)}</p>}
      </div>
    </li>
  );
};
