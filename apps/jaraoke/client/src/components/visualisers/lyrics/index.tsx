import type { JaraokeFile } from 'jaraoke-shared/types';
import { useEffect, useRef } from 'preact/hooks';
import { KARAOKE_EVENT, TITLE_CARD_DURATION_MS } from '../../../constants';
import { KaraokeEvent } from '../../../events/karaoke-event';
import { JaraokeLyricsRenderer } from './render';

interface LyricsVisualiserProps {
  lyrics: JaraokeFile['lyrics'];
  metadata: JaraokeFile['metadata'];
  onLoaded?: () => void;
}

export const LyricsVisualiser = ({
  lyrics,
  metadata,
  onLoaded,
}: LyricsVisualiserProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<JaraokeLyricsRenderer>(null);
  const frameIdRef = useRef<number>(null);
  const startedAtRef = useRef(0);
  const pausedAtMsRef = useRef(0);
  const startedRef = useRef(false);
  const pausedRef = useRef(true);
  const songStartDispatchedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const cancelFrame = () => {
    if (frameIdRef.current !== null) {
      cancelAnimationFrame(frameIdRef.current);
      frameIdRef.current = null;
    }
  };

  const resolveTimelineElapsed = () => performance.now() - startedAtRef.current;

  const resolveSongTimeMs = (timelineElapsedMs: number) => {
    if (!songStartDispatchedRef.current) {
      return 0;
    }

    const cachedAudio = audioRef.current;

    if (cachedAudio && !cachedAudio.isConnected) {
      audioRef.current = null;
    }

    if (!audioRef.current) {
      audioRef.current = document.getElementById('main-audio') as
        | HTMLAudioElement
        | null;
    }

    const audioElement = audioRef.current;

    if (audioElement) {
      return Math.max(0, audioElement.currentTime * 1000);
    }

    return Math.max(0, timelineElapsedMs - TITLE_CARD_DURATION_MS);
  };

  const renderFrame = () => {
    if (pausedRef.current || !rendererRef.current || !startedRef.current) {
      return;
    }

    const timelineElapsedMs = resolveTimelineElapsed();

    if (
      !songStartDispatchedRef.current &&
      timelineElapsedMs >= TITLE_CARD_DURATION_MS
    ) {
      songStartDispatchedRef.current = true;
      window.dispatchEvent(new KaraokeEvent('song-start'));
    }

    rendererRef.current.render({
      showLyrics: songStartDispatchedRef.current,
      songTimeMs: resolveSongTimeMs(timelineElapsedMs),
      overlay: {
        titleVisible: timelineElapsedMs < TITLE_CARD_DURATION_MS,
        title: metadata.title,
        artist: metadata.artist,
        duration: metadata.duration,
      },
    });

    frameIdRef.current = requestAnimationFrame(renderFrame);
  };

  const resume = () => {
    if (!startedRef.current || !pausedRef.current) {
      return;
    }

    pausedRef.current = false;
    startedAtRef.current = performance.now() - pausedAtMsRef.current;
    frameIdRef.current = requestAnimationFrame(renderFrame);
  };

  const pause = () => {
    if (!startedRef.current || pausedRef.current) {
      return;
    }

    pausedRef.current = true;
    pausedAtMsRef.current = resolveTimelineElapsed();
    cancelFrame();
  };

  const start = () => {
    startedRef.current = true;
    songStartDispatchedRef.current = false;
    pausedRef.current = false;
    pausedAtMsRef.current = 0;
    audioRef.current = null;
    startedAtRef.current = performance.now();
    cancelFrame();
    frameIdRef.current = requestAnimationFrame(renderFrame);
  };

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    rendererRef.current = new JaraokeLyricsRenderer(canvasRef.current, lyrics);

    const onResize = () => {
      rendererRef.current?.resize();
    };

    window.addEventListener('resize', onResize);

    if (onLoaded) {
      onLoaded();
    }

    return () => {
      window.removeEventListener('resize', onResize);
      cancelFrame();
    };
  }, [lyrics]);

  useEffect(() => {
    const onKaraokePlayerEvent = (ev: Event) => {
      const event = ev as KaraokeEvent;

      if (event.eventType === 'pause') {
        pause();
      }

      if (event.eventType === 'play') {
        resume();
      }

      if (event.eventType === 'start') {
        start();
      }
    };

    window.addEventListener(KARAOKE_EVENT, onKaraokePlayerEvent);

    return () => {
      window.removeEventListener(KARAOKE_EVENT, onKaraokePlayerEvent);
    };
  }, []);

  return <canvas ref={canvasRef} className="antialiased fixed z-20" />;
};
