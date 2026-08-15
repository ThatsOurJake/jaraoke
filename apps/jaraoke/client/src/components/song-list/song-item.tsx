import classNames from 'classnames';
import type { CombinedJaraokeFiles, JaraokeFile } from 'jaraoke-shared/types';
import { PLACEHOLDER_ALBUM_COVER } from '../../constants';
import { formatTime } from '../../utils/format-time';
import { DuetSongLabel } from '../song-labels/duet';

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
    'bg-zinc-800',
    'border-2',
    'h-full',
    'w-full',
    'rounded',
    isSelected ? 'border-purple-300' : 'border-zinc-700',
  );

  const {
    metadata: { title, artist, duration },
    coverPhoto,
    id,
  } = song;

  const imgSrc =
    coverPhoto || `${import.meta.env.BASE_URL}${PLACEHOLDER_ALBUM_COVER}`;

  const isJaraokeFile = (song: CombinedJaraokeFiles): song is JaraokeFile =>
    'tracks' in song;
  const isDuet = isJaraokeFile(song) && song.lyricsType === 'duet';

  return (
    <div
      className="p-2 cursor-pointer aspect-card"
      data-id={id}
      onClick={() => onSongSelected(song)}
    >
      <div className={classes}>
        <div
          className="h-3/5 bg-cover bg-center relative rounded-t"
          style={{
            backgroundImage: `url(${imgSrc})`,
          }}
        >
          {isDuet && (
            <div className="absolute bottom-0 right-0">
              <div className="p-0.5">
                <DuetSongLabel />
              </div>
            </div>
          )}
        </div>
        <div className="p-2 h-2/5 text-white space-y-0.5 border-t-2 border-zinc-700">
          <p
            className="overflow-hidden text-ellipsis whitespace-nowrap font-bricolage font-semibold text-base xl:text-xl"
            title={title}
          >
            {title}
            {isDuet && <span className="mx-1">[Duet]</span>}
          </p>
          <p className="overflow-hidden text-ellipsis whitespace-nowrap text-sm xl:text-base font-inter">
            {artist || 'Unknown'}
          </p>
          {duration && duration > 0 && (
            <p className="text-sm xl:text-base font-inter">
              {formatTime(duration)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
