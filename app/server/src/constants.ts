import path from 'node:path';
import getAppDataPath from 'appdata-path';

export const PORT = 9897;
export const APP_NAME =
  process.env.NODE_ENV === 'production' ? 'jaraoke' : 'jaraoke-dev';

export const directories = (() => {
  const rootDir = getAppDataPath(APP_NAME);

  return {
    root: rootDir,
    songs: path.join(rootDir, 'songs'),
    temp: path.join(rootDir, 'temp'),
  };
})();

export const INFO_FILE_NAME = 'jaraoke.json';
export const LYRICS_FILE_NAME = 'lyrics.ass';
export const SAFE_DIR_NAME = 'Original Contents';

export const IGNORED_FILES = ['.DS_Store'];
