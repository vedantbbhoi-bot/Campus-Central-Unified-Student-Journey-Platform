import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let redisInstance: Redis | undefined = globalForRedis.redis;

if (!redisInstance) {
  try {
    redisInstance = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 2000,
    });
    redisInstance.on('error', (err) => {
      // Gracefully ignore connection errors so app works seamlessly without Redis
      if (process.env.NODE_ENV === 'development') {
        console.warn('Redis offline/error:', err.message);
      }
    });
  } catch (e) {
    console.warn('Failed to initialize Redis client:', e);
  }
}

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redisInstance;

export const redis = redisInstance;

/**
 * Safe get wrapper with automatic fallback on Redis connection failure
 */
export async function redisGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (err) {
    return null;
  }
}

/**
 * Safe set wrapper with TTL (default 60 seconds)
 */
export async function redisSet(key: string, value: any, ttlSeconds: number = 60): Promise<void> {
  if (!redis) return;
  try {
    const data = JSON.stringify(value);
    await redis.set(key, data, 'EX', ttlSeconds);
  } catch (err) {
    // Ignore cache set failures
  }
}

/**
 * Safe invalidate key wrapper
 */
export async function redisDel(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (err) {
    // Ignore cache del failures
  }
}
