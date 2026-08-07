import fs from 'node:fs';
import type { CombinedJaraokeFiles } from 'jaraoke-shared/types';
import { isJaraokeVersionCompat } from './is-jaraoke-version-compat';

export const readJaraokeFile = async (filePath: string, parentDir: string) => {
  const contents = await fs.promises.readFile(filePath, 'utf8');
  const parsed = JSON.parse(contents) as CombinedJaraokeFiles;
  const isCompat = isJaraokeVersionCompat(parsed);

  return {
    ...parsed,
    parentDir,
    isCompatibleWithCurrentVersion: isCompat,
  };
};
