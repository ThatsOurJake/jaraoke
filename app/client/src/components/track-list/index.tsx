import type { JaraokeTrack } from 'jaraoke-shared/types';

import { TrackItem } from './track-item';

interface TrackListProps {
  tracks: JaraokeTrack[];
  onChange: (trackName: string, checked: boolean) => void;
}

export const TrackList = ({ tracks, onChange }: TrackListProps) => (
  <div className="h-full max-h-full overflow-y-auto">
    <p className="font-bold">Track Options</p>
    <ul className="py-2 gap-y-2 flex flex-col">
      {tracks.map((t) => (
        <TrackItem track={t} onChange={onChange} />
      ))}
    </ul>
  </div>
);
