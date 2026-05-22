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
  renderAssChunk,
  resolveAssFontSizes,
} from '../shared';
import {
  type KfnLyricsEffect,
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

interface KfnLyricsSection {
  caption?: string;
  highlightColour: string;
  lines: AssLine[];
  positions: number[];
  labelY: number;
}

const normalizeSingerName = (value?: string) =>
  value?.trim().toLowerCase() || '';

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

  const getTimings = (eff: KfnLyricsEffect) => {
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

  const getLines = (eff: KfnLyricsEffect) => {
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

  const constructLyrics = (eff: KfnLyricsEffect) => {
    const timings = getTimings(eff);
    const lines = getLines(eff);
    const words = getWords(lines);

    if (timings.length !== words.length) {
      throw new Error(`Timings: ${timings.length} !== Words: ${words.length}`);
    }

    const lyrics = applyTimingsToWords(words, timings);

    return groupLyrics(lyrics);
  };

  const buildLines = (
    lyrics: Map<string, LineTiming[]>,
    paddingTiming: number,
  ): AssLine[] => {
    const lines: AssLine[] = [];

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

    return lines;
  };

  const createSectionLayout = (
    sectionIndex: number,
    sectionCount: number,
    lineCount: number,
    height: number,
    fontSize: number,
  ) => {
    const safeLineCount = Math.max(1, lineCount);
    const sectionHeight = height / sectionCount;
    const sectionTop = sectionIndex * sectionHeight;
    const initialStartPos = sectionTop + sectionHeight / (safeLineCount + 1);
    const positions = Array.from(
      { length: safeLineCount },
      (_, index) => initialStartPos + fontSize * index,
    );
    const labelY = Math.max(
      sectionTop + fontSize * 0.75,
      positions[0] - fontSize,
    );

    return {
      positions,
      labelY,
    };
  };

  const toAss = (options?: LyricBuilderAssOptions) => {
    const {
      paddingTiming = 100,
      font = 'IMPACT',
      fontSize,
      highlightColours,
      maxLinesOnScreen = 4,
      screen,
    } = options || {};
    const {
      personOne: personOneHighlight = '&H00FF00&',
      personTwo: personTwoHighlight = '&H00A5FF&',
    } = highlightColours || {};
    const { lyrics: lyricFontSize, subtitle: subtitleFontSize } =
      resolveAssFontSizes(fontSize);
    const { height, centerX, positions } = createAssLayout({
      fontSize: lyricFontSize,
      maxLinesOnScreen,
      screen,
    });

    const syncedEffects = iniReader.findLyricsEffects();

    if (syncedEffects.length === 0) {
      throw new Error('Could not find lyrics effect in Song.ini');
    }

    const assTemplate = createAssTemplate({ font, fontSize: lyricFontSize });

    const assLines: string[] = [];
    const isDuet = syncedEffects.length > 1;
    const mainSinger = normalizeSingerName(iniReader.getMetadata()?.artist);
    const orderedEffects = isDuet
      ? [...syncedEffects].sort(
          (a, b) =>
            Number(normalizeSingerName(b.caption) === mainSinger) -
              Number(normalizeSingerName(a.caption) === mainSinger) ||
            parseInt(a.offsety || '0', 10) - parseInt(b.offsety || '0', 10),
        )
      : syncedEffects;
    const sections = orderedEffects.reduce(
      (acc: KfnLyricsSection[], effect, index) => {
        const lyrics = constructLyrics(effect);
        const lines = buildLines(lyrics, paddingTiming);

        if (lines.length === 0) {
          return acc;
        }

        if (!isDuet) {
          acc.push({
            caption: effect.caption,
            highlightColour: personOneHighlight,
            lines,
            positions,
            labelY: Math.max(lyricFontSize, positions[0] - lyricFontSize),
          });

          return acc;
        }

        const requestedLineCount = parseInt(effect.linecount || '', 10);
        const fallbackLineCount = Math.max(1, Math.ceil(maxLinesOnScreen / 2));
        const lineCount =
          Number.isFinite(requestedLineCount) && requestedLineCount > 0
            ? requestedLineCount
            : fallbackLineCount;
        const sectionLayout = createSectionLayout(
          index,
          orderedEffects.length,
          lineCount,
          height,
          lyricFontSize,
        );

        acc.push({
          caption: effect.caption,
          highlightColour:
            index === 0 ? personOneHighlight : personTwoHighlight,
          lines,
          positions: sectionLayout.positions,
          labelY: sectionLayout.labelY,
        });

        return acc;
      },
      [],
    );

    if (sections.length === 0) {
      throw new Error('Could not construct lyrics from Song.ini');
    }

    const allLines = sections.flatMap((section) => section.lines);
    const earliestLineStart = Math.min(...allLines.map((line) => line.start));
    const latestLineEnd = Math.max(...allLines.map((line) => line.end));
    const countdownY = height / 2;

    const countdownLines = constructCountdown({
      firstTiming: earliestLineStart + paddingTiming,
      startingNumber: 3,
      paddingTiming,
      unitsPerSecond: 100,
    });

    for (const line of countdownLines) {
      const prefixTemplate = `{\\pos(${centerX},${countdownY})}`;
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

    if (isDuet) {
      for (const section of sections) {
        if (section.caption) {
          const captionPrefix = `{\\fs${subtitleFontSize}\\b1\\1c${section.highlightColour}\\pos(${centerX},${section.labelY})}`;
          assLines.push(
            createDialogueLine({
              start: earliestLineStart,
              end: latestLineEnd,
              lyric: section.caption,
              prefix: captionPrefix,
              formatTiming: convertTiming,
            }),
          );
        }
      }
    }

    for (const section of sections) {
      const highlightTemplate = `\\r\\1c${section.highlightColour}`;

      for (let i = 0; i < section.lines.length; i += section.positions.length) {
        const chunk = section.lines.slice(i, i + section.positions.length);

        // TODO: If the timings between the next end and start are far away we can reset back to positions[0]
        assLines.push(
          ...renderAssChunk({
            chunk,
            positions: section.positions,
            formatTiming: convertTiming,
            getWindow: (line) =>
              line
                ? {
                    start: line.start,
                    end: line.end,
                  }
                : null,
            createPrefix: ({ pos }) =>
              `{\\k${paddingTiming}${highlightTemplate}\\pos(${centerX},${pos})}`,
          }),
        );
      }
    }

    return `${assTemplate}${assLines.join('\n')}`;
  };

  return {
    toAss,
  };
};
