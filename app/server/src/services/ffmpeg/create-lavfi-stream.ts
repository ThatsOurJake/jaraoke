import { spawn } from 'node:child_process';
import path from 'node:path';
import type { VolumeOverride } from 'jaraoke-shared/types';
import { directories } from '../../constants';
import type { JaraokeFile } from '../../utils/jaraoke-info-file';
import { createLogger } from '../../utils/logger';

const logger = createLogger('create-lavfi-stream');

export const createLavfiStream = (
  jaraokeFile: JaraokeFile,
  volumeOverrides: VolumeOverride[],
) => {
  const { tracks, lyrics, parentDir } = jaraokeFile;
  const songDir = path.join(directories.songs, parentDir!);
  const lyricsPath = path.join(songDir, lyrics);

  const audioComplexes = tracks.map((t, index) => {
    let volume = volumeOverrides.find((x) => x.trackName === t.name)?.volume;

    if (volume === undefined || volume < 0 || volume > 1) {
      logger.warn(
        `Volume: ${volume} must be between 0 and 1 for ${t.fileName}`,
      );

      volume = 1;
    }

    logger.debug(`Setting: ${t.name} to volume: ${volume}`);

    return `[${index}:a]volume=${volume}[a${index}]`;
  });
  const audioComplexesInput = Array(tracks.length)
    .fill(() => undefined)
    .map((_, index) => `[a${index}]`);
  const lavifiIndex = audioComplexesInput.length;
  const filterComplexArg = `${audioComplexes.join('; ')};${audioComplexesInput.join('')}amix=inputs=${tracks.length}[aout]; [${lavifiIndex}:v]subtitles=${lyricsPath}[vout]`;

  const args = [
    ...tracks.flatMap((x) => ['-i', path.join(songDir, x.fileName)]),
    '-f',
    'lavfi',
    '-i',
    'color=size=1280x720:rate=25:color=black',
    '-filter_complex',
    filterComplexArg,
    '-map',
    '[vout]',
    '-map',
    '[aout]',
    '-c:v',
    'libx264',
    '-c:a',
    'aac',
    '-shortest',
    '-f',
    'matroska',
    '-',
  ];

  return spawn('ffmpeg', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
};
