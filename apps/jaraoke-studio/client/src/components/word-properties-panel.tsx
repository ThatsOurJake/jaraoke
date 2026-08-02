import type { TimelineWord } from './timeline';
import { normalizeWordTiming } from './timeline/helpers';

export interface WordPropertiesPanelProps {
  selectedWord: TimelineWord | null;
  songDurationMs: number;
  minWordDurationMs: number;
  onChangeWordTiming: (
    wordId: string,
    patch: { startMs?: number | null; endMs?: number | null },
  ) => void;
  onUpdateWordText: (wordId: string, text: string) => void;
}

export const WordPropertiesPanel = ({
  selectedWord,
  songDurationMs,
  minWordDurationMs,
  onChangeWordTiming,
  onUpdateWordText,
}: WordPropertiesPanelProps) => {
  return (
    <aside class="flex w-md shrink-0 min-h-0 flex-col rounded border border-slate-300 bg-white p-3">
      <h2 class="text-sm font-semibold">Word Properties</h2>
      {!selectedWord ? (
        <p class="mt-2 text-xs text-slate-500">
          Select a word in the timeline to edit it.
        </p>
      ) : (
        <div class="mt-3 flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
          {normalizeWordTiming(selectedWord.startMs ?? 0, selectedWord.endMs)
            .endMs > songDurationMs && (
            <p class="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-700">
              Warning: This word extends outside the song duration and will be
              skipped at export.
            </p>
          )}

          <label class="block text-xs font-medium text-slate-600">
            Lyric
            <input
              class="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              value={selectedWord.text}
              onInput={(event) =>
                onUpdateWordText(selectedWord.id, event.currentTarget.value)
              }
            />
          </label>

          <label class="block text-xs font-medium text-slate-600">
            Start (ms)
            <input
              type="number"
              class="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              value={Math.round(selectedWord.startMs ?? 0)}
              onInput={(event) => {
                const value = Number(event.currentTarget.value);
                if (!Number.isFinite(value)) {
                  return;
                }

                onChangeWordTiming(selectedWord.id, { startMs: value });
              }}
            />
          </label>

          <label class="block text-xs font-medium text-slate-600">
            Duration (ms)
            <input
              type="number"
              class="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              value={Math.round(
                normalizeWordTiming(
                  selectedWord.startMs ?? 0,
                  selectedWord.endMs,
                ).endMs - (selectedWord.startMs ?? 0),
              )}
              onInput={(event) => {
                const value = Number(event.currentTarget.value);
                if (!Number.isFinite(value) || value < minWordDurationMs) {
                  return;
                }

                const startMs = selectedWord.startMs ?? 0;
                onChangeWordTiming(selectedWord.id, {
                  endMs: startMs + value,
                });
              }}
            />
          </label>
        </div>
      )}
    </aside>
  );
};
