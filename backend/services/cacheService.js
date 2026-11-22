const cacheClient = require('../config/redis');

class CacheService {
  /**
   * Get cached data and deserialize JSON
   */
  static async get(key) {
    try {
      const data = await cacheClient.get(key);
      if (!data) return null;
      return JSON.parse(data);
    } catch (err) {
      console.error(`Cache get error for key ${key}:`, err.message);
      return null;
    }
  }

  /**
   * Set cached data with TTL in seconds
   */
  static async set(key, value, ttlSeconds = 900) {
    try {
      const serialized = JSON.stringify(value);
      await cacheClient.set(key, serialized, 'EX', ttlSeconds);
      return true;
    } catch (err) {
      console.error(`Cache set error for key ${key}:`, err.message);
      return false;
    }
  }

  /**
   * Invalidate exact key
   */
  static async del(key) {
    try {
      await cacheClient.del(key);
    } catch (err) {
      console.error(`Cache del error for key ${key}:`, err.message);
    }
  }

  /**
   * Invalidate all keys matching a pattern (e.g. `analytics:user:${userId}:*`)
   */
  static async invalidatePattern(pattern) {
    try {
      const keys = await cacheClient.keys(pattern);
      if (keys && keys.length > 0) {
        await cacheClient.del(keys);
        // console.log(`Invalidated ${keys.length} cache keys for pattern: ${pattern}`);
      }
    } catch (err) {
      console.error(`Cache invalidatePattern error for pattern ${pattern}:`, err.message);
    }
  }

  /**
   * Helper to invalidate all caches belonging to a user when their transactions change
   */
  static async invalidateUserCaches(userId) {
    await Promise.all([
      this.invalidatePattern(`analytics:user:${userId}:*`),
      this.invalidatePattern(`budgets:user:${userId}:*`),
      this.invalidatePattern(`insights:user:${userId}:*`),
    ]);
  }

  /**
   * Helper to invalidate categories cache
   */
  static async invalidateCategoryCaches(userId) {
    await Promise.all([
      this.del(`categories:user:${userId}`),
      this.del(`categories:global`),
      this.invalidateUserCaches(userId)
    ]);
  }
}

module.exports = CacheService;
