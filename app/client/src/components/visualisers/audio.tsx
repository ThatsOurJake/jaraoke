import butterchurn from 'butterchurn';
import butterchurnPresets from 'butterchurn-presets';
import { useEffect, useRef } from 'preact/hooks';

interface VisualiserProps {
  audio: AudioContext;
}

export const Visualiser = ({ audio }: VisualiserProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const visualiser = butterchurn.createVisualizer(audio, canvasRef.current, {
      width: 800,
      height: 600,
    });

    const presets = butterchurnPresets.getPresets();
    const preset =
      presets['Flexi, martin + geiss - dedicated to the sherwin maxawow'];

    visualiser.loadPreset(preset, 0.0);
    visualiser.setRendererSize(1600, 1200);
    visualiser.render();
  }, []);

  return <canvas ref={canvasRef} />;
};
