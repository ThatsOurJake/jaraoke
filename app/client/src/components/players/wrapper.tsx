import { mdiMinidisc, mdiPauseBoxOutline, mdiPlayBoxOutline } from '@mdi/js';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
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

  return (
    <div className="h-screen w-screen bg-black relative group">
      {children}
      <div className="absolute top-0 right-0 left-0 bottom-0 flex gap-x-2 justify-center items-center group-hover:visible invisible z-20 bg-black/60">
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
