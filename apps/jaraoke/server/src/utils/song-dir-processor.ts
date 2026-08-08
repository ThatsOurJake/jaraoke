import { promises as fsPromises } from 'node:fs';
import path from 'node:path';
import type { CombinedJaraokeFiles } from 'jaraoke-shared/types';
import { directories, INFO_FILE_NAME, SAFE_DIR_NAME } from '../constants';
import { Queue } from '../data/queue';
import { store } from '../data/store';
import { PROCESSOR_MAP } from '../processors/processor-map';
import { cleanDir } from './clean-dir';
import { determineFolderType, FolderType } from './determine-folder-type';
import { createLogger } from './logger';
import { readJaraokeFile } from './read-jaraoke-file';

interface ToBeProcessed {
  dir: string;
  type: FolderType;
}
interface CannotBeProcessed {
  dir: string;
  reason: string;
}

const logger = createLogger('song-dir-processor');

export const isToBeProcessedResult = (
  result: ToBeProcessed | CannotBeProcessed,
): result is ToBeProcessed => {
  return 'type' in result;
};

export const determineIfCanBeProcessed = (
  dir: string,
): ToBeProcessed | CannotBeProcessed => {
  const folderType = determineFolderType(dir);

  if (folderType === FolderType.NOT_SUPPORTED) {
    return {
      dir,
      reason: 'Not supported', // TODO: better reasoning
    };
  }

  return {
    dir,
    type: folderType,
  };
};

export const processSongDirectory = async (
  item: ToBeProcessed,
  originId?: string,
) => {
  const processorFunc = PROCESSOR_MAP[item.type];
  await processorFunc(item.dir, originId);
  cleanDir(directories.temp);
};

const readFileNamesInDir = async (dir: string) => {
  const names = await fsPromises.readdir(dir);
  const withType = await Promise.all(
    names.map(async (name) => {
      const fullPath = path.join(dir, name);
      const stat = await fsPromises.lstat(fullPath);
      return {
        name,
        isFile: stat.isFile(),
      };
    }),
  );

  return withType.filter((item) => item.isFile).map((item) => item.name);
};

const pathExists = async (targetPath: string) => {
  try {
    await fsPromises.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const processQueueItem = async (item: Required<CombinedJaraokeFiles>) => {
  logger.info(`Reprocessing: ${item.metadata.title}`);
  const dir = path.join(directories.songs, item.parentDir);

  const filteredFiles = await readFileNamesInDir(dir);

  logger.debug(`Removing "${filteredFiles.length}" old files`);

  for (const f of filteredFiles) {
    const fullPath = path.join(dir, f);
    await fsPromises.rm(fullPath);
    logger.debug(`Removed "${f}"`);
  }

  logger.debug(`Moving original files into parent directory`);

  const originContentDir = path.join(
    directories.songs,
    item.parentDir,
    SAFE_DIR_NAME,
  );

  const hasOriginalContentDir = await pathExists(originContentDir);

  if (!hasOriginalContentDir) {
    logger.error(
      `Cannot reprocess "${item.metadata.title}": missing ${SAFE_DIR_NAME} under ${item.parentDir}`,
    );
    return;
  }

  const filteredOriginFiles = await readFileNamesInDir(originContentDir);

  for (const f of filteredOriginFiles) {
    const fullPath = path.join(originContentDir, f);
    const newPath = path.join(dir, f);
    await fsPromises.copyFile(fullPath, newPath);
    logger.debug(`Moved ${f} to ${newPath}`);
  }

  logger.info(
    `Moved original contents into parent directory - triggering reprocess`,
  );

  const processItem = determineIfCanBeProcessed(dir);

  if (!isToBeProcessedResult(processItem)) {
    logger.error(`Cannot reprocess the directory: ${processItem.reason}`);
    return;
  }

  await processSongDirectory(processItem, item.id);

  const index = store.karaokeFiles.findIndex((x) => x.id === item.id);
  const newItem = await readJaraokeFile(
    path.join(dir, INFO_FILE_NAME),
    item.parentDir,
  );
  store.karaokeFiles[index] = newItem;

  logger.info(`Updated: ${newItem.metadata.title}`);
};

const processQueue = new Queue<Required<CombinedJaraokeFiles>>(
  processQueueItem,
  'song-processing',
);

export const reprocessSong = (file: Required<CombinedJaraokeFiles>) => {
  processQueue.addItemToQueue(file);
};
