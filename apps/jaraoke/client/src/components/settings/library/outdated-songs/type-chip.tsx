import type { OriginalSongTypes } from 'jaraoke-shared/types';

interface TypeChipProps {
  type: OriginalSongTypes;
}

interface Mapping {
  text: string;
  colour: string;
}

const MAPPINGS: Record<OriginalSongTypes, { text: string; colour: string }> = {
  cdg: {
    text: 'CDG',
    colour: '#FF6B6B',
  },
  kfn: {
    text: 'Karafun',
    colour: '#9B1D65',
  },
  lrc: {
    text: 'LRC',
    colour: '#45B7D1',
  },
  us: {
    text: 'UltraStar',
    colour: '#366B9D',
  },
  video: {
    text: 'Video',
    colour: '#9B59B6',
  },
};

const UNDEFINED_MAPPING: Mapping = {
  colour: '#3a3a3a',
  text: 'Unknown',
};

export const TypeChip = ({ type }: TypeChipProps) => {
  const mapping = MAPPINGS[type] || UNDEFINED_MAPPING;

  return (
    <div
      className="py-0.5 px-2 rounded-sm w-fit font-inter"
      style={{ background: mapping.colour }}
    >
      <p className="text-sm">{mapping.text}</p>
    </div>
  );
};
