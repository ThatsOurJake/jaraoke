/** biome-ignore-all lint/a11y/useMediaCaption: No captions needed */
import type { JaraokeCDGFile } from 'jaraoke-shared/types';
import { useRef } from 'preact/hooks';
import { PlayerWrapper } from './wrapper';

interface CDGPlayerProps {
  song: JaraokeCDGFile;
  onLoadingFinished: () => void;
}

export const CDGPlayer = ({ song }: CDGPlayerProps) => {
  const videoUrl = useRef<string>(`/api/song/${song.id}/${song.video}`);
  const videoElement = useRef<HTMLVideoElement>(null);

  return (
    <PlayerWrapper
      onPause={() => {
        videoElement.current?.pause();
      }}
      onPlay={() => {
        videoElement.current?.play();
      }}
    >
      <video className="h-full w-full" ref={videoElement} autoPlay>
        <source type="video/mp4" src={videoUrl.current}></source>
      </video>
    </PlayerWrapper>
  );
};
