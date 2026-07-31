import type { JaraokeTrack } from 'jaraoke-shared/types';
import { useCallback } from 'preact/hooks';

import { Toggle } from '../toggle';

interface TrackItemProps {
  track: JaraokeTrack;
  onChange: (trackName: string, checked: boolean) => void;
}

export const TrackItem = ({ onChange, track }: TrackItemProps) => {
  const onLocalChange = useCallback(
    (value: boolean) => onChange(track.fileName, value),
    [],
  );

  return (
    <li className="w-full flex justify-between" id={track.fileName}>
      <p>{track.name}</p>
      <Toggle checked onChange={onLocalChange} />
    </li>
  );
};
