import fs from 'node:fs';
import path from 'node:path';
import type { CombinedJaraokeFiles } from 'jaraoke-shared/types';
import { directories, INFO_FILE_NAME } from '../constants';
import { store } from '../data/store';
import { createLogger } from '../utils/logger';

const logger = createLogger('bootstrap:read-karaoke-files');

export const readJaraokeFiles = () => {
  const files: { filePath: string; parentDir: string }[] = fs
    .readdirSync(directories.songs)
    .reduce((acc: { filePath: string; parentDir: string }[], dir) => {
      const fileLoc = path.join(directories.songs, dir, INFO_FILE_NAME);

      if (!fs.existsSync(fileLoc)) {
        return acc;
      }

      acc.push({
        filePath: fileLoc,
        parentDir: dir,
      });

      return acc;
    }, []);

  const output: CombinedJaraokeFiles[] = [];

  for (const f of files) {
    const contents = fs.readFileSync(f.filePath).toString();
    const parsed = JSON.parse(contents) as CombinedJaraokeFiles;
    output.push({
      ...parsed,
      parentDir: f.parentDir,
    });
  }

  logger.debug(`Parsed ${output.length} Jaraoke files`);

  store.karaokeFiles = output;
};
