/**
 * rerank_ce.test.ts
 * Unit tests for Cross-Encoder Reranking System
 */

import { 
  CrossEncoderReranker, 
  LocalCrossEncoderModel, 
  APICrossEncoderModel, 
  InMemoryRerankingCache,
  type RerankingRequest,
  type CrossEncoderOptions,
  type RerankingResponse
} from '../../src/context-engine/retrieve/rerank_ce.js';
import type { RetrievalCandidate } from '../../src/context-engine/retrieve/hybrid.js';
import type { Chunk } from '../../src/context-engine/types.js';

// Mock data for testing
const mockChunks: Chunk[] = [
  { id: 'chunk1', documentId: 'doc1', content: 'Machine learning is a subset of artificial intelligence', metadata: {}, timestamps: {} },
  { id: 'chunk2', documentId: 'doc1', content: 'Deep learning uses neural networks with multiple layers', metadata: {}, timestamps: {} },
  { id: 'chunk3', documentId: 'doc2', content: 'Natural language processing enables computers to understand text', metadata: {}, timestamps: {} },
  { id: 'chunk4', documentId: 'doc2', content: 'Computer vision focuses on image and video analysis', metadata: {}, timestamps: {} },
];

const mockCandidates: RetrievalCandidate[] = [
  { chunk: mockChunks[0], score: 0.8, source: 'hybrid', metadata: { documentId: 'doc1', chunkIndex: 0, relevance: 0.8, confidence: 0.9 } },
  { chunk: mockChunks[1], score: 0.7, source: 'hybrid', metadata: { documentId: 'doc1', chunkIndex: 1, relevance: 0.7, confidence: 0.8 } },
  { chunk: mockChunks[2], score: 0.6, source: 'hybrid', metadata: { documentId: 'doc2', chunkIndex: 0, relevance: 0.6, confidence: 0.7 } },
  { chunk: mockChunks[3], score: 0.5, source: 'hybrid', metadata: { documentId: 'doc2', chunkIndex: 1, relevance: 0.5, confidence: 0.6 } },
];

describe('CrossEncoderReranker', () => {
  let reranker: CrossEncoderReranker;
  let localModel: LocalCrossEncoderModel;
  let apiModel: APICrossEncoderModel;
  let cache: InMemoryRerankingCache;

  beforeEach(() => {
    // Create mock models
    localModel = new LocalCrossEncoderModel('local-test', '/path/to/model', '/path/to/tokenizer', {
      maxBatchSize: 8,
      timeoutMs: 5000,
    });

    apiModel = new APICrossEncoderModel('api-test', 'https://api.example.com', 'test-api-key', {
      maxBatchSize: 16,
      timeoutMs: 10000,
    });

    cache = new InMemoryRerankingCache();

    // Create reranker with both models
    reranker = new CrossEncoderReranker([localModel, apiModel], cache, {
      modelName: 'local-test',
      batchSize: 4,
      timeoutMs: 15000,
      enableCaching: true,
      cacheTTL: 3600000,
      fallbackChain: ['api-test'],
      maxRetries: 2,
      retryDelayMs: 500,
    });
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with default options', () => {
      const defaultReranker = new CrossEncoderReranker([localModel], cache);
      expect(defaultReranker).toBeInstanceOf(CrossEncoderReranker);
    });

    it('should accept custom options', () => {
      const customReranker = new CrossEncoderReranker([localModel], cache, {
        modelName: 'custom-model',
        batchSize: 64,
        timeoutMs: 60000,
        enableCaching: false,
      });
      expect(customReranker).toBeInstanceOf(CrossEncoderReranker);
    });

    it('should initialize health status for all models', async () => {
      const healthStatus = await reranker.getHealthStatus();
      expect(healthStatus).toHaveProperty('local-test');
      expect(healthStatus).toHaveProperty('api-test');
    });
  });

  describe('Reranking Functionality', () => {
    it('should rerank candidates successfully', async () => {
      const request: RerankingRequest = {
        query: 'machine learning algorithms',
        candidates: mockCandidates,
      };

      const response = await reranker.rerank(request);
      
      expect(response).toHaveProperty('results');
      expect(response).toHaveProperty('metadata');
      expect(response.results).toHaveLength(mockCandidates.length);
      
      // Verify result structure
      response.results.forEach(result => {
        expect(result).toHaveProperty('chunkId');
        expect(result).toHaveProperty('originalScore');
        expect(result).toHaveProperty('rerankedScore');
        expect(result).toHaveProperty('confidence');
        expect(result).toHaveProperty('modelUsed');
        expect(result).toHaveProperty('processingTime');
      });
    });

    it('should process candidates in batches', async () => {
      const request: RerankingRequest = {
        query: 'test query',
        candidates: mockCandidates,
        options: { batchSize: 2 },
      };

      const response = await reranker.rerank(request);
      expect(response.results).toHaveLength(mockCandidates.length);
    });

    it('should handle empty candidate list', async () => {
      const request: RerankingRequest = {
        query: 'test query',
        candidates: [],
      };

      const response = await reranker.rerank(request);
      expect(response.results).toHaveLength(0);
      expect(response.metadata.totalProcessed).toBe(0);
    });

    it('should respect timeout settings', async () => {
      const request: RerankingRequest = {
        query: 'test query',
        candidates: mockCandidates,
        options: { timeoutMs: 1 }, // Very short timeout
      };

      await expect(reranker.rerank(request)).rejects.toThrow('Reranking timeout');
    });
  });

  describe('Caching Functionality', () => {
    it('should cache results when enabled', async () => {
      const request: RerankingRequest = {
        query: 'cached query',
        candidates: mockCandidates,
        options: { enableCaching: true },
      };

      // First call should cache results
      const firstResponse = await reranker.rerank(request);
      expect(firstResponse.metadata.cacheHits).toBe(0);

      // Second call should hit cache
      const secondResponse = await reranker.rerank(request);
      expect(secondResponse.metadata.cacheHits).toBe(mockCandidates.length);

      // Verify cache stats
      const cacheStats = await reranker.getCacheStats();
      expect(cacheStats.hits).toBeGreaterThan(0);
    });

    it('should not cache when disabled', async () => {
      const request: RerankingRequest = {
        query: 'no cache query',
        candidates: mockCandidates,
        options: { enableCaching: false },
      };

      const response1 = await reranker.rerank(request);
      const response2 = await reranker.rerank(request);

      expect(response1.metadata.cacheHits).toBe(0);
      expect(response2.metadata.cacheHits).toBe(0);
    });

    it('should clear cache successfully', async () => {
      const request: RerankingRequest = {
        query: 'clear cache query',
        candidates: mockCandidates,
      };

      await reranker.rerank(request);
      await reranker.clearCache();

      const cacheStats = await reranker.getCacheStats();
      expect(cacheStats.size).toBe(0);
    });
  });

  describe('Fallback Mechanism', () => {
    it('should use fallback models when primary fails', async () => {
      // Mock local model to fail
      jest.spyOn(localModel, 'rerank').mockRejectedValue(new Error('Local model failed'));

      const request: RerankingRequest = {
        query: 'fallback test',
        candidates: mockCandidates,
        options: { fallbackChain: ['api-test'] },
      };

      const response = await reranker.rerank(request);
      expect(response.results).toHaveLength(mockCandidates.length);
      
      // Should have used fallback model
      const modelUsage = response.metadata.modelUsage;
      expect(modelUsage['api-test']).toBeGreaterThan(0);
    });

    it('should return original scores when all models fail', async () => {
      // Mock both models to fail
      jest.spyOn(localModel, 'rerank').mockRejectedValue(new Error('Local model failed'));
      jest.spyOn(apiModel, 'rerank').mockRejectedValue(new Error('API model failed'));

      const request: RerankingRequest = {
        query: 'all models fail',
        candidates: mockCandidates,
        options: { fallbackChain: ['api-test'] },
      };

      const response = await reranker.rerank(request);
      expect(response.results).toHaveLength(mockCandidates.length);
      
      // Should have fallback-original as model
      response.results.forEach(result => {
        expect(result.modelUsed).toBe('fallback-original');
        expect(result.rerankedScore).toBe(result.originalScore);
      });
    });
  });

  describe('Health Monitoring', () => {
    it('should check model health status', async () => {
      const healthStatus = await reranker.getHealthStatus();
      
      expect(healthStatus['local-test']).toHaveProperty('healthy');
      expect(healthStatus['local-test']).toHaveProperty('lastCheck');
      expect(healthStatus['local-test']).toHaveProperty('errorCount');
      expect(healthStatus['local-test']).toHaveProperty('model');
    });

    it('should force health check for all models', async () => {
      await reranker.forceHealthCheck();
      
      const healthStatus = await reranker.getHealthStatus();
      expect(healthStatus['local-test'].lastCheck).toBeGreaterThan(0);
      expect(healthStatus['api-test'].lastCheck).toBeGreaterThan(0);
    });

    it('should track error counts for failed models', async () => {
      // Mock local model to fail health check
      jest.spyOn(localModel, 'healthCheck').mockResolvedValue(false);
      
      await reranker.forceHealthCheck();
      
      const healthStatus = await reranker.getHealthStatus();
      expect(healthStatus['local-test'].errorCount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle model initialization failures gracefully', async () => {
      const failingModel = new LocalCrossEncoderModel('failing-model', '/invalid/path', '/invalid/path');
      
      const failingReranker = new CrossEncoderReranker([failingModel], cache);
      
      const request: RerankingRequest = {
        query: 'test query',
        candidates: mockCandidates,
      };

      // Should handle gracefully even if model fails to initialize
      await expect(failingReranker.rerank(request)).rejects.toThrow('No healthy cross-encoder models available');
    });

    it('should handle batch processing errors', async () => {
      // Mock local model to fail on specific batch
      jest.spyOn(localModel, 'rerank')
        .mockResolvedValueOnce([0.8, 0.7]) // First batch succeeds
        .mockRejectedValueOnce(new Error('Second batch failed')); // Second batch fails

      const request: RerankingRequest = {
        query: 'batch error test',
        candidates: mockCandidates,
        options: { batchSize: 2 },
      };

      const response = await reranker.rerank(request);
      expect(response.metadata.errors).toHaveLength(1);
      expect(response.metadata.errors[0]).toContain('Batch 2 failed');
    });

    it('should handle invalid batch sizes', async () => {
      const request: RerankingRequest = {
        query: 'test query',
        candidates: mockCandidates,
        options: { batchSize: 0 },
      };

      await expect(reranker.rerank(request)).rejects.toThrow();
    });
  });

  describe('Performance and Metrics', () => {
    it('should track processing times', async () => {
      const request: RerankingRequest = {
        query: 'performance test',
        candidates: mockCandidates,
      };

      const response = await reranker.rerank(request);
      
      expect(response.metadata.averageProcessingTime).toBeGreaterThan(0);
      response.results.forEach(result => {
        expect(result.processingTime).toBeGreaterThanOrEqual(0);
      });
    });

    it('should track model usage statistics', async () => {
      const request: RerankingRequest = {
        query: 'usage tracking test',
        candidates: mockCandidates,
      };

      const response = await reranker.rerank(request);
      
      expect(response.metadata.modelUsage).toBeDefined();
      const totalUsage = Object.values(response.metadata.modelUsage).reduce((sum, count) => sum + count, 0);
      expect(totalUsage).toBe(mockCandidates.length);
    });
  });
});

describe('LocalCrossEncoderModel', () => {
  let model: LocalCrossEncoderModel;

  beforeEach(() => {
    model = new LocalCrossEncoderModel('test-local', '/path/to/model', '/path/to/tokenizer');
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const isHealthy = await model.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should handle initialization failures', async () => {
      const failingModel = new LocalCrossEncoderModel('failing', '/invalid/path', '/invalid/path');
      
      // Should handle initialization errors gracefully
      expect(failingModel).toBeInstanceOf(LocalCrossEncoderModel);
    });
  });

  describe('Reranking', () => {
    it('should rerank documents successfully', async () => {
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const documents = ['doc1', 'doc2', 'doc3'];
      const scores = await model.rerank('test query', documents);
      
      expect(scores).toHaveLength(documents.length);
      scores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });

    it('should respect batch size limits', async () => {
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const largeBatch = Array.from({ length: 20 }, (_, i) => `doc${i}`);
      
      await expect(model.rerank('test query', largeBatch))
        .rejects.toThrow('Batch size 20 exceeds maximum 16');
    });

    it('should fail if not initialized', async () => {
      const uninitializedModel = new LocalCrossEncoderModel('uninit', '/path/to/model', '/path/to/tokenizer');
      
      await expect(uninitializedModel.rerank('test', ['doc1']))
        .rejects.toThrow('Model not initialized');
    });
  });
});

describe('APICrossEncoderModel', () => {
  let model: APICrossEncoderModel;

  beforeEach(() => {
    model = new APICrossEncoderModel('test-api', 'https://api.example.com', 'test-key');
  });

  describe('Health Check', () => {
    it('should check API health endpoint', async () => {
      // Mock fetch for health check
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
        } as Response)
      ) as jest.Mock;

      const isHealthy = await model.healthCheck();
      expect(isHealthy).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/health',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
          }),
        })
      );
    });

    it('should handle health check failures', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        } as Response)
      ) as jest.Mock;

      const isHealthy = await model.healthCheck();
      expect(isHealthy).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      global.fetch = jest.fn(() =>
        Promise.reject(new Error('Network error'))
      ) as jest.Mock;

      const isHealthy = await model.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });

  describe('Reranking', () => {
    it('should call API rerank endpoint', async () => {
      const mockScores = [0.8, 0.7, 0.6];
      
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ scores: mockScores }),
        } as Response)
      ) as jest.Mock;

      const documents = ['doc1', 'doc2', 'doc3'];
      const scores = await model.rerank('test query', documents);
      
      expect(scores).toEqual(mockScores);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/rerank',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            query: 'test query',
            documents,
            options: undefined,
          }),
        })
      );
    });

    it('should handle API errors', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        } as Response)
      ) as jest.Mock;

      await expect(model.rerank('test', ['doc1']))
        .rejects.toThrow('API request failed: 500 Internal Server Error');
    });

    it('should handle network timeouts', async () => {
      global.fetch = jest.fn(() =>
        Promise.reject(new Error('Timeout'))
      ) as jest.Mock;

      await expect(model.rerank('test', ['doc1']))
        .rejects.toThrow('API cross-encoder reranking failed: Error: Timeout');
    });
  });
});

describe('InMemoryRerankingCache', () => {
  let cache: InMemoryRerankingCache;

  beforeEach(() => {
    cache = new InMemoryRerankingCache();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values', async () => {
      const key = 'test-key';
      const value = [{ chunkId: '1', originalScore: 0.8, rerankedScore: 0.9, confidence: 0.8, modelUsed: 'test', processingTime: 100 }];
      const ttl = 1000;

      await cache.set(key, value, ttl);
      const retrieved = await cache.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should return null for non-existent keys', async () => {
      const retrieved = await cache.get('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should clear all cached values', async () => {
      await cache.set('key1', [], 1000);
      await cache.set('key2', [], 1000);

      await cache.clear();

      const stats = await cache.getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('TTL and Expiration', () => {
    it('should expire values after TTL', async () => {
      const key = 'expiring-key';
      const value = [{ chunkId: '1', originalScore: 0.8, rerankedScore: 0.9, confidence: 0.8, modelUsed: 'test', processingTime: 100 }];
      const ttl = 1; // 1ms TTL

      await cache.set(key, value, ttl);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const retrieved = await cache.get(key);
      expect(retrieved).toBeNull();
    });

    it('should clean up expired entries automatically', async () => {
      await cache.set('expired1', [], 1);
      await cache.set('expired2', [], 1);
      await cache.set('valid', [], 1000);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Trigger cleanup by setting a new value
      await cache.set('trigger', [], 1000);
      
      const stats = await cache.getStats();
      expect(stats.size).toBe(3); // valid, trigger, and cleanup should have removed expired
    });
  });

  describe('Statistics', () => {
    it('should track cache hits and misses', async () => {
      const key = 'stats-key';
      const value = [{ chunkId: '1', originalScore: 0.8, rerankedScore: 0.9, confidence: 0.8, modelUsed: 'test', processingTime: 100 }];

      // Miss
      await cache.get(key);
      
      // Hit
      await cache.set(key, value, 1000);
      await cache.get(key);
      
      // Miss
      await cache.get('another-key');

      const stats = await cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(2);
    });

    it('should track cache size', async () => {
      await cache.set('key1', [], 1000);
      await cache.set('key2', [], 1000);

      const stats = await cache.getStats();
      expect(stats.size).toBe(2);
    });
  });
});
