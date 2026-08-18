"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.redisClient = void 0;
const redis_1 = require("redis");
const env_1 = require("./env");
// Ultra-fast in-memory fallback cache with TTL
class MemoryCache {
    cache = new Map();
    get(key) {
        const item = this.cache.get(key);
        if (!item)
            return null;
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        return item.value;
    }
    set(key, value, ttlSeconds = 300) {
        this.cache.set(key, {
            value,
            expiry: Date.now() + ttlSeconds * 1000,
        });
    }
    del(keys) {
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const k of keyList) {
            this.cache.delete(k);
        }
    }
    clear() {
        this.cache.clear();
    }
}
const memoryCache = new MemoryCache();
let isRedisConnected = false;
let hasLoggedRedisWarning = false;
exports.redisClient = (0, redis_1.createClient)({
    url: env_1.config.redisUrl,
    socket: {
        reconnectStrategy: (retries) => {
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
exports.redisClient.on('error', (err) => {
    isRedisConnected = false;
    // Quietly suppress spamming errors when Redis is not running locally
    if (!hasLoggedRedisWarning) {
        console.log('ℹ️ Redis connection unavailable. Using in-memory cache fallback.');
        hasLoggedRedisWarning = true;
    }
});
exports.redisClient.on('connect', () => {
    isRedisConnected = true;
    hasLoggedRedisWarning = false;
    console.log('✅ Connected to Redis cache service');
});
// Attempt connection in background
exports.redisClient.connect().catch(() => {
    isRedisConnected = false;
});
// Unified caching interface with 0ms fallback
exports.cacheService = {
    async get(key) {
        if (isRedisConnected && exports.redisClient.isOpen) {
            try {
                return await exports.redisClient.get(key);
            }
            catch {
                // fallback to memory
            }
        }
        return memoryCache.get(key);
    },
    async set(key, value, ttlSeconds = 300) {
        memoryCache.set(key, value, ttlSeconds);
        if (isRedisConnected && exports.redisClient.isOpen) {
            try {
                await exports.redisClient.setEx(key, ttlSeconds, value);
            }
            catch {
                // fallback to memory
            }
        }
    },
    async del(keys) {
        memoryCache.del(keys);
        if (isRedisConnected && exports.redisClient.isOpen) {
            try {
                await exports.redisClient.del(keys);
            }
            catch {
                // fallback to memory
            }
        }
    },
    isRedisActive() {
        return isRedisConnected && exports.redisClient.isOpen;
    }
};
