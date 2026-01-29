declare module 'butterchurn' {
  type Preset = Record<string, unknown>;
  type ImageData = { data: string; width: number; height: number };
  class Visualizer {
    loadExtraImages(imageData: Record<string, ImageData>): void;
    loadPreset(preset: Preset, blendTime: number): void;
    setRendererSize(width: number, height: number): void;
    connectAudio(node: AudioNode): void;
    render(): void;
  }

  export default class Butterchurn {
    static createVisualizer(
      context: BaseAudioContext,
      canvas: HTMLCanvasElement,
      options?: {
        width?: number;
        height?: number;
        onlyUseWASM?: boolean;
      },
    ): Visualizer;
  }
}

declare module 'butterchurn-presets' {
  import type { Preset } from 'butterchurn';
  export function getPresets(): Record<string, Preset>;
}
