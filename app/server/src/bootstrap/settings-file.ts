import fs, { writeFileSync } from 'node:fs';
import { parse, stringify } from 'ini';
import type { Settings } from 'jaraoke-shared/types';
import { SETTINGS_FILE_LOC, VERSIONS } from '../constants';
import { store } from '../data/store';
import { createLogger } from '../utils/logger';

const logger = createLogger('bootstrap:settings-file');

const migrate = (ini: Settings) => {
  let hasMigrations = false;

  if (ini.version === '1') {
    hasMigrations = true;
    ini.player = 'mpv';
  }

  if (hasMigrations) {
    logger.info('Migrated settings file');
    saveSettingsFile(ini);
  }
};

const readSettingsFile = () => {
  const contents = fs.readFileSync(SETTINGS_FILE_LOC);
  const ini = parse(contents.toString()) as Settings;
  // TODO: validation
  migrate(ini);
  store.settings = ini;
  logger.info(`Read and store settings from file @ "${SETTINGS_FILE_LOC}"`);
  logger.debug(`Settings file: ${JSON.stringify(ini, null, 2)}`);
};

const initialSettings: Settings = {
  ffmpegPath: 'ffmpeg',
  ffprobePath: 'ffprobe',
  mpvPath: 'mpv',
  player: 'mpv',
  version: VERSIONS.settings.toString(),
};

const createSettingsFile = () => {
  writeFileSync(SETTINGS_FILE_LOC, stringify(initialSettings));
  logger.info(`Created and stored settings file @ "${SETTINGS_FILE_LOC}"`);
};

const saveSettingsFile = (ini: Settings) => {
  writeFileSync(SETTINGS_FILE_LOC, stringify(ini));
  logger.info(`Saved settings file @ "${SETTINGS_FILE_LOC}"`);
};

export const createAndReadSettingsFile = () => {
  if (fs.existsSync(SETTINGS_FILE_LOC)) {
    readSettingsFile();
    return;
  }

  createSettingsFile();
  store.settings = initialSettings;
};
