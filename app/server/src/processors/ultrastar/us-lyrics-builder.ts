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
} from '../shared';

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

    const noteGroups = constructNotes();
    const assTemplate = createAssTemplate({ font, fontSize });

    const assLines: string[] = [];
    const lines: AssLine[] = [];
    const highlightTemplate = `\\r\\1c${highlightColour}`;

    for (const group of noteGroups) {
      const startingTiming = group[0].start;
      const endingTiming = group[group.length - 1].start;

      const paddingStart = startingTiming + gap - paddingTiming * 10;
      const paddingEnd = endingTiming + gap + paddingTiming * 10;

      const parts: { start: number; str: string }[] = [];
      const filteredGroup = group
        .filter((x) => !x.endOfPhrase && x.text !== '~')
        .map((x) => ({
          ...x,
          text: x.text?.replace(/~/g, ''),
        }));

      for (let i = 0; i < filteredGroup.length; i++) {
        const word = filteredGroup[i];
        const nextWordTiming = filteredGroup[i + 1]?.start || endingTiming;
        const start = nextWordTiming - word.start;

        parts.push({
          start: Math.round(start / 10),
          str: word.text!,
        });
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
