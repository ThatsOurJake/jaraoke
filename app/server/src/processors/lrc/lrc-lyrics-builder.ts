import fs from 'node:fs';

import type { LyricBuilderAssOptions } from 'jaraoke-shared/types';
import {
  createAssLayout,
  createAssTemplate,
  createAssTimingFormatter,
  renderAssChunk,
} from '../shared';

interface LyricBuilderOptions {
  lrcFile: string;
}

interface LRCLine {
  startTime: number;
  str: string;
}

interface DisplayLine {
  displayStart: number;
  activeStart: number;
  end: number;
  lyric: string;
}

export const lrcLyricBuilder = (opts: LyricBuilderOptions) => {
  const fileContents = fs.readFileSync(opts.lrcFile).toString();
  const lyricLines: LRCLine[] = fileContents
    .split('\n')
    .map((line: string) => {
      const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2})\](.*)/);
      const startTime = match
        ? parseInt(match[1], 10) * 6000 +
          parseInt(match[2], 10) * 100 +
          parseInt(match[3], 10)
        : -1;

      if (startTime === -1) {
        return null;
      }

      const str = match ? match[4].trim() : line.trim();
      return { startTime, str };
    })
    .filter((x) => x != null);

  const convertTiming = createAssTimingFormatter(100);

  const toAss = (
    options?: Pick<
      LyricBuilderAssOptions,
      'font' | 'fontSize' | 'highlightColour' | 'screen'
    >,
  ) => {
    const {
      font = 'IMPACT',
      fontSize = 48,
      highlightColour = '&H00FF00&',
      screen,
    } = options || {};

    const { centerX, positions } = createAssLayout({
      fontSize,
      maxLinesOnScreen: 3,
      screen,
    });
    const assTemplate = createAssTemplate({ font, fontSize });

    const assLines: string[] = [];
    const lines: DisplayLine[] = [];
    const highlightTemplate = `\\r\\1c${highlightColour}\\b1`;

    for (let i = 0; i < lyricLines.length; i++) {
      const line = lyricLines[i];
      const nextLineStart = lyricLines[i + 1]?.startTime || line.startTime;
      const activeStart = line.startTime;
      const displayStart =
        i === 0 ? Math.max(0, activeStart - 200) : activeStart;

      lines.push({
        displayStart,
        activeStart,
        end: nextLineStart,
        lyric: line.str,
      });
    }

    for (let i = 0; i < lines.length; i++) {
      const chunk = [lines[i - 1], lines[i], lines[i + 1]];
      const currentLine = chunk[1];

      if (currentLine.displayStart < currentLine.activeStart) {
        assLines.push(
          ...renderAssChunk({
            chunk,
            positions,
            centerX,
            formatTiming: convertTiming,
            window: {
              start: currentLine.displayStart,
              end: currentLine.activeStart,
            },
            createPrefix: ({ pos, isHighlighted }) =>
              isHighlighted
                ? `{${highlightTemplate}\\pos(${centerX},${pos})}`
                : `{\\pos(${centerX},${pos})}`,
          }),
        );
      }

      assLines.push(
        ...renderAssChunk({
          chunk,
          positions,
          centerX,
          formatTiming: convertTiming,
          window: {
            start: currentLine.activeStart,
            end: currentLine.end,
          },
          createPrefix: ({ pos, isHighlighted }) =>
            isHighlighted
              ? `{${highlightTemplate}\\pos(${centerX},${pos})}`
              : `{\\pos(${centerX},${pos})}`,
          highlightedIndex: 1,
        }),
      );
    }

    return `${assTemplate}${assLines.join('\n')}`;
  };

  return {
    toAss,
  };
};
