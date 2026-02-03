import type {
  CombinedJaraokeFiles,
  JaraokeCDGFile,
  JaraokeFile,
  PlayPayload,
  VolumeOverride,
} from 'jaraoke-shared/types';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { Loading } from '../components/loading';
import { MainPlayer } from '../components/players/main';
import { VideoPlayer } from '../components/players/video';
import { SONG_STORAGE_KEY } from '../constants';
import { KaraokeEvent } from '../events/karaoke-event';

export const PlayerScreen = () => {
  const [selectedSong, setSelectedSong] = useState<CombinedJaraokeFiles>();
  const [trackVolumes, setTrackVolumes] = useState<VolumeOverride[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [songType, setSongType] = useState<'video' | 'other'>();

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
      setSongType(Object.hasOwn(data, 'video') ? 'video' : 'other');
      setSelectedSong(data);
    };

    getSong();
    setTrackVolumes(parsedStoredSong.trackVolumes || []);
  }, []);

  const onPlayerLoaded = useCallback(() => {
    setTimeout(() => {
      setLoading(false);
      window.dispatchEvent(new KaraokeEvent('start'));
    }, 500);
  }, []);

  return (
    <div className="relative">
      <div
        className={`${loading ? 'block' : 'hidden'} fixed top-0 left-0 right-0 bottom-0 z-80`}
      >
        <div className="w-full h-full flex flex-col justify-center items-center bg-black">
          <Loading size="lg" />
          <p className="font-bold text-white my-2">Loading Track</p>
        </div>
      </div>
      {songType === 'video' && (
        <VideoPlayer
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
