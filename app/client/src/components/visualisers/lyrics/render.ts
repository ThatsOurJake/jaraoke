import type { RefObject } from 'react';
import type {
  ASSEvent,
  ASSStyle,
  ASSSubtitle,
  ASSSyllable,
  ASSTag,
} from './ass-parser';

export class ASSRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private subtitle: ASSSubtitle;
  private animationFrameId: number | null = null;
  private startTime: number = 0;
  private pausedTime: number = 0;
  private isPaused: boolean = false;
  private currentTime: number = 0;

  constructor(canvasRef: RefObject<HTMLCanvasElement>, subtitle: ASSSubtitle) {
    if (!canvasRef.current) {
      throw new Error('Canvas ref is not available');
    }

    this.canvas = canvasRef.current;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context from canvas');
    }

    this.ctx = ctx;
    this.subtitle = subtitle;
    this.setupCanvas();
  }

  private setupCanvas(): void {
    const { playResX, playResY } = this.subtitle.metadata;
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;

    const canvasAspect = displayWidth / displayHeight;
    const videoAspect = playResX / playResY;

    this.canvas.width = displayWidth;
    this.canvas.height = displayHeight;

    let scaleX: number, scaleY: number, offsetX: number, offsetY: number;

    if (canvasAspect > videoAspect) {
      scaleY = displayHeight / playResY;
      scaleX = scaleY;
      offsetX = (displayWidth - playResX * scaleX) / 2;
      offsetY = 0;
    } else {
      scaleX = displayWidth / playResX;
      scaleY = scaleX;
      offsetX = 0;
      offsetY = (displayHeight - playResY * scaleY) / 2;
    }

    this.ctx.setTransform(scaleX, 0, 0, scaleY, offsetX, offsetY);
  }

  public start(): void {
    if (this.animationFrameId !== null) {
      return;
    }

    this.startTime = performance.now();
    this.pausedTime = 0;
    this.isPaused = false;
    this.animate();
  }

  public pause(): void {
    if (this.isPaused) {
      return;
    }

    this.isPaused = true;
    this.pausedTime = this.currentTime;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public resume(): void {
    if (!this.isPaused) {
      return;
    }

    this.isPaused = false;
    this.startTime = performance.now() - this.pausedTime;
    this.animate();
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.isPaused = false;
    this.currentTime = 0;
    this.clearCanvas();
  }

  public seek(timeMs: number): void {
    this.currentTime = timeMs;
    this.pausedTime = timeMs;
    this.startTime = performance.now() - timeMs;

    if (!this.isPaused) {
      this.render(timeMs);
    }
  }

  private animate = (): void => {
    if (this.isPaused) {
      return;
    }

    this.currentTime = performance.now() - this.startTime;
    this.render(this.currentTime);

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  private clearCanvas(): void {
    const { playResX, playResY } = this.subtitle.metadata;
    this.ctx.clearRect(0, 0, playResX, playResY);
  }

  private render(timeMs: number): void {
    this.clearCanvas();

    const activeEvents = this.subtitle.events.filter(
      (event) => timeMs >= event.start && timeMs <= event.end,
    );

    activeEvents.sort((a, b) => a.layer - b.layer);

    for (const event of activeEvents) {
      this.renderEvent(event, timeMs);
    }
  }

  private renderEvent(event: ASSEvent, timeMs: number): void {
    const style = this.subtitle.styles.find((s) => s.name === event.style);
    if (!style) {
      return;
    }

    const posTag = event.tags.find((t) => t.type === 'pos');
    const fadTag = event.tags.find((t) => t.type === 'fad');
    const colorTag = event.tags.find((t) => t.type === '1c');

    const { x, y } = this.calculatePosition(posTag, style);
    const opacity = this.calculateOpacity(fadTag, event, timeMs);
    const currentSyllableIndex = this.calculateCurrentSyllable(event, timeMs);

    this.ctx.save();
    this.applyFontStyle(style);

    const totalWidth = this.measureEventWidth(event, style);
    let currentX = x - totalWidth / 2;

    for (let i = 0; i < event.syllables.length; i++) {
      const syllable = event.syllables[i];
      const isActive = currentSyllableIndex >= i;

      const textColor = this.getSyllableColor(
        syllable,
        isActive,
        colorTag,
        style,
      );

      this.ctx.fillStyle = this.applyOpacity(textColor, opacity);
      this.ctx.strokeStyle = this.applyOpacity(style.outlineColour, opacity);

      if (style.outline > 0) {
        this.ctx.lineWidth = style.outline;
        this.ctx.strokeText(syllable.text, currentX, y);
      }

      this.ctx.fillText(syllable.text, currentX, y);
      currentX += this.ctx.measureText(syllable.text).width;
    }

    this.ctx.restore();
  }

  private calculatePosition(
    posTag: ASSTag | undefined,
    style: ASSStyle,
  ): { x: number; y: number } {
    const { playResX } = this.subtitle.metadata;

    if (
      posTag &&
      typeof posTag.value === 'object' &&
      posTag.value !== null &&
      'x' in posTag.value
    ) {
      return { x: posTag.value.x, y: posTag.value.y };
    }

    return {
      x: playResX / 2,
      y: this.getYPositionFromAlignment(style.alignment, style.marginV),
    };
  }

  private calculateOpacity(
    fadTag: ASSTag | undefined,
    event: ASSEvent,
    timeMs: number,
  ): number {
    if (
      !fadTag ||
      typeof fadTag.value !== 'object' ||
      fadTag.value === null ||
      !('in' in fadTag.value)
    ) {
      return 1;
    }

    const relativeTime = timeMs - event.start;
    const duration = event.end - event.start;
    const { in: fadeIn, out: fadeOut } = fadTag.value;

    if (relativeTime < fadeIn) {
      return relativeTime / fadeIn;
    }

    if (relativeTime > duration - fadeOut) {
      return (duration - relativeTime) / fadeOut;
    }

    return 1;
  }

  private calculateCurrentSyllable(event: ASSEvent, timeMs: number): number {
    let elapsedTime = timeMs - event.start;

    if (elapsedTime < event.preRenderDelay) {
      return -1;
    }

    elapsedTime -= event.preRenderDelay;

    for (let i = 0; i < event.syllables.length; i++) {
      if (elapsedTime < event.syllables[i].duration) {
        return i;
      }
      elapsedTime -= event.syllables[i].duration;
    }

    return event.syllables.length - 1;
  }

  private getSyllableColor(
    syllable: ASSSyllable,
    isActive: boolean,
    colorTag: ASSTag | undefined,
    style: ASSStyle,
  ): string {
    let textColor = style.primaryColour;

    if (isActive && colorTag && typeof colorTag.value === 'string') {
      textColor = colorTag.value;
    }

    for (const tag of syllable.tags) {
      if (tag.type === '1c' && isActive && typeof tag.value === 'string') {
        textColor = tag.value;
      }
    }

    return textColor;
  }

  private applyFontStyle(style: ASSStyle): void {
    const fontWeight = style.bold ? 'bold' : 'normal';
    const fontStyle = style.italic ? 'italic' : 'normal';
    this.ctx.font = `${fontStyle} ${fontWeight} ${style.fontSize}px ${style.fontName}`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
  }

  private measureEventWidth(event: ASSEvent, style: ASSStyle): number {
    this.ctx.save();
    this.applyFontStyle(style);

    const totalWidth = event.syllables.reduce(
      (width, syllable) => width + this.ctx.measureText(syllable.text).width,
      0,
    );

    this.ctx.restore();
    return totalWidth;
  }

  private getYPositionFromAlignment(
    alignment: number,
    marginV: number,
  ): number {
    const { playResY } = this.subtitle.metadata;

    if (alignment >= 7) {
      return marginV;
    }

    if (alignment >= 4) {
      return playResY / 2;
    }

    return playResY - marginV;
  }

  private applyOpacity(color: string, opacity: number): string {
    if (!color.startsWith('#')) {
      return color;
    }

    const r = parseInt(color.substring(1, 3), 16);
    const g = parseInt(color.substring(3, 5), 16);
    const b = parseInt(color.substring(5, 7), 16);

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
}
