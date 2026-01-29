import { Howl } from 'howler';
import type { JaraokeFile, VolumeOverride } from 'jaraoke-shared/types';
import { useEffect } from 'preact/hooks';
import { constructFileUrl } from '../../utils/construct-file-url';
import { Visualiser } from '../visualisers/audio';
import { PlayerWrapper } from './wrapper';

interface MainPlayerProps {
  song: JaraokeFile;
  trackVolumes: VolumeOverride[];
  onLoadingFinished: () => void;
}

export const MainPlayer = ({
  onLoadingFinished,
  song,
  trackVolumes,
}: MainPlayerProps) => {
  const { lyrics, tracks, id: songId } = song;
  const filteredTracks = tracks.filter(
    (x) => !trackVolumes.find((y) => y.trackFileName === x.fileName),
  );

  const lyricsUrl = constructFileUrl(songId, lyrics);

  useEffect(() => {
    const loadLyrics = async () => {};

    loadLyrics();
  }, []);

  // const mainTrack = tracks.find(x => x.name === 'General')!;
  // const audioUrl = `/api/song/${song.id}/${mainTrack.fileName}`;
  // const audio = new Audio();

  // useEffect(() => {
  //   const tracks = song.tracks.filter(
  //     (x) => !trackVolumes.find((y) => y.trackFileName === x.fileName),
  //   );

  //   const loadTracks = async () => {
  //     const audios = await Promise.allSettled<{
  //       isBackingTrack: boolean;
  //       sound: Howl;
  //     }>(
  //       tracks.map((x) => {
  //         const audioSrc = `/api/song/${song.id}/${x.fileName}`;
  //         const isBackingTrack = x.name === 'General';
  //         return new Promise((resolve) => {
  //           const sound = new Howl({
  //             src: audioSrc,
  //             onload: () => resolve({ isBackingTrack, sound }),
  //           });
  //         });
  //       }),
  //     );

  //     for (const audio of audios) {
  //       if (audio.status === 'fulfilled') {
  //         audio.value.sound.play();
  //       }
  //     }
  //   };

  //   loadTracks();
  // }, [song]);

  return (
    <PlayerWrapper onPause={() => {}} onPlay={() => {}}>
      <p>xxx</p>
    </PlayerWrapper>
  );
};
