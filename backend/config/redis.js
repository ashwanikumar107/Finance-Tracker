const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = process.env.REDIS_PORT || 6379;
const redisPassword = process.env.REDIS_PASSWORD || undefined;

let redisClient = null;
let isRedisConnected = false;

// In-memory fallback cache when standalone Redis daemon is absent
class MemoryCacheFallback {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
    console.log('⚡ Redis offline: MemoryCacheFallback initialized with TTL support');
  }

  async get(key) {
    if (!this.store.has(key)) return null;
    const expiresAt = this.ttls.get(key);
    if (expiresAt && Date.now() > expiresAt) {
      this.store.delete(key);
      this.ttls.delete(key);
      return null;
    }
    return this.store.get(key);
  }

  async set(key, value, mode, duration) {
    this.store.set(key, value);
    if (mode === 'EX' && duration) {
      this.ttls.set(key, Date.now() + duration * 1000);
    }
    return 'OK';
  }

  async del(key) {
    if (Array.isArray(key)) {
      key.forEach((k) => {
        this.store.delete(k);
        this.ttls.delete(k);
      });
      return key.length;
    }
    const existed = this.store.delete(key);
    this.ttls.delete(key);
    return existed ? 1 : 0;
  }

  async keys(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const matched = [];
    const now = Date.now();
    for (const key of this.store.keys()) {
      const expiresAt = this.ttls.get(key);
      if (expiresAt && now > expiresAt) {
        this.store.delete(key);
        this.ttls.delete(key);
      } else if (regex.test(key)) {
        matched.push(key);
      }
    }
    return matched;
  }

  async flushall() {
    this.store.clear();
    this.ttls.clear();
    return 'OK';
  }
}

const memoryFallback = new MemoryCacheFallback();

try {
  const redisOptions = {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 2) return null;
      return 1000;
    },
    lazyConnect: true,
  };

  if (redisUrl) {
    redisClient = new Redis(redisUrl, redisOptions);
  } else {
    // If connecting to cloud Redis (e.g. Aiven), TLS/SSL is required
    const isCloud = redisHost.includes('aivencloud.com') || redisHost.includes('upstash.io') || process.env.REDIS_TLS === 'true';
    redisClient = new Redis({
      host: redisHost,
      port: parseInt(redisPort, 10),
      password: redisPassword,
      tls: isCloud ? { rejectUnauthorized: false } : undefined,
      ...redisOptions,
    });
  }

  redisClient.connect().then(() => {
    isRedisConnected = true;
    console.log(`✓ Connected to Redis server at ${redisHost}:${redisPort}`);
  }).catch((err) => {
    isRedisConnected = false;
    console.warn(`⚠️ Standalone Redis not reachable (${err.message}). Using resilient in-process caching fallback.`);
  });

  redisClient.on('connect', () => {
    isRedisConnected = true;
  });

  redisClient.on('error', (err) => {
    isRedisConnected = false;
  });
} catch (err) {
  isRedisConnected = false;
}

// Proxy wrapper that routes to Redis if live, or fallback cache if offline
const cacheClient = {
  async get(key) {
    if (isRedisConnected && redisClient) {
      try {
        return await redisClient.get(key);
      } catch (e) {
        return await memoryFallback.get(key);
      }
    }
    return await memoryFallback.get(key);
  },

  async set(key, value, mode, duration) {
    if (isRedisConnected && redisClient) {
      try {
        if (mode && duration) {
          return await redisClient.set(key, value, mode, duration);
        }
        return await redisClient.set(key, value);
      } catch (e) {
        return await memoryFallback.set(key, value, mode, duration);
      }
    }
    return await memoryFallback.set(key, value, mode, duration);
  },

  async del(key) {
    if (isRedisConnected && redisClient) {
      try {
        return await redisClient.del(key);
      } catch (e) {
        return await memoryFallback.del(key);
      }
    }
    return await memoryFallback.del(key);
  },

  async keys(pattern) {
    if (isRedisConnected && redisClient) {
      try {
        return await redisClient.keys(pattern);
      } catch (e) {
        return await memoryFallback.keys(pattern);
      }
    }
    return await memoryFallback.keys(pattern);
  },

  isLive() {
    return isRedisConnected;
  }
};

module.exports = cacheClient;
