import type {
  Lyric,
  LyricDisplayType,
  LyricSyllable,
  PhraseEffect,
} from 'jaraoke-shared/types';
import { LYRIC_COLOURS } from '../../../constants';

const DEFAULT_FILL_DURATION_MS = 1_000;
const DEFAULT_LINE_DURATION_MS = 2_000;
const WORD_SPACING_RATIO = 0.4;
const BASE_FONT_FAMILY = 'Impact, Haettenschweiler, sans-serif';
const BASE_OUTLINE_COLOUR = 'rgba(0, 0, 0, 0.9)';
const BASE_INACTIVE_COLOUR = 'rgba(255, 255, 255, 0.65)';

interface PreparedSyllable {
  phrase: string;
  startAtMs: number;
  durationMs?: number;
  effect: PhraseEffect;
}

interface PreparedWord {
  syllables: PreparedSyllable[];
}

interface PreparedLine {
  startAtMs: number;
  endAtMs: number;
  words: PreparedWord[];
}

interface PreparedLane {
  lines: PreparedLine[];
  starts: number[];
}

export interface IntroOverlay {
  titleVisible: boolean;
  title: string;
  artist?: string;
  duration?: number;
  countdownValue?: number;
}

export interface LyricsRenderFrame {
  showLyrics: boolean;
  songTimeMs: number;
  overlay: IntroOverlay;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export class JaraokeLyricsRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private textWidthCache = new Map<string, number>();
  private lanes: Record<LyricDisplayType, PreparedLane>;

  constructor(canvas: HTMLCanvasElement, lyrics: Lyric[]) {
    this.canvas = canvas;
    const context = this.canvas.getContext('2d');

    if (!context) {
      throw new Error('Could not get 2D context from canvas');
    }

    this.ctx = context;
    this.lanes = this.buildLanes(lyrics);
    this.resize();
  }

  public resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
  }

  public render(frame: LyricsRenderFrame): void {
    this.clear();

    if (frame.showLyrics) {
      this.drawLyrics(frame.songTimeMs);
    }

    if (frame.overlay.titleVisible) {
      this.drawTitleCard(frame.overlay);
    }

    if (typeof frame.overlay.countdownValue === 'number') {
      this.drawCountdown(frame.overlay.countdownValue);
    }
  }

  private buildLanes(lyrics: Lyric[]): Record<LyricDisplayType, PreparedLane> {
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
              .map((syllable) => this.prepareSyllable(syllable))
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
        const fallbackLineEnd =
          lastSyllableStart + DEFAULT_LINE_DURATION_MS;
        const endAtMs = nextLineStart || fallbackLineEnd;
        const resolvedWords = this.resolveSyllableDurations(words, endAtMs);

        laneLines[lyric.displayType].push({
          startAtMs: line.startAtMs,
          endAtMs: Math.max(endAtMs, line.startAtMs + DEFAULT_LINE_DURATION_MS),
          words: resolvedWords,
        });
      }
    }

    const buildLane = (displayType: LyricDisplayType): PreparedLane => {
      const lines = laneLines[displayType].sort((a, b) => a.startAtMs - b.startAtMs);

      return {
        starts: lines.map((line) => line.startAtMs),
        lines,
      };
    };

    return {
      top: buildLane('top'),
      bottom: buildLane('bottom'),
      translation: buildLane('translation'),
    };
  }

  private prepareSyllable(syllable: LyricSyllable): PreparedSyllable {
    return {
      phrase: syllable.phrase.trim(),
      startAtMs: syllable.startAtMs,
      durationMs:
        typeof syllable.durationMs === 'number' && syllable.durationMs > 0
          ? syllable.durationMs
          : undefined,
      effect: syllable.effect,
    };
  }

  private resolveSyllableDurations(words: PreparedWord[], lineEndAtMs: number) {
    return words.map((word, wordIndex) => {
      const syllables = word.syllables.map((syllable, syllableIndex) => {
        const explicitDuration = syllable.durationMs;

        if (typeof explicitDuration === 'number') {
          return {
            ...syllable,
            durationMs: explicitDuration,
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
          durationMs: undefined,
        };
      });

      return {
        syllables,
      };
    });
  }

  private clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawLyrics(songTimeMs: number): void {
    this.drawLaneLine('top', songTimeMs, this.canvas.height * 0.72);
    this.drawLaneLine('bottom', songTimeMs, this.canvas.height * 0.84);
    this.drawLaneLine('translation', songTimeMs, this.canvas.height * 0.62);
  }

  private drawLaneLine(
    displayType: LyricDisplayType,
    songTimeMs: number,
    y: number,
  ): void {
    const lane = this.lanes[displayType];
    const activeLine = this.findActiveLine(lane, songTimeMs);

    if (!activeLine) {
      return;
    }

    const fontSize = this.resolveFontSize(displayType);
    const wordSpacing = Math.round(fontSize * WORD_SPACING_RATIO);
    const activeColour = this.resolveActiveColour(displayType);
    const inactiveColour =
      displayType === 'translation' ? 'rgba(220, 220, 220, 0.6)' : BASE_INACTIVE_COLOUR;
    const lineWidth = this.measureLineWidth(activeLine, fontSize, wordSpacing);
    let currentX = this.canvas.width / 2 - lineWidth / 2;

    this.ctx.font = `700 ${fontSize}px ${BASE_FONT_FAMILY}`;
    this.ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.1));
    this.ctx.strokeStyle = BASE_OUTLINE_COLOUR;

    for (let wordIndex = 0; wordIndex < activeLine.words.length; wordIndex++) {
      const word = activeLine.words[wordIndex];

      for (const syllable of word.syllables) {
        const textWidth = this.measureTextWidth(syllable.phrase, fontSize);

        this.ctx.strokeText(syllable.phrase, currentX, y);
        this.ctx.fillStyle = inactiveColour;
        this.ctx.fillText(syllable.phrase, currentX, y);

        this.drawActiveSyllable(
          syllable,
          currentX,
          y,
          textWidth,
          songTimeMs,
          activeColour,
        );

        currentX += textWidth;
      }

      if (wordIndex < activeLine.words.length - 1) {
        currentX += wordSpacing;
      }
    }
  }

  private drawActiveSyllable(
    syllable: PreparedSyllable,
    x: number,
    y: number,
    width: number,
    songTimeMs: number,
    activeColour: string,
  ): void {
    if (songTimeMs < syllable.startAtMs) {
      return;
    }

    const durationMs = syllable.durationMs;
    const useFill = syllable.effect === 'fill' && typeof durationMs === 'number';

    if (!useFill) {
      this.ctx.fillStyle = activeColour;
      this.ctx.fillText(syllable.phrase, x, y);
      return;
    }

    const safeDuration = Math.max(1, durationMs || DEFAULT_FILL_DURATION_MS);
    const fillRatio = clamp((songTimeMs - syllable.startAtMs) / safeDuration, 0, 1);

    if (fillRatio <= 0) {
      return;
    }

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(x, y - this.resolveClipHeight(), width * fillRatio, this.resolveClipHeight() * 2);
    this.ctx.clip();
    this.ctx.fillStyle = activeColour;
    this.ctx.fillText(syllable.phrase, x, y);
    this.ctx.restore();
  }

  private resolveClipHeight(): number {
    return Math.round(this.canvas.height * 0.06);
  }

  private findActiveLine(lane: PreparedLane, songTimeMs: number): PreparedLine | null {
    if (lane.lines.length === 0) {
      return null;
    }

    let low = 0;
    let high = lane.starts.length - 1;
    let candidate = -1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);

      if (lane.starts[mid] <= songTimeMs) {
        candidate = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    if (candidate < 0) {
      return null;
    }

    const line = lane.lines[candidate];

    if (songTimeMs > line.endAtMs) {
      return null;
    }

    return line;
  }

  private measureLineWidth(line: PreparedLine, fontSize: number, wordSpacing: number): number {
    let width = 0;

    for (let wordIndex = 0; wordIndex < line.words.length; wordIndex++) {
      const word = line.words[wordIndex];

      for (const syllable of word.syllables) {
        width += this.measureTextWidth(syllable.phrase, fontSize);
      }

      if (wordIndex < line.words.length - 1) {
        width += wordSpacing;
      }
    }

    return width;
  }

  private measureTextWidth(text: string, fontSize: number): number {
    const cacheKey = `${fontSize}:${text}`;
    const existing = this.textWidthCache.get(cacheKey);

    if (typeof existing === 'number') {
      return existing;
    }

    this.ctx.font = `700 ${fontSize}px ${BASE_FONT_FAMILY}`;
    const width = this.ctx.measureText(text).width;
    this.textWidthCache.set(cacheKey, width);

    return width;
  }

  private resolveFontSize(displayType: LyricDisplayType): number {
    if (displayType === 'translation') {
      return Math.max(26, Math.round(this.canvas.height * 0.045));
    }

    return Math.max(32, Math.round(this.canvas.height * 0.06));
  }

  private resolveActiveColour(displayType: LyricDisplayType): string {
    if (displayType === 'bottom') {
      return LYRIC_COLOURS.personTwo;
    }

    if (displayType === 'translation') {
      return LYRIC_COLOURS.translation;
    }

    return LYRIC_COLOURS.personOne;
  }

  private drawTitleCard(overlay: IntroOverlay): void {
    const cardWidth = Math.min(620, Math.round(this.canvas.width * 0.75));
    const cardHeight = 150;
    const x = (this.canvas.width - cardWidth) / 2;
    const y = this.canvas.height * 0.16;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    this.roundRect(x, y, cardWidth, cardHeight, 14, true);

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = `700 42px ${BASE_FONT_FAMILY}`;
    this.ctx.fillText(overlay.title, this.canvas.width / 2, y + 52);

    this.ctx.font = `500 26px ${BASE_FONT_FAMILY}`;
    const artist = overlay.artist?.trim() || 'Unknown Artist';
    this.ctx.fillText(artist, this.canvas.width / 2, y + 96);

    if (typeof overlay.duration === 'number' && overlay.duration > 0) {
      this.ctx.font = `500 20px ${BASE_FONT_FAMILY}`;
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      this.ctx.fillText(
        `Duration ${this.formatDuration(overlay.duration)}`,
        this.canvas.width / 2,
        y + 126,
      );
    }

    this.ctx.restore();
  }

  private drawCountdown(value: number): void {
    this.ctx.save();
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.font = `700 126px ${BASE_FONT_FAMILY}`;
    this.ctx.lineWidth = 8;
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.92)';
    this.ctx.strokeText(String(value), this.canvas.width / 2, this.canvas.height * 0.5);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText(String(value), this.canvas.width / 2, this.canvas.height * 0.5);
    this.ctx.restore();
  }

  private formatDuration(durationSeconds: number): string {
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = Math.floor(durationSeconds % 60)
      .toString()
      .padStart(2, '0');

    return `${minutes}:${seconds}`;
  }

  private roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fill: boolean,
  ): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();

    if (fill) {
      this.ctx.fill();
    }
  }
}
