import type { JaraokeLyricsType } from 'jaraoke-shared/types';
import type { KfnLyricsEffectDetails } from './kfn-song-ini-reader';

export const normalizeSingerName = (value?: string) =>
  value?.trim().toLowerCase() || '';

const getLineCoverage = (effectDetails: KfnLyricsEffectDetails) =>
  effectDetails.lyricLineCount;

const sortByOffsetY = (
  firstEffect: KfnLyricsEffectDetails,
  secondEffect: KfnLyricsEffectDetails,
) => {
  return (
    parseInt(firstEffect.effect.offsety || '0', 10) -
    parseInt(secondEffect.effect.offsety || '0', 10)
  );
};

export const orderEffectDetails = ({
  describedEffects,
  lyricsType,
  mainSinger,
}: {
  describedEffects: KfnLyricsEffectDetails[];
  lyricsType: JaraokeLyricsType;
  mainSinger: string;
}) => {
  if (lyricsType === 'duet') {
    return describedEffects
      .slice()
      .sort(
        (firstEffect, secondEffect) =>
          Number(
            normalizeSingerName(secondEffect.effect.caption) === mainSinger,
          ) -
            Number(
              normalizeSingerName(firstEffect.effect.caption) === mainSinger,
            ) || sortByOffsetY(firstEffect, secondEffect),
      );
  }

  if (lyricsType === 'translation') {
    return describedEffects
      .slice()
      .sort(
        (firstEffect, secondEffect) =>
          getLineCoverage(secondEffect) - getLineCoverage(firstEffect) ||
          sortByOffsetY(firstEffect, secondEffect),
      );
  }

  return describedEffects;
};
