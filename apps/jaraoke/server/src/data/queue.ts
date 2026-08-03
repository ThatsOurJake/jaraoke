type ProcessingCallback<T> =
  | ((processing: T) => void)
  | ((processing: T) => Promise<void>);

export class Queue<T> {
  private items: T[] = [];
  private isProcessing: boolean = false;

  private callbackProcessItem: ProcessingCallback<T>;

  constructor(cbProcessItem: ProcessingCallback<T>) {
    this.callbackProcessItem = cbProcessItem;
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
          console.error('Queue item processing failed:', error);
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
