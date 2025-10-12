import path from 'node:path';
import { cwd } from 'node:process';
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
    visuals: path.join(rootDir, 'visuals'),
    binaries: path.join(rootDir, 'binaries'),
  };
})();

export const installLocation = (() => {
  if (process.env.NODE_ENV === 'production') {
    // TODO: This should be the cwd or maybe an env var
    return cwd();
  }

  return directories.root;
})();

export const INFO_FILE_NAME = 'jaraoke.json';
export const LYRICS_FILE_NAME = 'lyrics.ass';
export const CDG_COMBINED_FILE_NAME = 'track.mp4';
export const BG_VISUALS_FILE_NAME = 'bg.mp4';

export const SETTINGS_FILE_LOC = path.join(installLocation, 'settings.ini');

export const BINARY_DIR_LOC = path.join(installLocation, 'binaries');
export const VISUALS_DIR_LOC = path.join(installLocation, 'visuals');

export const SAFE_DIR_NAME = 'Original Contents';

export const IGNORED_FILES = ['.DS_Store'];

export const US_TEMP_INFO_FILE = 'us.txt';
export const US_TEMP_AUDIO_FILE = 'main.mp3';

export const VERSIONS = {
  settings: 1,
  jaraokeInfo: 1,
};
