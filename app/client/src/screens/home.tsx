import type { CombinedJaraokeFiles } from 'jaraoke-shared/types';
import { useCallback, useEffect, useState } from 'preact/hooks';

import { Loading } from '../components/loading';
import { SongList } from '../components/song-list';
import { SongPanel } from '../components/song-panel';

export const HomeScreen = () => {
  const [isLoading, setLoading] = useState<boolean>(true);
  const [songs, setSongs] = useState<CombinedJaraokeFiles[]>([]);
  const [selectedSongId, setSelectedId] = useState<string>('');
  const [selectedSong, setSelectedSong] = useState<CombinedJaraokeFiles>();

  useEffect(() => {
    const fetchSongs = async () => {
      setLoading(true);

      try {
        const req = await fetch('/api/songs');
        const resp = await req.json();
        // TODO: Validation
        const songs = resp as CombinedJaraokeFiles[];
        setSongs(songs);
      } catch (err) {
        // TODO front end to backend logger
        console.error(err);
      }

      setLoading(false);
    };

    fetchSongs();
  }, []);

  const onSongSelected = useCallback((song: CombinedJaraokeFiles) => {
    setSelectedId(song.id);
    setSelectedSong(song);
  }, []);

  if (isLoading) {
    return (
      <div className="h-full w-full">
        <div className="h-full flex justify-center items-center">
          <Loading size="lg" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-y-scroll h-full max-h-full w-1/2 px-4 py-2">
        <SongList
          songs={songs}
          onSongSelected={onSongSelected}
          selectedSongId={selectedSongId}
        />
      </div>
      <div className="w-1/2 px-4 py-2 h-full">
        <SongPanel selectedSong={selectedSong} />
      </div>
    </>
  );
};
