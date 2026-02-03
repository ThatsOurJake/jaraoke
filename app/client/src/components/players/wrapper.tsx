/** biome-ignore-all lint/a11y/noStaticElementInteractions: Not needed in this case */
import { mdiMinidisc, mdiPauseBoxOutline, mdiPlayBoxOutline } from '@mdi/js';
import type { ComponentChildren } from 'preact';
import { useCallback, useState } from 'preact/hooks';
import { PlayerBtn } from '../buttons/player-btn';

interface PlayerWrapperProps {
  children: ComponentChildren;
  onPlay: () => void;
  onPause: () => void;
}

export const PlayerWrapper = ({
  children,
  onPause,
  onPlay,
}: PlayerWrapperProps) => {
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(false);

  const onZoneClick = useCallback(() => {
    setShowControls(true);
  }, []);

  const onWrapperClick = useCallback((e: MouseEvent) => {
    if (!(e.target instanceof HTMLElement)) {
      return;
    }

    const { nodeName } = e.target;

    if (nodeName !== 'DIV') {
      return;
    }

    setShowControls(false);
  }, []);

  return (
    <div className="h-screen w-screen bg-black relative">
      {children}
      <div
        className="absolute top-0 right-0 left-0 bottom-0 z-40 cursor-pointer"
        onClick={onZoneClick}
      />
      <div
        className={`absolute top-0 right-0 left-0 bottom-0 flex gap-x-2 justify-center items-center z-50 bg-black/60 ${showControls ? 'block' : 'hidden'} cursor-pointer`}
        onClick={onWrapperClick}
      >
        <PlayerBtn
          icon={mdiMinidisc}
          text="Song Selection"
          onClick={() => {
            location.href = '/';
          }}
        />
        {isPaused && (
          <PlayerBtn
            icon={mdiPlayBoxOutline}
            text="Play"
            onClick={() => {
              setIsPaused(false);
              onPlay();
            }}
          />
        )}
        {!isPaused && (
          <PlayerBtn
            icon={mdiPauseBoxOutline}
            text="Pause"
            onClick={() => {
              setIsPaused(true);
              onPause();
            }}
          />
        )}
      </div>
    </div>
  );
};
