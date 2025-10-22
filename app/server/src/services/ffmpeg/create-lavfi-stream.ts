import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type {
  JaraokeFile,
  JaraokeTrack,
  VolumeOverride,
} from 'jaraoke-shared/types';
import { assetDirectories, directories } from '../../constants';
import { createLogger } from '../../utils/logger';
import { rng } from '../../utils/rng';

const logger = createLogger('create-lavfi-stream');

// TODO: Toggle from settings for backgrounds

const getBackgroundAsset = (): string | null => {
  if (!fs.existsSync(assetDirectories.backgrounds)) {
    return null;
  }

  const videos = fs
    .readdirSync(assetDirectories.backgrounds)
    .filter((x) => x.endsWith('mp4'))
    .map((x) => path.join(assetDirectories.backgrounds, x));
  const index = rng(1, videos.length) - 1;
  return videos[index];
};

export const createLavfiStream = (
  jaraokeFile: JaraokeFile,
  volumeOverrides: VolumeOverride[],
) => {
  const { tracks, lyrics, parentDir } = jaraokeFile;
  const songDir = path.join(directories.songs, parentDir!);
  const lyricsPath = path.join(songDir, lyrics);
  const video = getBackgroundAsset();

  const audioComplexes = tracks.map((t: JaraokeTrack, index: number) => {
    let volume = volumeOverrides.find(
      (x) => x.trackFileName === t.fileName,
    )?.volume;

    if (volume === undefined || volume < 0 || volume > 1) {
      logger.warn(
        `Volume: ${volume} must be between 0 and 1 for ${t.fileName} - setting to "1"`,
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

  let videoInputArgs: string[];
  let videoInputLabel: string;

  if (video) {
    videoInputArgs = ['-stream_loop', '-1', '-i', video];
    videoInputLabel = `${lavifiIndex}:v`;
  } else {
    videoInputArgs = [
      '-f',
      'lavfi',
      '-i',
      'color=size=1280x720:rate=25:color=black',
    ];
    videoInputLabel = `${lavifiIndex}:v`;
  }

  const filterComplexArg = `${audioComplexes.join('; ')};${audioComplexesInput.join('')}amix=inputs=${tracks.length}[aout]; [${videoInputLabel}]subtitles=${lyricsPath}[vout]`;

  const args = [
    ...tracks.flatMap((x) => ['-i', path.join(songDir, x.fileName)]),
    ...videoInputArgs,
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
