import type { TimelineLaneId, TimelineWord } from './types';

const DEFAULT_WORD_DURATION_MS = 400;
const MIN_WORD_DURATION_MS = 50;

export const msToPx = (ms: number, zoomPxPerSecond: number): number =>
  (ms / 1000) * zoomPxPerSecond;

export const pxToMs = (px: number, zoomPxPerSecond: number): number =>
  (px / zoomPxPerSecond) * 1000;

export const clampTime = (ms: number, durationMs: number): number =>
  Math.max(0, Math.min(ms, durationMs));

export const getLaneWords = (
  words: TimelineWord[],
  laneId: TimelineLaneId,
): TimelineWord[] =>
  words
    .filter((word) => word.laneId === laneId)
    .sort((a, b) => a.order - b.order);

export const getNextWord = (
  words: TimelineWord[],
  selectedWordId: string | null,
): TimelineWord | null => {
  if (words.length === 0) {
    return null;
  }

  const orderedWords = [...words].sort((a, b) => {
    const aStart = a.startMs ?? Number.MAX_SAFE_INTEGER;
    const bStart = b.startMs ?? Number.MAX_SAFE_INTEGER;

    if (aStart !== bStart) {
      return aStart - bStart;
    }

    if (a.laneId !== b.laneId) {
      return a.laneId.localeCompare(b.laneId);
    }

    return a.order - b.order;
  });

  if (!selectedWordId) {
    return orderedWords[0] ?? null;
  }

  const selectedIndex = orderedWords.findIndex(
    (word) => word.id === selectedWordId,
  );
  if (selectedIndex === -1) {
    return orderedWords[0] ?? null;
  }

  return orderedWords[(selectedIndex + 1) % orderedWords.length] ?? null;
};

export const getPreviousWord = (
  words: TimelineWord[],
  selectedWordId: string | null,
): TimelineWord | null => {
  if (words.length === 0) {
    return null;
  }

  const orderedWords = [...words].sort((a, b) => {
    const aStart = a.startMs ?? Number.MAX_SAFE_INTEGER;
    const bStart = b.startMs ?? Number.MAX_SAFE_INTEGER;

    if (aStart !== bStart) {
      return aStart - bStart;
    }

    if (a.laneId !== b.laneId) {
      return a.laneId.localeCompare(b.laneId);
    }

    return a.order - b.order;
  });

  if (!selectedWordId) {
    return orderedWords[orderedWords.length - 1] ?? null;
  }

  const selectedIndex = orderedWords.findIndex(
    (word) => word.id === selectedWordId,
  );
  if (selectedIndex === -1) {
    return orderedWords[orderedWords.length - 1] ?? null;
  }

  return (
    orderedWords[
      (selectedIndex - 1 + orderedWords.length) % orderedWords.length
    ] ?? null
  );
};

export const normalizeWordTiming = (
  startMs: number,
  endMs: number | null,
): { startMs: number; endMs: number } => {
  const safeStart = Number.isFinite(startMs) ? startMs : 0;
  const fallbackEnd = safeStart + DEFAULT_WORD_DURATION_MS;
  const rawEnd = endMs ?? fallbackEnd;
  const safeEnd = Number.isFinite(rawEnd) ? rawEnd : fallbackEnd;

  return {
    startMs: safeStart,
    endMs: Math.max(safeStart + MIN_WORD_DURATION_MS, safeEnd),
  };
};

export const isWordOutOfBounds = (
  word: TimelineWord,
  durationMs: number,
): boolean => {
  if (word.startMs === null) {
    return false;
  }

  const normalized = normalizeWordTiming(word.startMs, word.endMs);

  return normalized.startMs < 0 || normalized.endMs > durationMs;
};
