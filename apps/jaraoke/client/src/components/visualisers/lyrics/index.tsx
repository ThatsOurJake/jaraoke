import { useEffect, useRef } from 'preact/hooks';
import { KARAOKE_EVENT } from '../../../constants';
import type { KaraokeEvent } from '../../../events/karaoke-event';
import { parseASS } from './ass-parser';
import { ASSRenderer } from './render';

interface LyricsVisualiserProps {
  url: string;
  onLoaded?: () => void;
}

export const LyricsVisualiser = ({ url, onLoaded }: LyricsVisualiserProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const assRenderer = useRef<ASSRenderer>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const onKaraokePlayerEvent = (ev: Event) => {
      const event = ev as KaraokeEvent;

      if (!assRenderer.current) {
        return;
      }

      if (event.eventType === 'pause') {
        assRenderer.current.pause();
      }

      if (event.eventType === 'play') {
        assRenderer.current.resume();
      }

      if (event.eventType === 'start') {
        assRenderer.current.start();
      }
    };

    const fetchLyrics = async () => {
      const res = await fetch(url);
      const assData = await res.text();
      const parsedLyrics = parseASS(assData);
      assRenderer.current = new ASSRenderer(canvasRef, parsedLyrics);

      if (onLoaded) {
        onLoaded();
      }
    };

    window.addEventListener(KARAOKE_EVENT, onKaraokePlayerEvent);

    fetchLyrics();

    return () => {
      window.removeEventListener(KARAOKE_EVENT, onKaraokePlayerEvent);
    };
  }, []);

  return <canvas ref={canvasRef} className="antialiased fixed z-20" />;
};
