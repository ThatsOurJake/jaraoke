import fs from 'node:fs';

import { IGNORED_FILES } from '../constants';

export enum FolderType {
  CDG,
  KARAFUN,
  ULTRA_STAR,
  LRC,
  NOT_SUPPORTED,
}

export const determineFolderType = (dir: string): FolderType => {
  const files = fs.readdirSync(dir).filter((f) => !IGNORED_FILES.includes(f));

  if (files.length === 0) {
    return FolderType.NOT_SUPPORTED;
  }

  if (files.find((x: string) => x.endsWith('kfn'))) {
    return FolderType.KARAFUN;
  }

  if (
    files.find((x: string) => x.endsWith('cdg')) &&
    files.find((x: string) => x.endsWith('mp3'))
  ) {
    return FolderType.CDG;
  }

  if (
    files.find((x: string) => x.endsWith('txt')) &&
    files.find((x: string) => x.endsWith('mp3'))
  ) {
    return FolderType.ULTRA_STAR;
  }

  if (
    files.find((x: string) => x.endsWith('lrc')) &&
    (files.find((x: string) => x.endsWith('mp3')) ||
      files.find((x: string) => x.endsWith('ogg')) ||
      files.find((x: string) => x.endsWith('flac')))
  ) {
    return FolderType.LRC;
  }

  return FolderType.NOT_SUPPORTED;
};
