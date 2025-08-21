/**
 * kv.test.ts
 * Tests for the caching and performance layer
 */

import { LRUCacheWithTTL, MultiLevelCacheManager, FileBasedInvalidation, createCacheManager } from '../../../src/context-engine/cache/kv.js';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

// Mock fs for testing
jest.mock('fs/promises');
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;
const mockFsSync = fsSync as jest.Mocked<typeof fsSync>;

describe('LRUCacheWithTTL', () => {
  let cache: LRUCacheWithTTL<string>;
  const testOptions = {
    maxSize: 3,
    ttl: 1000, // 1 second
    persistToDisk: false,
    memoryThreshold: 1, // 1MB
    enableMetrics: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new LRUCacheWithTTL<string>(testOptions);
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values', async () => {
      await cache.set('key1', 'value1');
      const result = await cache.get('key1');
      expect(result).toBe('value1');
    });

    it('should return undefined for non-existent keys', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should update existing values', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key1', 'value2');
      const result = await cache.get('key1');
      expect(result).toBe('value2');
    });

    it('should delete values', async () => {
      await cache.set('key1', 'value1');
      const deleted = cache.delete('key1');
      expect(deleted).toBe(true);
      
      const result = await cache.get('key1');
      expect(result).toBeUndefined();
    });

    it('should check if key exists', async () => {
      await cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return cache size', async () => {
      expect(cache.size()).toBe(0);
      await cache.set('key1', 'value1');
      expect(cache.size()).toBe(1);
    });

    it('should clear all entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size()).toBe(0);
    });

    it('should return all valid keys', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      const keys = cache.keys();
      expect(keys).toEqual(expect.arrayContaining(['key1', 'key2']));
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used items when size limit is exceeded', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');
      await cache.set('key4', 'value4'); // Should evict key1

      expect(await cache.get('key1')).toBeUndefined();
      expect(await cache.get('key2')).toBe('value2');
      expect(await cache.get('key3')).toBe('value3');
      expect(await cache.get('key4')).toBe('value4');
    });

    it('should update access order when items are retrieved', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');
      
      // Access key1 to make it most recently used
      await cache.get('key1');
      
      await cache.set('key4', 'value4'); // Should evict key2 (least recently used)

      expect(await cache.get('key1')).toBe('value1');
      expect(await cache.get('key2')).toBeUndefined();
      expect(await cache.get('key3')).toBe('value3');
      expect(await cache.get('key4')).toBe('value4');
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire items after TTL', async () => {
      const shortTTLCache = new LRUCacheWithTTL<string>({
        ...testOptions,
        ttl: 100, // 100ms
      });

      await shortTTLCache.set('key1', 'value1');
      expect(await shortTTLCache.get('key1')).toBe('value1');

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(await shortTTLCache.get('key1')).toBeUndefined();

      shortTTLCache.destroy();
    });

    it('should not return expired items when checking existence', async () => {
      const shortTTLCache = new LRUCacheWithTTL<string>({
        ...testOptions,
        ttl: 100, // 100ms
      });

      await shortTTLCache.set('key1', 'value1');
      expect(shortTTLCache.has('key1')).toBe(true);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(shortTTLCache.has('key1')).toBe(false);

      shortTTLCache.destroy();
    });

    it('should clean up expired items during cleanup', async () => {
      const shortTTLCache = new LRUCacheWithTTL<string>({
        ...testOptions,
        ttl: 100, // 100ms
      });

      await shortTTLCache.set('key1', 'value1');
      await shortTTLCache.set('key2', 'value2');
      
      expect(shortTTLCache.size()).toBe(2);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Trigger cleanup by trying to access
      await shortTTLCache.get('key1');
      
      // Items should be cleaned up
      expect(shortTTLCache.size()).toBe(0);

      shortTTLCache.destroy();
    });
  });

  describe('Memory Management', () => {
    it('should estimate memory usage', async () => {
      await cache.set('key1', 'value1');
      const metrics = cache.getMetrics();
      expect(metrics.memoryUsage).toBeGreaterThan(0);
    });

    it('should enforce memory limits', async () => {
      const memoryLimitedCache = new LRUCacheWithTTL<string>({
        ...testOptions,
        maxSize: 1000, // Large size limit
        memoryThreshold: 2, // 2MB memory limit (small but not too restrictive)
      });

      // Add first item - should fit within limit
      await memoryLimitedCache.set('key1', 'a'.repeat(500));
      expect(await memoryLimitedCache.get('key1')).toBe('a'.repeat(500));
      
      // Add many more items to exceed memory limit
      for (let i = 0; i < 10; i++) {
        await memoryLimitedCache.set(`key${i}`, 'x'.repeat(200000)); // 400KB each
      }
      
      // The first item should be evicted due to memory pressure
      expect(await memoryLimitedCache.get('key1')).toBeUndefined();
      
      // But recent items should still exist
      expect(await memoryLimitedCache.get('key9')).toBeDefined();

      memoryLimitedCache.destroy();
    });
  });

  describe('Metrics', () => {
    it('should track cache hits and misses', async () => {
      await cache.set('key1', 'value1');
      
      // Hit
      await cache.get('key1');
      
      // Miss
      await cache.get('nonexistent');

      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(1);
      expect(metrics.hitRate).toBe(0.5);
    });

    it('should track evictions', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');
      await cache.set('key4', 'value4'); // Should cause eviction

      const metrics = cache.getMetrics();
      expect(metrics.evictions).toBe(1);
    });

    it('should track total items and memory usage', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const metrics = cache.getMetrics();
      expect(metrics.totalItems).toBe(2);
      expect(metrics.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('Disk Persistence', () => {
    it('should persist cache to disk when enabled', async () => {
      const persistentCache = new LRUCacheWithTTL<string>({
        ...testOptions,
        persistToDisk: true,
        diskPath: './test-cache.json',
      });

      await persistentCache.set('key1', 'value1');
      
      // Trigger persistence manually by calling destroy (which calls persistToDisk)
      persistentCache.destroy();
      
      // Wait a bit for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check that mkdir and writeFile were called
      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should load cache from disk on initialization', async () => {
      const cacheData = {
        entries: [['key1', {
          value: 'value1',
          timestamp: Date.now(),
          accessTime: Date.now(),
          accessCount: 1,
          size: 12,
        }]],
        accessOrder: ['key1'],
        metrics: {},
        timestamp: Date.now(),
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(cacheData));

      const persistentCache = new LRUCacheWithTTL<string>({
        ...testOptions,
        persistToDisk: true,
        diskPath: './test-cache.json',
      });

      // Wait for loading to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(await persistentCache.get('key1')).toBe('value1');
      
      persistentCache.destroy();
    });

    it('should handle disk read errors gracefully', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('File not found'));

      const persistentCache = new LRUCacheWithTTL<string>({
        ...testOptions,
        persistToDisk: true,
        diskPath: './test-cache.json',
      });

      // Should not throw error
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(persistentCache.size()).toBe(0);
      
      persistentCache.destroy();
    });
  });
});

describe('MultiLevelCacheManager', () => {
  let cacheManager: MultiLevelCacheManager;
  const testConfig = {
    embeddings: {
      maxSize: 10,
      ttl: 1000,
      persistToDisk: false,
      memoryThreshold: 1,
      enableMetrics: true,
    },
    reranking: {
      maxSize: 10,
      ttl: 1000,
      persistToDisk: false,
      memoryThreshold: 1,
      enableMetrics: true,
    },
    utilities: {
      maxSize: 10,
      ttl: 1000,
      persistToDisk: false,
      memoryThreshold: 1,
      enableMetrics: true,
    },
    enableGlobalMetrics: true,
  };

  beforeEach(() => {
    cacheManager = new MultiLevelCacheManager(testConfig);
  });

  afterEach(() => {
    cacheManager.destroy();
  });

  describe('Embeddings Cache', () => {
    it('should store and retrieve embeddings', async () => {
      const embedding = new Float32Array([1.0, 2.0, 3.0]);
      await cacheManager.setEmbedding('doc1', embedding);
      
      const retrieved = await cacheManager.getEmbedding('doc1');
      expect(retrieved).toEqual(embedding);
    });

    it('should return undefined for non-existent embeddings', async () => {
      const result = await cacheManager.getEmbedding('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('Reranking Cache', () => {
    it('should store and retrieve reranking results', async () => {
      const rerankingResult = { scores: [0.9, 0.8, 0.7], indices: [0, 1, 2] };
      await cacheManager.setRerankingResult('query1', rerankingResult);
      
      const retrieved = await cacheManager.getRerankingResult('query1');
      expect(retrieved).toEqual(rerankingResult);
    });
  });

  describe('Utilities Cache', () => {
    it('should store and retrieve utility results', async () => {
      const utilityResult = { processed: true, data: 'test' };
      await cacheManager.setUtility('util1', utilityResult);
      
      const retrieved = await cacheManager.getUtility('util1');
      expect(retrieved).toEqual(utilityResult);
    });
  });

  describe('Cache Invalidation', () => {
    beforeEach(async () => {
      await cacheManager.setEmbedding('doc1_embedding', new Float32Array([1.0]));
      await cacheManager.setRerankingResult('doc1_rerank', { score: 0.9 });
      await cacheManager.setUtility('doc1_util', { data: 'test' });
    });

    it('should invalidate by pattern', async () => {
      const pattern = /^doc1_/;
      cacheManager.invalidateByPattern(pattern);

      expect(await cacheManager.getEmbedding('doc1_embedding')).toBeUndefined();
      expect(await cacheManager.getRerankingResult('doc1_rerank')).toBeUndefined();
      expect(await cacheManager.getUtility('doc1_util')).toBeUndefined();
    });

    it('should invalidate by prefix', async () => {
      cacheManager.invalidateByPrefix('doc1_');

      expect(await cacheManager.getEmbedding('doc1_embedding')).toBeUndefined();
      expect(await cacheManager.getRerankingResult('doc1_rerank')).toBeUndefined();
      expect(await cacheManager.getUtility('doc1_util')).toBeUndefined();
    });

    it('should invalidate all caches', async () => {
      cacheManager.invalidateAll();

      expect(await cacheManager.getEmbedding('doc1_embedding')).toBeUndefined();
      expect(await cacheManager.getRerankingResult('doc1_rerank')).toBeUndefined();
      expect(await cacheManager.getUtility('doc1_util')).toBeUndefined();
    });
  });

  describe('Aggregated Metrics', () => {
    it('should provide aggregated metrics across all caches', async () => {
      await cacheManager.setEmbedding('emb1', new Float32Array([1.0]));
      await cacheManager.setRerankingResult('rerank1', { score: 0.9 });
      await cacheManager.setUtility('util1', { data: 'test' });

      // Generate some hits and misses
      await cacheManager.getEmbedding('emb1'); // hit
      await cacheManager.getEmbedding('nonexistent'); // miss

      const metrics = cacheManager.getAggregatedMetrics();
      
      expect(metrics.total.totalItems).toBe(3);
      expect(metrics.total.memoryUsage).toBeGreaterThan(0);
      expect(metrics.total.combinedHitRate).toBeGreaterThan(0);
      expect(metrics.embeddings).toBeDefined();
      expect(metrics.reranking).toBeDefined();
      expect(metrics.utilities).toBeDefined();
    });
  });

  describe('Memory Pressure Handling', () => {
    it('should clear caches under memory pressure', async () => {
      // Create a cache manager with low memory thresholds
      const pressureTestCache = new MultiLevelCacheManager({
        embeddings: { maxSize: 100, ttl: 1000, persistToDisk: false, memoryThreshold: 1, enableMetrics: true }, // 1MB
        reranking: { maxSize: 100, ttl: 1000, persistToDisk: false, memoryThreshold: 1, enableMetrics: true },   // 1MB
        utilities: { maxSize: 100, ttl: 1000, persistToDisk: false, memoryThreshold: 1, enableMetrics: true },   // 1MB
        enableGlobalMetrics: true,
      });

      // Add items that will create significant memory usage
      await pressureTestCache.setEmbedding('emb1', new Float32Array(50000)); // Large embedding
      await pressureTestCache.setRerankingResult('rerank1', { data: 'x'.repeat(100000) }); // Large reranking result
      await pressureTestCache.setUtility('util1', { data: 'y'.repeat(100000) }); // Large utility result

      // Check that we have data before pressure handling
      expect(await pressureTestCache.getUtility('util1')).toBeDefined();

      // Get memory usage before pressure handling
      const beforeMetrics = pressureTestCache.getAggregatedMetrics();
      expect(beforeMetrics.utilities.totalItems).toBe(1);

      pressureTestCache.handleMemoryPressure();

      // Utilities should be cleared first under memory pressure
      expect(await pressureTestCache.getUtility('util1')).toBeUndefined();
      
      // Check metrics after pressure handling
      const afterMetrics = pressureTestCache.getAggregatedMetrics();
      expect(afterMetrics.utilities.totalItems).toBe(0);

      pressureTestCache.destroy();
    });
  });
});

describe('FileBasedInvalidation', () => {
  let cacheManager: MultiLevelCacheManager;
  let fileInvalidation: FileBasedInvalidation;

  beforeEach(() => {
    const testConfig = {
      embeddings: { maxSize: 10, ttl: 1000, persistToDisk: false, memoryThreshold: 1, enableMetrics: true },
      reranking: { maxSize: 10, ttl: 1000, persistToDisk: false, memoryThreshold: 1, enableMetrics: true },
      utilities: { maxSize: 10, ttl: 1000, persistToDisk: false, memoryThreshold: 1, enableMetrics: true },
      enableGlobalMetrics: true,
    };
    
    cacheManager = new MultiLevelCacheManager(testConfig);
    fileInvalidation = new FileBasedInvalidation(cacheManager);
  });

  afterEach(() => {
    fileInvalidation.destroy();
    cacheManager.destroy();
  });

  describe('File Watching', () => {
    it('should watch files for changes', () => {
      // Mock fsSync.watch
      const mockWatcher = { close: jest.fn() };
      mockFsSync.watch.mockReturnValue(mockWatcher as any);

      fileInvalidation.watchFile('/test/file.txt');
      
      expect(mockFsSync.watch).toHaveBeenCalledWith('/test/file.txt', expect.any(Function));
    });

    it('should stop watching files', () => {
      const mockWatcher = { close: jest.fn() };
      mockFsSync.watch.mockReturnValue(mockWatcher as any);

      fileInvalidation.watchFile('/test/file.txt');
      fileInvalidation.unwatchFile('/test/file.txt');
      
      expect(mockWatcher.close).toHaveBeenCalled();
    });

    it('should handle file watch errors gracefully', () => {
      mockFsSync.watch.mockImplementation(() => {
        throw new Error('Watch failed');
      });

      // Should not throw error
      expect(() => {
        fileInvalidation.watchFile('/test/file.txt');
      }).not.toThrow();
    });
  });
});

describe('createCacheManager', () => {
  it('should create cache manager with default config', () => {
    const manager = createCacheManager();
    expect(manager).toBeInstanceOf(MultiLevelCacheManager);
    manager.destroy();
  });

  it('should create cache manager with custom config', () => {
    const customConfig = {
      embeddings: {
        maxSize: 50,
        ttl: 2000,
        persistToDisk: false,
        memoryThreshold: 2,
        enableMetrics: true,
      },
    };

    const manager = createCacheManager(customConfig);
    expect(manager).toBeInstanceOf(MultiLevelCacheManager);
    manager.destroy();
  });
});

describe('Integration Tests', () => {
  let cacheManager: MultiLevelCacheManager;

  beforeEach(() => {
    cacheManager = createCacheManager({
      embeddings: { maxSize: 5, ttl: 1000, persistToDisk: false, memoryThreshold: 1, enableMetrics: true },
      reranking: { maxSize: 5, ttl: 1000, persistToDisk: false, memoryThreshold: 1, enableMetrics: true },
      utilities: { maxSize: 5, ttl: 1000, persistToDisk: false, memoryThreshold: 1, enableMetrics: true },
      enableGlobalMetrics: true,
    });
  });

  afterEach(() => {
    cacheManager.destroy();
  });

  it('should work with realistic data types', async () => {
    // Embeddings
    const embedding = new Float32Array(384); // Typical sentence transformer size
    for (let i = 0; i < 384; i++) {
      embedding[i] = Math.random();
    }
    await cacheManager.setEmbedding('document_123', embedding);

    // Reranking results
    const rerankingResult = {
      query: 'test query',
      results: [
        { id: 'doc1', score: 0.95, rank: 1 },
        { id: 'doc2', score: 0.87, rank: 2 },
        { id: 'doc3', score: 0.76, rank: 3 },
      ],
      model: 'rerank-v2',
      timestamp: Date.now(),
    };
    await cacheManager.setRerankingResult('query_hash_456', rerankingResult);

    // Utility computations
    const utilityResult = {
      type: 'text_analysis',
      sentiment: 0.8,
      entities: ['Person A', 'Company B'],
      keywords: ['machine learning', 'artificial intelligence'],
      summary: 'This document discusses AI technologies...',
      confidence: 0.92,
    };
    await cacheManager.setUtility('analysis_789', utilityResult);

    // Verify retrieval
    const retrievedEmbedding = await cacheManager.getEmbedding('document_123');
    expect(retrievedEmbedding).toEqual(embedding);

    const retrievedReranking = await cacheManager.getRerankingResult('query_hash_456');
    expect(retrievedReranking).toEqual(rerankingResult);

    const retrievedUtility = await cacheManager.getUtility('analysis_789');
    expect(retrievedUtility).toEqual(utilityResult);

    // Check metrics
    const metrics = cacheManager.getAggregatedMetrics();
    expect(metrics.total.totalItems).toBe(3);
    expect(metrics.total.combinedHitRate).toBeGreaterThan(0);
  });

  it('should handle cache overflow and eviction properly', async () => {
    // Fill embeddings cache beyond capacity
    for (let i = 0; i < 10; i++) {
      const embedding = new Float32Array([i]);
      await cacheManager.setEmbedding(`doc_${i}`, embedding);
    }

    // Only the last 5 should remain due to LRU eviction
    expect(await cacheManager.getEmbedding('doc_0')).toBeUndefined();
    expect(await cacheManager.getEmbedding('doc_5')).toBeDefined();
    expect(await cacheManager.getEmbedding('doc_9')).toBeDefined();
  });

  it('should handle concurrent operations', async () => {
    // Simulate concurrent cache operations
    const promises = [];
    
    for (let i = 0; i < 20; i++) {
      promises.push(cacheManager.setEmbedding(`concurrent_${i}`, new Float32Array([i])));
      promises.push(cacheManager.setRerankingResult(`query_${i}`, { score: i / 20 }));
      promises.push(cacheManager.setUtility(`util_${i}`, { value: i }));
    }

    await Promise.all(promises);

    // Verify some entries exist
    const embedding = await cacheManager.getEmbedding('concurrent_15');
    expect(embedding).toBeDefined();

    const metrics = cacheManager.getAggregatedMetrics();
    expect(metrics.total.totalItems).toBeGreaterThan(0);
  });
});
