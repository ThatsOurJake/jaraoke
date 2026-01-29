interface JARAOKE  {
  settings: {
    player: 'mpv' | 'web'
  }
};

declare global {
  interface Window {
    __JARAOKE__: JARAOKE;
  }
}

const defaultJaraoke: JARAOKE = {
  settings: {
    player: 'mpv'
  }
}

export const getSettings = (): JARAOKE['settings'] => {
  if (window && window.__JARAOKE__) {
    return window.__JARAOKE__.settings;
  }

  return defaultJaraoke.settings;
};
