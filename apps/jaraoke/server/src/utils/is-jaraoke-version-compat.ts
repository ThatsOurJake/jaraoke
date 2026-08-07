import type { CombinedJaraokeFiles } from 'jaraoke-shared/types';

interface BreakingChange {
  version: number;
  affects: 'all' | CombinedJaraokeFiles['type'];
}

const BREAKING_CHANGES: BreakingChange[] = [
  {
    version: 4,
    affects: 'all',
  },
];

const getRequiredVersionForType = (type: CombinedJaraokeFiles['type']) =>
  BREAKING_CHANGES.reduce((requiredVersion, breakingChange) => {
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
