import type pino from 'pino';
import { createLogger } from '../utils/logger';

type ProcessingCallback<T> =
  | ((processing: T) => void)
  | ((processing: T) => Promise<void>);

export class Queue<T> {
  private items: T[] = [];
  private isProcessing: boolean = false;

  private callbackProcessItem: ProcessingCallback<T>;
  private logger: pino.Logger;

  constructor(cbProcessItem: ProcessingCallback<T>, queueName: string) {
    this.callbackProcessItem = cbProcessItem;
    this.logger = createLogger(`${queueName}-queue`);
  }

  private async processNextItem() {
    const itemToProcess = this.items.shift();

    if (!itemToProcess) {
      return;
    }

    await this.callbackProcessItem(itemToProcess);
  }

  private async kickOffProcessLoop() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.items.length > 0) {
        try {
          await this.processNextItem();
        } catch (error) {
          this.logger.error({
            error,
          });
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  public addItemToQueue(item: T) {
    this.items.push(item);

    if (!this.isProcessing) {
      // Defer processing so the caller can complete and respond immediately.
      setImmediate(() => {
        void this.kickOffProcessLoop();
      });
    }
  }
}
