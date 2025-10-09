import fs, { lstatSync } from 'node:fs';
import path from 'node:path';
import { IGNORED_FILES } from '../constants';

/**
 * Cleans the files of a directory
 * @param directory
 */
export const cleanDir = (directory: string) => {
  const allFiles = fs
    .readdirSync(directory)
    .map((f) => ({ fileName: f, fullPath: path.join(directory, f) }))
    .filter(
      (f) =>
        !IGNORED_FILES.includes(f.fileName) && lstatSync(f.fullPath).isFile(),
    );

  for (const file of allFiles) {
    fs.rmSync(file.fullPath, { force: true });
  }
};
