export type TimelineLaneId = string;

export interface TimelineWord {
  id: string;
  laneId: TimelineLaneId;
  text: string;
  startMs: number | null;
  endMs: number | null;
  order: number;
}

export interface TimelineLane {
  id: TimelineLaneId;
  name: string;
  color: string;
  enabled: boolean;
}

export interface AddWordDraft {
  id: string;
  laneId: TimelineLaneId;
  text: string;
  startMs: number;
  durationMs: number;
}

export interface KaraokeTimelineProps {
  durationMs: number;
  currentTimeMs: number;
  maxLanes: number;
  lanes: TimelineLane[];
  words: TimelineWord[];
  selectedWordId: string | null;
  zoomPxPerSecond: number;
  defaultZoomPxPerSecond?: number;
  minZoomPxPerSecond?: number;
  maxZoomPxPerSecond?: number;
  onSeek: (timeMs: number) => void;
  onSelectWord: (wordId: string | null) => void;
  onChangeWordTiming: (
    wordId: string,
    patch: { startMs?: number | null; endMs?: number | null },
  ) => void;
  onAddLane: () => void;
  onRenameLane: (laneId: TimelineLaneId, name: string) => void;
  onChangeZoom: (nextZoomPxPerSecond: number) => void;
  onAddWord: (draft: AddWordDraft) => void;
}
