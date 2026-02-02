/** biome-ignore-all lint/a11y/useMediaCaption: No captions needed */
import type { JaraokeCDGFile } from 'jaraoke-shared/types';
import { useCallback, useEffect, useRef } from 'preact/hooks';
import { KARAOKE_EVENT } from '../../constants';
import type { KaraokeEvent } from '../../events/karaoke-event';
import { constructFileUrl } from '../../utils/construct-file-url';
import { PlayerWrapper } from './wrapper';

interface CDGPlayerProps {
  song: JaraokeCDGFile;
  onLoadingFinished: () => void;
}

export const CDGPlayer = ({ song, onLoadingFinished }: CDGPlayerProps) => {
  const videoUrl = useRef<string>(constructFileUrl(song.id, song.video));
  const videoElement = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const onKaraokeEvent = (ev: Event) => {
      const event = ev as KaraokeEvent;

      if (event.eventType === 'start' && videoElement.current) {
        videoElement.current.play();
      }
    };

    window.addEventListener(KARAOKE_EVENT, onKaraokeEvent);

    return () => {
      window.removeEventListener(KARAOKE_EVENT, onKaraokeEvent);
    };
  }, []);

  const onVideoLoaded = useCallback(() => {
    onLoadingFinished();
  }, []);

  return (
    <PlayerWrapper
      onPause={() => {
        videoElement.current?.pause();
      }}
      onPlay={() => {
        videoElement.current?.play();
      }}
    >
      <video
        className="h-full w-full"
        ref={videoElement}
        onLoadedData={onVideoLoaded}
      >
        <source type="video/mp4" src={videoUrl.current}></source>
      </video>
    </PlayerWrapper>
  );
};
