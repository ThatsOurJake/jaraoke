import fs from 'node:fs';
import path from 'node:path';
import { parse as parseIni } from 'ini';

import type {
  JaraokeLyricsType,
  KFNTrack,
  kfnTrackTypes,
} from 'jaraoke-shared/types';

export type KfnLyricsEffect = Record<string, string>;
export interface KfnLyricsEffectDetails {
  effect: KfnLyricsEffect;
  lyricLineCount: number;
  hasCaption: boolean;
}

type ParsedIni = Record<string, KfnLyricsEffect>;

const getMeaningfulTextLines = (effect: KfnLyricsEffect) => {
  return Object.entries(effect).reduce((acc: string[], [key, value]) => {
    if (!/text\d/.test(key)) {
      return acc;
    }

    const trimmedValue = value.trim();
    const visibleValue = trimmedValue.replace(/[_/\s]+/g, '');

    if (!visibleValue) {
      return acc;
    }

    acc.push(trimmedValue);

    return acc;
  }, []);
};

interface SongIniReaderOpts {
  kfnDirectory: string;
}

export const kfnSongIniReader = (opts: SongIniReaderOpts) => {
  const { kfnDirectory } = opts;

  let parsedIni: ParsedIni | null = null;

  const parseIniFile = () => {
    const songIniLoc = path.join(kfnDirectory.toString(), 'Song.ini');

    if (!fs.existsSync(songIniLoc)) {
      throw new Error('Cannot find Song.ini');
    }

    const songIniContents = fs.readFileSync(songIniLoc);

    return parseIni(songIniContents.toString()) as ParsedIni;
  };

  const getIni = () => {
    if (!parsedIni) {
      parsedIni = parseIniFile();
    }

    return parsedIni;
  };

  const findLyricsEffects = (): KfnLyricsEffect[] => {
    const ini = getIni();

    return Object.entries(ini).reduce((acc: KfnLyricsEffect[], section) => {
      const [key, value] = section;

      if (!key.startsWith('eff')) {
        return acc;
      }

      const effect = value as KfnLyricsEffect;

      if (effect.insync !== '1') {
        return acc;
      }

      acc.push(effect);

      return acc;
    }, []);
  };

  const findLyricsEffect = () => {
    return findLyricsEffects()[0] || null;
  };

  const describeLyricsEffects = (): KfnLyricsEffectDetails[] => {
    return findLyricsEffects().map((effect) => {
      const textLines = getMeaningfulTextLines(effect);
      const caption = effect.caption?.trim() || '';

      return {
        effect,
        lyricLineCount: textLines.length,
        hasCaption: caption.length > 0,
      };
    });
  };

  const getLyricsType = (): JaraokeLyricsType => {
    const effects = describeLyricsEffects();

    if (effects.length <= 1) {
      return 'single';
    }

    const sortedByCoverage = [...effects].sort(
      (a, b) => b.lyricLineCount - a.lyricLineCount,
    );
    const primaryEffect = sortedByCoverage[0];
    const secondaryEffect = sortedByCoverage[1];
    const allHaveCaptions = effects.every((effect) => effect.hasCaption);
    const secondaryCoverageRatio =
      secondaryEffect.lyricLineCount /
      Math.max(1, primaryEffect.lyricLineCount);

    if (
      effects.length === 2 &&
      secondaryCoverageRatio <= 0.5 &&
      !allHaveCaptions
    ) {
      return 'translation';
    }

    return 'duet';
  };

  const getMetadata = () => {
    const ini = getIni();
    const { general } = ini;

    if (!general) {
      return null;
    }

    return {
      title: general.title,
      artist: general.artist,
      year: general.year,
    };
  };

  const fileNameToType = (str: string): kfnTrackTypes => {
    if (str.startsWith('ld')) {
      return 'LEAD';
    }

    if (str.startsWith('bv')) {
      return 'BACKING_VOCALS';
    }

    return 'UNKNOWN';
  };

  const constructTrackName = (
    trackType: kfnTrackTypes,
    kfnTrackName: string,
  ) => {
    if (trackType === 'BACKING_VOCALS') {
      return 'Backing Vocals';
    }

    if (trackType === 'LEAD' && kfnTrackName.length > 0) {
      return `Lead vocals [${kfnTrackName}]`;
    }

    if (trackType === 'LEAD' && !kfnTrackName) {
      return `Lead vocals`;
    }

    return trackType;
  };

  const getTracks = (): KFNTrack[] => {
    const ini = getIni();
    const { general, mp3music } = ini;

    if (!general && !mp3music) {
      throw new Error('No tracks can be found');
    }

    const [_0, _1, instrumentalTrack] = general.source.split(',');

    const tracks = Object.entries(mp3music).filter(([key]) =>
      key.startsWith('track'),
    );

    let mappedTracks: KFNTrack[] = tracks.map((x) => {
      const [_, value] = x;
      const [fileName, _0, _1, trackName] = (value as string).split(',');

      const trackType = fileNameToType(fileName);

      return {
        fileName,
        trackName: constructTrackName(trackType, trackName),
        type: trackType,
        isToggleable: true,
      };
    });

    const multipleLeads =
      mappedTracks.filter((x) => x.type === 'LEAD').length > 1;

    if (multipleLeads) {
      // Not ideal but this will remove the mixed lead vocal tracks
      mappedTracks = mappedTracks.filter((x) => !x.fileName.includes('mixed'));
    }

    return [
      ...mappedTracks,
      {
        fileName: instrumentalTrack,
        trackName: 'General',
        type: 'INSTRUMENTAL',
        isToggleable: false,
      },
    ];
  };

  return {
    describeLyricsEffects,
    findLyricsEffects,
    findLyricsEffect,
    getLyricsType,
    getMetadata,
    getTracks,
  };
};

export type SongIniReaderInstance = ReturnType<typeof kfnSongIniReader>;
