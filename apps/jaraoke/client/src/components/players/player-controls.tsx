import { mdiExitToApp, mdiPauseBoxOutline, mdiPlay } from '@mdi/js';
import Icon from '@mdi/react';
import type { CombinedJaraokeFiles } from 'jaraoke-shared/types';
import { useCallback, useState } from 'preact/hooks';

interface PlayerControlsProps {
  onPlay: () => void;
  onPause: () => void;
  song: CombinedJaraokeFiles;
}

// TODO: Display current duration in top song bar

export const PlayerControls = ({
  onPause,
  onPlay,
  song,
}: PlayerControlsProps) => {
  const [showControls, setShowControls] = useState<boolean>(false);
  const {
    metadata: { title, artist },
    coverPhoto,
  } = song;

  const onZoneClick = useCallback(() => {
    setShowControls(true);
    onPause();
  }, []);

  const resume = useCallback(() => {
    setShowControls(false);
    onPlay();
  }, [onPlay]);

  return (
    <>
      <div
        className="absolute top-0 right-0 left-0 bottom-0 z-40 cursor-pointer"
        onClick={onZoneClick}
      />
      <div
        className={`absolute top-0 right-0 left-0 bottom-0 flex flex-col items-center justify-between z-50 bg-background-secondary backdrop-blur-sm ${showControls ? 'flex' : 'hidden'}`}
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 110%, rgba(99, 102, 241, 0.28) 0%, rgba(99, 102, 241, 0.12) 35%, transparent 65%),
            radial-gradient(circle at 10% 0%, rgba(168, 85, 247, 0.14) 0%, transparent 50%)
          `,
        }}
      >
        <div className="py-8 w-1/2 xl:w-1/3">
          <div className="text-white py-2 px-2 bg-zinc-800/40 rounded-lg border-2 border-zinc-500 flex space-x-4 drop-shadow-2xl">
            <img
              src={coverPhoto || '/album.png'}
              alt="album cover"
              className="w-12 h-12 rounded"
            />
            <div>
              <p className="text-xl font-bold font-bricolage">{title}</p>
              <p className="font-inter text-sm">{artist || 'Unknown'}</p>
            </div>
          </div>
        </div>
        <div>
          <div className="flex flex-col items-center space-y-2">
            <Icon path={mdiPauseBoxOutline} size={2} color="#d8b4fe" />
            <p className="text-purple-300 text-4xl font-bold font-bricolage">
              Paused
            </p>
          </div>
          <div className="flex flex-col items-center mt-8 space-y-6">
            <button
              type="button"
              className="flex space-x-2 items-center cursor-pointer border-2 border-purple-200 pl-8 pr-10 py-2 rounded-lg bg-background-secondary/50 shadow-[0_0_24px_rgba(168,85,247,0.5)]"
              onClick={resume}
            >
              <Icon path={mdiPlay} size={2} color="#d8b4fe" />
              <p className="text-purple-300 font-inter text-2xl">Resume Song</p>
            </button>
            <button
              type="button"
              className="flex space-x-2 items-center cursor-pointer border-2 border-orange-200 pl-8 pr-10 py-2 rounded-lg bg-background-secondary/50 shadow-[0_0_24px_rgba(251,146,60,0.5)]"
              onClick={() => {
                location.href = '/';
              }}
            >
              <Icon path={mdiExitToApp} size={2} color="#fdba74" />
              <p className="text-orange-300 font-inter text-2xl">
                Back to selection
              </p>
            </button>
          </div>
        </div>
        <div className="py-8"></div>
      </div>
    </>
  );
};
