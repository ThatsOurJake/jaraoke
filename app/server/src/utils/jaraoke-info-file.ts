import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { INFO_FILE_NAME, VERSIONS } from '../constants';
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

interface BaseJarokeFIle {
  metadata: JaraokeFileMeta;
  version: number;
  id: string;
  parentDir?: string;
}

export interface JaraokeFile extends BaseJarokeFIle {
  tracks: JaraokeTrack[];
  lyrics: string;
}

export interface JaraokeCDGFile extends BaseJarokeFIle {
  video: string;
}

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

  const data: JaraokeFile | JaraokeCDGFile = {
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
