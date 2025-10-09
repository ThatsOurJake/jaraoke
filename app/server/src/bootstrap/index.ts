import { createDirectories } from './create-directories';
import { processSongs } from './process-songs';

export const bootstrap = async () => {
  createDirectories();
  await processSongs();
  // TODO: Load the songs into memory
};
