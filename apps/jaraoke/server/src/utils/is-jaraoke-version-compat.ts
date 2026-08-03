import { VERSIONS } from "../constants";

export const isJaraokeVersionCompat = (jaraokeFileVersion: number) => {
  if (jaraokeFileVersion < VERSIONS.jaraokeInfo) {
    return false;
  }

  return true;
};
