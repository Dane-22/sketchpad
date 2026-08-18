"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Semaphore = void 0;
class Semaphore {
    tasks = [];
    activeCount = 0;
    concurrency;
    constructor(concurrency) {
        this.concurrency = concurrency;
    }
    async acquire() {
        if (this.activeCount < this.concurrency) {
            this.activeCount++;
            return this.release.bind(this);
        }
        return new Promise((resolve) => {
            this.tasks.push(() => resolve(this.release.bind(this)));
        });
    }
    release() {
        this.activeCount--;
        if (this.tasks.length > 0 && this.activeCount < this.concurrency) {
            this.activeCount++;
            const nextTask = this.tasks.shift();
            if (nextTask) {
                nextTask();
            }
        }
    }
    async run(fn) {
        const release = await this.acquire();
        try {
            return await fn();
        }
        finally {
            release();
        }
    }
}
exports.Semaphore = Semaphore;
