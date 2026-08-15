import type { CombinedJaraokeFiles } from 'jaraoke-shared/types';
import type { ComponentChildren } from 'preact';
import { PlayerControls } from './player-controls';

interface PlayerWrapperProps {
  children: ComponentChildren;
  onPlay: () => void;
  onPause: () => void;
  song: CombinedJaraokeFiles;
}

export const PlayerWrapper = ({
  children,
  onPause,
  onPlay,
  song,
}: PlayerWrapperProps) => {
  return (
    <div className="h-screen w-screen bg-black relative">
      {children}
      <PlayerControls onPause={onPause} onPlay={onPlay} song={song} />
    </div>
  );
};
