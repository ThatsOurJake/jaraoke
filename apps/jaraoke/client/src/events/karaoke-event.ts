import { KARAOKE_EVENT } from '../constants';

type KaraokeEventTypes = 'pause' | 'play' | 'start' | 'song-start';

export class KaraokeEvent extends Event {
  public eventType: KaraokeEventTypes;

  constructor(type: KaraokeEventTypes) {
    super(KARAOKE_EVENT);

    this.eventType = type;
  }
}
