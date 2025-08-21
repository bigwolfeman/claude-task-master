/**
 * kv.ts
 * Comprehensive caching system with LRU, TTL, and disk persistence
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

export interface CacheOptions {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  persistToDisk: boolean;
  diskPath?: string;
  memoryThreshold: number; // Memory threshold in MB
  enableMetrics: boolean;
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessTime: number;
  accessCount: number;
  size: number; // Estimated size in bytes
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  diskWrites: number;
  diskReads: number;
  memoryUsage: number; // in bytes
  totalItems: number;
  hitRate: number;
}

export class LRUCacheWithTTL<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];
  private metrics: CacheMetrics;
  private cleanupInterval?: NodeJS.Timeout;
  private persistenceInterval?: NodeJS.Timeout;

  constructor(private options: CacheOptions) {
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      diskWrites: 0,
      diskReads: 0,
      memoryUsage: 0,
      totalItems: 0,
      hitRate: 0,
    };

    // Start cleanup interval for expired items
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, Math.min(this.options.ttl / 10, 60000)); // Cleanup every TTL/10 or 1 minute max

    // Start persistence interval if disk persistence is enabled
    if (this.options.persistToDisk && this.options.diskPath) {
      this.persistenceInterval = setInterval(() => {
        this.persistToDisk();
      }, 300000); // Persist every 5 minutes
    }

    // Load from disk if persistence is enabled
    if (this.options.persistToDisk && this.options.diskPath) {
      this.loadFromDisk().catch(console.error);
    }
  }

  /**
   * Get value from cache
   */
  async get(key: string): Promise<T | undefined> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.metrics.misses++;
      this.updateMetrics();
      return undefined;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.metrics.misses++;
      this.updateMetrics();
      return undefined;
    }

    // Update access information
    entry.accessTime = Date.now();
    entry.accessCount++;
    
    // Move to end of access order (most recently used)
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);

    this.metrics.hits++;
    this.updateMetrics();
    
    return entry.value;
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: T, customTTL?: number): Promise<void> {
    const now = Date.now();
    const size = this.estimateSize(value);
    
    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      accessTime: now,
      accessCount: 1,
      size,
    };

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.removeFromAccessOrder(key);
      const oldEntry = this.cache.get(key)!;
      this.metrics.memoryUsage -= oldEntry.size;
    }

    // Add new entry
    this.cache.set(key, entry);
    this.accessOrder.push(key);
    this.metrics.memoryUsage += size;

    // Check if we need to evict items
    await this.enforceSize();
    await this.enforceMemoryLimit();

    this.updateMetrics();
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.metrics.memoryUsage -= entry.size;
      this.updateMetrics();
      return true;
    }
    return false;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.metrics.memoryUsage = 0;
    this.updateMetrics();
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.updateMetrics();
      return false;
    }
    
    return true;
  }

  /**
   * Get current cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys (non-expired)
   */
  keys(): string[] {
    const validKeys: string[] = [];
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isExpired(entry)) {
        validKeys.push(key);
      }
    }
    return validKeys;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      const entry = this.cache.get(key)!;
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.metrics.memoryUsage -= entry.size;
    }

    if (expiredKeys.length > 0) {
      this.updateMetrics();
    }
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > this.options.ttl;
  }

  /**
   * Remove key from access order array
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Enforce maximum cache size
   */
  private async enforceSize(): Promise<void> {
    while (this.cache.size > this.options.maxSize) {
      const lruKey = this.accessOrder.shift();
      if (lruKey) {
        const entry = this.cache.get(lruKey)!;
        this.cache.delete(lruKey);
        this.metrics.memoryUsage -= entry.size;
        this.metrics.evictions++;
      }
    }
  }

  /**
   * Enforce memory limit
   */
  private async enforceMemoryLimit(): Promise<void> {
    const memoryLimitBytes = this.options.memoryThreshold * 1024 * 1024;
    
    while (this.metrics.memoryUsage > memoryLimitBytes && this.cache.size > 0) {
      const lruKey = this.accessOrder.shift();
      if (lruKey) {
        const entry = this.cache.get(lruKey)!;
        this.cache.delete(lruKey);
        this.metrics.memoryUsage -= entry.size;
        this.metrics.evictions++;
      }
    }
  }

  /**
   * Estimate size of value in bytes
   */
  private estimateSize(value: T): number {
    if (typeof value === 'string') {
      return value.length * 2; // UTF-16 encoding
    } else if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value).length * 2;
    } else if (typeof value === 'number') {
      return 8;
    } else if (typeof value === 'boolean') {
      return 4;
    }
    return 64; // Default estimate
  }

  /**
   * Update cache metrics
   */
  private updateMetrics(): void {
    this.metrics.totalItems = this.cache.size;
    this.metrics.hitRate = this.metrics.hits / (this.metrics.hits + this.metrics.misses) || 0;
  }

  /**
   * Persist cache to disk
   */
  private async persistToDisk(): Promise<void> {
    if (!this.options.diskPath) return;

    try {
      const cacheData = {
        entries: Array.from(this.cache.entries()),
        accessOrder: this.accessOrder,
        metrics: this.metrics,
        timestamp: Date.now(),
      };

      await fs.mkdir(path.dirname(this.options.diskPath), { recursive: true });
      await fs.writeFile(this.options.diskPath, JSON.stringify(cacheData, null, 2));
      this.metrics.diskWrites++;
    } catch (error) {
      console.error('Failed to persist cache to disk:', error);
    }
  }

  /**
   * Load cache from disk
   */
  private async loadFromDisk(): Promise<void> {
    if (!this.options.diskPath) return;

    try {
      const data = await fs.readFile(this.options.diskPath, 'utf-8');
      const cacheData = JSON.parse(data);

      // Validate loaded data is not too old
      const maxAge = this.options.ttl * 2; // Allow data up to 2x TTL old
      if (Date.now() - cacheData.timestamp > maxAge) {
        console.log('Cached data too old, starting fresh');
        return;
      }

      // Restore cache entries
      for (const [key, entry] of cacheData.entries) {
        // Only restore non-expired entries
        if (!this.isExpired(entry as CacheEntry<T>)) {
          this.cache.set(key, entry as CacheEntry<T>);
        }
      }

      // Restore access order (filter out expired entries)
      this.accessOrder = cacheData.accessOrder.filter((key: string) => this.cache.has(key));

      // Update memory usage
      this.metrics.memoryUsage = 0;
      for (const entry of this.cache.values()) {
        this.metrics.memoryUsage += entry.size;
      }

      this.metrics.diskReads++;
      this.updateMetrics();

      console.log(`Loaded ${this.cache.size} cache entries from disk`);
    } catch (error) {
      // File doesn't exist or is corrupted, start fresh
      console.log('No valid cache file found, starting fresh');
    }
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.persistenceInterval) {
      clearInterval(this.persistenceInterval);
    }
    
    // Final persistence if enabled
    if (this.options.persistToDisk && this.options.diskPath) {
      this.persistToDisk().catch(console.error);
    }
    
    this.clear();
  }
}

/**
 * Multi-level cache manager for different data types
 */
export interface MultiLevelCacheOptions {
  embeddings: CacheOptions;
  reranking: CacheOptions;
  utilities: CacheOptions;
  enableGlobalMetrics: boolean;
}

export class MultiLevelCacheManager {
  private embeddingsCache: LRUCacheWithTTL<Float32Array>;
  private rerankingCache: LRUCacheWithTTL<any>;
  private utilitiesCache: LRUCacheWithTTL<any>;
  private options: MultiLevelCacheOptions;

  constructor(options: MultiLevelCacheOptions) {
    this.options = options;
    
    this.embeddingsCache = new LRUCacheWithTTL<Float32Array>(options.embeddings);
    this.rerankingCache = new LRUCacheWithTTL<any>(options.reranking);
    this.utilitiesCache = new LRUCacheWithTTL<any>(options.utilities);
  }

  /**
   * Embeddings cache operations
   */
  async getEmbedding(key: string): Promise<Float32Array | undefined> {
    return this.embeddingsCache.get(key);
  }

  async setEmbedding(key: string, embedding: Float32Array): Promise<void> {
    return this.embeddingsCache.set(key, embedding);
  }

  /**
   * Reranking cache operations
   */
  async getRerankingResult(key: string): Promise<any> {
    return this.rerankingCache.get(key);
  }

  async setRerankingResult(key: string, result: any): Promise<void> {
    return this.rerankingCache.set(key, result);
  }

  /**
   * Utilities cache operations
   */
  async getUtility(key: string): Promise<any> {
    return this.utilitiesCache.get(key);
  }

  async setUtility(key: string, result: any): Promise<void> {
    return this.utilitiesCache.set(key, result);
  }

  /**
   * Invalidation strategies
   */
  invalidateByPattern(pattern: RegExp): void {
    this.invalidateCacheByPattern(this.embeddingsCache, pattern);
    this.invalidateCacheByPattern(this.rerankingCache, pattern);
    this.invalidateCacheByPattern(this.utilitiesCache, pattern);
  }

  invalidateByPrefix(prefix: string): void {
    const pattern = new RegExp(`^${prefix}`);
    this.invalidateByPattern(pattern);
  }

  invalidateAll(): void {
    this.embeddingsCache.clear();
    this.rerankingCache.clear();
    this.utilitiesCache.clear();
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(): {
    embeddings: CacheMetrics;
    reranking: CacheMetrics;
    utilities: CacheMetrics;
    total: {
      memoryUsage: number;
      totalItems: number;
      combinedHitRate: number;
    };
  } {
    const embeddingsMetrics = this.embeddingsCache.getMetrics();
    const rerankingMetrics = this.rerankingCache.getMetrics();
    const utilitiesMetrics = this.utilitiesCache.getMetrics();

    const totalHits = embeddingsMetrics.hits + rerankingMetrics.hits + utilitiesMetrics.hits;
    const totalMisses = embeddingsMetrics.misses + rerankingMetrics.misses + utilitiesMetrics.misses;

    return {
      embeddings: embeddingsMetrics,
      reranking: rerankingMetrics,
      utilities: utilitiesMetrics,
      total: {
        memoryUsage: embeddingsMetrics.memoryUsage + rerankingMetrics.memoryUsage + utilitiesMetrics.memoryUsage,
        totalItems: embeddingsMetrics.totalItems + rerankingMetrics.totalItems + utilitiesMetrics.totalItems,
        combinedHitRate: totalHits / (totalHits + totalMisses) || 0,
      },
    };
  }

  /**
   * Memory pressure handling
   */
  handleMemoryPressure(): void {
    // Clear least important cache first (utilities)
    const metrics = this.getAggregatedMetrics();
    const totalMemory = metrics.total.memoryUsage;
    const threshold = Math.max(
      this.options.embeddings.memoryThreshold,
      this.options.reranking.memoryThreshold,
      this.options.utilities.memoryThreshold
    ) * 1024 * 1024;

    if (totalMemory > threshold * 0.9) {
      // Clear utilities cache first
      this.utilitiesCache.clear();
      
      // If still over threshold, clear reranking cache
      if (totalMemory > threshold * 0.95) {
        this.rerankingCache.clear();
      }
    }
  }

  /**
   * Destroy all caches
   */
  destroy(): void {
    this.embeddingsCache.destroy();
    this.rerankingCache.destroy();
    this.utilitiesCache.destroy();
  }

  /**
   * Helper method to invalidate cache by pattern
   */
  private invalidateCacheByPattern<T>(cache: LRUCacheWithTTL<T>, pattern: RegExp): void {
    const keysToDelete: string[] = [];
    
    for (const key of cache.keys()) {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      cache.delete(key);
    }
  }
}

/**
 * File-based cache invalidation
 */
export class FileBasedInvalidation {
  private fileWatchers = new Map<string, fsSync.FSWatcher>();
  private cacheManager: MultiLevelCacheManager;

  constructor(cacheManager: MultiLevelCacheManager) {
    this.cacheManager = cacheManager;
  }

  /**
   * Watch file for changes and invalidate related cache entries
   */
  watchFile(filePath: string, invalidationPattern?: RegExp): void {
    try {
      const watcher = fsSync.watch(filePath, (eventType) => {
        if (eventType === 'change') {
          if (invalidationPattern) {
            this.cacheManager.invalidateByPattern(invalidationPattern);
          } else {
            // Default: invalidate entries containing the file path
            const pattern = new RegExp(path.basename(filePath, path.extname(filePath)));
            this.cacheManager.invalidateByPattern(pattern);
          }
        }
      });

      this.fileWatchers.set(filePath, watcher);
    } catch (error) {
      console.error(`Failed to watch file ${filePath}:`, error);
    }
  }

  /**
   * Stop watching file
   */
  unwatchFile(filePath: string): void {
    const watcher = this.fileWatchers.get(filePath);
    if (watcher) {
      watcher.close();
      this.fileWatchers.delete(filePath);
    }
  }

  /**
   * Stop watching all files
   */
  unwatchAll(): void {
    for (const [filePath, watcher] of this.fileWatchers) {
      watcher.close();
    }
    this.fileWatchers.clear();
  }

  /**
   * Destroy file watcher
   */
  destroy(): void {
    this.unwatchAll();
  }
}

/**
 * Default cache configurations
 */
export const defaultCacheConfig: MultiLevelCacheOptions = {
  embeddings: {
    maxSize: 1000,
    ttl: 3600000, // 1 hour
    persistToDisk: true,
    diskPath: '.cache/embeddings.json',
    memoryThreshold: 100, // 100MB
    enableMetrics: true,
  },
  reranking: {
    maxSize: 500,
    ttl: 1800000, // 30 minutes
    persistToDisk: true,
    diskPath: '.cache/reranking.json',
    memoryThreshold: 50, // 50MB
    enableMetrics: true,
  },
  utilities: {
    maxSize: 200,
    ttl: 900000, // 15 minutes
    persistToDisk: false,
    memoryThreshold: 25, // 25MB
    enableMetrics: true,
  },
  enableGlobalMetrics: true,
};

/**
 * Create default cache manager instance
 */
export function createCacheManager(options?: Partial<MultiLevelCacheOptions>): MultiLevelCacheManager {
  const config = { ...defaultCacheConfig, ...options };
  return new MultiLevelCacheManager(config);
}
