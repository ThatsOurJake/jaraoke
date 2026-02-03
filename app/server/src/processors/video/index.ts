import fs from 'node:fs';
import path, { extname } from 'node:path';
import { parseFile } from 'music-metadata';
import { directories, VIDEO_FILE_NAME } from '../../constants';
import { transcodeToMp4 } from '../../services/ffmpeg/transcode-to-mp4';
import { createJaraokeInfoFile } from '../../utils/jaraoke-info-file';
import { createLogger } from '../../utils/logger';
import { moveFiles } from '../../utils/move-files';
import type { Processor } from '../processor-map';

const logger = createLogger('video-processor');

export const SUPPORTED_VIDEO_TYPES = ['mp4', 'webm'];

export const videoProcessor: Processor = async (
  directory: string,
): Promise<void> => {
  logger.info(`Processing: ${directory} as a Video type`);

  const files = fs.readdirSync(directory);

  const videoPath = files.find((x) => {
    const extName = extname(x).replace('.', '');
    return SUPPORTED_VIDEO_TYPES.includes(extName.toLowerCase());
  });

  if (!videoPath) {
    logger.error(
      `The files present in "${directory}" do not contain a supported video format: ${SUPPORTED_VIDEO_TYPES}`,
    );
    return;
  }

  const ext = extname(videoPath);
  const tempLoc = path.join(directories.temp, VIDEO_FILE_NAME);

  if (!ext.includes('mp4')) {
    transcodeToMp4(path.join(directory, videoPath));
  } else {
    fs.copyFileSync(path.join(directory, videoPath), tempLoc);
  }

  const fileName = videoPath.replace(ext, '');
  const fileMetaData = await parseFile(path.join(directory, videoPath));
  const {
    format: { duration },
  } = fileMetaData;

  const infoFileLocation = createJaraokeInfoFile(
    {
      metadata: {
        title: fileName,
        duration: Math.floor(duration || 0),
      },
      video: VIDEO_FILE_NAME,
    },
    directories.temp,
  );

  moveFiles([infoFileLocation, tempLoc], directory);
};
