import type { TargetedPointerEvent } from 'preact';
import { msToPx, normalizeWordTiming } from './helpers';
import type { TimelineWord } from './types';

export interface TimelineWordBlockProps {
  word: TimelineWord;
  isSelected: boolean;
  isOutOfBounds: boolean;
  zoomPxPerSecond: number;
  laneColor: string;
  minWidthPx?: number;
  onClick: (wordId: string) => void;
  onDragStart: (
    event: TargetedPointerEvent<HTMLElement>,
    word: TimelineWord,
  ) => void;
  onResizeStart: (
    event: TargetedPointerEvent<HTMLElement>,
    word: TimelineWord,
  ) => void;
}

const MIN_WORD_WIDTH_PX = 24;

export const TimelineWordBlock = ({
  word,
  isSelected,
  isOutOfBounds,
  zoomPxPerSecond,
  laneColor,
  minWidthPx = MIN_WORD_WIDTH_PX,
  onClick,
  onDragStart,
  onResizeStart,
}: TimelineWordBlockProps) => {
  if (word.startMs === null) {
    return null;
  }

  const timing = normalizeWordTiming(word.startMs, word.endMs);
  const left = msToPx(timing.startMs, zoomPxPerSecond);
  const width = Math.max(
    minWidthPx,
    msToPx(timing.endMs - timing.startMs, zoomPxPerSecond),
  );

  return (
    <button
      type="button"
      class={[
        'absolute top-2 h-10 rounded-md border px-2 text-xs leading-10 shadow-sm select-none',
        isSelected
          ? 'ring-2 ring-offset-1 ring-blue-500 border-blue-600'
          : 'border-slate-400/70',
        isOutOfBounds ? 'border-red-500 ring-1 ring-red-500/50' : '',
      ].join(' ')}
      style={{
        left: `${left}px`,
        width: `${width}px`,
        backgroundColor: laneColor,
      }}
      onPointerDown={(event) => onDragStart(event, word)}
      onClick={(event) => {
        event.stopPropagation();
        onClick(word.id);
      }}
    >
      <span class="block truncate pr-3 text-slate-950">
        {word.text || '(empty)'}
      </span>
      <span
        class="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r-md bg-slate-900/20"
        onPointerDown={(event) => onResizeStart(event, word)}
      />
    </button>
  );
};
