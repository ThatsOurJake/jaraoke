import fs from 'node:fs';
import path from 'node:path';
import { parse as parseIni } from 'ini';

import type { KFNTrack, kfnTrackTypes } from 'jaraoke-shared/types';

interface SongIniReaderOpts {
  kfnDirectory: string;
}

export const kfnSongIniReader = (opts: SongIniReaderOpts) => {
  const { kfnDirectory } = opts;

  // TODO: Figure out typings
  let parsedIni: { [key: string]: any } | null = null;

  const parseIniFile = () => {
    const songIniLoc = path.join(kfnDirectory.toString(), 'Song.ini');

    if (!fs.existsSync(songIniLoc)) {
      throw new Error('Cannot find Song.ini');
    }

    const songIniContents = fs.readFileSync(songIniLoc);

    return parseIni(songIniContents.toString());
  };

  const getIni = () => {
    if (!parsedIni) {
      parsedIni = parseIniFile();
    }

    return parsedIni;
  };

  const findLyricsEffect = () => {
    const ini = getIni();

    for (const section of Object.entries(ini)) {
      const [key, value] = section;

      if (!key.startsWith('eff')) {
        continue;
      }

      for (const prop of Object.entries(value)) {
        const [propKey, propValue] = prop;

        if (propKey === 'insync' && propValue === '1') {
          return value as Record<string, string>;
        }
      }
    }

    return null;
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
    const mappedTracks: KFNTrack[] = tracks.map((x) => {
      const [_, value] = x;
      const [fileName, _0, _1, gender] = (value as string).split(',');

      return {
        fileName,
        gender: (gender as KFNTrack['gender']) || 'NA',
        type: fileNameToType(fileName),
      };
    });

    return [
      ...mappedTracks,
      {
        fileName: instrumentalTrack,
        gender: 'NA',
        type: 'INSTRUMENTAL',
      },
    ];
  };

  return {
    findLyricsEffect,
    getMetadata,
    getTracks,
  };
};

export type SongIniReaderInstance = ReturnType<typeof kfnSongIniReader>;
