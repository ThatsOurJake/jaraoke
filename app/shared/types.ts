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
   * Language of ttrack
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
  gender: 'MALE' | 'FEMALE' | 'NA';
  type: kfnTrackTypes;
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

export interface LyricBuilderAssOptions {
  highlightColour?: string;
  fontSize?: number;
  font?: string;
  paddingTiming?: number;
  screen?: {
    width: number;
    height: number;
  };
  maxLinesOnScreen?: number;
}

export interface AssLine {
  start: number;
  end: number;
  lyric: string;
  style?: string;
}

export interface Settings {
  ffmpegPath: string;
  mpvPath: string;
  version: number;
}

export interface VolumeOverride {
  trackFileName: string;
  volume: number; // Between 0 and 1
}

export interface PlayPayload {
  id: string;
  trackVolumes?: VolumeOverride[];
}

export interface JaraokeTrack {
  name: string;
  fileName: string;
}

export interface JaraokeFileMeta {
  title: string;
  artist?: string;
  year?: string;
}

interface BaseJarokeFIle {
  metadata: JaraokeFileMeta;
  version: number;
  id: string;
  parentDir?: string;
}

export interface JaraokeFile extends BaseJarokeFIle {
  tracks: JaraokeTrack[];
  lyrics: string;
}

export interface JaraokeCDGFile extends BaseJarokeFIle {
  video: string;
}

export type CombinedJaraokeFiles = JaraokeFile | JaraokeCDGFile;
