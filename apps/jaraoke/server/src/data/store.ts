import type { CombinedJaraokeFiles, Settings } from 'jaraoke-shared/types';

interface ReadyState {
  isReady: boolean;
}

class Store {
  private _settings: Settings | null = null;
  private _karaokeFiles: CombinedJaraokeFiles[] = [];
  private _readyState: ReadyState = { isReady: false };

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

  public get readyState(): ReadyState {
    return this._readyState;
  }

  public setIsReady() {
    this._readyState.isReady = true;
  }
}

export const store = new Store();
