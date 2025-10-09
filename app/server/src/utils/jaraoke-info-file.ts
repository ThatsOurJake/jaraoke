import fs from 'node:fs';
import path from 'node:path';
import { INFO_FILE_NAME } from '../constants';
import { createLogger } from './logger';

export interface JaraokeTrack {
  name: string;
  fileName: string;
}

interface JaraokeFileMeta {
  title: string;
  artist?: string;
  year?: string;
}

export interface JaraokeFile {
  metadata: JaraokeFileMeta;
  tracks: JaraokeTrack[];
  lyrics: string;
}

const logger = createLogger('jaraoke-info-file');

export const createJaraokeInfoFile = (
  details: JaraokeFile,
  directory: string,
) => {
  if (!fs.existsSync(directory)) {
    throw new Error(
      `Cannot create Jaraoke file @ "${directory}" as this directory does not exist`,
    );
  }

  const output = path.join(directory, INFO_FILE_NAME);
  fs.writeFileSync(output, JSON.stringify(details));

  logger.debug(`Created JaraokeInfo File @ "${output}"`);

  return output;
};

// TODO: ZOD validation
