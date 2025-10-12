import { createDirectories } from './create-directories';
import { processSongs } from './process-songs';
import { createAndReadSettingsFile } from './settings-file';

export const bootstrap = async () => {
  createDirectories();
  createAndReadSettingsFile();
  await processSongs();
  // TODO: Load the songs into memory
};
