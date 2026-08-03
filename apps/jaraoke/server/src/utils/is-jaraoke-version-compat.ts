import { VERSIONS } from '../constants';

// TODO: Better detection of if this file is incompat,
// right now we blanket everything which will also include videos
export const isJaraokeVersionCompat = (jaraokeFileVersion: number) => {
  if (jaraokeFileVersion < VERSIONS.jaraokeInfo) {
    return false;
  }

  return true;
};
