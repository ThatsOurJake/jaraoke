import EventEmitter from 'node:events';

export type EventNames =
  | 'connected'
  | 'bootstrap:create-directories'
  | 'bootstrap:process-songs';

export interface BootstrapProcessSongsPayload {
  numberOfSongs: number;
  isDone: boolean;
  currentDir?: string;
  songsProcessed?: number;
}

export const eventEmitter = new EventEmitter();

export const sendEvent = <T extends object>(
  eventName: EventNames,
  data?: T,
) => {
  const msg = `event: ${eventName}\ndata: ${JSON.stringify(data || {})}\n\n`;
  eventEmitter.emit('event', msg);
};
