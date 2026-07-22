import type {
  LyricBuilderAssOptions,
  WithRequired,
} from 'jaraoke-shared/types';
import {
  constructCountdown,
  createAssLayout,
  createAssTemplate,
  createAssTimingFormatter,
  createDialogueLine,
  paginateAssLines,
  renderAssChunk,
  resolveAssFontSizes,
} from '../shared';
import {
  buildTranslationEventsForPage,
  getTranslationBaseY,
  type KfnLyricsSection,
  normalizeSingerName,
  normalizeTranslationEvents,
  orderEffectDetails,
  resolveSectionLineCount,
  type TimedAssLine,
} from './kfn-lyrics-builder-helpers';
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

const PAGE_RESET_GAP_MULTIPLIER = 2;
const KFN_TIMING_UNITS_PER_SECOND = 100;
const DEFAULT_PADDING_TIMING = 100;
const DEFAULT_MAX_LINES_ON_SCREEN = 4;
const DEFAULT_LINE_END_BUFFER = 500;
const SECTION_LABEL_OFFSET_SCALE = 0.75;
const DEFAULT_COUNTDOWN_STARTING_NUMBER = 3;
const MIN_TRANSLATION_BLOCK_GAP = 6;
const TRANSLATION_BLOCK_GAP_SCALE = 0.35;
const MIN_TRANSLATION_LEAD_IN = 12;
const TRANSLATION_LEAD_IN_SCALE = 0.25;

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

  let iniReader: SongIniReaderInstance;

  if (songIniInstance) {
    iniReader = songIniInstance;
  } else {
    if (!kfnDirectory) {
      throw new Error(
        'Please pass in either a kfn directory or SongIni Reader Instance',
      );
    }

    iniReader = kfnSongIniReader({ kfnDirectory });
  }

  const convertTiming = createAssTimingFormatter(KFN_TIMING_UNITS_PER_SECOND);

  const getTimings = (eff: KfnLyricsEffect) => {
    return Object.entries(eff)
      .reduce((acc: number[], current) => {
        const [key, value] = current;

        if (!/sync\d/.test(key)) {
          return acc;
        }

        const parts = value.split(',').map((x) => parseInt(x, 10));

        acc.push(...parts);

        return acc;
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

      acc.push({
        str,
        group: key,
      });

      return acc;
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

        acc.push(...wordsGroup);

        return acc;
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
      const existingGroup = output.get(group);

      if (existingGroup) {
        existingGroup.push(lyrics[i]);
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
  ): TimedAssLine[] => {
    const lines: TimedAssLine[] = [];

    for (const element of lyrics.values()) {
      const startingTiming = element[0].timing;
      const endingTiming =
        element[element.length - 1].timing ||
        startingTiming + DEFAULT_LINE_END_BUFFER;

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
        activeStart: startingTiming,
        activeEnd: endingTiming,
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
      sectionTop + fontSize * SECTION_LABEL_OFFSET_SCALE,
      positions[0] - fontSize,
    );

    return {
      positions,
      labelY,
    };
  };

  const toAss = (options?: LyricBuilderAssOptions) => {
    const {
      paddingTiming = DEFAULT_PADDING_TIMING,
      font = 'IMPACT',
      fontSize,
      highlightColours,
      maxLinesOnScreen = DEFAULT_MAX_LINES_ON_SCREEN,
      screen,
    } = options || {};
    const {
      personOne: personOneHighlight = '&H00FF00&',
      personTwo: personTwoHighlight = '&H00A5FF&',
      translation: translationHighlight = '&H00909090&',
    } = highlightColours || {};
    const { lyrics: lyricFontSize, subtitle: subtitleFontSize } =
      resolveAssFontSizes(fontSize);
    const { height, centerX, positions } = createAssLayout({
      fontSize: lyricFontSize,
      maxLinesOnScreen,
      screen,
    });

    const lyricsType = iniReader.getLyricsType();
    const describedEffects = iniReader.describeLyricsEffects();
    const syncedEffects = describedEffects.map((details) => details.effect);

    if (syncedEffects.length === 0) {
      throw new Error('Could not find lyrics effect in Song.ini');
    }

    const assTemplate = createAssTemplate({ font, fontSize: lyricFontSize });

    const assLines: string[] = [];
    const pageResetGap = paddingTiming * PAGE_RESET_GAP_MULTIPLIER;
    const mainSinger = normalizeSingerName(iniReader.getMetadata()?.artist);
    const orderedEffects = orderEffectDetails({
      describedEffects,
      lyricsType,
      mainSinger,
    });
    const sections = orderedEffects.reduce(
      (acc: KfnLyricsSection[], effectDetails, index) => {
        const { effect } = effectDetails;
        const lyrics = constructLyrics(effect);
        const lines = buildLines(lyrics, paddingTiming);

        if (lines.length === 0) {
          return acc;
        }

        if (lyricsType !== 'duet') {
          acc.push({
            caption: effect.caption,
            highlightColour: personOneHighlight,
            lines,
            positions,
            labelY: Math.max(lyricFontSize, positions[0] - lyricFontSize),
          });

          return acc;
        }

        const lineCount = resolveSectionLineCount(effect, maxLinesOnScreen);
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
      startingNumber: DEFAULT_COUNTDOWN_STARTING_NUMBER,
      paddingTiming,
      unitsPerSecond: KFN_TIMING_UNITS_PER_SECOND,
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

    if (lyricsType === 'duet') {
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

    const translationBlockGap = Math.max(
      MIN_TRANSLATION_BLOCK_GAP,
      Math.round(subtitleFontSize * TRANSLATION_BLOCK_GAP_SCALE),
    );
    const translationLeadIn = Math.min(
      paddingTiming,
      Math.max(
        MIN_TRANSLATION_LEAD_IN,
        Math.round(paddingTiming * TRANSLATION_LEAD_IN_SCALE),
      ),
    );
    const translationBaseY = getTranslationBaseY({
      firstVisiblePos: positions[0],
      lyricFontSize,
      subtitleFontSize,
      translationBlockGap,
    });

    const renderSectionPages = (section: KfnLyricsSection) => {
      const highlightTemplate = `\\r\\1c${section.highlightColour}`;

      return paginateAssLines({
        lines: section.lines,
        pageSize: section.positions.length,
        shouldStartNewPage: (previousLine, nextLine) =>
          nextLine.activeStart - previousLine.activeEnd > pageResetGap,
      }).map((chunk) => {
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

        return chunk;
      });
    };

    if (lyricsType === 'translation') {
      const [primarySection, ...translationSections] = sections;
      const primaryPages = renderSectionPages(primarySection);
      const translationEvents = primaryPages.flatMap((chunk) =>
        buildTranslationEventsForPage({
          chunk,
          translationSections,
          translationLeadIn,
        }),
      );
      const normalizedTranslationEvents =
        normalizeTranslationEvents(translationEvents);
      const translationPrefix = `{\\fs${subtitleFontSize}\\1c${translationHighlight}\\pos(${centerX},${translationBaseY})}`;

      for (const event of normalizedTranslationEvents) {
        assLines.push(
          createDialogueLine({
            start: event.start,
            end: event.end,
            lyric: event.lyric,
            prefix: translationPrefix,
            formatTiming: convertTiming,
          }),
        );
      }
    } else {
      for (const section of sections) {
        renderSectionPages(section);
      }
    }

    return `${assTemplate}${assLines.join('\n')}`;
  };

  return {
    toAss,
  };
};
