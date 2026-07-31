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

const spawnMPV = (source: string, extraArgs: string[] = []) => {
  const args = [
    '--osc=no',
    '--fs',
    '--ontop',
    '--no-input-cursor',
    ...extraArgs,
    source,
  ];

  logger.debug(`Spawning MPV: mpv ${args.join(' ')}`);

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
  if (!jaraokeFile.parentDir) {
    throw new Error('Cannot play karaoke without a parent directory');
  }

  const lyricsPath = path.join(
    directories.songs,
    jaraokeFile.parentDir,
    jaraokeFile.lyrics,
  );
  const lavfiStream = createLavfiStream(jaraokeFile, volumeOverrides);
  const mpvProcess = spawnMPV('-', [`--sub-file=${lyricsPath}`]);
  let isStoppingLavfiStream = false;

  const stopLavfiStream = (reason: string) => {
    if (isStoppingLavfiStream) {
      return;
    }

    isStoppingLavfiStream = true;
    logger.debug(`Stopping lavfi stream: ${reason}`);

    lavfiStream.stdout.unpipe(mpvProcess.stdin);

    if (!mpvProcess.stdin.destroyed) {
      mpvProcess.stdin.destroy();
    }

    if (lavfiStream.exitCode === null && lavfiStream.signalCode === null) {
      lavfiStream.kill('SIGTERM');
    }
  };

  logger.debug(`Loading lyrics in MPV from: ${lyricsPath}`);

  lavfiStream.on('error', (error) => {
    logger.error(`Lavfi stream process error: ${error.message}`);
  });

  lavfiStream.stdout.on('error', (error) => {
    logger.error(`Lavfi stream stdout error: ${error.message}`);
  });

  lavfiStream.stdout.on('end', () => {
    logger.debug('Lavfi stream stdout ended');
  });

  mpvProcess.stdin.on('error', (error: NodeJS.ErrnoException) => {
    logger.error(`MPV stdin error: ${error.message}`);

    stopLavfiStream(`mpv stdin error (${error.code || 'unknown'})`);
  });

  lavfiStream.stdout.pipe(mpvProcess.stdin);

  mpvProcess.stderr.on('data', (data) => {
    logger.error(data.toString());
  });

  mpvProcess.on('error', (error) => {
    logger.error(`MPV process error: ${error.message}`);

    stopLavfiStream('mpv process error');
  });

  mpvProcess.on('close', (code, signal) => {
    stopLavfiStream('mpv closed');
    logger.debug(
      `MPV closed with code=${code ?? 'null'} signal=${signal ?? 'null'}`,
    );
    onClose();
  });

  lavfiStream.on('close', (code, signal) => {
    logger.debug(
      `Lavfi stream closed with code=${code ?? 'null'} signal=${signal ?? 'null'}`,
    );
  });
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
