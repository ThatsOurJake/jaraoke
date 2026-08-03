import type { LyricDisplayType } from 'jaraoke-shared/types';
import { LYRIC_COLOURS } from '../../../constants';
import type {
  InstrumentalBreakState,
  IntroOverlay,
  LineRenderStyle,
  PreparedLine,
  PreparedSyllable,
} from './types';

const DEFAULT_FILL_DURATION_MS = 1_000;
const WORD_SPACING_RATIO = 0.4;
const BASE_FONT_FAMILY =
  'Montserrat, "SF Pro Text", "Avenir Next", "Segoe UI", sans-serif';
const BASE_OUTLINE_COLOUR = 'rgba(0, 0, 0, 0.9)';
const BASE_INACTIVE_COLOUR = 'rgba(255, 255, 255, 0.65)';

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export class LyricsCanvasDrawer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private textWidthCache = new Map<string, number>();
  private backdropGradient: CanvasGradient | null = null;
  private backdropGradientWidth = 0;
  private backdropGradientHeight = 0;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  public onResize(): void {
    this.backdropGradient = null;
  }

  public clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public drawBackdropVignette(): void {
    if (
      !this.backdropGradient ||
      this.backdropGradientWidth !== this.canvas.width ||
      this.backdropGradientHeight !== this.canvas.height
    ) {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const radius = Math.max(this.canvas.width, this.canvas.height) * 0.75;
      const gradient = this.ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.2,
        centerX,
        centerY,
        radius,
      );

      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.75)');

      this.backdropGradient = gradient;
      this.backdropGradientWidth = this.canvas.width;
      this.backdropGradientHeight = this.canvas.height;
    }

    this.ctx.save();
    this.ctx.fillStyle = this.backdropGradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  public drawInstrumentalBreak(state: InstrumentalBreakState): void {
    const barWidth = Math.min(420, Math.round(this.canvas.width * 0.55));
    const barHeight = 12;
    const x = (this.canvas.width - barWidth) / 2;
    const y = this.canvas.height * 0.52;

    this.ctx.save();
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    this.ctx.font = `700 34px ${BASE_FONT_FAMILY}`;
    this.ctx.lineWidth = 4;
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    this.ctx.strokeText('♪ Instrumental Solo ♪', this.canvas.width / 2, y - 42);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText('♪ Instrumental Solo ♪', this.canvas.width / 2, y - 42);

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.roundRect(x, y, barWidth, barHeight, 8, true);

    this.ctx.fillStyle = '#FFFFFF';
    this.roundRect(x, y, barWidth * state.progress, barHeight, 8, true);

    this.ctx.font = `600 20px ${BASE_FONT_FAMILY}`;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    this.ctx.fillText(
      `${Math.ceil(state.remainingMs / 1000)}s`,
      this.canvas.width / 2,
      y + 30,
    );

    this.ctx.restore();
  }

  public drawLaneInstrumentalBreak(
    state: InstrumentalBreakState,
    centerY: number,
  ): void {
    const barWidth = Math.min(420, Math.round(this.canvas.width * 0.55));
    const barHeight = 10;
    const x = (this.canvas.width - barWidth) / 2;
    const y = centerY - barHeight / 2;

    this.ctx.save();
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.roundRect(x, y, barWidth, barHeight, 6, true);

    this.ctx.fillStyle = '#FFFFFF';
    this.roundRect(x, y, barWidth * state.progress, barHeight, 6, true);

    this.ctx.font = `600 16px ${BASE_FONT_FAMILY}`;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    this.ctx.fillText(
      `${Math.ceil(state.remainingMs / 1000)}s`,
      this.canvas.width / 2,
      y + 22,
    );

    this.ctx.restore();
  }

  public drawSingerLabel(
    displayName: string,
    displayType: LyricDisplayType,
    lineY: number,
    lineFontSize: number,
  ): void {
    const labelText = displayName.trim();

    if (!labelText) {
      return;
    }

    const labelFontSize = Math.max(15, Math.round(lineFontSize * 0.36));
    const labelY = Math.max(
      labelFontSize * 1.5,
      lineY - Math.round(lineFontSize * 1.65),
    );

    this.ctx.save();
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.font = `700 ${labelFontSize}px ${BASE_FONT_FAMILY}`;
    this.ctx.lineWidth = Math.max(1, Math.round(labelFontSize * 0.12));
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    this.ctx.strokeText(labelText, this.canvas.width / 2, labelY);
    this.ctx.fillStyle = this.resolveActiveColour(displayType);
    this.ctx.fillText(labelText, this.canvas.width / 2, labelY);
    this.ctx.restore();
  }

  public drawPreparedLine(
    line: PreparedLine,
    displayType: LyricDisplayType,
    y: number,
    songTimeMs: number,
    style: LineRenderStyle,
  ): void {
    const fontSize = Math.max(
      12,
      Math.round(this.resolveFontSize(displayType) * style.fontScale),
    );
    const wordSpacing = Math.round(fontSize * WORD_SPACING_RATIO);
    const activeColour = this.resolveActiveColour(displayType);
    const inactiveColour =
      displayType === 'translation'
        ? 'rgba(220, 220, 220, 0.85)'
        : BASE_INACTIVE_COLOUR;
    const lineWidth = this.measureLineWidth(line, fontSize, wordSpacing);
    let currentX = this.canvas.width / 2 - lineWidth / 2;

    this.ctx.save();
    this.ctx.globalAlpha = style.opacity;
    this.ctx.font = `700 ${fontSize}px ${BASE_FONT_FAMILY}`;
    this.ctx.lineWidth = Math.max(1, Math.round(fontSize * 0.08));
    this.ctx.strokeStyle = BASE_OUTLINE_COLOUR;

    for (let wordIndex = 0; wordIndex < line.words.length; wordIndex++) {
      const word = line.words[wordIndex];

      for (const syllable of word.syllables) {
        const textWidth = this.measureTextWidth(syllable.phrase, fontSize);

        this.ctx.strokeText(syllable.phrase, currentX, y);
        this.ctx.fillStyle = inactiveColour;
        this.ctx.fillText(syllable.phrase, currentX, y);

        if (style.highlight) {
          this.drawActiveSyllable(
            syllable,
            currentX,
            y,
            textWidth,
            songTimeMs,
            activeColour,
          );
        }

        currentX += textWidth;
      }

      if (wordIndex < line.words.length - 1) {
        currentX += wordSpacing;
      }
    }

    this.ctx.restore();
  }

  public drawTitleCard(overlay: IntroOverlay): void {
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

  public resolveFontSize(displayType: LyricDisplayType): number {
    if (displayType === 'translation') {
      return Math.max(22, Math.round(this.canvas.height * 0.04));
    }

    return Math.max(30, Math.round(this.canvas.height * 0.055));
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
    const fillRatio = clamp(
      (songTimeMs - syllable.startAtMs) / safeDuration,
      0,
      1,
    );

    if (fillRatio <= 0) {
      return;
    }

    if (fillRatio >= 1) {
      this.ctx.fillStyle = activeColour;
      this.ctx.fillText(syllable.phrase, x, y);
      return;
    }

    const clipHeight = this.resolveClipHeight();

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(
      x,
      y - clipHeight,
      width * fillRatio,
      clipHeight * 2,
    );
    this.ctx.clip();
    this.ctx.fillStyle = activeColour;
    this.ctx.fillText(syllable.phrase, x, y);
    this.ctx.restore();
  }

  private resolveClipHeight(): number {
    return Math.round(this.canvas.height * 0.055);
  }

  private measureLineWidth(
    line: PreparedLine,
    fontSize: number,
    wordSpacing: number,
  ): number {
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

  private resolveActiveColour(displayType: LyricDisplayType): string {
    if (displayType === 'bottom') {
      return LYRIC_COLOURS.personTwo;
    }

    if (displayType === 'translation') {
      return LYRIC_COLOURS.translation;
    }

    return LYRIC_COLOURS.personOne;
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
    if (width <= 0 || height <= 0) {
      return;
    }

    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(
      x + width,
      y + height,
      x + width - radius,
      y + height,
    );
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
