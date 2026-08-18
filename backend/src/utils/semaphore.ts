export class Semaphore {
  private tasks: (() => void)[] = [];
  private activeCount: number = 0;
  private readonly concurrency: number;

  constructor(concurrency: number) {
    this.concurrency = concurrency;
  }

  async acquire(): Promise<() => void> {
    if (this.activeCount < this.concurrency) {
      this.activeCount++;
      return this.release.bind(this);
    }

    return new Promise<() => void>((resolve) => {
      this.tasks.push(() => resolve(this.release.bind(this)));
    });
  }

  private release() {
    this.activeCount--;
    if (this.tasks.length > 0 && this.activeCount < this.concurrency) {
      this.activeCount++;
      const nextTask = this.tasks.shift();
      if (nextTask) {
        nextTask();
      }
    }
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }
}
