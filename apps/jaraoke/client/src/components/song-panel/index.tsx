import type {
  CombinedJaraokeFiles,
  JaraokeFile,
  PlayPayload,
  VolumeOverride,
} from 'jaraoke-shared/types';
import { useCallback, useEffect, useRef } from 'preact/hooks';
import { PLACEHOLDER_ALBUM_COVER, SONG_STORAGE_KEY } from '../../constants';
import { formatTime } from '../../utils/format-time';
import { NormalButton } from '../buttons/normal-btn';
import { MicrophoneIcon } from '../icons/microphone';
import { DuetSongLabel } from '../song-labels/duet';
import { DurationSongLabel } from '../song-labels/duration';
import { TrackList } from '../track-list';

interface SongPanelProps {
  selectedSong?: CombinedJaraokeFiles;
}

export const SongPanel = ({ selectedSong }: SongPanelProps) => {
  const { metadata } = selectedSong || {};
  const tracks = Object.hasOwn(selectedSong || {}, 'tracks')
    ? (selectedSong as JaraokeFile).tracks
    : [];
  const volumeOverrides = useRef<VolumeOverride[]>([]);

  const onTrackVolumeChange = (fileName: string, volume: number) => {
    const index = volumeOverrides.current?.findIndex(
      (x) => x.trackFileName === fileName,
    );

    if (index >= 0) {
      volumeOverrides.current[index].volume = volume;
    } else {
      volumeOverrides.current?.push({
        trackFileName: fileName,
        volume,
      });
    }
  };

  useEffect(() => {
    volumeOverrides.current = [];
  }, [selectedSong]);

  const onPlaySong = useCallback(async () => {
    if (!selectedSong) {
      return;
    }

    const playPayload: PlayPayload = {
      id: selectedSong.id,
      trackVolumes: volumeOverrides.current,
    };

    localStorage.setItem(SONG_STORAGE_KEY, JSON.stringify(playPayload));
    location.href = '/play';
  }, [selectedSong]);

  const imgSrc =
    selectedSong?.coverPhoto ||
    `${import.meta.env.BASE_URL}${PLACEHOLDER_ALBUM_COVER}`;

  const isJaraokeFile = (song: CombinedJaraokeFiles): song is JaraokeFile =>
    'tracks' in song;
  const isDuet =
    selectedSong &&
    isJaraokeFile(selectedSong) &&
    selectedSong.lyricsType === 'duet';

  return (
    <div className="rounded-xl w-full h-full flex flex-col border-2 shadow-2xl bg-background/60 border-black/60 text-white">
      {!selectedSong && (
        <div className="w-full h-full flex flex-col px-2 py-8 items-center gap-y-4">
          <div className="w-1/4 aspect-square">
            <MicrophoneIcon />
          </div>
          <p className="w-2/3 text-center font-bricolage">
            Which song would you like to sing today?
          </p>
        </div>
      )}
      {selectedSong && (
        <>
          <div
            className="w-full aspect-video bg-cover rounded-t-xl bg-center relative"
            style={{ backgroundImage: `url(${imgSrc})` }}
          >
            <div className="absolute inset-0 inset-shadow-sm inset-shadow-black flex flex-col justify-between p-2 bg-linear-to-b from-transparent to-black/50">
              <div className="w-full flex justify-end gap-x-1">
                {isDuet && <DuetSongLabel />}
                {metadata?.duration && metadata.duration > 0 && (
                  <DurationSongLabel duration={formatTime(metadata.duration)} />
                )}
              </div>
              <div className="flex flex-col">
                <p className="text-3xl font-bricolage font-bold drop-shadow-sm drop-shadow-purple-500">
                  {metadata?.title}
                </p>
                <p className="text-base font-inter text-white drop-shadow-sm drop-shadow-purple-500 font-semibold">
                  {metadata?.artist || 'Unknown'} -{' '}
                  {metadata?.year || 'Unknown'}
                </p>
              </div>
            </div>
          </div>
          <div className="grow flex flex-col p-2">
            {tracks.length > 1 && (
              <TrackList tracks={tracks} onChange={onTrackVolumeChange} />
            )}
          </div>
          <div className="p-2">
            <NormalButton onClick={onPlaySong}>
              <p>Lets Sing 🎤</p>
            </NormalButton>
          </div>
        </>
      )}
    </div>
  );
};
