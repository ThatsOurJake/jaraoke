import type { LaneRowsResult, PreparedLane, PreparedLine } from './types';

interface ResolveLaneRowsInput {
  lane: PreparedLane;
  songTimeMs: number;
  previousFocusIndex: number;
  maxVisibleLines: number;
  previewWindowMs: number;
  focusRegressionGuardMs: number;
}

const shouldRenderPreview = (
  line: PreparedLine,
  songTimeMs: number,
  previewWindowMs: number,
): boolean => {
  return line.startAtMs - songTimeMs <= previewWindowMs;
};

export const findLatestSingingLineIndex = (
  lane: PreparedLane,
  songTimeMs: number,
): number => {
  for (let index = lane.lines.length - 1; index >= 0; index--) {
    if (lane.lines[index].firstSyllableStartAtMs <= songTimeMs) {
      return index;
    }
  }

  return -1;
};

export const findCurrentLineIndex = (
  lane: PreparedLane,
  songTimeMs: number,
): number => {
  if (lane.lines.length === 0) {
    return -1;
  }

  const latestStarted = findLatestSingingLineIndex(lane, songTimeMs);

  if (latestStarted < 0) {
    return -1;
  }

  const candidate = lane.lines[latestStarted];

  if (songTimeMs > candidate.holdUntilMs) {
    return -1;
  }

  return latestStarted;
};

const resolveStableCurrentLineIndex = (
  lane: PreparedLane,
  songTimeMs: number,
  previousFocusIndex: number,
  focusRegressionGuardMs: number,
): number => {
  const currentIndex = findCurrentLineIndex(lane, songTimeMs);

  if (
    previousFocusIndex < 0 ||
    previousFocusIndex >= lane.lines.length ||
    currentIndex >= previousFocusIndex
  ) {
    return currentIndex;
  }

  const previousFocusLine = lane.lines[previousFocusIndex];
  const guardWindowStartAtMs =
    previousFocusLine.firstSyllableStartAtMs - focusRegressionGuardMs;

  if (
    songTimeMs >= guardWindowStartAtMs &&
    songTimeMs <= previousFocusLine.holdUntilMs
  ) {
    return previousFocusIndex;
  }

  return currentIndex;
};

const findNextPreviewIndices = (
  lane: PreparedLane,
  songTimeMs: number,
  currentLineIndex: number,
  maxVisibleLines: number,
  previewWindowMs: number,
): number[] => {
  const output: number[] = [];

  for (let index = currentLineIndex + 1; index < lane.lines.length; index++) {
    const line = lane.lines[index];

    if (output.length === 0) {
      // Always show at least one full upcoming line for singer lead time.
      output.push(index);
      continue;
    }

    if (!shouldRenderPreview(line, songTimeMs, previewWindowMs)) {
      break;
    }

    output.push(index);

    if (output.length >= maxVisibleLines) {
      break;
    }
  }

  return output;
};

export const findUpcomingLineIndices = (
  lane: PreparedLane,
  songTimeMs: number,
  maxCount: number,
  previewWindowMs: number,
): number[] => {
  const latestStarted = findLatestSingingLineIndex(lane, songTimeMs);
  const output: number[] = [];

  for (let index = latestStarted + 1; index < lane.lines.length; index++) {
    const line = lane.lines[index];

    if (output.length === 0) {
      output.push(index);
    } else {
      if (!shouldRenderPreview(line, songTimeMs, previewWindowMs)) {
        break;
      }

      output.push(index);
    }

    if (output.length >= maxCount) {
      break;
    }
  }

  return output;
};

export const resolveLaneRows = ({
  lane,
  songTimeMs,
  previousFocusIndex,
  maxVisibleLines,
  previewWindowMs,
  focusRegressionGuardMs,
}: ResolveLaneRowsInput): LaneRowsResult => {
  const currentIndex = resolveStableCurrentLineIndex(
    lane,
    songTimeMs,
    previousFocusIndex,
    focusRegressionGuardMs,
  );

  if (currentIndex >= 0) {
    const previewIndices = findNextPreviewIndices(
      lane,
      songTimeMs,
      currentIndex,
      maxVisibleLines,
      previewWindowMs,
    );
    const visiblePreviews = previewIndices.slice(0, maxVisibleLines - 1);

    return {
      rows: [
        {
          index: currentIndex,
          offset: 0,
          role: 'active' as const,
        },
        ...visiblePreviews.map((index, previewIndex) => ({
          index,
          offset: previewIndex + 1,
          role: previewIndex === 0 ? ('next' as const) : ('future' as const),
        })),
      ],
      focusIndex: currentIndex,
    };
  }

  const upcoming = findUpcomingLineIndices(
    lane,
    songTimeMs,
    maxVisibleLines,
    previewWindowMs,
  );

  if (upcoming.length === 0) {
    return {
      rows: [],
      focusIndex: -1,
    };
  }

  return {
    rows: upcoming.map((index, rowIndex) => ({
      index,
      offset: rowIndex,
      role: rowIndex === 0 ? ('next' as const) : ('future' as const),
    })),
    focusIndex: upcoming[0],
  };
};
