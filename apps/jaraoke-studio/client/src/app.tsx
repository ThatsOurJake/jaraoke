import { KaraokeTimeline } from './components/timeline';
import { WordPropertiesPanel } from './components/word-properties-panel';
import {
  DEFAULT_ZOOM_PX_PER_SECOND,
  MAX_LANES,
  MIN_WORD_DURATION_MS,
  SONG_DURATION_MS,
  useTimelineStore,
} from './stores/timeline-store';

export const App = () => {
  const {
    lanes,
    words,
    selectedWord,
    selectedWordId,
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
  } = useTimelineStore();

  return (
    <main class="flex h-full flex-col bg-slate-50 text-slate-800">
      <div class="flex min-h-0 grow border-b border-slate-300">
        <div class="w-2/5 border-r border-slate-300 p-4">
          <div class="aspect-video rounded border border-slate-300 bg-white p-3">
            <h2 class="text-sm font-semibold">Visualiser</h2>
            <p class="mt-2 text-xs text-slate-500">
              Preview renderer lives outside this MVP.
            </p>
          </div>
        </div>
        <div class="w-3/5 p-4">
          <div class="rounded border border-slate-300 bg-white p-3">
            <h2 class="text-sm font-semibold">File Explorer</h2>
            <p class="mt-2 text-xs text-slate-500">
              Project and lyric file tools come next.
            </p>
          </div>
        </div>
      </div>

      <div class="flex h-[42%] min-h-80 gap-3 p-3">
        <div class="min-w-0 grow">
          <KaraokeTimeline
            durationMs={SONG_DURATION_MS}
            currentTimeMs={currentTimeMs}
            maxLanes={MAX_LANES}
            lanes={lanes}
            words={words}
            selectedWordId={selectedWordId}
            zoomPxPerSecond={zoomPxPerSecond}
            defaultZoomPxPerSecond={DEFAULT_ZOOM_PX_PER_SECOND}
            onSeek={setCurrentTimeMs}
            onSelectWord={setSelectedWordId}
            onChangeWordTiming={changeWordTiming}
            onAddLane={addLane}
            onRenameLane={renameLane}
            onChangeZoom={setZoomPxPerSecond}
            onAddWord={addWord}
          />
        </div>

        <WordPropertiesPanel
          selectedWord={selectedWord}
          songDurationMs={SONG_DURATION_MS}
          minWordDurationMs={MIN_WORD_DURATION_MS}
          onChangeWordTiming={changeWordTiming}
          onUpdateWordText={updateWordText}
        />
      </div>
    </main>
  );
};
