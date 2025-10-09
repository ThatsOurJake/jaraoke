import fs from 'node:fs';
import { IGNORED_FILES } from '../constants';

export enum FolderType {
  CDG,
  KARAFUN,
  ULTRA_STAR,
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
    files.length === 2 &&
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

  return FolderType.NOT_SUPPORTED;
};
