import type { TargetedPointerEvent } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { isWordOutOfBounds, pxToMs } from './helpers';
import { TimelineWordBlock } from './timeline-word-block';
import type { TimelineLane as TimelineLaneModel, TimelineWord } from './types';

export interface TimelineLaneProps {
  lane: TimelineLaneModel;
  isActive: boolean;
  words: TimelineWord[];
  selectedWordId: string | null;
  durationMs: number;
  zoomPxPerSecond: number;
  labelWidthPx: number;
  contentWidthPx: number;
  onSeek: (timeMs: number) => void;
  onSelectWord: (wordId: string | null) => void;
  onRenameLane: (laneId: string, name: string) => void;
  onActivateLane: (laneId: string) => void;
  onWordDragStart: (
    event: TargetedPointerEvent<HTMLElement>,
    word: TimelineWord,
  ) => void;
  onWordResizeStart: (
    event: TargetedPointerEvent<HTMLElement>,
    word: TimelineWord,
  ) => void;
}

export const TimelineLane = ({
  lane,
  isActive,
  words,
  selectedWordId,
  durationMs,
  zoomPxPerSecond,
  labelWidthPx,
  contentWidthPx,
  onSeek,
  onSelectWord,
  onRenameLane,
  onActivateLane,
  onWordDragStart,
  onWordResizeStart,
}: TimelineLaneProps) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(lane.name);
  const laneNameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraftName(lane.name);
  }, [lane.name]);

  useEffect(() => {
    if (!isEditingName) {
      return;
    }

    laneNameInputRef.current?.focus();
  }, [isEditingName]);

  const seekLaneFromClientX = (clientX: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const seekTimeMs = pxToMs(clientX - rect.left, zoomPxPerSecond);
    onSeek(seekTimeMs);
    onSelectWord(null);
    onActivateLane(lane.id);
  };

  const commitRename = () => {
    const nextName = draftName.trim();
    if (nextName.length > 0 && nextName !== lane.name) {
      onRenameLane(lane.id, nextName);
    }

    setDraftName(lane.name);
    setIsEditingName(false);
  };

  const cancelRename = () => {
    setDraftName(lane.name);
    setIsEditingName(false);
  };

  return (
    <div class="relative flex h-14 border-b border-slate-200">
      <div
        class={[
          'sticky left-0 z-10 flex h-full items-center border-r border-slate-300 px-2 transition-colors',
          isActive
            ? 'bg-blue-100 ring-1 ring-inset ring-blue-500'
            : lane.enabled
              ? 'bg-white'
              : 'bg-slate-200 text-slate-500',
        ].join(' ')}
        style={{ width: `${labelWidthPx}px`, minWidth: `${labelWidthPx}px` }}
      >
        <button
          type="button"
          class="absolute inset-0 z-0"
          aria-label={`Select lane ${lane.name}`}
          onClick={() => onActivateLane(lane.id)}
        />

        <div class="relative z-10 w-full">
          {isEditingName ? (
            <input
              ref={laneNameInputRef}
              class="w-full rounded border border-slate-300 px-2 py-1 text-xs"
              value={draftName}
              onInput={(event) => setDraftName(event.currentTarget.value)}
              onBlur={commitRename}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitRename();
                }

                if (event.key === 'Escape') {
                  event.preventDefault();
                  cancelRename();
                }
              }}
            />
          ) : (
            <button
              class={[
                'w-full truncate rounded px-2 py-1 text-left text-xs font-medium',
                isActive ? 'text-blue-900' : '',
              ].join(' ')}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onActivateLane(lane.id);
                setIsEditingName(true);
              }}
            >
              {lane.name}
            </button>
          )}
        </div>
      </div>

      <div
        class={[
          'relative h-full transition-colors',
          isActive ? 'bg-blue-50/40' : '',
          lane.enabled ? 'bg-white' : 'bg-slate-100',
        ].join(' ')}
        style={{
          width: `${contentWidthPx}px`,
          minWidth: `${contentWidthPx}px`,
        }}
      >
        <button
          type="button"
          class="absolute inset-0 z-0"
          aria-label={`Seek timeline lane ${lane.name}`}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const clickClientX =
              event.detail === 0 ? rect.left + rect.width / 2 : event.clientX;
            seekLaneFromClientX(clickClientX, event.currentTarget);
          }}
        />

        {words.map((word) => (
          <TimelineWordBlock
            key={word.id}
            word={word}
            isSelected={selectedWordId === word.id}
            isOutOfBounds={isWordOutOfBounds(word, durationMs)}
            zoomPxPerSecond={zoomPxPerSecond}
            laneColor={lane.color}
            onClick={(wordId) => {
              onSelectWord(wordId);
              onActivateLane(lane.id);
            }}
            onDragStart={onWordDragStart}
            onResizeStart={onWordResizeStart}
          />
        ))}
      </div>
    </div>
  );
};
