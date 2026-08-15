import type {
  Lyric,
  LyricLine,
  LyricWord,
  UltrastarFile,
  UltrastarNote,
} from 'jaraoke-shared/types';

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

  const toJaraoke = (): Lyric[] => {
    const noteGroups = constructNotes();
    const lines: LyricLine[] = [];

    for (const group of noteGroups) {
      const firstNote = group.find(
        (n) => !n.endOfPhrase && n.text && n.text !== '~',
      );

      if (!firstNote) {
        continue;
      }

      const firstPhraseStartAtMs = firstNote.start + gap;
      const words: LyricWord[] = [];
      let currentWord: LyricWord | null = null;

      const pushCurrentWord = () => {
        if (!currentWord || currentWord.syllables.length === 0) {
          return;
        }

        words.push(currentWord);
        currentWord = null;
      };

      for (const note of group) {
        if (note.endOfPhrase) continue;

        // Standalone ~ is a hold note; treat as a word boundary
        if (!note.text || note.text === '~') {
          pushCurrentWord();
          continue;
        }

        const text = note.text.replace(/~/g, '');
        const hasLeadingSpace = /^\s+/.test(note.text);
        const hasTrailingSpace = /\s+$/.test(note.text);
        const syllable = text.trim();

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
          startAtMs: note.start + gap,
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
