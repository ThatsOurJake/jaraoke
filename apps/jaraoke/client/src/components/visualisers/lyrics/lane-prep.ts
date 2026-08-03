import type {
  Lyric,
  LyricDisplayType,
  LyricSyllable,
} from 'jaraoke-shared/types';
import type {
  PreparedLane,
  PreparedLine,
  PreparedSyllable,
  PreparedWord,
} from './types';

const DEFAULT_FILL_DURATION_MS = 1_000;
const DEFAULT_LINE_DURATION_MS = 2_000;

export interface PreparedLyricsState {
  lanes: Record<LyricDisplayType, PreparedLane>;
  timelineStarts: number[];
  timelineHolds: number[];
  laneTimelineBounds: Record<LyricDisplayType, { starts: number[]; holds: number[] }>;
}

const prepareSyllable = (syllable: LyricSyllable): PreparedSyllable => {
  return {
    phrase: syllable.phrase.trim(),
    startAtMs: syllable.startAtMs,
    durationMs:
      typeof syllable.durationMs === 'number' && syllable.durationMs > 0
        ? syllable.durationMs
        : undefined,
    effect: syllable.effect,
  };
};

const resolveSyllableDurations = (words: PreparedWord[], lineEndAtMs: number) => {
  return words.map((word, wordIndex) => {
    const syllables = word.syllables.map((syllable, syllableIndex) => {
      const explicitDuration = syllable.durationMs;

      if (typeof explicitDuration === 'number') {
        return {
          ...syllable,
          durationMs: explicitDuration,
        };
      }

      if (syllable.effect !== 'fill') {
        return {
          ...syllable,
          durationMs: undefined,
        };
      }

      const nextSyllableStart = word.syllables[syllableIndex + 1]?.startAtMs;
      const nextWordStart = words[wordIndex + 1]?.syllables[0]?.startAtMs;
      const inferredBoundary =
        nextSyllableStart || nextWordStart || lineEndAtMs || 0;
      const inferredDuration = inferredBoundary - syllable.startAtMs;

      if (inferredDuration > 0) {
        return {
          ...syllable,
          durationMs: inferredDuration,
        };
      }

      return {
        ...syllable,
        durationMs: DEFAULT_FILL_DURATION_MS,
      };
    });

    return {
      syllables,
    };
  });
};

const resolveLastSyllableEndAtMs = (words: PreparedWord[]): number => {
  let maxEndAtMs = 0;

  for (const word of words) {
    for (const syllable of word.syllables) {
      const endAtMs =
        syllable.startAtMs +
        (syllable.effect === 'fill' ? syllable.durationMs || 0 : 0);

      maxEndAtMs = Math.max(maxEndAtMs, endAtMs);
    }
  }

  return maxEndAtMs;
};

const resolveFirstSyllableStartAtMs = (
  words: PreparedWord[],
  fallbackStartAtMs: number,
): number => {
  const allStarts = words.flatMap((word) =>
    word.syllables.map((syllable) => syllable.startAtMs),
  );

  if (allStarts.length === 0) {
    return fallbackStartAtMs;
  }

  return Math.min(...allStarts);
};

export const buildPreparedLyricsState = (
  lyrics: Lyric[],
  postSingHoldMs: number,
): PreparedLyricsState => {
  const laneLines: Record<LyricDisplayType, PreparedLine[]> = {
    top: [],
    bottom: [],
    translation: [],
  };

  for (const lyric of lyrics) {
    const sortedLines = lyric.lines.slice().sort((a, b) => a.startAtMs - b.startAtMs);

    for (let index = 0; index < sortedLines.length; index++) {
      const line = sortedLines[index];
      const nextLineStart = sortedLines[index + 1]?.startAtMs;
      const words = line.words
        .map((word) => ({
          syllables: word.syllables
            .map((syllable) => prepareSyllable(syllable))
            .filter((syllable) => syllable.phrase.length > 0),
        }))
        .filter((word) => word.syllables.length > 0);

      if (words.length === 0) {
        continue;
      }

      const lastSyllableStart = Math.max(
        ...words.flatMap((word) =>
          word.syllables.map((syllable) => syllable.startAtMs),
        ),
      );

      const fallbackLineBoundary =
        lastSyllableStart + DEFAULT_LINE_DURATION_MS;
      const inferredLineBoundary =
        typeof nextLineStart === 'number' && nextLineStart > lastSyllableStart
          ? nextLineStart
          : fallbackLineBoundary;
      const resolvedWords = resolveSyllableDurations(
        words,
        inferredLineBoundary,
      );
      const firstSyllableStartAtMs = resolveFirstSyllableStartAtMs(
        resolvedWords,
        line.startAtMs,
      );
      const lastSyllableEnd = resolveLastSyllableEndAtMs(resolvedWords);
      const singUntilMs = Math.max(lastSyllableEnd, firstSyllableStartAtMs);
      const holdUntilMs = singUntilMs + postSingHoldMs;

      laneLines[lyric.displayType].push({
        startAtMs: line.startAtMs,
        firstSyllableStartAtMs,
        singUntilMs,
        holdUntilMs,
        displayName: lyric.displayName,
        words: resolvedWords,
      });
    }
  }

  const buildLane = (displayType: LyricDisplayType): PreparedLane => {
    const lines = laneLines[displayType].sort(
      (a, b) =>
        a.firstSyllableStartAtMs - b.firstSyllableStartAtMs ||
        a.startAtMs - b.startAtMs,
    );

    return {
      lines,
    };
  };

  const lanes: Record<LyricDisplayType, PreparedLane> = {
    top: buildLane('top'),
    bottom: buildLane('bottom'),
    translation: buildLane('translation'),
  };

  const combined = [
    ...lanes.top.lines,
    ...lanes.bottom.lines,
    ...lanes.translation.lines,
  ];

  const timelineStarts = combined
    .map((line) => line.firstSyllableStartAtMs)
    .sort((a, b) => a - b);
  const timelineHolds = combined.map((line) => line.holdUntilMs).sort((a, b) => a - b);

  const buildBounds = (displayType: LyricDisplayType) => {
    const lines = lanes[displayType].lines;

    return {
      starts: lines
        .map((line) => line.firstSyllableStartAtMs)
        .sort((a, b) => a - b),
      holds: lines.map((line) => line.holdUntilMs).sort((a, b) => a - b),
    };
  };

  const laneTimelineBounds: Record<
    LyricDisplayType,
    { starts: number[]; holds: number[] }
  > = {
    top: buildBounds('top'),
    bottom: buildBounds('bottom'),
    translation: buildBounds('translation'),
  };

  return {
    lanes,
    timelineStarts,
    timelineHolds,
    laneTimelineBounds,
  };
};
