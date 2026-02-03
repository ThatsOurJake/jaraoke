export interface ASSStyle {
  name: string;
  fontName: string;
  fontSize: number;
  primaryColour: string;
  secondaryColour: string;
  outlineColour: string;
  backColour: string;
  bold: number;
  italic: number;
  underline: number;
  strikeOut: number;
  scaleX: number;
  scaleY: number;
  spacing: number;
  angle: number;
  borderStyle: number;
  outline: number;
  shadow: number;
  alignment: number;
  marginL: number;
  marginR: number;
  marginV: number;
  encoding: number;
}

export interface ASSTag {
  type: string;
  value:
    | number
    | { in: number; out: number }
    | { x: number; y: number }
    | string
    | null;
}

export interface ASSSyllable {
  duration: number; // milliseconds
  text: string;
  tags: ASSTag[]; // tags specific to this syllable
}

export interface ASSEvent {
  start: number; // milliseconds
  end: number; // milliseconds
  style: string;
  layer: number;
  tags: ASSTag[]; // global tags for the entire line
  syllables: ASSSyllable[];
  rawText: string;
  preRenderDelay: number; // milliseconds to show line before starting karaoke highlighting
}

export interface ASSSubtitle {
  metadata: {
    playResX: number;
    playResY: number;
  };
  styles: ASSStyle[];
  events: ASSEvent[];
}

/**
 * Parses an ASS timestamp (HH:MM:SS.CS) to milliseconds
 */
function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const secondsParts = parts[2].split('.');
  const seconds = parseInt(secondsParts[0], 10);
  const centiseconds = parseInt(secondsParts[1], 10);

  return hours * 3600000 + minutes * 60000 + seconds * 1000 + centiseconds * 10;
}

/**
 * Parses ASS color format (&HAABBGGRR) to a more usable format
 */
function parseColor(assColor: string): string {
  // ASS colors are in format &HAABBGGRR or &HBBGGRR
  const hex = assColor.replace('&H', '');

  if (hex.length === 8) {
    // &HAABBGGRR
    const aa = hex.substring(0, 2);
    const bb = hex.substring(2, 4);
    const gg = hex.substring(4, 6);
    const rr = hex.substring(6, 8);
    return `#${rr}${gg}${bb}${aa}`;
  } else if (hex.length === 6) {
    // &HBBGGRR
    const bb = hex.substring(0, 2);
    const gg = hex.substring(2, 4);
    const rr = hex.substring(4, 6);
    return `#${rr}${gg}${bb}`;
  }

  return assColor;
}

/**
 * Parses a style line from the ASS file
 */
function parseStyle(line: string): ASSStyle | null {
  if (!line.startsWith('Style:')) {
    return null;
  }

  const content = line.substring(6).trim();
  const parts = content.split(',').map((p) => p.trim());

  if (parts.length < 23) {
    return null;
  }

  return {
    name: parts[0],
    fontName: parts[1],
    fontSize: parseInt(parts[2], 10),
    primaryColour: parseColor(parts[3]),
    secondaryColour: parseColor(parts[4]),
    outlineColour: parseColor(parts[5]),
    backColour: parseColor(parts[6]),
    bold: parseInt(parts[7], 10),
    italic: parseInt(parts[8], 10),
    underline: parseInt(parts[9], 10),
    strikeOut: parseInt(parts[10], 10),
    scaleX: parseFloat(parts[11]),
    scaleY: parseFloat(parts[12]),
    spacing: parseFloat(parts[13]),
    angle: parseFloat(parts[14]),
    borderStyle: parseInt(parts[15], 10),
    outline: parseFloat(parts[16]),
    shadow: parseFloat(parts[17]),
    alignment: parseInt(parts[18], 10),
    marginL: parseInt(parts[19], 10),
    marginR: parseInt(parts[20], 10),
    marginV: parseInt(parts[21], 10),
    encoding: parseInt(parts[22], 10),
  };
}

/**
 * Parses tags from text, extracting type and value
 */
function parseTag(tagContent: string): ASSTag | null {
  // Handle \k tags (karaoke timing)
  if (tagContent.match(/^k\d+$/)) {
    return {
      type: 'k',
      value: parseInt(tagContent.substring(1), 10) * 10, // centiseconds to milliseconds
    };
  }

  // Handle \fad tag (fade in/out)
  if (tagContent.match(/^fad\(/)) {
    const values = tagContent.substring(4, tagContent.length - 1).split(',');
    return {
      type: 'fad',
      value: {
        in: parseInt(values[0], 10),
        out: parseInt(values[1], 10),
      },
    };
  }

  // Handle \pos tag (position)
  if (tagContent.match(/^pos\(/)) {
    const values = tagContent.substring(4, tagContent.length - 1).split(',');
    return {
      type: 'pos',
      value: {
        x: parseFloat(values[0]),
        y: parseFloat(values[1]),
      },
    };
  }

  // Handle \r tag (reset to style)
  if (tagContent.match(/^r$/)) {
    return {
      type: 'r',
      value: null,
    };
  }

  // Handle color tags like \1c&H00FF00&
  if (tagContent.match(/^\dc&H[0-9A-Fa-f]+&?$/)) {
    const colorNum = tagContent.charAt(0);
    const colorMatch = tagContent.match(/&H([0-9A-Fa-f]+)&?/);
    if (colorMatch) {
      return {
        type: `${colorNum}c`,
        value: parseColor(`&H${colorMatch[1]}`),
      };
    }
  }

  // Return raw tag for unsupported types
  return {
    type: 'unknown',
    value: tagContent,
  };
}

/**
 * Parses dialogue text, extracting syllables and tags
 */
function parseDialogueText(text: string): {
  syllables: ASSSyllable[];
  globalTags: ASSTag[];
  preRenderDelay: number;
} {
  const syllables: ASSSyllable[] = [];
  const globalTags: ASSTag[] = [];

  // Track current state
  let currentDuration = 0;
  let currentTags: ASSTag[] = [];
  let currentText = '';

  const tagRegex = /\{([^}]+)\}/g;
  let lastIndex = 0;
  let hasKaraokeTags = false;

  let match = tagRegex.exec(text);
  while (match !== null) {
    if (match.index > lastIndex) {
      currentText += text.substring(lastIndex, match.index);
    }

    const tagContent = match[1];
    const tags = tagContent.split('\\').filter((t) => t.length > 0);

    for (const tagStr of tags) {
      const tag = parseTag(tagStr);

      if (tag) {
        if (tag.type === 'k') {
          hasKaraokeTags = true;

          if (currentText.trim().length > 0 || currentDuration > 0) {
            syllables.push({
              duration: currentDuration,
              text: currentText,
              tags: [...currentTags],
            });
          }

          currentDuration = tag.value as number;
          currentText = '';
          currentTags = [];
        } else {
          if (hasKaraokeTags) {
            currentTags.push(tag);
          } else {
            globalTags.push(tag);
          }
        }
      }
    }

    lastIndex = tagRegex.lastIndex;
    match = tagRegex.exec(text);
  }

  if (lastIndex < text.length) {
    currentText += text.substring(lastIndex);
  }

  if (hasKaraokeTags) {
    if (
      currentText.trim().length > 0 ||
      currentDuration > 0 ||
      syllables.length > 0
    ) {
      syllables.push({
        duration: currentDuration,
        text: currentText,
        tags: currentTags,
      });
    }
  } else if (currentText.length > 0) {
    syllables.push({
      duration: 0,
      text: currentText,
      tags: [],
    });
  }

  let preRenderDelay = 0;
  if (syllables.length > 0 && syllables[0].text.trim().length === 0) {
    const firstSyllable = syllables.shift()!;
    globalTags.push(...firstSyllable.tags);
    preRenderDelay = firstSyllable.duration;
  }

  return { syllables, globalTags, preRenderDelay };
}

/**
 * Parses a dialogue event line
 */
function parseEvent(line: string): ASSEvent | null {
  if (!line.startsWith('Dialogue:')) {
    return null;
  }

  const content = line.substring(9).trim();
  const parts = content.split(',');

  if (parts.length < 10) {
    return null;
  }

  const layer = parseInt(parts[0], 10);
  const start = parseTimestamp(parts[1]);
  const end = parseTimestamp(parts[2]);
  const style = parts[3];
  const text = parts.slice(9).join(',');

  const { syllables, globalTags, preRenderDelay } = parseDialogueText(text);

  return {
    start,
    end,
    style,
    layer,
    tags: globalTags,
    syllables,
    rawText: text,
    preRenderDelay,
  };
}

/**
 * Main parser function for ASS subtitle files
 */
export function parseASS(content: string): ASSSubtitle {
  const lines = content.split(/\r?\n/);

  const result: ASSSubtitle = {
    metadata: {
      playResX: 640,
      playResY: 480,
    },
    styles: [],
    events: [],
  };

  let currentSection = '';

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.length === 0 || trimmedLine.startsWith(';')) {
      continue;
    }

    if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
      currentSection = trimmedLine.substring(1, trimmedLine.length - 1);
      continue;
    }

    if (currentSection === 'Script Info') {
      if (trimmedLine.startsWith('PlayResX:')) {
        result.metadata.playResX = parseInt(
          trimmedLine.split(':')[1].trim(),
          10,
        );
      } else if (trimmedLine.startsWith('PlayResY:')) {
        result.metadata.playResY = parseInt(
          trimmedLine.split(':')[1].trim(),
          10,
        );
      }
    } else if (currentSection === 'V4+ Styles') {
      const style = parseStyle(trimmedLine);
      if (style) {
        result.styles.push(style);
      }
    } else if (currentSection === 'Events') {
      const event = parseEvent(trimmedLine);
      if (event) {
        result.events.push(event);
      }
    }
  }

  return result;
}
