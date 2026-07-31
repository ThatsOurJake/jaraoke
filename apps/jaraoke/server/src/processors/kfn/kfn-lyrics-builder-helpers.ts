import type { AssLine, JaraokeLyricsType } from 'jaraoke-shared/types';
import type {
  KfnLyricsEffect,
  KfnLyricsEffectDetails,
} from './kfn-song-ini-reader';

export interface TimedAssLine extends AssLine {
  activeStart: number;
  activeEnd: number;
}

export interface KfnLyricsSection {
  caption?: string;
  highlightColour: string;
  lines: TimedAssLine[];
  positions: number[];
  labelY: number;
}

interface TranslationMatch {
  line: TimedAssLine;
  overlap: number;
}

export interface TimedTextEvent {
  lyric: string;
  start: number;
  end: number;
}

export const normalizeSingerName = (value?: string) =>
  value?.trim().toLowerCase() || '';

const getLineCoverage = (effectDetails: KfnLyricsEffectDetails) =>
  effectDetails.lyricLineCount;

const getLineOverlap = (firstLine: TimedAssLine, secondLine: TimedAssLine) => {
  return (
    Math.min(firstLine.activeEnd, secondLine.activeEnd) -
    Math.max(firstLine.activeStart, secondLine.activeStart)
  );
};

const sortByOffsetY = (
  firstEffect: KfnLyricsEffectDetails,
  secondEffect: KfnLyricsEffectDetails,
) => {
  return (
    parseInt(firstEffect.effect.offsety || '0', 10) -
    parseInt(secondEffect.effect.offsety || '0', 10)
  );
};

export const orderEffectDetails = ({
  describedEffects,
  lyricsType,
  mainSinger,
}: {
  describedEffects: KfnLyricsEffectDetails[];
  lyricsType: JaraokeLyricsType;
  mainSinger: string;
}) => {
  if (lyricsType === 'duet') {
    return describedEffects
      .slice()
      .sort(
        (firstEffect, secondEffect) =>
          Number(
            normalizeSingerName(secondEffect.effect.caption) === mainSinger,
          ) -
            Number(
              normalizeSingerName(firstEffect.effect.caption) === mainSinger,
            ) || sortByOffsetY(firstEffect, secondEffect),
      );
  }

  if (lyricsType === 'translation') {
    return describedEffects
      .slice()
      .sort(
        (firstEffect, secondEffect) =>
          getLineCoverage(secondEffect) - getLineCoverage(firstEffect) ||
          sortByOffsetY(firstEffect, secondEffect),
      );
  }

  return describedEffects;
};

export const resolveSectionLineCount = (
  effect: KfnLyricsEffect,
  maxLinesOnScreen: number,
) => {
  const requestedLineCount = parseInt(effect.linecount || '', 10);
  const fallbackLineCount = Math.max(1, Math.ceil(maxLinesOnScreen / 2));

  if (Number.isFinite(requestedLineCount) && requestedLineCount > 0) {
    return requestedLineCount;
  }

  return fallbackLineCount;
};

export const getTranslationBaseY = ({
  firstVisiblePos,
  lyricFontSize,
  subtitleFontSize,
  translationBlockGap,
}: {
  firstVisiblePos: number;
  lyricFontSize: number;
  subtitleFontSize: number;
  translationBlockGap: number;
}) => {
  return (
    firstVisiblePos -
    Math.round((lyricFontSize + subtitleFontSize) / 2) -
    translationBlockGap -
    subtitleFontSize
  );
};

const findBestTranslationMatch = (
  primaryLine: TimedAssLine,
  translationSections: KfnLyricsSection[],
) => {
  let bestMatch: TranslationMatch | null = null;

  for (const translationSection of translationSections) {
    for (const candidate of translationSection.lines) {
      const overlap = getLineOverlap(primaryLine, candidate);

      if (overlap <= 0) {
        continue;
      }

      if (!bestMatch || bestMatch.overlap < overlap) {
        bestMatch = {
          line: candidate,
          overlap,
        };
      }
    }
  }

  return bestMatch;
};

export const buildTranslationEventsForPage = ({
  chunk,
  translationSections,
  translationLeadIn,
}: {
  chunk: TimedAssLine[];
  translationSections: KfnLyricsSection[];
  translationLeadIn: number;
}) => {
  const translationMatches = chunk.map((line) =>
    findBestTranslationMatch(line, translationSections),
  );
  const firstTranslationIndex = translationMatches.findIndex(Boolean);
  const events: TimedTextEvent[] = [];

  for (let index = 0; index < chunk.length; index++) {
    const primaryLine = chunk[index];
    const bestMatch = translationMatches[index];

    if (!bestMatch) {
      continue;
    }

    const activeStart = Math.max(
      primaryLine.activeStart,
      bestMatch.line.activeStart,
    );
    const leadIn = index === firstTranslationIndex ? translationLeadIn : 0;
    const start = Math.max(
      primaryLine.start,
      bestMatch.line.start,
      activeStart - leadIn,
    );
    const end = Math.min(primaryLine.activeEnd, bestMatch.line.activeEnd);

    if (start >= end) {
      continue;
    }

    events.push({
      lyric: bestMatch.line.lyric,
      start,
      end,
    });
  }

  return events;
};

export const normalizeTranslationEvents = (events: TimedTextEvent[]) => {
  const sortedEvents = events
    .slice()
    .sort(
      (firstEvent, secondEvent) =>
        firstEvent.start - secondEvent.start ||
        firstEvent.end - secondEvent.end,
    );
  const normalizedEvents: TimedTextEvent[] = [];

  for (const event of sortedEvents) {
    const previousEvent = normalizedEvents[normalizedEvents.length - 1];

    if (!previousEvent) {
      normalizedEvents.push({
        lyric: event.lyric,
        start: event.start,
        end: event.end,
      });
      continue;
    }

    if (
      previousEvent.lyric === event.lyric &&
      previousEvent.end >= event.start
    ) {
      previousEvent.end = Math.max(previousEvent.end, event.end);
      continue;
    }

    if (previousEvent.end > event.start) {
      previousEvent.end = event.start;
    }

    if (previousEvent.start >= previousEvent.end) {
      normalizedEvents.pop();
    }

    normalizedEvents.push({
      lyric: event.lyric,
      start: event.start,
      end: event.end,
    });
  }

  return normalizedEvents;
};
