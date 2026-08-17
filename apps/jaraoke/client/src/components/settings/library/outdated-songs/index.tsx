import type { CombinedJaraokeFiles } from 'jaraoke-shared/types';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { Loading } from '../../../loading';
import { useConfirmationModal } from '../../../modals/use-confirmation-modal';
import { OutdatedSongItem } from './song-item';
import { OutdatedSongsWrapper } from './wrapper';

// TODO: Highlight when songs cannot be reimported due to "keep original files being off"
export const OutdatedSongs = () => {
  const [songs, setSongs] = useState<CombinedJaraokeFiles[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { showModal } = useConfirmationModal();

  useEffect(() => {
    const doFetch = async () => {
      setLoading(true);

      try {
        const req = await fetch('/api/songs?includeIncompatible=true');
        // TODO Validation
        const resp = await req.json();
        const fetchedSongs = resp as CombinedJaraokeFiles[];
        const filterd = fetchedSongs.filter(
          (x) => !x.isCompatibleWithCurrentVersion,
        );
        setSongs(filterd);
      } catch (err) {
        // todo better error handling
        console.error(err);
      }

      setLoading(false);
    };

    doFetch();
  }, []);

  const onSongClick = useCallback(
    async (song: CombinedJaraokeFiles) => {
      const confirmed = await showModal(`Reimport "${song.metadata.title}"?`);

      if (confirmed) {
        const req = await fetch(`/api/song/${song.id}/reimport`, {
          method: 'PUT',
        });

        if (req.ok) {
          setSongs(songs.filter((s) => s.id !== song.id));
        }
      }
    },
    [songs],
  );

  if (loading) {
    return (
      <OutdatedSongsWrapper>
        <div className="p-1 text-center">
          <Loading />
        </div>
      </OutdatedSongsWrapper>
    );
  }

  if (songs.length > 0) {
    return (
      <OutdatedSongsWrapper>
        <p className="text-sm">
          There are ({songs.length}) songs that have become outdated:
        </p>
        <p className="text-sm">Click a song to reimport it</p>
        <div className="space-y-2 py-2 max-h-80 overflow-y-auto scrollbar-none">
          {songs.map((s) => (
            <OutdatedSongItem key={s.id} song={s} onClick={onSongClick} />
          ))}
        </div>
      </OutdatedSongsWrapper>
    );
  }

  return (
    <OutdatedSongsWrapper>
      <p className="text-sm">All imported songs are currently up to date!</p>
    </OutdatedSongsWrapper>
  );
};
