import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  CombinedJaraokeFiles,
  JaraokeCDGFile,
  JaraokeFile,
  JaraokeFileMeta,
} from 'jaraoke-shared/types';
import { INFO_FILE_NAME, VERSIONS } from '../constants';
import { createLogger } from './logger';

const logger = createLogger('jaraoke-info-file');

const idHash = (metadata: JaraokeFileMeta) => {
  const str = Object.values(metadata).join('|');
  return crypto.createHash('md5').update(str).digest('hex');
};

export const createJaraokeInfoFile = (
  details:
    | Omit<JaraokeFile, 'version' | 'id'>
    | Omit<JaraokeCDGFile, 'version' | 'id'>,
  directory: string,
) => {
  if (!fs.existsSync(directory)) {
    throw new Error(
      `Cannot create Jaraoke file @ "${directory}" as this directory does not exist`,
    );
  }

  const data: CombinedJaraokeFiles = {
    ...details,
    id: idHash(details.metadata),
    version: VERSIONS.jaraokeInfo,
  };

  const output = path.join(directory, INFO_FILE_NAME);
  fs.writeFileSync(output, JSON.stringify(data));

  logger.debug(`Created JaraokeInfo File @ "${output}"`);

  return output;
};

// TODO: ZOD validation
