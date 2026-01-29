import fs, { lstatSync } from 'node:fs';
import path from 'node:path';
import { IGNORED_FILES, SAFE_DIR_NAME } from '../constants';
import { cleanDir } from './clean-dir';
import { createLogger } from './logger';

// TODO: make this a setting
const KEEP_ORIGINAL_FILES = true;

const logger = createLogger('move-files');

export const moveFiles = (files: string[], songOriginDir: string) => {
  const allFiles = fs
    .readdirSync(songOriginDir)
    .map((f) => ({ fileName: f, fullPath: path.join(songOriginDir, f) }))
    .filter(
      (f) =>
        !IGNORED_FILES.includes(f.fileName) && lstatSync(f.fullPath).isFile(),
    );

  if (KEEP_ORIGINAL_FILES) {
    logger.info(`Moving all files in "${songOriginDir}" to a safe location`);

    const safeLocation = path.join(songOriginDir, SAFE_DIR_NAME);

    logger.info(`Moving: "${allFiles.length}" to "${safeLocation}"`);

    if (!fs.existsSync(safeLocation)) {
      fs.mkdirSync(safeLocation, { recursive: true });
    }

    for (const file of allFiles) {
      const newPath = path.join(safeLocation, file.fileName);
      fs.copyFileSync(file.fullPath, newPath);
    }
  }

  logger.debug(`Cleaning: "${songOriginDir}"`);

  cleanDir(songOriginDir);

  for (const file of files) {
    logger.debug(`Moving: "${file}" to "${songOriginDir}"`);
    const newPath = path.join(songOriginDir, path.basename(file));
    fs.copyFileSync(file, newPath);
  }
};
