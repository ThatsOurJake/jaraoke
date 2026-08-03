import type {
  JaraokeFile,
  UltrastarFile,
  UltrastarNote,
} from 'jaraoke-shared/types';

type LyricNote = UltrastarNote & { text: string };

const DEFAULT_LINE_LEAD_IN_MS = 1000;

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

  const toJaraoke = (): JaraokeFile['lyrics'] => {
    const noteGroups = constructNotes();
    const lines: JaraokeFile['lyrics'][number]['lines'] = [];

    for (const group of noteGroups) {
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

      if (filteredGroup.length === 0) {
        continue;
      }

      const firstPhraseStartAtMs = filteredGroup[0].start + gap;
      const words: JaraokeFile['lyrics'][number]['lines'][number]['words'] = [];
      let currentWord:
        | JaraokeFile['lyrics'][number]['lines'][number]['words'][number]
        | null = null;

      const pushCurrentWord = () => {
        if (!currentWord || currentWord.syllables.length === 0) {
          return;
        }

        words.push(currentWord);
        currentWord = null;
      };

      for (const word of filteredGroup) {
        const hasLeadingSpace = /^\s+/.test(word.text);
        const hasTrailingSpace = /\s+$/.test(word.text);
        const syllable = word.text.trim();

        if (!syllable) {
          continue;
        }

        if (hasLeadingSpace) {
          pushCurrentWord();
        }

        if (!currentWord) {
          currentWord = {
            syllables: [],
          };
        }

        currentWord.syllables.push({
          phrase: syllable,
          startAtMs: word.start + gap,
          effect: 'highlight' as const,
        });

        if (hasTrailingSpace) {
          pushCurrentWord();
        }
      }

      pushCurrentWord();

      if (words.length === 0) {
        continue;
      }

      lines.push({
        startAtMs: Math.max(0, firstPhraseStartAtMs - DEFAULT_LINE_LEAD_IN_MS),
        words,
      });
    }

    if (lines.length === 0) {
      throw new Error('Could not construct lyrics from Ultrastar file');
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
