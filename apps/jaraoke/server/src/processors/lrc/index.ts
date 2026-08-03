import fs from 'node:fs';
import path from 'node:path';
import { parseFile, selectCover } from 'music-metadata';
import { directories } from '../../constants';
import { transcodeToMp3 } from '../../services/ffmpeg/transcode-to-mp3';
import { bufferToBase64 } from '../../utils/image-to-base64';
import { createJaraokeInfoFile } from '../../utils/jaraoke-info-file';
import { createLogger } from '../../utils/logger';
import { moveFiles } from '../../utils/move-files';
import type { Processor } from '../processor-map';
import { lrcLyricBuilder } from './lrc-lyrics-builder';

const logger = createLogger('lrc-processor');

export const checkAndTranscodeTrack = (audioFile: string, rootDir: string) => {
  if (audioFile.endsWith('mp3')) {
    return { result: false };
  }

  const fullAudioPath = path.join(rootDir, audioFile);

  const { filename: newFileName } = transcodeToMp3(fullAudioPath);

  return { result: true, newFileName };
};

export const lrcProcessor: Processor = async (
  directory: string,
): Promise<void> => {
  logger.info(`Processing: "${directory}" as LRC type`);
  const files = fs.readdirSync(directory);

  const lrcFile = files.find((x: string) => x.endsWith('lrc'));
  const audioFile =
    files.find((x: string) => x.endsWith('mp3')) ||
    files.find((x: string) => x.endsWith('ogg')) ||
    files.find((x: string) => x.endsWith('flac'));

  if (!lrcFile || !audioFile) {
    logger.error(`LRC and audio file not found inside of: "${directory}"`);
    return;
  }

  const { result: hadToTranscode, newFileName } = checkAndTranscodeTrack(
    audioFile,
    directory,
  );
  const audioFileName = hadToTranscode && newFileName ? newFileName : audioFile;

  const fullLrcPath = path.join(directory, lrcFile);
  const fullAudioPath = path.join(directory, audioFileName);

  const destAudioFile = path.join(directories.temp, audioFileName);

  fs.cpSync(fullAudioPath, destAudioFile);

  try {
    const { common, format } = await parseFile(fullAudioPath);
    const { title, artist, year, picture } = common;
    const { duration } = format;

    const albumCover = selectCover(picture);

    const lyricsBuilder = lrcLyricBuilder({
      lrcFile: fullLrcPath,
    });

    const lyrics = lyricsBuilder.toJaraoke();

    const infoFileLocation = createJaraokeInfoFile(
      {
        metadata: {
          title: title || audioFileName,
          artist: artist,
          year: year?.toString(),
          duration: Math.floor(duration || 0),
        },
        tracks: [
          {
            fileName: audioFileName,
            name: 'main',
            isToggleable: false,
          },
        ],
        lyrics,
        coverPhoto: albumCover
          ? bufferToBase64(albumCover.data, albumCover.format)
          : undefined,
      },
      directories.temp,
    );

    moveFiles([destAudioFile, infoFileLocation], directory);
  } catch (err) {
    const error = err as Error;
    logger.error(
      { stack: error.stack },
      `Failed to process: "${directory}" - Reason: ${error.message}`,
    );

    return;
  }

  logger.info(`Processed successfully`);
};
