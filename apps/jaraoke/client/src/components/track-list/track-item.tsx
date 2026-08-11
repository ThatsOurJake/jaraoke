import type { JaraokeTrack } from 'jaraoke-shared/types';
import { useCallback, useState } from 'preact/hooks';
import { VolumeSlider } from '../volume-slider';

interface TrackItemProps {
  track: JaraokeTrack;
  onChange: (trackName: string, volume: number) => void;
}

export const TrackItem = ({ onChange, track }: TrackItemProps) => {
  const [localSliderValue, setLocalSliderValue] = useState(1);

  const onLocalChange = useCallback((value: number) => {
    const clampedTwoDecimals = Math.round(value * 100) / 100;
    setLocalSliderValue(clampedTwoDecimals);
    onChange(track.fileName, clampedTwoDecimals);
  }, []);

  return (
    <li className="w-full" id={track.fileName}>
      <div className="flex flex-row justify-between">
        <p>{track.name}</p>
        <p className="text-sm font-inter text-purple-300 font-semibold">
          {Math.floor(localSliderValue * 100)}%
        </p>
      </div>
      <VolumeSlider onChange={onLocalChange} currentValue={localSliderValue} />
    </li>
  );
};
