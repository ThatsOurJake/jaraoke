import type { JaraokeFile, VolumeOverride } from 'jaraoke-shared/types';
import { useCallback, useRef } from 'preact/hooks';
import { KaraokeEvent } from '../../events/karaoke-event';
import { constructFileUrl } from '../../utils/construct-file-url';
import { AudioVisualiser } from '../visualisers/audio';
import { LyricsVisualiser } from '../visualisers/lyrics';
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
  const loadedRef = useRef<{ audio: boolean; lyrics: boolean }>({
    audio: false,
    lyrics: false,
  });

  const lyricsUrl = constructFileUrl(songId, lyrics);
  const audioTracks = tracks.map((x) => ({
    ...x,
    volume:
      trackVolumes.find((y) => y.trackFileName === x.fileName)?.volume || 1,
    isMainTrack: tracks.length === 1 || x.name === 'General',
    url: constructFileUrl(songId, x.fileName),
  }));

  const onPause = useCallback(() => {
    window.dispatchEvent(new KaraokeEvent('pause'));
  }, []);

  const onPlay = useCallback(() => {
    window.dispatchEvent(new KaraokeEvent('play'));
  }, []);

  const checkLoadedState = () => {
    const { audio, lyrics } = loadedRef.current;

    if (audio && lyrics) {
      onLoadingFinished();
    }
  };

  const onAudioLoaded = useCallback(() => {
    loadedRef.current.audio = true;

    checkLoadedState();
  }, []);

  const onLyricsLoaded = useCallback(() => {
    loadedRef.current.lyrics = true;

    checkLoadedState();
  }, []);

  return (
    <PlayerWrapper onPause={onPause} onPlay={onPlay}>
      <AudioVisualiser tracks={audioTracks} onLoaded={onAudioLoaded} />
      <LyricsVisualiser url={lyricsUrl} onLoaded={onLyricsLoaded} />
    </PlayerWrapper>
  );
};
