import path from 'node:path';
import getAppDataPath from 'appdata-path';

export const PORT = 9897;
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const APP_NAME = IS_PRODUCTION ? 'jaraoke' : 'jaraoke-dev';

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
export const CDG_COMBINED_FILE_NAME = 'track.mp4';
export const VIDEO_FILE_NAME = 'video.mp4';
export const BG_VISUALS_FILE_NAME = 'bg.mp4';

export const SETTINGS_FILE_LOC = path.join(directories.root, 'settings.ini');
export const ASSETS_DIR_LOC = path.join(directories.root, 'assets');
export const assetDirectories = {
  backgrounds: path.join(ASSETS_DIR_LOC, 'backgrounds'),
};

export const SAFE_DIR_NAME = 'Original Contents';

export const IGNORED_FILES = ['.DS_Store'];

export const US_TEMP_INFO_FILE = 'us.txt';
export const US_TEMP_AUDIO_FILE = 'main.mp3';

export const VERSIONS = {
  settings: 2,
  jaraokeInfo: 1,
};
