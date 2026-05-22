import classNames from 'classnames';
import type { CombinedJaraokeFiles, JaraokeFile } from 'jaraoke-shared/types';
import { PLACEHOLDER_ALBUM_COVER } from '../../constants';
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
    coverPhoto,
    id,
  } = song;

  const imgSrc =
    coverPhoto || `${import.meta.env.BASE_URL}${PLACEHOLDER_ALBUM_COVER}`;

  const isJaraokeFile = (song: CombinedJaraokeFiles): song is JaraokeFile =>
    'tracks' in song;

  return (
    <li className={classes} data-id={id} onClick={() => onSongSelected(song)}>
      <img
        src={imgSrc}
        alt="placeholder album"
        className="h-12 aspect-square border-2"
      />
      <div className="grow px-4 min-w-0">
        <p
          className="overflow-hidden text-ellipsis whitespace-nowrap"
          title={title}
        >
          {title}
          {isJaraokeFile(song) && song.isDuet && (
            <span className="mx-1">[Duet]</span>
          )}
        </p>
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
