import type { Settings } from 'jaraoke-shared/types';

class Store {
  private _settings: Settings | null = null;

  public get settings(): Settings {
    if (!this._settings) {
      throw new Error('Settings has not been set!');
    }

    return this._settings;
  }

  public set settings(value: Settings) {
    this._settings = value;
  }
}

export const store = new Store();
