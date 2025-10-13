import type { Settings } from 'jaraoke-shared/types';
import type { JaraokeCDGFile, JaraokeFile } from '../utils/jaraoke-info-file';

type CombinedJaraokeFiles = JaraokeFile | JaraokeCDGFile;

class Store {
  private _settings: Settings | null = null;
  private _karaokeFiles: CombinedJaraokeFiles[] = [];

  public get settings(): Settings {
    if (!this._settings) {
      throw new Error('Settings has not been set!');
    }

    return this._settings;
  }

  public set settings(value: Settings) {
    this._settings = value;
  }

  public get karaokeFiles(): CombinedJaraokeFiles[] {
    return this._karaokeFiles;
  }

  public set karaokeFiles(value: CombinedJaraokeFiles[]) {
    this._karaokeFiles = value;
  }
}

export const store = new Store();
