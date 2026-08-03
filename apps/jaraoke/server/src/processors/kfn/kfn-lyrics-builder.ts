import type {
  JaraokeFile,
  JaraokeLyricsType,
  LyricDisplayType,
  WithRequired,
} from 'jaraoke-shared/types';
import {
  normalizeSingerName,
  orderEffectDetails,
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

interface SyllableToken {
  str: string;
  group: string;
  wordIndex: number;
}

interface TimedSyllableToken extends SyllableToken {
  timing: number;
}

interface TimedWord {
  syllables: Array<{
    str: string;
    timing: number;
  }>;
}

const KFN_TIMING_UNITS_PER_SECOND = 100;
const KFN_MILLISECONDS_PER_TIMING_UNIT =
  1000 / KFN_TIMING_UNITS_PER_SECOND;
const DEFAULT_PADDING_TIMING = 100;

const TOP_ROLE_LABEL = 'Main vocals';
const BOTTOM_ROLE_LABEL = 'Other vocals';
const TRANSLATION_ROLE_LABEL = 'Translation';
const UNKNOWN_ARTIST = 'Unknown artist';

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

  const convertToMilliseconds = (value: number) =>
    Math.round(value * KFN_MILLISECONDS_PER_TIMING_UNIT);

  const extractSequenceIndex = (key: string) => {
    const matches = key.match(/(\d+)$/);

    if (!matches) {
      return Number.MAX_SAFE_INTEGER;
    }

    return parseInt(matches[1], 10);
  };

  const parseTimings = (value?: string): number[] => {
    if (!value) {
      return [];
    }

    return value
      .split(',')
      .map((part) => parseInt(part.trim(), 10))
      .filter((timing) => !Number.isNaN(timing));
  };

  const reconcileTimingsAndTokens = (
    timings: number[],
    tokenCount: number,
  ): number[] => {
    if (tokenCount === 0) {
      return [];
    }

    if (timings.length === tokenCount) {
      return timings;
    }

    if (timings.length === 0) {
      return [];
    }

    if (timings.length > tokenCount) {
      const extraCount = timings.length - tokenCount;

      // Extra sync cues are typically pre-roll markers, so keep the tail that
      // aligns with actual singable tokens.
      return timings.slice(extraCount);
    }

    return timings;
  };

  const getTimings = (eff: KfnLyricsEffect) => {
    return Object.entries(eff)
      .filter(([key]) => /sync\d/.test(key))
      .sort((first, second) => {
        return (
          extractSequenceIndex(first[0]) - extractSequenceIndex(second[0])
        );
      })
      .flatMap(([, value]) => parseTimings(value));
  };

  const getLines = (eff: KfnLyricsEffect) => {
    return Object.entries(eff)
      .filter(([key]) => /text\d/.test(key))
      .sort((first, second) => {
        return (
          extractSequenceIndex(first[0]) - extractSequenceIndex(second[0])
        );
      })
      .reduce((acc: Line[], [key, value]) => {
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

  const getSyllableTokens = (lines: Line[]) => {
    return lines.reduce((acc: SyllableToken[], line) => {
      const words = line.str.split(/\s+/g).filter((word) => word.length > 0);

      for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
        // Preserve intentionally empty split segments and underscore syllables
        // so token indexes stay aligned with authored KFN sync arrays.
        const syllables = words[wordIndex]
          .split(/\//g)
          .map((syllable) => syllable.trim());

        for (const syllable of syllables) {
          acc.push({
            str: syllable,
            group: line.group,
            wordIndex,
          });
        }
      }

      return acc;
    }, []);
  };

  const applyTimingsToSyllables = (
    tokens: SyllableToken[],
    timings: number[],
  ): TimedSyllableToken[] => {
    return tokens.map((token, index) => ({
      str: token.str,
      group: token.group,
      wordIndex: token.wordIndex,
      timing: timings[index],
    }));
  };

  const groupLyrics = (
    tokens: TimedSyllableToken[],
  ): Map<string, TimedWord[]> => {
    const output = new Map<string, TimedWord[]>();

    for (const token of tokens) {
      const existingGroup = output.get(token.group) || [];

      while (existingGroup.length <= token.wordIndex) {
        existingGroup.push({ syllables: [] });
      }

      existingGroup[token.wordIndex].syllables.push({
        str: token.str,
        timing: token.timing,
      });

      output.set(token.group, existingGroup);
    }

    return output;
  };

  // TODO there are words with multiple "_" that need to be handled

  const constructLyrics = (eff: KfnLyricsEffect) => {
    const timings = getTimings(eff);
    const lines = getLines(eff);
    const tokens = getSyllableTokens(lines);
    const reconciledTimings = reconcileTimingsAndTokens(
      timings,
      tokens.length,
    );

    if (reconciledTimings.length !== tokens.length) {
      throw new Error(
        `Timings: ${reconciledTimings.length} !== Syllables: ${tokens.length}`,
      );
    }

    const timedTokens = applyTimingsToSyllables(tokens, reconciledTimings);

    return groupLyrics(timedTokens);
  };

  const buildJaraokeLines = (
    lyrics: Map<string, TimedWord[]>,
    paddingTiming: number,
  ): JaraokeFile['lyrics'][number]['lines'] => {
    const lines: JaraokeFile['lyrics'][number]['lines'] = [];

    for (const wordsInLine of lyrics.values()) {
      if (wordsInLine.length === 0) {
        continue;
      }

      const firstTiming = wordsInLine[0]?.syllables[0]?.timing;

      if (typeof firstTiming !== 'number') {
        continue;
      }

      const startAtMs = Math.max(
        0,
        convertToMilliseconds(firstTiming - paddingTiming),
      );
      const words = wordsInLine
        .map((word) => ({
          syllables: word.syllables
            .map((syllable) => ({
              phrase: syllable.str
                .replace(/_/g, ' ')
                .replace(/ {2,}/g, ' ')
                .trim(),
              startAtMs: convertToMilliseconds(syllable.timing),
              effect: 'highlight' as const,
            }))
            .filter((syllable) => syllable.phrase.length > 0),
        }))
        .filter((word) => word.syllables.length > 0);

      if (words.length === 0) {
        continue;
      }

      lines.push({
        startAtMs,
        words,
      });
    }

    return lines;
  };

  const resolveDisplayType = (
    lyricsType: JaraokeLyricsType,
    index: number,
  ): LyricDisplayType => {
    if (lyricsType === 'duet') {
      return index === 0 ? 'top' : 'bottom';
    }

    if (lyricsType === 'translation') {
      return index === 0 ? 'top' : 'translation';
    }

    return 'top';
  };

  const roleLabelFromDisplayType = (displayType: LyricDisplayType) => {
    if (displayType === 'top') {
      return TOP_ROLE_LABEL;
    }

    if (displayType === 'bottom') {
      return BOTTOM_ROLE_LABEL;
    }

    return TRANSLATION_ROLE_LABEL;
  };

  const toJaraoke = (): JaraokeFile['lyrics'] => {
    const describedEffects = iniReader.describeLyricsEffects();
    if (describedEffects.length === 0) {
      throw new Error('Could not find lyrics effect in Song.ini');
    }

    const lyricsType = iniReader.getLyricsType();
    const artist = iniReader.getMetadata()?.artist?.trim() || UNKNOWN_ARTIST;
    const mainSinger = normalizeSingerName(artist);
    const orderedEffects = orderEffectDetails({
      describedEffects,
      lyricsType,
      mainSinger,
    });

    const output: JaraokeFile['lyrics'] = [];

    for (let index = 0; index < orderedEffects.length; index++) {
      const { effect } = orderedEffects[index];
      const lyrics = constructLyrics(effect);
      const lines = buildJaraokeLines(lyrics, DEFAULT_PADDING_TIMING);

      if (lines.length === 0) {
        continue;
      }

      const displayType = resolveDisplayType(lyricsType, index);
      const roleLabel = roleLabelFromDisplayType(displayType);
      const caption = effect.caption?.trim();
      const displayName =
        caption && caption.length > 0
          ? caption
          : `${artist} (${roleLabel})`;

      output.push({
        displayName,
        displayType,
        lines,
      });
    }

    if (output.length === 0) {
      throw new Error('Could not construct lyrics from Song.ini');
    }

    return output;
  };

  return {
    toJaraoke,
  };
};
