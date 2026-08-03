export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export interface KFNHeader {
  /**
   * Difficult for men
   */
  DIFM?: string;
  /**
   * Difficult for women
   */
  DIFW?: string;
  /**
   * Genre of track (ID3 Tag)
   */
  GNRE?: string;
  /**
   * Song length in seconds
   */
  MUSL?: string;
  FLID?: string;
  /**
   * Language of track
   */
  LANG?: string;
  /**
   * Title of track
   */
  TITL?: string;
  /**
   * Artist of track
   */
  ARTS?: string;
  /**
   * Album of track
   */
  ALBM?: string;
  COMP?: string;
  COPY?: string;
  /**
   * Field value always uses format: "%d,%c,%s" (file_type, source_type, filename)
   * File Type: 1 = Audio file "Audio file" | 2 = MIDI/Karaoke file (mid, kar) "Midi music file" | 6 Video file "Video file"
   * Source Type: I = "MP3 audio file" without linked file | L "MP3 audio file" with linked file
   * File name: Source Type = I then original file name is here otherw1 path to audio file
   */
  SORC?: string;
  COMM?: string;
  /**
   * Year of release
   */
  YEAR?: string;
  /**
   * Song Track Number on Album
   */
  TRAK?: string;
  ENDH?: string;
}

export interface KFNFile {
  type: number;
  offset: number;
  length: number;
  flags: number;
  encryptedLength: number;
  fileName: string;
}

export type kfnTrackTypes =
  | 'BACKING_VOCALS'
  | 'LEAD'
  | 'UNKNOWN'
  | 'INSTRUMENTAL';

export interface KFNTrack {
  fileName: string;
  trackName: string;
  type: kfnTrackTypes;
  isToggleable: boolean;
}

export type RPartial<T> = {
  [P in keyof T]?: T[P] extends object ? RPartial<T[P]> : T[P];
};

export interface UltrastarNote {
  start: number;
  length: number;
  text?: string;
  endOfPhrase?: boolean;
}

export interface UltrastarFile {
  metadata: {
    title: string;
    artist: string;
    language: string[];
    genre?: string[];
    year?: string;
  };
  bpm: number;
  beatLength: number;
  gap: number;
  notes: UltrastarNote[];
  tracks: {
    audio?: string;
    vocals?: string;
    instrumental?: string;
  };
  video?: string;
  cover?: string;
  creator?: string;
  duration?: number;
}

export interface Settings {
  ffmpegPath: string;
  ffprobePath: string;
  mpvPath: string;
  player: 'mpv' | 'web';
  version: string;
}

export interface VolumeOverride {
  trackFileName: string;
  volume: number;
}

export interface PlayPayload {
  id: string;
  trackVolumes?: VolumeOverride[];
}

export interface JaraokeTrack {
  name: string;
  fileName: string;
  isToggleable: boolean;
}

export interface JaraokeFileMeta {
  title: string;
  artist?: string;
  year?: string;
  duration?: number;
}

interface BaseJarokeFIle {
  metadata: JaraokeFileMeta;
  version: number;
  id: string;
  coverPhoto?: string;
  parentDir?: string;
}

export type LyricDisplayType = 'top' | 'bottom' | 'translation';

export type JaraokeLyricsType = 'single' | 'duet' | 'translation';

export type PhraseEffect = 'highlight' | 'fill';

export interface LyricSyllable {
  phrase: string;
  // When should this phrase highlight (be sung)
  startAtMs: number;
  effect: PhraseEffect;
}

export interface LyricWord {
  syllables: LyricSyllable[];
}

export interface LyricLine {
  // When should the whole line appear on screen in ms
  startAtMs: number;
  words: LyricWord[];
}

export interface Lyric {
  displayName: string;
  displayType: LyricDisplayType;
  lines: LyricLine[];
}

export interface JaraokeFile extends BaseJarokeFIle {
  tracks: JaraokeTrack[];
  lyrics: Lyric[];
}

export interface JaraokeCDGFile extends BaseJarokeFIle {
  video: string;
}

export type CombinedJaraokeFiles = JaraokeFile | JaraokeCDGFile;
