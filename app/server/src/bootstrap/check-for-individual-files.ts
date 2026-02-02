import fs, { lstatSync } from 'node:fs';
import path, { basename, extname } from 'node:path';
import { directories } from '../constants';
import { createLogger } from '../utils/logger';

const logger = createLogger('bootstrap:check-for-individual-files');

const handleKFN = (loc: string) => {
  const fileNameWithExt = basename(loc);
  const ext = extname(loc);
  const fileName = fileNameWithExt.replace(ext, '');
  const outputDir = path.join(directories.songs, fileName);

  fs.mkdirSync(outputDir, {
    recursive: true,
  });

  fs.cpSync(loc, path.join(outputDir, fileNameWithExt));

  fs.rmSync(loc);

  logger.info(`Moved: ${fileNameWithExt} into its own directory`);
};

const handlers: Record<string, (loc: string) => void> = {
  KFN: handleKFN,
};

export const checkForIndividualFiles = () => {
  logger.info('Checking for any individual files to help process');

  const songFiles = fs
    .readdirSync(directories.songs)
    .map((loc) => path.join(directories.songs, loc))
    .filter((x) => !lstatSync(x).isDirectory());

  for (const file of songFiles) {
    const ext = extname(file).replace('.', '').toUpperCase();
    const handler = handlers[ext];

    if (!handler) {
      logger.warn(`Found "${file}" which cannot be pre-processed`);
      continue;
    }

    logger.info(`PreProcessing "${file}"`);
    handler(file);
  }
};
