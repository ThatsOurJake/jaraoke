export const PLACEHOLDER_ALBUM_COVER = 'album.png';
export const SONG_STORAGE_KEY = 'jaraoke:current_song';
export const KARAOKE_EVENT = 'karaoke-event';

export const LYRIC_COLOURS = {
  personOne: '#00FF00',
  personTwo: '#FFA500',
  translation: '#909090',
} as const;

export const TITLE_CARD_DURATION_MS = 2_000;

export const LYRIC_POST_SING_HOLD_MS = 1_800;
export const LYRIC_NEXT_LINE_PREVIEW_WINDOW_MS = 2_500;
export const LYRIC_INSTRUMENTAL_BAR_END_EARLY_MS = 1250;

export const AUDIO_SYNC_INTERVAL_MS = 160;
export const AUDIO_SYNC_SOFT_DRIFT_MS = 24;
export const AUDIO_SYNC_HARD_DRIFT_MS = 120;
export const AUDIO_SYNC_RATE_MIN = 0.985;
export const AUDIO_SYNC_RATE_MAX = 1.015;
export const AUDIO_SYNC_RATE_GAIN = 0.15;

export const BT_PRESETS = [
  '$$$ Royal - Mashup (220)',
  '_Mig_085',
  '_Rovastar + Geiss - Hurricane Nightmare (Posterize Mix)',
  'flexi + geiss - pogo cubes vs. tokamak vs. game of life [stahls jelly 4.5 finish]',
  'Flexi - area 51',
  'Flexi - truly soft piece of software - this is generic texturing (Jelly) ',
  'Geiss, Flexi + Stahlregen - Thumbdrum Tokamak [crossfiring aftermath jelly mashup]',
  'Martin - acid wiring',
  'martin - castle in the air',
  'martin - chain breaker',
  'martin - disco mix 4',
  'martin - The Bridge of Khazad-Dum',
  'martin - witchcraft reloaded',
  'martin, flexi, fishbrain + sto - enterstate [random mashup]',
];
