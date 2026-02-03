import fs from 'node:fs';
import { extname } from 'node:path';
import { IGNORED_FILES } from '../constants';
import { findSupportedVideo, SUPPORTED_VIDEO_TYPES } from '../processors/video';

export enum FolderType {
  CDG,
  KARAFUN,
  ULTRA_STAR,
  LRC,
  VIDEO,
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

  if (findSupportedVideo(files)) {
    return FolderType.VIDEO;
  }

  return FolderType.NOT_SUPPORTED;
};
