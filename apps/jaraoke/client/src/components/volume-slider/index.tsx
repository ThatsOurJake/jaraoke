import { mdiVolumeHigh, mdiVolumeOff } from '@mdi/js';
import Icon from '@mdi/react';
import { useCallback, useRef, useState } from 'preact/hooks';

interface VolumeSliderProps {
  // Value is 0 -> 1
  onChange: (value: number) => void;
  currentValue: number;
}

export const VolumeSlider = ({ onChange, currentValue }: VolumeSliderProps) => {
  const [value, setValue] = useState<number>(currentValue);
  const [isSliding, setIsSliding] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const valueRef = useRef<number>(currentValue);
  const lastUnmutedValueRef = useRef<number>(1);

  const commitValue = useCallback(
    (nextValue: number) => {
      const clampedValue = Math.max(0, Math.min(1, nextValue));

      valueRef.current = clampedValue;
      setValue(clampedValue);
      setIsMuted(clampedValue <= 0);

      if (clampedValue > 0) {
        lastUnmutedValueRef.current = clampedValue;
      }

      onChange(clampedValue);
    },
    [onChange],
  );

  const onSlideStart = useCallback(() => {
    setIsSliding(true);
  }, []);

  const onSlideEnd = useCallback(() => {
    setIsSliding(false);
    commitValue(valueRef.current);
  }, [commitValue]);

  const onSliderInput = useCallback((event: Event) => {
    if (!(event.currentTarget instanceof HTMLInputElement)) {
      return;
    }

    const nextValue = Number(event.currentTarget.value);

    valueRef.current = nextValue;
    setValue(nextValue);
    setIsMuted(nextValue <= 0);

    if (nextValue > 0) {
      lastUnmutedValueRef.current = nextValue;
    }
  }, []);

  const onToggleMute = useCallback(() => {
    if (isMuted || valueRef.current <= 0) {
      commitValue(
        lastUnmutedValueRef.current > 0 ? lastUnmutedValueRef.current : 1,
      );
      return;
    }

    lastUnmutedValueRef.current = valueRef.current;
    commitValue(0);
  }, [commitValue, isMuted]);

  const valuePercentage = Math.round(value * 100);
  const activeFill = isSliding
    ? 'rgba(216, 180, 254, 0.96)'
    : 'rgba(156, 163, 175, 0.68)';
  const inactiveFill = isSliding
    ? 'rgba(44, 19, 59, 0.9)'
    : 'rgba(55, 65, 81, 0.55)';

  return (
    <div className="w-full flex items-center gap-3 py-1">
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        aria-label="Volume"
        onInput={onSliderInput}
        onMouseDown={onSlideStart}
        onTouchStart={onSlideStart}
        onMouseUp={onSlideEnd}
        onTouchEnd={onSlideEnd}
        onKeyUp={onSlideEnd}
        className="w-full h-2 rounded-full cursor-pointer appearance-none border border-purple-200/30 shadow-[0_0_10px_rgba(216,180,254,0.35)]"
        style={{
          background: `linear-gradient(to right, ${activeFill} 0%, ${activeFill} ${valuePercentage}%, ${inactiveFill} ${valuePercentage}%, ${inactiveFill} 100%)`,
          accentColor: isSliding ? '#e879f9' : '#94a3b8',
        }}
      />
      <button
        type="button"
        aria-label={isMuted ? 'Unmute' : 'Mute'}
        title={isMuted ? 'Unmute' : 'Mute'}
        onClick={onToggleMute}
        className="cursor-pointer shrink-0 h-10 w-10 rounded-md border border-purple-200/30 bg-background-secondary/80 hover:bg-background-secondary active:scale-95 transition-all shadow-[0_0_14px_rgba(216,180,254,0.24)] flex items-center justify-center"
      >
        <Icon
          path={isMuted ? mdiVolumeOff : mdiVolumeHigh}
          size={0.95}
          color={isMuted ? '#9ca3af' : '#f5d0fe'}
        />
      </button>
    </div>
  );
};
