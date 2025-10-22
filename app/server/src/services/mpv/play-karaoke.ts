import { spawn } from 'node:child_process';
import path from 'node:path';
import type {
  CombinedJaraokeFiles,
  JaraokeCDGFile,
  JaraokeFile,
  VolumeOverride,
} from 'jaraoke-shared/types';
import { directories } from '../../constants';
import { createLogger } from '../../utils/logger';
import { createLavfiStream } from '../ffmpeg/create-lavfi-stream';

let isPlaying = false;

const logger = createLogger('play-karaoke');

const spawnMPV = (source: string) => {
  const args = ['--osc=no', '--fs', '--ontop', '--no-input-cursor', source];

  logger.debug(`Spawning MPV: mpv ${args}`);

  return spawn('mpv', args, {
    env: process.env,
    stdio: 'pipe',
  });
};

const playCDG = (videoSource: string, onClose: () => void) => {
  const mpvProcess = spawnMPV(videoSource);

  mpvProcess.stderr.on('data', (data) => {
    logger.error(data.toString());
  });

  mpvProcess.on('close', onClose);
};

const playTrackSources = (
  jaraokeFile: JaraokeFile,
  volumeOverrides: VolumeOverride[],
  onClose: () => void,
) => {
  const lavfiStream = createLavfiStream(jaraokeFile, volumeOverrides);
  const mpvProcess = spawnMPV('-');
  lavfiStream.stdout.pipe(mpvProcess.stdin);

  mpvProcess.stderr.on('data', (data) => {
    logger.error(data.toString());
  });

  mpvProcess.on('close', onClose);
};

export const playKaraoke = (
  song: CombinedJaraokeFiles,
  trackVolumes: VolumeOverride[] = [],
) => {
  if (isPlaying) {
    return;
  }

  isPlaying = true;

  if (!song.parentDir) {
    logger.warn(`No parent directory set - this shouldn't be possible.`);
    return;
  }

  logger.info(`Playing: ${song.metadata.title}`);
  const parentDir = song.parentDir;

  const onClose = () => {
    isPlaying = false;
  };

  if (Object.hasOwn(song, 'video')) {
    const cdgSong = song as JaraokeCDGFile;
    const videoPath = path.join(directories.songs, parentDir, cdgSong.video);
    logger.debug(`Playing CDG: ${song.metadata.title}`);
    playCDG(videoPath, onClose);
    return;
  }

  logger.debug(`Playing: ${song.metadata.title}`);
  const nonCdgSong = song as JaraokeFile;
  playTrackSources(nonCdgSong, trackVolumes, onClose);
};
