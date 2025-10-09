import type { WithRequired } from 'jaraoke-shared/types';
import {
  kfnSongIniReader,
  type SongIniReaderInstance,
} from './kfn-song-ini-reader';

interface LyricBuilderOptions {
  kfnDirectory?: string;
  songIniInstance?: SongIniReaderInstance;
}

interface LyricBuilderAssOptions {
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

interface Line {
  str: string;
  group: string;
}

interface LineTiming extends Line {
  timing: number;
}

interface AssLine {
  start: number;
  end: number;
  lyric: string;
  style?: string;
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

  const convertTiming = (value: number) => {
    const minutes = Math.floor(value / 6000);
    const seconds = Math.floor((value - minutes * 6000) / 100);
    const ms = Math.floor(value - (minutes * 6000 + seconds * 100));

    const pad = (num: number) => num.toString().padStart(2, '0');

    return `${pad(minutes)}:${pad(seconds)}.${pad(ms)}`;
  };

  const constructCountdown = (
    firstTiming: number,
    startingNumber: number = 3,
    paddingTiming: number = 100,
  ): AssLine[] => {
    return Array(startingNumber)
      .fill(() => undefined)
      .map((_, index) => {
        const number = startingNumber - index;
        const centiseconds = number * 100;

        return {
          start: firstTiming - centiseconds - 100 - paddingTiming,
          end: firstTiming - centiseconds - paddingTiming,
          lyric: `{\\fad(300,300)}${number}`,
          style: 'Countdown',
        };
      });
  };

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
    const { width = 1280, height = 720 } = screen || {};

    const lyrics = constructLyrics();

    const initialStartPos = height / maxLinesOnScreen;
    const positions = Array(maxLinesOnScreen)
      .fill((_: any) => undefined)
      .map((_, i) => initialStartPos + fontSize * i);
    const CENTER_X = width / 2;

    const ASS_TEMPLATE = `[Script Info]
; Script generated by Aegisub 3.4.2
; http://www.aegisub.org/
Title: Default Aegisub file
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: None
PlayResX: 1280
PlayResY: 720

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${font},${fontSize},&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1
Style: Countdown,Arial Black,80,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,5,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    const assLines: string[] = [];
    const lines: AssLine[] = [];
    const HIGHLIGHT_TEMPLATE = `\\r\\1c${highlightColour}`;

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

    const countdownLines = constructCountdown(
      lines[0].start + paddingTiming,
      3,
      paddingTiming,
    );

    for (const line of countdownLines) {
      const startTiming = convertTiming(line.start);
      const endTiming = convertTiming(line.end);

      const prefixTemplate = `{\\pos(${CENTER_X},${height / 2})}`;
      const formattedLine = `Dialogue: 0,0:${startTiming},0:${endTiming},Countdown,,0,0,0,,${prefixTemplate}${line.lyric}`;
      assLines.push(formattedLine);
    }

    for (let i = 0; i < lines.length; i += maxLinesOnScreen) {
      const chunk = lines.slice(i, i + maxLinesOnScreen);

      for (let j = 0; j < chunk.length; j++) {
        const line = chunk[j];
        const startTiming = convertTiming(line.start);
        const endTiming = convertTiming(line.end);
        const pos = positions[j];

        // TODO: If the timings between the next end and start are far away we can reset back to positions[0]

        const prefixTemplate = `{\\k${paddingTiming}${HIGHLIGHT_TEMPLATE}\\pos(${CENTER_X},${pos})}`;
        const formattedLine = `Dialogue: 0,0:${startTiming},0:${endTiming},Default,,0,0,0,,${prefixTemplate}${line.lyric}`;
        assLines.push(formattedLine);
      }
    }

    return `${ASS_TEMPLATE}${assLines.join('\n')}`;
  };

  return {
    toAss,
  };
};
