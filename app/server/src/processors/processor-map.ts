import { FolderType } from '../utils/determine-folder-type';
import { kfnProcessor } from './kfn';

export type Processor = (directory: string) => Promise<void>;
export type Noop = () => void;

const noop = () => {};

export const PROCESSOR_MAP: Record<FolderType, Processor | Noop> = {
  [FolderType.KARAFUN]: kfnProcessor,
  [FolderType.CDG]: () => {},
  [FolderType.ULTRA_STAR]: () => {},
  [FolderType.NOT_SUPPORTED]: noop,
};
