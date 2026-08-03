import type { TargetedPointerEvent } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  getLaneWords,
  getNextWord,
  getPreviousWord,
  msToPx,
  normalizeWordTiming,
  pxToMs,
} from './helpers';
import { TimelineLane } from './timeline-lane';
import { TimelinePlayhead } from './timeline-playhead';
import { TimelineRuler } from './timeline-ruler';
import type { KaraokeTimelineProps, TimelineWord } from './types';

const LABEL_WIDTH_PX = 140;
const MIN_WORD_DURATION_MS = 50;

export interface DragState {
  wordId: string;
  mode: 'move' | 'resize';
  originClientX: number;
  originScrollLeft: number;
  initialStartMs: number;
  initialEndMs: number;
}

const isEditableElement = (element: Element | null): boolean => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const tagName = element.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }

  return element.isContentEditable;
};

const buildWordId = (): string => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `word-${Date.now()}-${Math.round(Math.random() * 100000)}`;
};

export const KaraokeTimeline = ({
  durationMs,
  currentTimeMs,
  maxLanes,
  lanes,
  words,
  selectedWordId,
  zoomPxPerSecond,
  defaultZoomPxPerSecond,
  minZoomPxPerSecond = 40,
  maxZoomPxPerSecond = 320,
  onSeek,
  onSelectWord,
  onChangeWordTiming,
  onAddLane,
  onRenameLane,
  onChangeZoom,
  onAddWord,
}: KaraokeTimelineProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const playheadDragRef = useRef<boolean>(false);
  const [activeLaneId, setActiveLaneId] = useState<string | null>(
    lanes[0]?.id ?? null,
  );
  const [isAddWordModalOpen, setIsAddWordModalOpen] = useState(false);
  const [newWordText, setNewWordText] = useState('');
  const [newWordDurationMs, setNewWordDurationMs] = useState('500');

  useEffect(() => {
    if (!activeLaneId && lanes.length > 0) {
      setActiveLaneId(lanes[0]?.id ?? null);
      return;
    }

    if (activeLaneId && !lanes.some((lane) => lane.id === activeLaneId)) {
      setActiveLaneId(lanes[0]?.id ?? null);
    }
  }, [activeLaneId, lanes]);

  const resolvedDefaultZoom = defaultZoomPxPerSecond ?? zoomPxPerSecond;

  const maxWordEndMs = useMemo(() => {
    if (words.length === 0) {
      return durationMs;
    }

    return words.reduce((maxEnd, word) => {
      if (word.startMs === null) {
        return maxEnd;
      }

      const normalized = normalizeWordTiming(word.startMs, word.endMs);
      return Math.max(maxEnd, normalized.endMs);
    }, durationMs);
  }, [durationMs, words]);

  const contentWidthPx = Math.max(
    msToPx(maxWordEndMs + 1000, zoomPxPerSecond),
    800,
  );
  const trackEndPx = msToPx(durationMs, zoomPxPerSecond);

  const safeSeek = (nextTimeMs: number) => {
    onSeek(Math.max(0, Math.min(nextTimeMs, durationMs)));
  };

  const handleWordPointerDown = (
    event: TargetedPointerEvent<HTMLElement>,
    word: TimelineWord,
    mode: 'move' | 'resize',
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (word.startMs === null) {
      return;
    }

    const normalized = normalizeWordTiming(word.startMs, word.endMs);
    onSelectWord(word.id);
    setActiveLaneId(word.laneId);

    const scrollContainer = scrollContainerRef.current;
    const originScrollLeft = scrollContainer?.scrollLeft ?? 0;

    dragStateRef.current = {
      wordId: word.id,
      mode,
      originClientX: event.clientX,
      originScrollLeft,
      initialStartMs: normalized.startMs,
      initialEndMs: normalized.endMs,
    };

    const target = event.currentTarget;
    target.blur();
    target.setPointerCapture(event.pointerId);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      const activeScrollContainer = scrollContainerRef.current;
      if (activeScrollContainer) {
        const scrollRect = activeScrollContainer.getBoundingClientRect();
        const edgeThresholdPx = 56;
        const edgeScrollStepPx = 18;

        if (moveEvent.clientX <= scrollRect.left + edgeThresholdPx) {
          activeScrollContainer.scrollLeft -= edgeScrollStepPx;
        } else if (moveEvent.clientX >= scrollRect.right - edgeThresholdPx) {
          activeScrollContainer.scrollLeft += edgeScrollStepPx;
        }
      }

      const scrollDeltaPx =
        (activeScrollContainer?.scrollLeft ?? dragState.originScrollLeft) -
        dragState.originScrollLeft;
      const pointerDeltaPx = moveEvent.clientX - dragState.originClientX;
      const deltaMs = pxToMs(pointerDeltaPx + scrollDeltaPx, zoomPxPerSecond);

      if (dragState.mode === 'move') {
        onChangeWordTiming(dragState.wordId, {
          startMs: dragState.initialStartMs + deltaMs,
          endMs: dragState.initialEndMs + deltaMs,
        });

        return;
      }

      const nextEndMs = Math.max(
        dragState.initialStartMs + MIN_WORD_DURATION_MS,
        dragState.initialEndMs + deltaMs,
      );

      onChangeWordTiming(dragState.wordId, { endMs: nextEndMs });
    };

    const onPointerUp = () => {
      dragStateRef.current = null;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handlePlayheadPointerDown = (
    event: TargetedPointerEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    playheadDragRef.current = true;

    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!playheadDragRef.current) {
        return;
      }

      const scrollContainer = scrollContainerRef.current;
      if (!scrollContainer) {
        return;
      }

      const scrollRect = scrollContainer.getBoundingClientRect();
      const edgeThresholdPx = 56;
      const edgeScrollStepPx = 18;

      if (moveEvent.clientX <= scrollRect.left + edgeThresholdPx) {
        scrollContainer.scrollLeft -= edgeScrollStepPx;
      } else if (moveEvent.clientX >= scrollRect.right - edgeThresholdPx) {
        scrollContainer.scrollLeft += edgeScrollStepPx;
      }

      const timelineX =
        scrollContainer.scrollLeft +
        moveEvent.clientX -
        scrollRect.left -
        LABEL_WIDTH_PX;
      safeSeek(pxToMs(timelineX, zoomPxPerSecond));
    };

    const onPointerUp = () => {
      playheadDragRef.current = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const activeElement = document.activeElement;
    if (isEditableElement(activeElement)) {
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      safeSeek(currentTimeMs - 250);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      safeSeek(currentTimeMs + 250);
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const nextWord = getNextWord(words, selectedWordId);
      if (nextWord) {
        onSelectWord(nextWord.id);
        setActiveLaneId(nextWord.laneId);
      }
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const previousWord = getPreviousWord(words, selectedWordId);
      if (previousWord) {
        onSelectWord(previousWord.id);
        setActiveLaneId(previousWord.laneId);
      }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  });

  const canAddLane = lanes.length < maxLanes;

  const openAddWordModal = () => {
    if (!activeLaneId) {
      return;
    }

    setNewWordText('');
    setNewWordDurationMs('500');
    setIsAddWordModalOpen(true);
  };

  const submitAddWord = () => {
    if (!activeLaneId) {
      return;
    }

    const trimmedText = newWordText.trim();
    const parsedDurationMs = Number(newWordDurationMs);

    if (!trimmedText) {
      return;
    }

    if (
      !Number.isFinite(parsedDurationMs) ||
      parsedDurationMs < MIN_WORD_DURATION_MS
    ) {
      return;
    }

    const nextWordId = buildWordId();

    onAddWord({
      id: nextWordId,
      laneId: activeLaneId,
      text: trimmedText,
      startMs: currentTimeMs,
      durationMs: parsedDurationMs,
    });

    onSelectWord(nextWordId);
    setIsAddWordModalOpen(false);
  };

  return (
    <div
      ref={containerRef}
      class="flex h-full flex-col rounded border border-slate-300 bg-white"
    >
      <div class="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
            onClick={() =>
              onChangeZoom(Math.max(minZoomPxPerSecond, zoomPxPerSecond - 20))
            }
          >
            -
          </button>
          <button
            type="button"
            class="rounded border border-slate-300 px-2 py-1 text-xs"
            onClick={() => onChangeZoom(resolvedDefaultZoom)}
          >
            reset
          </button>
          <button
            type="button"
            class="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
            onClick={() =>
              onChangeZoom(Math.min(maxZoomPxPerSecond, zoomPxPerSecond + 20))
            }
          >
            +
          </button>
          <span class="text-xs text-slate-500">
            {Math.round(zoomPxPerSecond)} px/s
          </span>
          <span class="ml-2 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">
            Add target:{' '}
            {lanes.find((lane) => lane.id === activeLaneId)?.name ?? 'No lane'}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
            onClick={openAddWordModal}
            disabled={!activeLaneId}
          >
            Add word
          </button>
          <button
            type="button"
            class="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
            disabled={!canAddLane}
            onClick={onAddLane}
          >
            Add lane
          </button>
        </div>
      </div>

      <div ref={scrollContainerRef} class="relative grow overflow-auto">
        <div
          class="relative min-h-full"
          style={{ width: `${contentWidthPx + LABEL_WIDTH_PX}px` }}
        >
          <TimelineRuler
            durationMs={durationMs}
            zoomPxPerSecond={zoomPxPerSecond}
            labelWidthPx={LABEL_WIDTH_PX}
            contentWidthPx={contentWidthPx}
            onSeek={safeSeek}
            onClearSelection={() => onSelectWord(null)}
          />

          {lanes.map((lane) => (
            <TimelineLane
              key={lane.id}
              lane={lane}
              isActive={lane.id === activeLaneId}
              words={getLaneWords(words, lane.id)}
              selectedWordId={selectedWordId}
              durationMs={durationMs}
              zoomPxPerSecond={zoomPxPerSecond}
              labelWidthPx={LABEL_WIDTH_PX}
              contentWidthPx={contentWidthPx}
              onSeek={safeSeek}
              onSelectWord={onSelectWord}
              onRenameLane={onRenameLane}
              onActivateLane={setActiveLaneId}
              onWordDragStart={(event, word) =>
                handleWordPointerDown(event, word, 'move')
              }
              onWordResizeStart={(event, word) =>
                handleWordPointerDown(event, word, 'resize')
              }
            />
          ))}

          <div
            class="pointer-events-none absolute bottom-0 top-8 z-10 border-l-2 border-red-400"
            style={{ left: `${LABEL_WIDTH_PX + trackEndPx}px` }}
          >
            <span class="-ml-6 -mt-5 block rounded bg-red-50 px-1 text-[10px] font-medium text-red-600">
              END
            </span>
          </div>

          {contentWidthPx > trackEndPx && (
            <div
              class="pointer-events-none absolute bottom-0 top-8 z-0 bg-red-100/60"
              style={{
                left: `${LABEL_WIDTH_PX + trackEndPx}px`,
                width: `${contentWidthPx - trackEndPx}px`,
              }}
            />
          )}

          <TimelinePlayhead
            currentTimeMs={currentTimeMs}
            zoomPxPerSecond={zoomPxPerSecond}
            offsetLeftPx={LABEL_WIDTH_PX}
          />

          <button
            type="button"
            class="absolute top-0 z-30 h-full w-4 -translate-x-1/2 cursor-ew-resize"
            style={{
              left: `${LABEL_WIDTH_PX + msToPx(currentTimeMs, zoomPxPerSecond)}px`,
            }}
            aria-label="Drag playhead"
            onPointerDown={handlePlayheadPointerDown}
          />
        </div>
      </div>

      {isAddWordModalOpen && (
        <div class="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/50">
          <div class="w-80 rounded bg-white p-4 shadow-lg">
            <h3 class="text-sm font-semibold text-slate-800">Add word</h3>
            <p class="mt-1 text-xs text-slate-500">
              Add a timed word at the current playhead position.
            </p>

            <label
              for="timeline-add-word-text"
              class="mt-3 block text-xs font-medium text-slate-600"
            >
              Word text
            </label>
            <input
              id="timeline-add-word-text"
              class="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              value={newWordText}
              onInput={(event) => setNewWordText(event.currentTarget.value)}
            />

            <label
              for="timeline-add-word-duration"
              class="mt-3 block text-xs font-medium text-slate-600"
            >
              Duration (ms)
            </label>
            <input
              id="timeline-add-word-duration"
              class="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              value={newWordDurationMs}
              onInput={(event) =>
                setNewWordDurationMs(event.currentTarget.value)
              }
            />

            <div class="mt-4 flex justify-end gap-2">
              <button
                type="button"
                class="rounded border border-slate-300 px-2 py-1 text-xs"
                onClick={() => setIsAddWordModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                class="rounded bg-blue-600 px-2 py-1 text-xs text-white"
                onClick={submitAddWord}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
