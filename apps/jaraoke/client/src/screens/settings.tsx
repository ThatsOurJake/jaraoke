import type { CombinedJaraokeFiles } from 'jaraoke-shared/types';
import { useEffect, useState } from 'preact/hooks';
import { SongList } from '../components/song-list';
import { Wrapper } from '../components/wrapper';

export const SettingsScreen = () => {
  const [songs, setSongs] = useState<CombinedJaraokeFiles[]>([]);

  useEffect(() => {
    const doFetch = async () => {
      const req = await fetch('/api/songs?includeIncompatible=true');
      // TODO Validation
      const resp = await req.json();
      const fetchedSongs = resp as CombinedJaraokeFiles[];
      const filterd = fetchedSongs.filter(
        (x) => !x.isCompatibleWithCurrentVersion,
      );
      setSongs(filterd);
    };

    doFetch();
  }, []);

  const onSongClick = async (song: CombinedJaraokeFiles) => {
    const confirmed = confirm(`Reimport: ${song.metadata.title}?`);

    if (confirmed) {
      const req = await fetch(`/api/song/${song.id}/reimport`, {
        method: 'PUT',
      });

      if (req.ok) {
        alert('Accepted reimport');
      }
    }
  };

  return (
    <Wrapper>
      <div className="w-full bg-white">
        <div className="h-full flex flex-col p-2">
          <p>Outdated songs</p>
          <div className="overflow-y-auto grow">
            <SongList
              songs={songs}
              onSongSelected={onSongClick}
              selectedSongId="x"
            />
          </div>
        </div>
      </div>
    </Wrapper>
  );
};
