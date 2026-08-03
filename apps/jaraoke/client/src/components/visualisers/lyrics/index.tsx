import type { JaraokeFile } from 'jaraoke-shared/types';
import { useEffect, useMemo, useRef } from 'preact/hooks';
import {
  COUNTDOWN_STARTING_NUMBER,
  COUNTDOWN_STEP_DURATION_MS,
  KARAOKE_EVENT,
  TITLE_CARD_DURATION_MS,
} from '../../../constants';
import { KaraokeEvent } from '../../../events/karaoke-event';
import { JaraokeLyricsRenderer } from './render';

interface LyricsVisualiserProps {
  lyrics: JaraokeFile['lyrics'];
  metadata: JaraokeFile['metadata'];
  onLoaded?: () => void;
}

interface IntroSchedule {
  songStartAtTimelineMs: number;
  countdownStartAtTimelineMs: number;
  countdownEndAtTimelineMs: number;
}

const COUNTDOWN_TOTAL_DURATION_MS =
  COUNTDOWN_STARTING_NUMBER * COUNTDOWN_STEP_DURATION_MS;

const resolveEarliestLineStartAt = (lyrics: JaraokeFile['lyrics']) => {
  const allStarts = lyrics.flatMap((lyric) =>
    lyric.lines.map((line) => line.startAtMs),
  );

  if (allStarts.length === 0) {
    return 0;
  }

  return Math.max(0, Math.min(...allStarts));
};

const buildIntroSchedule = (firstLineStartAtMs: number): IntroSchedule => {
  const titleEndAt = TITLE_CARD_DURATION_MS;

  if (firstLineStartAtMs >= COUNTDOWN_TOTAL_DURATION_MS) {
    const songStartAtTimelineMs = titleEndAt;
    const countdownEndAtTimelineMs =
      songStartAtTimelineMs + firstLineStartAtMs;
    const countdownStartAtTimelineMs =
      countdownEndAtTimelineMs - COUNTDOWN_TOTAL_DURATION_MS;

    return {
      songStartAtTimelineMs,
      countdownStartAtTimelineMs,
      countdownEndAtTimelineMs,
    };
  }

  const countdownStartAtTimelineMs = titleEndAt;
  const countdownEndAtTimelineMs =
    countdownStartAtTimelineMs + COUNTDOWN_TOTAL_DURATION_MS;

  if (firstLineStartAtMs < COUNTDOWN_STEP_DURATION_MS) {
    return {
      songStartAtTimelineMs: titleEndAt,
      countdownStartAtTimelineMs,
      countdownEndAtTimelineMs,
    };
  }

  const thresholdSongStartAt = countdownEndAtTimelineMs - firstLineStartAtMs;
  const boundaries = [
    countdownStartAtTimelineMs,
    countdownStartAtTimelineMs + COUNTDOWN_STEP_DURATION_MS,
    countdownStartAtTimelineMs + COUNTDOWN_STEP_DURATION_MS * 2,
    countdownEndAtTimelineMs,
  ];
  const songStartAtTimelineMs =
    boundaries.find((boundary) => boundary >= thresholdSongStartAt) ||
    countdownEndAtTimelineMs;

  return {
    songStartAtTimelineMs,
    countdownStartAtTimelineMs,
    countdownEndAtTimelineMs,
  };
};

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
  const schedule = useMemo(
    () => buildIntroSchedule(resolveEarliestLineStartAt(lyrics)),
    [lyrics],
  );

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

    const audioElement = document.getElementById(
      'main-audio',
    ) as HTMLAudioElement | null;

    if (audioElement) {
      return Math.max(0, audioElement.currentTime * 1000);
    }

    return Math.max(0, timelineElapsedMs - schedule.songStartAtTimelineMs);
  };

  const resolveCountdownValue = (timelineElapsedMs: number) => {
    if (
      timelineElapsedMs < schedule.countdownStartAtTimelineMs ||
      timelineElapsedMs >= schedule.countdownEndAtTimelineMs
    ) {
      return undefined;
    }

    const countdownElapsed =
      timelineElapsedMs - schedule.countdownStartAtTimelineMs;
    const index = Math.floor(countdownElapsed / COUNTDOWN_STEP_DURATION_MS);
    const value = COUNTDOWN_STARTING_NUMBER - index;

    if (value < 1) {
      return undefined;
    }

    return value;
  };

  const renderFrame = () => {
    if (pausedRef.current || !rendererRef.current || !startedRef.current) {
      return;
    }

    const timelineElapsedMs = resolveTimelineElapsed();

    if (
      !songStartDispatchedRef.current &&
      timelineElapsedMs >= schedule.songStartAtTimelineMs
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
        countdownValue: resolveCountdownValue(timelineElapsedMs),
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
  }, [schedule]);

  return <canvas ref={canvasRef} className="antialiased fixed z-20" />;
};
