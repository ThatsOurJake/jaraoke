import fs from 'node:fs';

import type { JaraokeFile } from 'jaraoke-shared/types';

interface LyricBuilderOptions {
  lrcFile: string;
}

interface LRCLine {
  startTime: number;
  str: string;
}

const FIRST_LINE_LEAD_IN_UNITS = 200;

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

  const toJaraoke = (): JaraokeFile['lyrics'] => {
    const lines = lyricLines
      .filter((line) => line.str.length > 0)
      .map((line, index) => {
        const activeStartAtMs = line.startTime * 10;
        const lineStartAtMs =
          index === 0
            ? Math.max(0, (line.startTime - FIRST_LINE_LEAD_IN_UNITS) * 10)
            : activeStartAtMs;

        return {
          startAtMs: lineStartAtMs,
          words: [
            {
              syllables: [
                {
                  phrase: line.str,
                  startAtMs: activeStartAtMs,
                  effect: 'highlight' as const,
                },
              ],
            },
          ],
        };
      });

    if (lines.length === 0) {
      throw new Error('Could not construct lyrics from LRC file');
    }

    return [
      {
        displayName: 'Main vocals',
        displayType: 'top',
        lines,
      },
    ];
  };

  return {
    toJaraoke,
  };
};
