import fs from 'node:fs';
import path from 'node:path';
import type { CombinedJaraokeFiles } from 'jaraoke-shared/types';
import { directories, INFO_FILE_NAME, VERSIONS } from '../constants';
import { store } from '../data/store';
import { createLogger } from '../utils/logger';
import { readJaraokeFile } from '../utils/read-jaraoke-file';

const logger = createLogger('bootstrap:read-karaoke-files');

export const readJaraokeFiles = async () => {
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
    const res = await readJaraokeFile(f.filePath, f.parentDir);

    if (!res.isCompatibleWithCurrentVersion) {
      logger.warn(
        `Parsed ${f.filePath} is on version ${res.version} and incompatible with the current version ${VERSIONS.jaraokeInfo}`,
      );
    }

    output.push(res);
  }

  logger.debug(`Parsed ${output.length} Jaraoke files`);

  store.karaokeFiles = output;
};
