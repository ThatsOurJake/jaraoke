import butterchurn, { type Visualizer } from 'butterchurn';
import butterchurnPresets from 'butterchurn-presets';
import type { JaraokeTrack } from 'jaraoke-shared/types';
import { type Attributes, h, type VNode } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import { BT_PRESETS, KARAOKE_EVENT } from '../../constants';
import type { KaraokeEvent } from '../../events/karaoke-event';
import { generateRandomNumber } from '../../utils/rng';

interface AudioVisualiserProps {
  tracks: (JaraokeTrack & {
    isMainTrack: boolean;
    url: string;
    volume: number;
  })[];
  onLoaded?: () => void;
}

const getPreset = () => {
  const presets = butterchurnPresets.getPresets();
  const idx = generateRandomNumber(1, BT_PRESETS.length) - 1;
  return { name: BT_PRESETS[idx], preset: presets[BT_PRESETS[idx]] };
};

export const AudioVisualiser = ({ tracks, onLoaded }: AudioVisualiserProps) => {
  const frameId = useRef<number>(null);
  const visualiser = useRef<Visualizer>(null);
  const [audioSources, setAudioSources] =
    useState<
      VNode<
        Attributes & {
          src: string;
          id: string;
          volume: number;
        }
      >[]
    >();

  const playAudio = useCallback(() => {
    const tracks = document.querySelectorAll('audio');

    for (const track of tracks) {
      track.play();
    }
  }, []);

  const pauseAudio = useCallback(() => {
    const tracks = document.querySelectorAll('audio');

    for (const track of tracks) {
      track.pause();
    }
  }, []);

  const onKaraokeEvent = useCallback((ev: Event) => {
    const event = ev as KaraokeEvent;

    if (event.eventType === 'play' || event.eventType === 'start') {
      playAudio();
      renderFrame();
    }

    if (event.eventType === 'pause') {
      pauseAudio();
    }
  }, []);

  const renderFrame = () => {
    frameId.current = requestAnimationFrame(renderFrame);
    visualiser.current?.render();
  };

  const setupVisualiser = useCallback(() => {
    const canvasElement = document.getElementById(
      'visual-canvas',
    ) as HTMLCanvasElement | null;
    const audioElement = document.getElementById(
      'main-audio',
    ) as HTMLAudioElement | null;

    if (!canvasElement && !audioElement) {
      return;
    }

    const audioContext = new AudioContext();
    const sourceNode = audioContext.createMediaElementSource(audioElement!);

    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;

    canvasElement!.width = canvasWidth;
    canvasElement!.height = canvasHeight;

    visualiser.current = butterchurn.createVisualizer(
      audioContext,
      canvasElement!,
      {
        width: canvasWidth,
        height: canvasHeight,
      },
    );

    sourceNode.connect(audioContext.destination);
    visualiser.current.connectAudio(sourceNode);

    const preset = getPreset().preset;
    visualiser.current.loadPreset(preset, 0.0);
    visualiser.current.setRendererSize(canvasWidth, canvasHeight);

    if (onLoaded) {
      onLoaded();
    }
  }, []);

  useEffect(() => {
    if (!audioSources?.length) {
      return;
    }

    setupVisualiser();
  }, [audioSources]);

  useEffect(() => {
    const eles: VNode<
      Attributes & {
        src: string;
        id: string;
        volume: number;
      }
    >[] = [];

    for (const track of tracks) {
      const ele = h('audio', {
        src: track.url,
        id: track.isMainTrack ? 'main-audio' : `audio-${track.name}`,
        volume: track.volume,
      });
      eles.push(ele);
    }

    window.addEventListener(KARAOKE_EVENT, onKaraokeEvent);

    setAudioSources(eles);

    return () => {
      window.removeEventListener(KARAOKE_EVENT, onKaraokeEvent);
    };
  }, []);

  return (
    <>
      {audioSources}
      <canvas id="visual-canvas" className="antialiased fixed z-10" />
    </>
  );
};
