/**
 * Simple in-memory cache with TTL
 * For production, replace with Redis/Vercel KV
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxSize = 1000; // Prevent unbounded growth

  set<T>(key: string, value: T, ttlSeconds: number): void {
    // Evict old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const now = Date.now();
      for (const [k, entry] of this.cache.entries()) {
        if (entry.expiresAt < now) {
          this.cache.delete(k);
        }
      }

      // If still full, delete oldest 10%
      if (this.cache.size >= this.maxSize) {
        const toDelete = Math.floor(this.maxSize * 0.1);
        const keys = Array.from(this.cache.keys()).slice(0, toDelete);
        keys.forEach((k) => {
          this.cache.delete(k);
        });
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const cache = new MemoryCache();

/**
 * Cache key generators
 */
export const cacheKeys = {
  link: (slug: string) => `link:${slug}`,
  qr: (slug: string) => `qr:${slug}`,
  stats: () => "stats:dashboard",
  linkAnalytics: (linkId: string, range: string) =>
    `analytics:${linkId}:${range}`,
};

/**
 * Cache TTLs in seconds
 */
export const cacheTTL = {
  link: 300, // 5 minutes - links don't change often
  qr: 3600, // 1 hour - QR codes never change
  stats: 60, // 1 minute - stats can be slightly stale
  analytics: 300, // 5 minutes
};
