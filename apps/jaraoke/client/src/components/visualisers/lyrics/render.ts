import type { Lyric, LyricDisplayType } from 'jaraoke-shared/types';
import {
  LYRIC_INSTRUMENTAL_BAR_END_EARLY_MS,
  LYRIC_NEXT_LINE_PREVIEW_WINDOW_MS,
  LYRIC_POST_SING_HOLD_MS,
} from '../../../constants';
import { LyricsCanvasDrawer } from './canvas-drawer';
import { resolveInstrumentalBreakState } from './instrumental-break';
import { resolveLaneRows, findCurrentLineIndex } from './lane-state';
import { buildPreparedLyricsState } from './lane-prep';
import type {
  InstrumentalBreakState,
  LaneRow,
  LaneScrollStateByDisplayType,
  LineRenderStyle,
  LyricsRenderFrame,
  PreparedLane,
} from './types';

export type { IntroOverlay, LyricsRenderFrame } from './types';

const MAX_VISIBLE_LINES_PER_LANE = 4;
const MAX_VISIBLE_TRANSLATION_LINES = 2;
const SCROLL_TRANSITION_MS = 400;
const FOCUS_REGRESSION_GUARD_MS = 140;
const INSTRUMENTAL_BREAK_THRESHOLD_MS = 8_000;
const DUET_LANE_FONT_SCALE = 0.88;
const DUET_LANE_GAP_RATIO = 1.18;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const cubicBezierOut = (t: number) => {
  const clamped = clamp(t, 0, 1);
  const u = 1 - clamped;
  const y1 = 1;
  const y2 = 1;

  return (
    3 * u * u * clamped * y1 +
    3 * u * clamped * clamped * y2 +
    clamped * clamped * clamped
  );
};

export class JaraokeLyricsRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private drawer: LyricsCanvasDrawer;
  private lanes: Record<LyricDisplayType, PreparedLane>;
  private laneTimelineBounds: Record<
    LyricDisplayType,
    { starts: number[]; holds: number[] }
  >;
  private timelineStarts: number[];
  private timelineHolds: number[];
  private laneScrollState: LaneScrollStateByDisplayType;

  constructor(canvas: HTMLCanvasElement, lyrics: Lyric[]) {
    this.canvas = canvas;
    const context = this.canvas.getContext('2d');

    if (!context) {
      throw new Error('Could not get 2D context from canvas');
    }

    this.ctx = context;
    this.drawer = new LyricsCanvasDrawer(this.canvas, this.ctx);

    const prepared = buildPreparedLyricsState(lyrics, LYRIC_POST_SING_HOLD_MS);
    this.lanes = prepared.lanes;
    this.timelineStarts = prepared.timelineStarts;
    this.timelineHolds = prepared.timelineHolds;
    this.laneTimelineBounds = prepared.laneTimelineBounds;

    this.laneScrollState = {
      top: { fromIndex: -1, toIndex: -1, changedAtMs: 0 },
      bottom: { fromIndex: -1, toIndex: -1, changedAtMs: 0 },
      translation: { fromIndex: -1, toIndex: -1, changedAtMs: 0 },
    };

    this.resize();
  }

  public resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.drawer.onResize();
  }

  public render(frame: LyricsRenderFrame): void {
    this.drawer.clear();

    if (frame.showLyrics) {
      this.drawLyrics(frame.songTimeMs);
    }

    if (frame.overlay.titleVisible) {
      this.drawer.drawTitleCard(frame.overlay);
    }
  }

  private drawLyrics(songTimeMs: number): void {
    this.drawer.drawBackdropVignette();

    const hasTop = this.lanes.top.lines.length > 0;
    const hasBottom = this.lanes.bottom.lines.length > 0;
    const hasTranslation = this.lanes.translation.lines.length > 0;
    const isDuetLayout = hasTop && hasBottom;

    if (isDuetLayout) {
      const topAnchorY = this.canvas.height * 0.28;
      const bottomAnchorY = this.canvas.height * 0.72;
      const topBreak = this.resolveLaneInstrumentalBreak('top', songTimeMs);
      const bottomBreak = this.resolveLaneInstrumentalBreak('bottom', songTimeMs);

      this.drawDuetLane('top', songTimeMs, topAnchorY, topBreak);
      this.drawDuetLane('bottom', songTimeMs, bottomAnchorY, bottomBreak);

      if (hasTranslation) {
        this.drawTranslationLines(songTimeMs);
      }

      return;
    }

    const instrumentalBreak = this.resolveInstrumentalBreak(songTimeMs);

    if (instrumentalBreak) {
      this.drawer.drawInstrumentalBreak(instrumentalBreak);
      return;
    }

    const primaryDisplayType: LyricDisplayType = hasTop
      ? 'top'
      : hasBottom
        ? 'bottom'
        : 'translation';
    const primaryAnchorY = this.canvas.height * 0.5;

    this.drawLane(primaryDisplayType, songTimeMs, primaryAnchorY, false);

    if (hasTranslation && primaryDisplayType !== 'translation') {
      this.drawTranslationLines(songTimeMs);
    }
  }

  private resolveInstrumentalBreak(songTimeMs: number): InstrumentalBreakState | null {
    return resolveInstrumentalBreakState({
      songTimeMs,
      timelineStarts: this.timelineStarts,
      timelineHolds: this.timelineHolds,
      breakThresholdMs: INSTRUMENTAL_BREAK_THRESHOLD_MS,
      barEndEarlyMs: LYRIC_INSTRUMENTAL_BAR_END_EARLY_MS,
    });
  }

  private resolveLaneInstrumentalBreak(
    displayType: 'top' | 'bottom',
    songTimeMs: number,
  ): InstrumentalBreakState | null {
    const timeline = this.laneTimelineBounds[displayType];

    return resolveInstrumentalBreakState({
      songTimeMs,
      timelineStarts: timeline.starts,
      timelineHolds: timeline.holds,
      breakThresholdMs: INSTRUMENTAL_BREAK_THRESHOLD_MS,
      barEndEarlyMs: LYRIC_INSTRUMENTAL_BAR_END_EARLY_MS,
    });
  }

  private drawDuetLane(
    displayType: 'top' | 'bottom',
    songTimeMs: number,
    anchorY: number,
    laneBreak: InstrumentalBreakState | null,
  ): void {
    const lineFontSize = this.resolveLaneFontSize(displayType, true);
    const displayName = this.resolveDuetLaneDisplayName(displayType, songTimeMs);

    if (displayName) {
      this.drawer.drawSingerLabel(displayName, displayType, anchorY, lineFontSize);
    }

    if (!laneBreak) {
      this.drawLane(displayType, songTimeMs, anchorY, false, lineFontSize, true);
      return;
    }

    this.drawer.drawLaneInstrumentalBreak(laneBreak, anchorY);
  }

  private resolveDuetLaneDisplayName(
    displayType: 'top' | 'bottom',
    songTimeMs: number,
  ): string {
    const lane = this.lanes[displayType];

    if (lane.lines.length === 0) {
      return '';
    }

    const currentIndex = findCurrentLineIndex(lane, songTimeMs);
    const fallbackIndex = lane.lines.findIndex(
      (line) => line.firstSyllableStartAtMs >= songTimeMs,
    );
    const lineIndex =
      currentIndex >= 0
        ? currentIndex
        : fallbackIndex >= 0
          ? fallbackIndex
          : lane.lines.length - 1;

    return lane.lines[lineIndex]?.displayName || '';
  }

  private drawTranslationLines(songTimeMs: number): void {
    const lane = this.lanes.translation;

    if (lane.lines.length === 0) {
      return;
    }

    const currentIndex = findCurrentLineIndex(lane, songTimeMs);
    const previewIndices = this.findTranslationPreviewIndices(
      lane,
      songTimeMs,
      currentIndex,
      MAX_VISIBLE_TRANSLATION_LINES,
    );
    const rows: Array<{ index: number; role: 'active' | 'next' }> = [];

    if (currentIndex >= 0) {
      rows.push({ index: currentIndex, role: 'active' });
    }

    for (const index of previewIndices) {
      if (rows.length >= MAX_VISIBLE_TRANSLATION_LINES) {
        break;
      }

      rows.push({ index, role: 'next' });
    }

    if (rows.length === 0) {
      return;
    }

    const translationFont = this.drawer.resolveFontSize('translation');
    const topY = Math.max(34, Math.round(this.canvas.height * 0.1));
    const lineGap = Math.max(24, Math.round(translationFont * 1.2));

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const translationLine = lane.lines[row.index];
      const style =
        row.role === 'active'
          ? this.resolveLineStyle('active', 'translation', false)
          : this.resolveLineStyle('next', 'translation', false);

      this.drawer.drawPreparedLine(
        translationLine,
        'translation',
        topY + rowIndex * lineGap,
        songTimeMs,
        style,
      );
    }
  }

  private findTranslationPreviewIndices(
    lane: PreparedLane,
    songTimeMs: number,
    currentIndex: number,
    maxCount: number,
  ): number[] {
    const output: number[] = [];
    const startIndex = currentIndex >= 0 ? currentIndex + 1 : 0;

    for (let index = startIndex; index < lane.lines.length; index++) {
      const line = lane.lines[index];
      const delta = line.firstSyllableStartAtMs - songTimeMs;

      if (delta < 0) {
        continue;
      }

      if (delta > LYRIC_NEXT_LINE_PREVIEW_WINDOW_MS) {
        break;
      }

      output.push(index);

      if (output.length >= maxCount) {
        break;
      }
    }

    return output;
  }

  private drawLane(
    displayType: LyricDisplayType,
    songTimeMs: number,
    anchorY: number,
    showSingerLabel: boolean,
    resolvedFontSize = this.resolveLaneFontSize(displayType, false),
    isDuetLane = false,
  ): void {
    const lane = this.lanes[displayType];

    if (lane.lines.length === 0) {
      return;
    }

    const laneRows = resolveLaneRows({
      lane,
      songTimeMs,
      previousFocusIndex: this.laneScrollState[displayType].toIndex,
      maxVisibleLines: MAX_VISIBLE_LINES_PER_LANE,
      previewWindowMs: LYRIC_NEXT_LINE_PREVIEW_WINDOW_MS,
      focusRegressionGuardMs: FOCUS_REGRESSION_GUARD_MS,
    });

    if (laneRows.rows.length === 0) {
      return;
    }

    const fontSize = resolvedFontSize;
    const lineGap = Math.max(
      24,
      Math.round(fontSize * (isDuetLane ? DUET_LANE_GAP_RATIO : 1.28)),
    );
    const animatedOffsetRows = this.resolveAnimatedOffsetRows(
      displayType,
      laneRows.focusIndex,
      songTimeMs,
    );

    if (showSingerLabel) {
      const focusLine =
        laneRows.focusIndex >= 0 ? lane.lines[laneRows.focusIndex] : null;
      const topVisibleLineY = laneRows.rows.reduce(
        (minY, row) =>
          Math.min(
            minY,
            anchorY + (row.offset + animatedOffsetRows) * lineGap,
          ),
        anchorY,
      );

      if (focusLine?.displayName) {
        this.drawer.drawSingerLabel(
          focusLine.displayName,
          displayType,
          topVisibleLineY,
          fontSize,
        );
      }
    }

    for (const row of laneRows.rows) {
      const line = lane.lines[row.index];
      const y = anchorY + (row.offset + animatedOffsetRows) * lineGap;
      const style = this.resolveLineStyle(
        row.role,
        displayType,
        songTimeMs <= line.singUntilMs,
      );

      this.drawer.drawPreparedLine(line, displayType, y, songTimeMs, style);
    }
  }

  private resolveLaneFontSize(
    displayType: LyricDisplayType,
    isDuetLane: boolean,
  ): number {
    const baseFontSize = this.drawer.resolveFontSize(displayType);

    if (isDuetLane && displayType !== 'translation') {
      return Math.max(24, Math.round(baseFontSize * DUET_LANE_FONT_SCALE));
    }

    return baseFontSize;
  }

  private resolveAnimatedOffsetRows(
    displayType: LyricDisplayType,
    focusIndex: number,
    songTimeMs: number,
  ): number {
    const state = this.laneScrollState[displayType];

    if (focusIndex !== state.toIndex) {
      state.fromIndex = state.toIndex;
      state.toIndex = focusIndex;
      state.changedAtMs = songTimeMs;
    }

    if (state.fromIndex < 0 || state.toIndex < 0) {
      return 0;
    }

    const delta = state.toIndex - state.fromIndex;

    if (delta === 0) {
      return 0;
    }

    const elapsed = songTimeMs - state.changedAtMs;
    const progress = clamp(elapsed / SCROLL_TRANSITION_MS, 0, 1);
    const eased = cubicBezierOut(progress);
    const direction = delta > 0 ? 1 : -1;

    return direction * (1 - eased);
  }

  private resolveLineStyle(
    role: LaneRow['role'],
    displayType: LyricDisplayType,
    isStillSinging: boolean,
  ): LineRenderStyle {
    if (displayType === 'translation') {
      if (role === 'active') {
        return {
          opacity: 0.78,
          fontScale: 0.92,
          highlight: false,
        };
      }

      if (role === 'next') {
        return {
          opacity: 0.5,
          fontScale: 0.9,
          highlight: false,
        };
      }

      return {
        opacity: 0.28,
        fontScale: 0.88,
        highlight: false,
      };
    }

    if (role === 'active') {
      return {
        opacity: 1,
        fontScale: 1.08,
        highlight: true,
      };
    }

    if (role === 'next') {
      return {
        opacity: 0.5,
        fontScale: 0.94,
        highlight: false,
      };
    }

    if (role === 'future') {
      return {
        opacity: 0.3,
        fontScale: 0.9,
        highlight: false,
      };
    }

    if (isStillSinging) {
      return {
        opacity: 0.58,
        fontScale: 0.92,
        highlight: true,
      };
    }

    return {
      opacity: 0.2,
      fontScale: 0.9,
      highlight: false,
    };
  }
}
