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
