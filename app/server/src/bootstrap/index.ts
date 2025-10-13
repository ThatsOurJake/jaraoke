import { createDirectories } from './create-directories';
import { processSongs } from './process-songs';
import { readJaraokeFiles } from './read-jaraoke-files';
import { createAndReadSettingsFile } from './settings-file';

export const bootstrap = async () => {
  createDirectories();
  createAndReadSettingsFile();
  await processSongs();
  readJaraokeFiles();
};
