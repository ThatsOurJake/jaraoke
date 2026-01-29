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
import { TrackList } from '../track-list';
import { getSettings } from '../../utils/settings';

interface SongPanelProps {
  selectedSong?: CombinedJaraokeFiles;
}

export const SongPanel = ({ selectedSong }: SongPanelProps) => {
  const settings = getSettings();
  const { metadata } = selectedSong || {};
  const tracks = Object.hasOwn(selectedSong || {}, 'tracks')
    ? (selectedSong as JaraokeFile).tracks
    : [];
  const volumeOverrides = useRef<VolumeOverride[]>([]);

  const onTrackToggle = (fileName: string, checked: boolean) => {
    const index = volumeOverrides.current?.findIndex(
      (x) => x.trackFileName === fileName,
    );
    const volume = checked ? 1 : 0;

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

    if (settings.player === 'web') {
      localStorage.setItem(SONG_STORAGE_KEY, JSON.stringify(playPayload));
      location.href = '/play';
    } else {
      try {
        const req = await fetch('/api/play', {
          body: JSON.stringify(playPayload),
          headers: {
            'content-type': 'application/json',
          },
          method: 'POST',
        });

        if (req.status !== 202) {
          throw new Error(`Status is not 202 - ${req.status}`);
        }
      } catch (err) {
        // TODO front end to backend logging
        console.error(err);
      }
    }
  }, [selectedSong]);

  const imgSrc = selectedSong?.coverPhoto || PLACEHOLDER_ALBUM_COVER;

  return (
    <div className="bg-white rounded w-full h-full p-2 flex flex-col border-2 drop-shadow">
      {!selectedSong && (
        <div className="w-full h-full flex flex-col justify-center items-center gap-y-2">
          <div className="h-14 w-14">
            <MicrophoneIcon />
          </div>
          <p className="w-1/2 text-center">
            Which song would you like to sing today?
          </p>
        </div>
      )}
      {selectedSong && (
        <>
          <div className="h-1/4 py-2">
            <img
              src={imgSrc}
              alt="placeholder album"
              className="h-full aspect-square border-2 mx-auto"
            />
          </div>
          <div className="grow flex flex-col p-2">
            <p className="text-center">{metadata?.title}</p>
            <p className="text-center text-sm">
              {metadata?.artist || 'Unknown'} - {metadata?.year || 'Unknown'}
            </p>
            {metadata?.duration && metadata.duration > 0 && (
              <p className="text-center text-xs">
                Duration: {formatTime(metadata.duration)}
              </p>
            )}
            {tracks.length > 1 && (
              <TrackList tracks={tracks} onChange={onTrackToggle} />
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
