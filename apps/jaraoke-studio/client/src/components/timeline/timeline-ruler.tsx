import { msToPx, pxToMs } from './helpers';

export interface TimelineRulerProps {
  durationMs: number;
  zoomPxPerSecond: number;
  labelWidthPx: number;
  contentWidthPx: number;
  onSeek: (timeMs: number) => void;
  onClearSelection: () => void;
}

export const TimelineRuler = ({
  durationMs,
  zoomPxPerSecond,
  labelWidthPx,
  contentWidthPx,
  onSeek,
  onClearSelection,
}: TimelineRulerProps) => {
  const totalSeconds = Math.ceil(durationMs / 1000);

  const seekFromClientX = (clientX: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const ms = pxToMs(clientX - rect.left, zoomPxPerSecond);
    onSeek(ms);
    onClearSelection();
  };

  return (
    <div class="relative flex h-8 border-b border-slate-300 bg-slate-100">
      <div
        class="sticky left-0 z-10 flex h-full items-center border-r border-slate-300 bg-slate-100 px-3 text-xs font-medium text-slate-600"
        style={{ width: `${labelWidthPx}px`, minWidth: `${labelWidthPx}px` }}
      >
        Timeline
      </div>
      <button
        type="button"
        class="relative h-full text-left"
        style={{
          width: `${contentWidthPx}px`,
          minWidth: `${contentWidthPx}px`,
        }}
        aria-label="Seek timeline"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const clickClientX =
            event.detail === 0 ? rect.left + rect.width / 2 : event.clientX;
          seekFromClientX(clickClientX, event.currentTarget);
        }}
      >
        {Array.from({ length: totalSeconds + 1 }).map((_, index) => {
          const leftPx = msToPx(index * 1000, zoomPxPerSecond);

          return (
            <div
              key={`ruler-${index}`}
              class="absolute top-0 h-full border-l border-slate-300"
              style={{ left: `${leftPx}px` }}
            >
              <span class="ml-1 text-[10px] text-slate-500">{index}s</span>
            </div>
          );
        })}
      </button>
    </div>
  );
};
