import fs from 'node:fs';
import path, { extname } from 'node:path';
import { directories, VIDEO_FILE_NAME } from '../../constants';
import { probeDuration } from '../../services/ffmpeg/probe-duration';
import { probeVideoCodec } from '../../services/ffmpeg/probe-video-codec';
import { transcodeToMp4 } from '../../services/ffmpeg/transcode-to-mp4';
import { createJaraokeInfoFile } from '../../utils/jaraoke-info-file';
import { createLogger } from '../../utils/logger';
import { moveFiles } from '../../utils/move-files';
import type { Processor } from '../processor-map';

const logger = createLogger('video-processor');

export const SUPPORTED_VIDEO_EXTENSIONS = ['mp4', 'webm'];
const PREFERRED_MP4_VIDEO_CODECS = ['h264'];

export const findSupportedVideo = (files: string[]) =>
  files.find((x) => {
    const extName = extname(x).replace('.', '');
    return SUPPORTED_VIDEO_EXTENSIONS.includes(extName.toLowerCase());
  });

export const videoProcessor: Processor = async (
  directory: string,
  reimportId?: string,
): Promise<void> => {
  logger.info(`Processing: ${directory} as a Video type`);

  const files = fs.readdirSync(directory);
  const videoPath = findSupportedVideo(files);

  if (!videoPath) {
    logger.error(
      `The files present in "${directory}" do not contain a supported video extension: ${SUPPORTED_VIDEO_EXTENSIONS}`,
    );
    return;
  }

  const ext = extname(videoPath);
  const tempLoc = path.join(directories.temp, VIDEO_FILE_NAME);
  const sourceVideoPath = path.join(directory, videoPath);
  const normalizedExt = ext.toLowerCase();
  const videoCodec = await probeVideoCodec(sourceVideoPath);
  const isPreferredMp4 =
    normalizedExt === '.mp4' &&
    !!videoCodec &&
    PREFERRED_MP4_VIDEO_CODECS.includes(videoCodec);
  const shouldTranscode = !isPreferredMp4;

  if (shouldTranscode) {
    logger.info(
      `Video "${videoPath}" (${videoCodec || 'unknown'} codec) is not preferred MP4+h264; transcoding`,
    );
  }

  if (shouldTranscode) {
    await transcodeToMp4(sourceVideoPath);
  } else {
    fs.copyFileSync(sourceVideoPath, tempLoc);
  }

  const fileName = videoPath.replace(ext, '');
  const duration = await probeDuration(path.join(directory, videoPath));

  const infoFileLocation = createJaraokeInfoFile(
    {
      metadata: {
        title: fileName,
        duration: Math.floor(duration || 0),
      },
      video: VIDEO_FILE_NAME,
      type: 'video',
    },
    directories.temp,
    reimportId,
  );

  moveFiles([infoFileLocation, tempLoc], directory);
};
