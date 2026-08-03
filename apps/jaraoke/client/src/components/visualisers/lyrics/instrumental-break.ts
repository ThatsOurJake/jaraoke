import type { InstrumentalBreakState } from './types';

interface ResolveInstrumentalBreakInput {
  songTimeMs: number;
  timelineStarts: number[];
  timelineHolds: number[];
  breakThresholdMs: number;
  barEndEarlyMs: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const upperBound = (values: number[], target: number): number => {
  let low = 0;
  let high = values.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);

    if (values[mid] <= target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
};

const lowerBound = (values: number[], target: number): number => {
  let low = 0;
  let high = values.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);

    if (values[mid] < target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
};

export const resolveInstrumentalBreakState = ({
  songTimeMs,
  timelineStarts,
  timelineHolds,
  breakThresholdMs,
  barEndEarlyMs,
}: ResolveInstrumentalBreakInput): InstrumentalBreakState | null => {
  if (timelineStarts.length === 0) {
    return null;
  }

  const startedCount = upperBound(timelineStarts, songTimeMs);
  const endedBeforeCount = lowerBound(timelineHolds, songTimeMs);

  if (startedCount > endedBeforeCount) {
    return null;
  }

  const nextLineIndex = upperBound(timelineStarts, songTimeMs);

  if (nextLineIndex >= timelineStarts.length) {
    return null;
  }

  const nextLineStartAtMs = timelineStarts[nextLineIndex];
  const previousLineIndex = upperBound(timelineHolds, songTimeMs) - 1;
  const previousEndAtMs =
    previousLineIndex >= 0 ? timelineHolds[previousLineIndex] : 0;
  const gapDurationMs = nextLineStartAtMs - previousEndAtMs;

  if (gapDurationMs <= breakThresholdMs) {
    return null;
  }

  const barEndAtMs = Math.max(previousEndAtMs, nextLineStartAtMs - barEndEarlyMs);

  if (songTimeMs >= barEndAtMs) {
    return null;
  }

  const visibleGapDurationMs = Math.max(1, barEndAtMs - previousEndAtMs);
  const progress = clamp(
    (songTimeMs - previousEndAtMs) / visibleGapDurationMs,
    0,
    1,
  );

  return {
    progress,
    remainingMs: Math.max(0, nextLineStartAtMs - songTimeMs),
  };
};
