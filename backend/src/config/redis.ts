import { createClient } from 'redis';
import { config } from './env';

// Ultra-fast in-memory fallback cache with TTL
class MemoryCache {
  private cache = new Map<string, { value: string; expiry: number }>();

  get(key: string): string | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  set(key: string, value: string, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  del(keys: string | string[]): void {
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const k of keyList) {
      this.cache.delete(k);
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

const memoryCache = new MemoryCache();

let isRedisConnected = false;
let hasLoggedRedisWarning = false;

export const redisClient = createClient({
  url: config.redisUrl,
  socket: {
    reconnectStrategy: (retries: number) => {
      // Exponential backoff with a cap and max retries to avoid CPU starvation
      if (retries > 5) {
        if (!hasLoggedRedisWarning) {
          console.log('ℹ️ Redis not available. Falling back to high-performance in-memory cache.');
          hasLoggedRedisWarning = true;
        }
        return Math.min(retries * 500, 10000); // Retry every 10s quietly
      }
      return 500;
    },
    connectTimeout: 2000,
  },
});

redisClient.on('error', (err) => {
  isRedisConnected = false;
  // Quietly suppress spamming errors when Redis is not running locally
  if (!hasLoggedRedisWarning) {
    console.log('ℹ️ Redis connection unavailable. Using in-memory cache fallback.');
    hasLoggedRedisWarning = true;
  }
});

redisClient.on('connect', () => {
  isRedisConnected = true;
  hasLoggedRedisWarning = false;
  console.log('✅ Connected to Redis cache service');
});

// Attempt connection in background
redisClient.connect().catch(() => {
  isRedisConnected = false;
});

// Unified caching interface with 0ms fallback
export const cacheService = {
  async get(key: string): Promise<string | null> {
    if (isRedisConnected && redisClient.isOpen) {
      try {
        return await redisClient.get(key);
      } catch {
        // fallback to memory
      }
    }
    return memoryCache.get(key);
  },

  async set(key: string, value: string, ttlSeconds: number = 300): Promise<void> {
    memoryCache.set(key, value, ttlSeconds);
    if (isRedisConnected && redisClient.isOpen) {
      try {
        await redisClient.setEx(key, ttlSeconds, value);
      } catch {
        // fallback to memory
      }
    }
  },

  async del(keys: string | string[]): Promise<void> {
    memoryCache.del(keys);
    if (isRedisConnected && redisClient.isOpen) {
      try {
        await redisClient.del(keys);
      } catch {
        // fallback to memory
      }
    }
  },

  isRedisActive(): boolean {
    return isRedisConnected && redisClient.isOpen;
  }
};
