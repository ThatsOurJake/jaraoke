import fs from 'node:fs';

import type { RPartial, UltrastarFile } from 'jaraoke-shared/types';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ultrastar-reader');

export const usReader = (textFileLoc: string) => {
  const fileDetails: UltrastarFile | null = null;

  if (!fs.existsSync(textFileLoc)) {
    throw new Error(`file: ${textFileLoc} - does not exist`);
  }

  const getDetails = (): UltrastarFile => {
    if (fileDetails) {
      return fileDetails;
    }

    const lines = fs.readFileSync(textFileLoc).toString().split('\r\n');

    const output: RPartial<UltrastarFile> = {
      tracks: {},
      metadata: {},
      notes: [],
    };

    for (const line of lines) {
      if (line === 'E') {
        // End of file
        break;
      }

      const sanitisedLine = line.trim();

      if (sanitisedLine.startsWith('#')) {
        // Attributes line;
        const [key, value] = sanitisedLine.slice(1).split(':');

        switch (key.trim()) {
          case 'TITLE':
            output.metadata!.title = value;
            break;
          case 'ARTIST':
            output.metadata!.artist = value;
            break;
          case 'LANGUAGE':
            output.metadata!.language = value.split(',').map((x) => x.trim());
            break;
          case 'GENRE':
            output.metadata!.genre = value.split(',').map((x) => x.trim());
            break;
          case 'YEAR':
            output.metadata!.year = value;
            break;
          case 'MP3':
          case 'AUDIO':
            output.tracks!.audio = value;
            break;
          case 'BPM':
            output.bpm = parseInt(value, 10);
            output.beatLength = Math.round(60000 / (output.bpm * 4));
            break;
          case 'GAP':
            output.gap = parseInt(value, 10);
            break;
          case 'COVER':
            output.cover = value;
            break;
          case 'VOCALS':
            output.tracks!.vocals = value;
            break;
          case 'INSTRUMENTAL':
            output.tracks!.instrumental = value;
            break;
          case 'CREATOR':
            output.creator = value;
            break;
          case 'VIDEO':
            output.video = value;
            break;
          default:
            logger.debug(`Unhandled attribute: ${key}`);
            break;
        }
        continue;
      }

      // Must be a note line
      let count = 0;
      let currentWord: string[] = [];
      const letters = sanitisedLine.split('');
      const parts = letters.reduce((acc: string[], current: string, index) => {
        if (current === ' ' && count < 4) {
          acc.push(currentWord.join(''));
          count++;
          currentWord = [];
        } else {
          currentWord.push(current);
        }

        if (index === letters.length - 1) {
          acc.push(currentWord.join(''));
        }

        return acc;
      }, []);

      const [_noteType, startBeat, length, _pitch, text] = parts;

      if (!text) {
        output.notes?.push({
          endOfPhrase: true,
          start: parseInt(startBeat, 10) * output.beatLength!,
        });

        continue;
      }

      output.notes?.push({
        endOfPhrase: false,
        text,
        start: parseInt(startBeat, 10) * output.beatLength!,
        length: parseInt(length, 10) * output.beatLength!,
      });
    }

    const lastNote = output.notes?.[output.notes.length - 1]!;
    const duration = output.gap! + lastNote.start! + lastNote.length!;
    output.duration = duration / 1000;

    return output as UltrastarFile;
  };

  return {
    getDetails,
  };
};
