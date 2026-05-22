import type {
  AssLine,
  LyricBuilderAssOptions,
  WithRequired,
} from 'jaraoke-shared/types';
import {
  constructCountdown,
  createAssLayout,
  createAssTemplate,
  createAssTimingFormatter,
  createDialogueLine,
} from '../shared';
import {
  kfnSongIniReader,
  type SongIniReaderInstance,
} from './kfn-song-ini-reader';

interface LyricBuilderOptions {
  kfnDirectory?: string;
  songIniInstance?: SongIniReaderInstance;
}

interface Line {
  str: string;
  group: string;
}

interface LineTiming extends Line {
  timing: number;
}

export const kfnLyricsBuilder = (
  opts:
    | WithRequired<LyricBuilderOptions, 'kfnDirectory'>
    | WithRequired<LyricBuilderOptions, 'songIniInstance'>,
) => {
  const { kfnDirectory, songIniInstance } = opts;

  if (!songIniInstance && !kfnDirectory) {
    throw new Error(
      'Please pass in either a kfn directory or SongIni Reader Instance',
    );
  }

  const iniReader =
    songIniInstance || kfnSongIniReader({ kfnDirectory: kfnDirectory! });

  const convertTiming = createAssTimingFormatter(100);

  const getTimings = (eff: Record<string, string>) => {
    return Object.entries(eff)
      .reduce((acc: number[], current) => {
        const [key, value] = current;

        if (!/sync\d/.test(key)) {
          return acc;
        }

        const parts = value.split(',').map((x) => parseInt(x, 10));

        return [...acc, ...parts];
      }, [])
      .filter((x) => x);
  };

  const getLines = (eff: Record<string, string>) => {
    return Object.entries(eff).reduce((acc: Line[], current) => {
      const [key, value] = current;
      const isTextLine = /text\d/.test(key);

      if (!isTextLine) {
        return acc;
      }

      if (value.trim().length === 0) {
        return acc;
      }

      const str = value.replace(/ {2,}/g, ' ').trim();

      return [
        ...acc,
        {
          str,
          group: key,
        },
      ];
    }, []);
  };

  const getWords = (lines: Line[]) => {
    return lines
      .map((x) => ({ str: x.str.replace(/ /g, '# '), group: x.group }))
      .flatMap((x) => ({ str: x.str.split(/ /g), group: x.group }))
      .reduce((acc: Line[], current) => {
        const words = current.str.flatMap((x) => x.split(/\//g));
        const wordsGroup = words.map((x) => ({
          str: x.replace('#', ' '),
          group: current.group,
        }));

        return [...acc, ...wordsGroup];
      }, []);
  };

  const applyTimingsToWords = (
    lines: Line[],
    timings: number[],
  ): LineTiming[] => {
    return lines.map((l, index) => ({
      str: l.str,
      group: l.group,
      timing: timings[index],
    }));
  };

  const groupLyrics = (lyrics: LineTiming[]): Map<string, LineTiming[]> => {
    const output = new Map<string, LineTiming[]>();

    for (let i = 0; i < lyrics.length; i++) {
      const { group } = lyrics[i];

      if (output.has(group)) {
        const copy = [...output.get(group)!];
        copy.push(lyrics[i]);
        output.set(group, copy);
      } else {
        output.set(group, [lyrics[i]]);
      }
    }

    return output;
  };

  // TODO there are words with multiple "_" that need to be handled

  const constructLyrics = () => {
    const eff = iniReader.findLyricsEffect();

    if (!eff) {
      throw new Error('Could not find lyrics effect in Song.ini');
    }

    const timings = getTimings(eff);
    const lines = getLines(eff);
    const words = getWords(lines);

    if (timings.length !== words.length) {
      throw new Error(`Timings: ${timings.length} !== Words: ${words.length}`);
    }

    const lyrics = applyTimingsToWords(words, timings);

    return groupLyrics(lyrics);
  };

  const toAss = (options?: LyricBuilderAssOptions) => {
    const {
      paddingTiming = 100,
      font = 'IMPACT',
      fontSize = 48,
      highlightColour = '&H00FF00&',
      maxLinesOnScreen = 4,
      screen,
    } = options || {};
    const { height, centerX, positions } = createAssLayout({
      fontSize,
      maxLinesOnScreen,
      screen,
    });

    const lyrics = constructLyrics();
    const assTemplate = createAssTemplate({ font, fontSize });

    const assLines: string[] = [];
    const lines: AssLine[] = [];
    const highlightTemplate = `\\r\\1c${highlightColour}`;

    for (const element of lyrics.values()) {
      const startingTiming = element[0].timing;
      const endingTiming =
        element[element.length - 1].timing || startingTiming + 500;

      const paddingStart = startingTiming - paddingTiming;
      const paddingEnd = endingTiming + paddingTiming;
      const parts: { start: number; str: string }[] = [];

      for (let i = 0; i < element.length; i++) {
        const word = element[i];
        const nextWordTiming = element[i + 1]?.timing || endingTiming;

        const str = word.str.replace(/_/g, ' ');

        const start = nextWordTiming - word.timing;
        parts.push({
          start,
          str,
        });
      }

      if (!parts.some((x) => x.str.trim().length > 0)) {
        continue;
      }

      const lyric = parts.map((x) => `{\\k${x.start}}${x.str}`).join('');

      lines.push({
        start: paddingStart,
        end: paddingEnd,
        lyric,
      });
    }

    const countdownLines = constructCountdown({
      firstTiming: lines[0].start + paddingTiming,
      startingNumber: 3,
      paddingTiming,
      unitsPerSecond: 100,
    });

    for (const line of countdownLines) {
      const prefixTemplate = `{\\pos(${centerX},${height / 2})}`;
      const formattedLine = createDialogueLine({
        start: line.start,
        end: line.end,
        lyric: line.lyric,
        style: line.style,
        prefix: prefixTemplate,
        formatTiming: convertTiming,
      });
      assLines.push(formattedLine);
    }

    for (let i = 0; i < lines.length; i += maxLinesOnScreen) {
      const chunk = lines.slice(i, i + maxLinesOnScreen);

      for (let j = 0; j < chunk.length; j++) {
        const line = chunk[j];
        const pos = positions[j];

        // TODO: If the timings between the next end and start are far away we can reset back to positions[0]

        const prefixTemplate = `{\\k${paddingTiming}${highlightTemplate}\\pos(${centerX},${pos})}`;
        const formattedLine = createDialogueLine({
          start: line.start,
          end: line.end,
          lyric: line.lyric,
          prefix: prefixTemplate,
          formatTiming: convertTiming,
        });
        assLines.push(formattedLine);
      }
    }

    return `${assTemplate}${assLines.join('\n')}`;
  };

  return {
    toAss,
  };
};
