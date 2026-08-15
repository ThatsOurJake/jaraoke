import type { CombinedJaraokeFiles } from 'jaraoke-shared/types';
import { JARAOKE_BREAKING_CHANGES } from '../constants';

export interface BreakingChange {
  version: number;
  affects: 'all' | CombinedJaraokeFiles['type'];
}

const getRequiredVersionForType = (type: CombinedJaraokeFiles['type']) =>
  JARAOKE_BREAKING_CHANGES.reduce((requiredVersion, breakingChange) => {
    const doesAffectType =
      breakingChange.affects === 'all' || breakingChange.affects.includes(type);

    if (!doesAffectType) {
      return requiredVersion;
    }

    return Math.max(requiredVersion, breakingChange.version);
  }, 1);

export const isJaraokeVersionCompat = (jaraokeFile: CombinedJaraokeFiles) => {
  const requiredVersion = getRequiredVersionForType(jaraokeFile.type);
  return jaraokeFile.version >= requiredVersion;
};
