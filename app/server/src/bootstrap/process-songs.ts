import fs, { lstatSync } from 'node:fs';
import path from 'node:path';
import { directories, INFO_FILE_NAME } from '../constants';
import { PROCESSOR_MAP } from '../processors/processor-map';
import { cleanDir } from '../utils/clean-dir';
import {
  determineFolderType,
  FolderType,
} from '../utils/determine-folder-type';
import { createLogger } from '../utils/logger';

interface ReadDirectoriesResult {
  toBeProcessed: { dir: string; type: FolderType }[];
  cannotBeProcessed: { dir: string; reason: string }[];
}

const logger = createLogger('bootstrap:process-songs');

const readDirectories = (songDirectories: string[]): ReadDirectoriesResult => {
  const output: ReadDirectoriesResult = {
    cannotBeProcessed: [],
    toBeProcessed: [],
  };

  for (const dir of songDirectories) {
    if (fs.existsSync(path.join(dir, INFO_FILE_NAME))) {
      logger.info(`Already processed: ${dir}`);
      continue;
    }

    const folderType = determineFolderType(dir);

    if (folderType === FolderType.NOT_SUPPORTED) {
      output.cannotBeProcessed.push({
        dir,
        reason: 'Not supported', // TODO: better reasoning
      });

      continue;
    }

    output.toBeProcessed.push({
      dir,
      type: folderType,
    });
  }

  return output;
};

export const processSongs = async () => {
  const songDirectories = fs
    .readdirSync(directories.songs)
    .map((loc) => path.join(directories.songs, loc))
    .filter((x) => lstatSync(x).isDirectory());
  logger.info(`Found: "${songDirectories.length}" directories`);

  const { cannotBeProcessed, toBeProcessed } = readDirectories(songDirectories);

  for (const item of cannotBeProcessed) {
    logger.warn(`Could not process: "${item.dir}" because "${item.reason}"`);
  }

  for (const item of toBeProcessed) {
    const processorFunc = PROCESSOR_MAP[item.type];

    await processorFunc(item.dir);

    cleanDir(directories.temp);
  }
};
