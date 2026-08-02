import { msToPx } from './helpers';

export interface TimelinePlayheadProps {
  currentTimeMs: number;
  zoomPxPerSecond: number;
  offsetLeftPx: number;
}

export const TimelinePlayhead = ({
  currentTimeMs,
  zoomPxPerSecond,
  offsetLeftPx,
}: TimelinePlayheadProps) => {
  const leftPx = offsetLeftPx + msToPx(currentTimeMs, zoomPxPerSecond);

  return (
    <div
      class="pointer-events-none absolute top-0 z-20 h-full w-px bg-red-500"
      style={{ left: `${leftPx}px` }}
    >
      <div class="-ml-1.5 h-2 w-3 rounded-b bg-red-500" />
    </div>
  );
};
