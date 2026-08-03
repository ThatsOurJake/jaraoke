import butterchurn, { type Visualizer } from 'butterchurn';
import butterchurnPresets from 'butterchurn-presets';
import type { JaraokeTrack } from 'jaraoke-shared/types';
import { useCallback, useEffect, useRef } from 'preact/hooks';

import {
  AUDIO_SYNC_HARD_DRIFT_MS,
  AUDIO_SYNC_INTERVAL_MS,
  AUDIO_SYNC_RATE_GAIN,
  AUDIO_SYNC_RATE_MAX,
  AUDIO_SYNC_RATE_MIN,
  AUDIO_SYNC_SOFT_DRIFT_MS,
  BT_PRESETS,
  KARAOKE_EVENT,
} from '../../constants';
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
  const syncTimerId = useRef<number>(null);
  const visualiser = useRef<Visualizer>(null);
  const songStarted = useRef(false);
  const audioContextRef = useRef<AudioContext>(null);

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

  const getAudioTracks = () => Array.from(document.querySelectorAll('audio'));

  const stopVisualFrame = () => {
    if (frameId.current !== null) {
      cancelAnimationFrame(frameId.current);
      frameId.current = null;
    }
  };

  const stopSyncLoop = () => {
    if (syncTimerId.current !== null) {
      clearInterval(syncTimerId.current);
      syncTimerId.current = null;
    }
  };

  const syncAudioTracks = () => {
    const masterTrack = document.getElementById('main-audio') as
      | HTMLAudioElement
      | null;

    if (!masterTrack || masterTrack.paused) {
      return;
    }

    const allTracks = getAudioTracks();

    for (const track of allTracks) {
      if (track === masterTrack) {
        continue;
      }

      const driftMs = (track.currentTime - masterTrack.currentTime) * 1000;
      const absoluteDrift = Math.abs(driftMs);

      if (absoluteDrift > AUDIO_SYNC_HARD_DRIFT_MS) {
        track.currentTime = masterTrack.currentTime;
        track.playbackRate = 1;
        continue;
      }

      if (absoluteDrift > AUDIO_SYNC_SOFT_DRIFT_MS) {
        const driftSeconds = driftMs / 1000;
        const correction = clamp(
          driftSeconds * AUDIO_SYNC_RATE_GAIN,
          -(1 - AUDIO_SYNC_RATE_MIN),
          AUDIO_SYNC_RATE_MAX - 1,
        );

        track.playbackRate = clamp(
          1 - correction,
          AUDIO_SYNC_RATE_MIN,
          AUDIO_SYNC_RATE_MAX,
        );
      } else {
        track.playbackRate = 1;
      }
    }
  };

  const startSyncLoop = () => {
    if (syncTimerId.current !== null) {
      return;
    }

    syncTimerId.current = window.setInterval(
      syncAudioTracks,
      AUDIO_SYNC_INTERVAL_MS,
    );
  };

  const playAudio = useCallback(() => {
    const audioTracks = getAudioTracks();
    audioContextRef.current?.resume();

    for (const track of audioTracks) {
      void track.play();
    }
  }, []);

  const pauseAudio = useCallback(() => {
    const audioTracks = getAudioTracks();

    for (const track of audioTracks) {
      track.pause();
      track.playbackRate = 1;
    }
  }, []);

  const resetAudio = useCallback(() => {
    const audioTracks = getAudioTracks();

    for (const track of audioTracks) {
      track.pause();
      track.currentTime = 0;
      track.playbackRate = 1;
    }
  }, []);

  const renderFrame = () => {
    frameId.current = requestAnimationFrame(renderFrame);
    visualiser.current?.render();
  };

  const startVisualFrame = () => {
    if (frameId.current !== null) {
      return;
    }

    frameId.current = requestAnimationFrame(renderFrame);
  };

  const startSongPlayback = useCallback(() => {
    songStarted.current = true;
    playAudio();
    startVisualFrame();
    startSyncLoop();
  }, [playAudio]);

  const prepareForSequenceStart = useCallback(() => {
    songStarted.current = false;
    stopVisualFrame();
    stopSyncLoop();
    resetAudio();
  }, [resetAudio]);

  const onKaraokeEvent = useCallback((ev: Event) => {
    const event = ev as KaraokeEvent;

    if (event.eventType === 'start') {
      prepareForSequenceStart();
      return;
    }

    if (event.eventType === 'song-start') {
      startSongPlayback();
      return;
    }

    if (event.eventType === 'play') {
      if (!songStarted.current) {
        return;
      }

      playAudio();
      startVisualFrame();
      startSyncLoop();
      return;
    }

    if (event.eventType === 'pause') {
      pauseAudio();
      stopVisualFrame();
      stopSyncLoop();
    }
  }, [pauseAudio, playAudio, prepareForSequenceStart, startSongPlayback]);

  const setupVisualiser = useCallback(() => {
    const canvasElement = document.getElementById(
      'visual-canvas',
    ) as HTMLCanvasElement | null;
    const audioElement = document.getElementById(
      'main-audio',
    ) as HTMLAudioElement | null;

    if (!canvasElement || !audioElement) {
      return;
    }

    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
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
    setupVisualiser();
  }, [setupVisualiser]);

  useEffect(() => {
    window.addEventListener(KARAOKE_EVENT, onKaraokeEvent);

    return () => {
      window.removeEventListener(KARAOKE_EVENT, onKaraokeEvent);
      stopVisualFrame();
      stopSyncLoop();
      audioContextRef.current?.close();
      audioContextRef.current = null;
    };
  }, [onKaraokeEvent]);

  return (
    <>
      {tracks.map((track) => (
        <audio
          key={track.fileName}
          src={track.url}
          id={track.isMainTrack ? 'main-audio' : `audio-${track.name}`}
          volume={track.volume}
        />
      ))}
      <canvas id="visual-canvas" className="antialiased fixed z-10" />
    </>
  );
};
