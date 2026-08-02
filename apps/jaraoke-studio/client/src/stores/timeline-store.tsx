import type { ComponentChildren } from 'preact';
import { createContext } from 'preact';
import { useContext, useMemo, useState } from 'preact/hooks';
import type {
  AddWordDraft,
  TimelineLane,
  TimelineWord,
} from '../components/timeline';
import { normalizeWordTiming } from '../components/timeline/helpers';

export const SONG_DURATION_MS = 32_000;
export const DEFAULT_ZOOM_PX_PER_SECOND = 120;
export const MIN_WORD_DURATION_MS = 50;
export const MAX_LANES = 5;

const STARTER_LANES: TimelineLane[] = [
  { id: 'lane-main', name: 'Main', color: '#f59e0b', enabled: true },
];

const STARTER_WORDS: TimelineWord[] = [];

const buildLaneId = (): string =>
  `lane-${Date.now()}-${Math.round(Math.random() * 10_000)}`;

const resolveLaneOverlaps = (laneWords: TimelineWord[]): TimelineWord[] => {
  if (laneWords.length <= 1) {
    return laneWords;
  }

  const sortedByStart = [...laneWords]
    .map((word) => {
      const normalized = normalizeWordTiming(word.startMs ?? 0, word.endMs);
      return {
        ...word,
        startMs: normalized.startMs,
        endMs: normalized.endMs,
      };
    })
    .sort((a, b) => {
      if ((a.startMs ?? 0) !== (b.startMs ?? 0)) {
        return (a.startMs ?? 0) - (b.startMs ?? 0);
      }

      return a.order - b.order;
    });

  for (let index = 1; index < sortedByStart.length; index += 1) {
    const previousWord = sortedByStart[index - 1];
    const currentWord = sortedByStart[index];

    const previousTiming = normalizeWordTiming(
      previousWord.startMs ?? 0,
      previousWord.endMs,
    );
    const currentTiming = normalizeWordTiming(
      currentWord.startMs ?? 0,
      currentWord.endMs,
    );

    if (previousTiming.endMs <= currentTiming.startMs) {
      continue;
    }

    const desiredPreviousEndMs = currentTiming.startMs;
    const minimumPreviousEndMs = previousTiming.startMs + MIN_WORD_DURATION_MS;

    if (desiredPreviousEndMs >= minimumPreviousEndMs) {
      previousWord.endMs = desiredPreviousEndMs;
      continue;
    }

    previousWord.endMs = minimumPreviousEndMs;
    currentWord.startMs = minimumPreviousEndMs;
    currentWord.endMs = Math.max(
      minimumPreviousEndMs + MIN_WORD_DURATION_MS,
      currentTiming.endMs,
    );
  }

  return sortedByStart.map((word, index) => ({ ...word, order: index }));
};

const applyLaneOverlapResolution = (
  nextWords: TimelineWord[],
  laneId: string,
): TimelineWord[] => {
  const laneWords = nextWords.filter((word) => word.laneId === laneId);
  const nonLaneWords = nextWords.filter((word) => word.laneId !== laneId);
  const resolvedLaneWords = resolveLaneOverlaps(laneWords);

  return [...nonLaneWords, ...resolvedLaneWords];
};

export interface TimelineStoreValue {
  lanes: TimelineLane[];
  words: TimelineWord[];
  selectedWordId: string | null;
  selectedWord: TimelineWord | null;
  currentTimeMs: number;
  zoomPxPerSecond: number;
  setCurrentTimeMs: (nextTimeMs: number) => void;
  setZoomPxPerSecond: (nextZoom: number) => void;
  setSelectedWordId: (wordId: string | null) => void;
  addLane: () => void;
  renameLane: (laneId: string, name: string) => void;
  addWord: (draft: AddWordDraft) => void;
  changeWordTiming: (
    wordId: string,
    patch: { startMs?: number | null; endMs?: number | null },
  ) => void;
  updateWordText: (wordId: string, text: string) => void;
}

const TimelineStoreContext = createContext<TimelineStoreValue | undefined>(
  undefined,
);

export const TimelineStoreProvider = ({
  children,
}: {
  children: ComponentChildren;
}) => {
  const [lanes, setLanes] = useState<TimelineLane[]>(STARTER_LANES);
  const [words, setWords] = useState<TimelineWord[]>(STARTER_WORDS);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [zoomPxPerSecond, setZoomPxPerSecond] = useState(
    DEFAULT_ZOOM_PX_PER_SECOND,
  );

  const selectedWord = useMemo(
    () => words.find((word) => word.id === selectedWordId) ?? null,
    [selectedWordId, words],
  );

  const addLane = () => {
    const laneNumber = lanes.length + 1;
    const palette = [
      '#f59e0b',
      '#0ea5e9',
      '#22c55e',
      '#ef4444',
      '#a855f7',
      '#f97316',
    ];
    const color = palette[lanes.length % palette.length] ?? '#94a3b8';

    setLanes((previous) => [
      ...previous,
      {
        id: buildLaneId(),
        name: `Lane ${laneNumber}`,
        color,
        enabled: true,
      },
    ]);
  };

  const renameLane = (laneId: string, name: string) => {
    setLanes((previous) =>
      previous.map((lane) => (lane.id === laneId ? { ...lane, name } : lane)),
    );
  };

  const addWord = (draft: AddWordDraft) => {
    setWords((previousWords) => {
      const laneWords = previousWords.filter(
        (word) => word.laneId === draft.laneId,
      );
      const normalized = normalizeWordTiming(
        draft.startMs,
        draft.startMs + draft.durationMs,
      );

      const nextWord: TimelineWord = {
        id: draft.id,
        laneId: draft.laneId,
        text: draft.text,
        startMs: normalized.startMs,
        endMs: normalized.endMs,
        order: laneWords.length,
      };

      return applyLaneOverlapResolution(
        [...previousWords, nextWord],
        draft.laneId,
      );
    });

    setSelectedWordId(draft.id);
  };

  const changeWordTiming = (
    wordId: string,
    patch: { startMs?: number | null; endMs?: number | null },
  ) => {
    setWords((previousWords) => {
      const targetWord = previousWords.find((word) => word.id === wordId);
      if (!targetWord) {
        return previousWords;
      }

      const nextWords = previousWords.map((word) => {
        if (word.id !== wordId) {
          return word;
        }

        const mergedStartMs = patch.startMs ?? word.startMs ?? 0;
        const mergedEndMs = patch.endMs ?? word.endMs;
        const normalized = normalizeWordTiming(mergedStartMs, mergedEndMs);

        return {
          ...word,
          startMs: normalized.startMs,
          endMs: normalized.endMs,
        };
      });

      return applyLaneOverlapResolution(nextWords, targetWord.laneId);
    });
  };

  const updateWordText = (wordId: string, text: string) => {
    setWords((previousWords) =>
      previousWords.map((word) =>
        word.id === wordId ? { ...word, text } : word,
      ),
    );
  };

  const value = useMemo<TimelineStoreValue>(
    () => ({
      lanes,
      words,
      selectedWordId,
      selectedWord,
      currentTimeMs,
      zoomPxPerSecond,
      setCurrentTimeMs,
      setZoomPxPerSecond,
      setSelectedWordId,
      addLane,
      renameLane,
      addWord,
      changeWordTiming,
      updateWordText,
    }),
    [
      lanes,
      words,
      selectedWordId,
      selectedWord,
      currentTimeMs,
      zoomPxPerSecond,
    ],
  );

  return (
    <TimelineStoreContext.Provider value={value}>
      {children}
    </TimelineStoreContext.Provider>
  );
};

export const useTimelineStore = (): TimelineStoreValue => {
  const context = useContext(TimelineStoreContext);

  if (!context) {
    throw new Error(
      'useTimelineStore must be used within TimelineStoreProvider',
    );
  }

  return context;
};
