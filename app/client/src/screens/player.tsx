import type {
  CombinedJaraokeFiles,
  JaraokeCDGFile,
  JaraokeFile,
  PlayPayload,
  VolumeOverride,
} from 'jaraoke-shared/types';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { CDGPlayer } from '../components/players/cdg';
import { MainPlayer } from '../components/players/main';
import { SONG_STORAGE_KEY } from '../constants';

export const PlayerScreen = () => {
  const [selectedSong, setSelectedSong] = useState<CombinedJaraokeFiles>();
  const [trackVolumes, setTrackVolumes] = useState<VolumeOverride[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [songType, setSongType] = useState<'cdg' | 'other'>();

  useEffect(() => {
    const storedSong = localStorage.getItem(SONG_STORAGE_KEY) as string | null;

    if (!storedSong) {
      console.warn('Song is not stored in localstorage');
      return;
    }

    const parsedStoredSong = JSON.parse(storedSong) as PlayPayload;

    if (!parsedStoredSong.id) {
      console.warn('Song is localstorage does not have an id');
      return;
    }

    const getSong = async () => {
      const res = await fetch(`/api/song/${parsedStoredSong.id}`);
      const data = (await res.json()) as CombinedJaraokeFiles;
      setSongType(Object.hasOwn(data, 'video') ? 'cdg' : 'other');
      setSelectedSong(data);
    };

    getSong();
    setTrackVolumes(parsedStoredSong.trackVolumes || []);
  }, []);

  const onPlayerLoaded = useCallback(() => {}, []);

  return (
    <div>
      {songType === 'cdg' && (
        <CDGPlayer
          song={selectedSong as JaraokeCDGFile}
          onLoadingFinished={onPlayerLoaded}
        />
      )}
      {songType === 'other' && (
        <MainPlayer
          song={selectedSong as JaraokeFile}
          onLoadingFinished={onPlayerLoaded}
          trackVolumes={trackVolumes}
        />
      )}
    </div>
  );
};
