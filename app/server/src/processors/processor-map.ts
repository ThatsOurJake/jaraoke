import { FolderType } from '../utils/determine-folder-type';
import { cdgProcessor } from './cdg';
import { kfnProcessor } from './kfn';
import { ultastarProcessor } from './ultrastar';

export type Processor = (directory: string) => Promise<void>;
export type Noop = () => void;

const noop = () => {};

export const PROCESSOR_MAP: Record<FolderType, Processor | Noop> = {
  [FolderType.KARAFUN]: kfnProcessor,
  [FolderType.CDG]: cdgProcessor,
  [FolderType.ULTRA_STAR]: ultastarProcessor,
  [FolderType.NOT_SUPPORTED]: noop,
};
