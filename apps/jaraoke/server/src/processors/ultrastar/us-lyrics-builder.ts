import type {
  AssLine,
  LyricBuilderAssOptions,
  UltrastarFile,
  UltrastarNote,
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

interface TimedAssLine extends AssLine {
  activeStart: number;
  activeEnd: number;
}

type LyricNote = UltrastarNote & { text: string };

const PAGE_RESET_GAP_MULTIPLIER = 2;

export const usLyricsBuilder = (ultrastarFile: UltrastarFile) => {
  const { notes, gap = 0 } = ultrastarFile;

  const constructNotes = () => {
    const groups: UltrastarNote[][] = [];
    let current: UltrastarNote[] = [];

    for (const note of notes) {
      const { endOfPhrase } = note;

      current.push(note);

      if (endOfPhrase) {
        groups.push(current);
        current = [];
      }
    }

    return groups;
  };

  const convertTiming = createAssTimingFormatter(1000);

  const toAss = (options?: LyricBuilderAssOptions) => {
    const {
      paddingTiming = 100,
      font = 'IMPACT',
      fontSize,
      highlightColours,
      maxLinesOnScreen = 4,
      screen,
    } = options || {};
    const { personOne: personOneHighlight = '&H00FF00&' } =
      highlightColours || {};
    const { lyrics: lyricFontSize } = resolveAssFontSizes(fontSize);
    const { height, centerX, positions } = createAssLayout({
      fontSize: lyricFontSize,
      maxLinesOnScreen,
      screen,
    });

    const noteGroups = constructNotes();
    const assTemplate = createAssTemplate({ font, fontSize: lyricFontSize });

    const assLines: string[] = [];
    const lines: TimedAssLine[] = [];
    const highlightTemplate = `\\r\\1c${personOneHighlight}`;
    const pageResetGap = paddingTiming * 10 * PAGE_RESET_GAP_MULTIPLIER;

    for (const group of noteGroups) {
      const startingTiming = group[0].start;
      const endingTiming = group[group.length - 1].start;

      const paddingStart = startingTiming + gap - paddingTiming * 10;
      const paddingEnd = endingTiming + gap + paddingTiming * 10;

      const parts: { start: number; str: string }[] = [];
      const filteredGroup = group.reduce<LyricNote[]>((acc, note) => {
        if (note.endOfPhrase || note.text === '~' || !note.text) {
          return acc;
        }

        acc.push({
          ...note,
          text: note.text.replace(/~/g, ''),
        });

        return acc;
      }, []);

      for (let i = 0; i < filteredGroup.length; i++) {
        const word = filteredGroup[i];
        const nextWordTiming = filteredGroup[i + 1]?.start || endingTiming;
        const start = nextWordTiming - word.start;

        parts.push({
          start: Math.round(start / 10),
          str: word.text,
        });
      }

      const lyric = parts.map((x) => `{\\k${x.start}}${x.str}`).join('');

      lines.push({
        start: paddingStart,
        end: paddingEnd,
        activeStart: startingTiming + gap,
        activeEnd: endingTiming + gap,
        lyric,
      });
    }

    const countdownLines = constructCountdown({
      firstTiming: lines[0].start + paddingTiming,
      startingNumber: 3,
      paddingTiming,
      unitsPerSecond: 1000,
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

    const pages = paginateAssLines({
      lines,
      pageSize: positions.length,
      shouldStartNewPage: (previousLine, nextLine) =>
        nextLine.activeStart - previousLine.activeEnd > pageResetGap,
    });

    for (const chunk of pages) {
      assLines.push(
        ...renderAssChunk({
          chunk,
          positions,
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

    return `${assTemplate}${assLines.join('\n')}`;
  };

  return {
    toAss,
  };
};
