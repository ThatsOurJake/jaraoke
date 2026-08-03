import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type {
  JaraokeFile,
  JaraokeTrack,
  VolumeOverride,
} from 'jaraoke-shared/types';
import { assetDirectories, directories } from '../../constants';
import { createLogger } from 'jaraoke-shared/server/utils/logger';
import { rng } from '../../utils/rng';

const logger = createLogger('create-lavfi-stream');
const BACKGROUND_VIDEO_START_INDEX = 1;
const VIDEO_INDEX_OFFSET = 1;
const FALLBACK_VIDEO_WIDTH = 1280;
const FALLBACK_VIDEO_HEIGHT = 720;
const FALLBACK_VIDEO_FRAME_RATE = 25;

const logFfmpegErrorOutput = (output: string) => {
  const lines = output
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    logger.error(line);
  }
};

// TODO: Toggle from settings for backgrounds

const getBackgroundAsset = (): string | null => {
  if (!fs.existsSync(assetDirectories.backgrounds)) {
    return null;
  }

  const videos = fs
    .readdirSync(assetDirectories.backgrounds)
    .filter((x) => x.endsWith('mp4'))
    .map((x) => path.join(assetDirectories.backgrounds, x));
  const index =
    rng(BACKGROUND_VIDEO_START_INDEX, videos.length) - VIDEO_INDEX_OFFSET;
  return videos[index];
};

export const createLavfiStream = (
  jaraokeFile: JaraokeFile,
  volumeOverrides: VolumeOverride[],
) => {
  const { tracks, parentDir } = jaraokeFile;

  if (!parentDir) {
    throw new Error('Cannot create lavfi stream without a parent directory');
  }

  const songDir = path.join(directories.songs, parentDir);
  const video = getBackgroundAsset();

  const audioComplexes = tracks.map((t: JaraokeTrack, index: number) => {
    let volume = volumeOverrides.find(
      (x) => x.trackFileName === t.fileName,
    )?.volume;

    if (volume === undefined || volume < 0 || volume > 1) {
      logger.debug(
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
      `color=size=${FALLBACK_VIDEO_WIDTH}x${FALLBACK_VIDEO_HEIGHT}:rate=${FALLBACK_VIDEO_FRAME_RATE}:color=black`,
    ];
    videoInputLabel = `${lavifiIndex}:v`;
  }

  const filterComplexArg = `${audioComplexes.join('; ')};${audioComplexesInput.join('')}amix=inputs=${tracks.length}[aout]`;

  const args = [
    '-hide_banner',
    '-nostats',
    '-loglevel',
    'error',
    ...tracks.flatMap((x) => ['-i', path.join(songDir, x.fileName)]),
    ...videoInputArgs,
    '-filter_complex',
    filterComplexArg,
    '-map',
    `${videoInputLabel}`,
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

  logger.debug(`Spawning ffmpeg: ffmpeg ${args.join(' ')}`);

  const ffmpegProcess = spawn('ffmpeg', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  ffmpegProcess.on('error', (error) => {
    logger.error(`ffmpeg failed to start: ${error.message}`);
  });

  ffmpegProcess.stderr.on('data', (data) => {
    logFfmpegErrorOutput(data.toString());
  });

  ffmpegProcess.on('close', (code, signal) => {
    if (code && signal !== 'SIGTERM') {
      logger.error(
        `ffmpeg lavfi stream exited with code=${code} signal=${signal ?? 'null'}`,
      );
      return;
    }

    logger.debug(
      `ffmpeg lavfi stream closed with code=${code ?? 'null'} signal=${signal ?? 'null'}`,
    );
  });

  return ffmpegProcess;
};
