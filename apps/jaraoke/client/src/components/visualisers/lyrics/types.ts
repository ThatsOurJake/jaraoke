import type { LyricDisplayType, PhraseEffect } from 'jaraoke-shared/types';

export interface PreparedSyllable {
  phrase: string;
  startAtMs: number;
  durationMs?: number;
  effect: PhraseEffect;
}

export interface PreparedWord {
  syllables: PreparedSyllable[];
}

export interface PreparedLine {
  startAtMs: number;
  firstSyllableStartAtMs: number;
  singUntilMs: number;
  holdUntilMs: number;
  displayName: string;
  words: PreparedWord[];
}

export interface PreparedLane {
  lines: PreparedLine[];
}

export interface LaneScrollState {
  fromIndex: number;
  toIndex: number;
  changedAtMs: number;
}

export interface LineRenderStyle {
  opacity: number;
  fontScale: number;
  highlight: boolean;
}

export type LaneRole = 'past' | 'active' | 'next' | 'future';

export interface LaneRow {
  index: number;
  offset: number;
  role: LaneRole;
}

export interface LaneRowsResult {
  rows: LaneRow[];
  focusIndex: number;
}

export interface InstrumentalBreakState {
  progress: number;
  remainingMs: number;
}

export interface IntroOverlay {
  titleVisible: boolean;
  title: string;
  artist?: string;
  duration?: number;
}

export interface LyricsRenderFrame {
  showLyrics: boolean;
  songTimeMs: number;
  overlay: IntroOverlay;
}

export type LaneScrollStateByDisplayType = Record<
  LyricDisplayType,
  LaneScrollState
>;
