/**
 * extractive.test.ts
 * Tests for the extractive compression system
 */

import { ExtractiveCompressor } from '../../../src/context-engine/compress/extractive.js';
import type { Chunk, Atom } from '../../../src/context-engine/types.js';

// Mock fetch for sidecar service testing
global.fetch = jest.fn();

describe('ExtractiveCompressor', () => {
  let compressor: ExtractiveCompressor;
  let mockChunks: Chunk[];
  let mockAtoms: Atom[];

  beforeEach(() => {
    compressor = new ExtractiveCompressor();
    mockChunks = [
      {
        id: 'chunk1',
        docId: 'doc1',
        text: 'The year 2024 has the quick brown fox jumps over the lazy dog. This is a sample text that contains important information about the fox and the dog.',
        tokens: 25,
        metadata: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'chunk2',
        docId: 'doc1',
        text: 'Another sample text with different content. This chunk has more words and should be compressed more aggressively.',
        tokens: 20,
        metadata: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    mockAtoms = [
      {
        id: 'atom1',
        chunkId: 'chunk1',
        type: 'ENT',
        text: 'fox',
        confidence: 0.9,
        metadata: {},
        provenance: { offset: 16, length: 3 },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'atom2',
        chunkId: 'chunk1',
        type: 'ENT',
        text: 'dog',
        confidence: 0.9,
        metadata: {},
        provenance: { offset: 40, length: 3 },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'atom3',
        chunkId: 'chunk1',
        type: 'NUM',
        text: '2024',
        confidence: 0.95,
        metadata: {},
        provenance: { offset: 0, length: 4 },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    // Reset fetch mock
    (fetch as jest.Mock).mockClear();
  });

  describe('Configuration', () => {
    it('should use default configuration when no config provided', () => {
      const config = compressor.getConfig();
      expect(config.maxTokensPerSnippet).toBe(160);
      expect(config.preserveEntities).toBe(true);
      expect(config.preserveNumbers).toBe(true);
      expect(config.preserveIds).toBe(true);
      expect(config.compressionRatio).toBe(0.6);
      expect(config.qualityThreshold).toBe(0.8);
      expect(config.enableFallback).toBe(true);
    });

    it('should merge custom configuration with defaults', () => {
      const customCompressor = new ExtractiveCompressor({
        maxTokensPerSnippet: 100,
        preserveEntities: false,
        sidecarUrl: 'http://localhost:8080',
      });

      const config = customCompressor.getConfig();
      expect(config.maxTokensPerSnippet).toBe(100);
      expect(config.preserveEntities).toBe(false);
      expect(config.sidecarUrl).toBe('http://localhost:8080');
      expect(config.preserveNumbers).toBe(true); // Default preserved
    });

    it('should allow configuration updates', () => {
      compressor.updateConfig({
        maxTokensPerSnippet: 120,
        compressionRatio: 0.5,
      });

      const config = compressor.getConfig();
      expect(config.maxTokensPerSnippet).toBe(120);
      expect(config.compressionRatio).toBe(0.5);
    });
  });

  describe('Local Compression', () => {
    it('should compress chunks while preserving entities', async () => {
      const result = await compressor.compressChunks(mockChunks, mockAtoms);

      expect(result.originalChunks).toEqual(mockChunks);
      expect(result.compressedChunks).toHaveLength(2);
      expect(result.compressionRatio).toBeLessThan(1);
      expect(result.preservedEntities).toContain('fox');
      expect(result.preservedEntities).toContain('dog');
    });

    it('should preserve numbers when configured', async () => {
      const result = await compressor.compressChunks(mockChunks, mockAtoms);

      // Check that the compressed text still contains the number
      const compressedText = result.compressedChunks[0].text;
      expect(compressedText).toContain('2024');
    });

    it('should respect token limits', async () => {
      const customCompressor = new ExtractiveCompressor({
        maxTokensPerSnippet: 10,
      });

      const result = await customCompressor.compressChunks(mockChunks, mockAtoms);

      for (const chunk of result.compressedChunks) {
        expect(chunk.tokens).toBeLessThanOrEqual(10);
      }
    });

    it('should handle empty chunks gracefully', async () => {
      const emptyChunks: Chunk[] = [];
      const result = await compressor.compressChunks(emptyChunks, mockAtoms);

      expect(result.originalChunks).toEqual([]);
      expect(result.compressedChunks).toEqual([]);
      expect(result.compressionRatio).toBe(1);
      expect(result.tokenReduction).toBe(0);
    });

    it('should handle chunks without atoms', async () => {
      const result = await compressor.compressChunks(mockChunks);

      expect(result.preservedEntities).toEqual([]);
      expect(result.compressedChunks).toHaveLength(2);
    });

    it('should apply compression techniques', async () => {
      const result = await compressor.compressChunks(mockChunks, mockAtoms);

      // Check that compression actually reduced tokens
      const originalTokens = mockChunks.reduce((sum, chunk) => sum + chunk.tokens, 0);
      const compressedTokens = result.compressedChunks.reduce((sum, chunk) => sum + chunk.tokens, 0);
      expect(compressedTokens).toBeLessThan(originalTokens);
    });
  });

  describe('Sidecar Service Integration', () => {
    it('should use sidecar service when available', async () => {
      const sidecarCompressor = new ExtractiveCompressor({
        sidecarUrl: 'http://localhost:8080',
      });

      const mockSidecarResponse = {
        compressedText: 'Compressed text from sidecar',
        preservedEntities: ['fox', 'dog'],
        preservedNumbers: ['2024'],
        preservedIds: ['atom1', 'atom2'],
        compressionRatio: 0.4,
        qualityScore: 0.9,
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSidecarResponse,
      });

      const result = await sidecarCompressor.compressChunks(mockChunks, mockAtoms);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8080/compress',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(result.compressedChunks[0].text).toBe(mockSidecarResponse.compressedText);
      expect(result.compressionRatio).toBe(mockSidecarResponse.compressionRatio);
    });

    it('should fallback to local compression when sidecar fails', async () => {
      const sidecarCompressor = new ExtractiveCompressor({
        sidecarUrl: 'http://localhost:8080',
        enableFallback: true,
      });

      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await sidecarCompressor.compressChunks(mockChunks, mockAtoms);

      // Should still get a result from local compression
      expect(result.originalChunks).toEqual(mockChunks);
      expect(result.compressedChunks).toHaveLength(2);
      expect(result.compressionRatio).toBeLessThan(1);
    });

    it('should handle sidecar timeout', async () => {
      const sidecarCompressor = new ExtractiveCompressor({
        sidecarUrl: 'http://localhost:8080',
        sidecarTimeout: 100,
        enableFallback: true,
      });

      // Mock a slow response
      (fetch as jest.Mock).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(resolve, 200))
      );

      const result = await sidecarCompressor.compressChunks(mockChunks, mockAtoms);

      // Should fallback to local compression
      expect(result.originalChunks).toEqual(mockChunks);
      expect(result.compressedChunks).toHaveLength(2);
    });

    it('should handle invalid sidecar response', async () => {
      const sidecarCompressor = new ExtractiveCompressor({
        sidecarUrl: 'http://localhost:8080',
        enableFallback: true,
      });

      const invalidResponse = {
        compressedText: 'Valid text',
        // Missing required fields
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => invalidResponse,
      });

      const result = await sidecarCompressor.compressChunks(mockChunks, mockAtoms);

      // Should fallback to local compression due to invalid response
      expect(result.originalChunks).toEqual(mockChunks);
      expect(result.compressedChunks).toHaveLength(2);
    });

    it('should handle sidecar service errors', async () => {
      const sidecarCompressor = new ExtractiveCompressor({
        sidecarUrl: 'http://localhost:8080',
        enableFallback: true,
      });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await sidecarCompressor.compressChunks(mockChunks, mockAtoms);

      // Should fallback to local compression
      expect(result.originalChunks).toEqual(mockChunks);
      expect(result.compressedChunks).toHaveLength(2);
    });
  });

  describe('Compression Quality', () => {
    it('should calculate compression metrics correctly', async () => {
      const result = await compressor.compressChunks(mockChunks, mockAtoms);
      const metrics = compressor.getCompressionMetrics(result);

      expect(metrics.originalTokens).toBe(45); // 25 + 20
      expect(metrics.compressedTokens).toBeLessThan(45);
      expect(metrics.compressionRatio).toBeLessThan(1);
      expect(metrics.entitiesPreserved).toBeGreaterThan(0);
      expect(metrics.qualityScore).toBeGreaterThan(0);
    });

    it('should maintain semantic meaning', async () => {
      const result = await compressor.compressChunks(mockChunks, mockAtoms);

      // Check that key entities are still present
      const compressedText = result.compressedChunks[0].text;
      expect(compressedText).toContain('fox');
      expect(compressedText).toContain('dog');
      expect(compressedText).toContain('2024');
    });

    it('should handle different compression ratios', async () => {
      const aggressiveCompressor = new ExtractiveCompressor({
        compressionRatio: 0.3,
      });

      const conservativeCompressor = new ExtractiveCompressor({
        compressionRatio: 0.8,
      });

      const aggressiveResult = await aggressiveCompressor.compressChunks(mockChunks, mockAtoms);
      const conservativeResult = await conservativeCompressor.compressChunks(mockChunks, mockAtoms);

      // Aggressive compression should result in fewer tokens
      const aggressiveTokens = aggressiveResult.compressedChunks.reduce((sum, chunk) => sum + chunk.tokens, 0);
      const conservativeTokens = conservativeResult.compressedChunks.reduce((sum, chunk) => sum + chunk.tokens, 0);
      expect(aggressiveTokens).toBeLessThan(conservativeTokens);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when sidecar fails and fallback is disabled', async () => {
      const sidecarCompressor = new ExtractiveCompressor({
        sidecarUrl: 'http://localhost:8080',
        enableFallback: false,
      });

      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(sidecarCompressor.compressChunks(mockChunks, mockAtoms))
        .rejects.toThrow('Compression failed: Sidecar service failed and fallback is disabled');
    });

    it('should handle malformed chunks gracefully', async () => {
      const malformedChunks: Chunk[] = [
        {
          id: 'malformed',
          docId: 'doc1',
          text: '',
          tokens: 0,
          metadata: {},
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const result = await compressor.compressChunks(malformedChunks);
      expect(result.compressedChunks).toHaveLength(1);
      expect(result.compressedChunks[0].text).toBe('');
    });
  });

  describe('Health Check', () => {
    it('should check sidecar health when URL is configured', async () => {
      const sidecarCompressor = new ExtractiveCompressor({
        sidecarUrl: 'http://localhost:8080',
      });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      const isHealthy = await sidecarCompressor.checkSidecarHealth();
      expect(isHealthy).toBe(true);
      expect(fetch).toHaveBeenCalledWith('http://localhost:8080/health', expect.any(Object));
    });

    it('should return false when sidecar is unhealthy', async () => {
      const sidecarCompressor = new ExtractiveCompressor({
        sidecarUrl: 'http://localhost:8080',
      });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      const isHealthy = await sidecarCompressor.checkSidecarHealth();
      expect(isHealthy).toBe(false);
    });

    it('should return false when sidecar is unreachable', async () => {
      const sidecarCompressor = new ExtractiveCompressor({
        sidecarUrl: 'http://localhost:8080',
      });

      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const isHealthy = await sidecarCompressor.checkSidecarHealth();
      expect(isHealthy).toBe(false);
    });

    it('should return false when no sidecar URL is configured', async () => {
      const isHealthy = await compressor.checkSidecarHealth();
      expect(isHealthy).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long text', async () => {
      const longText = 'This is a very long text '.repeat(100);
      const longChunk: Chunk = {
        id: 'long',
        docId: 'doc1',
        text: longText,
        tokens: 2000,
        metadata: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const result = await compressor.compressChunks([longChunk]);
      expect(result.compressedChunks[0].tokens).toBeLessThanOrEqual(160);
    });

    it('should handle text with many entities', async () => {
      const manyEntities = ['entity1', 'entity2', 'entity3', 'entity4', 'entity5'];
      const textWithEntities = `This text contains ${manyEntities.join(' and ')} and other information.`;
      
      const chunkWithEntities: Chunk = {
        id: 'entities',
        docId: 'doc1',
        text: textWithEntities,
        tokens: 20,
        metadata: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const atomsWithEntities: Atom[] = manyEntities.map((entity, index) => ({
        id: `atom${index}`,
        chunkId: 'entities',
        type: 'ENT',
        text: entity,
        confidence: 0.9,
        metadata: {},
        provenance: { offset: index * 10, length: entity.length },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }));

      const result = await compressor.compressChunks([chunkWithEntities], atomsWithEntities);
      
      // All entities should be preserved
      for (const entity of manyEntities) {
        expect(result.preservedEntities).toContain(entity);
      }
    });

    it('should handle mixed content types', async () => {
      const mixedChunk: Chunk = {
        id: 'mixed',
        docId: 'doc1',
        text: 'The year 2024 has entity1 and entity2 with ID123 and more content.',
        tokens: 15,
        metadata: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const mixedAtoms: Atom[] = [
        {
          id: 'atom1',
          chunkId: 'mixed',
          type: 'ENT',
          text: 'entity1',
          confidence: 0.9,
          metadata: {},
          provenance: { offset: 20, length: 7 },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'atom2',
          chunkId: 'mixed',
          type: 'NUM',
          text: '2024',
          confidence: 0.95,
          metadata: {},
          provenance: { offset: 8, length: 4 },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'atom3',
          chunkId: 'mixed',
          type: 'ENT',
          text: 'ID123',
          confidence: 0.9,
          metadata: {},
          provenance: { offset: 35, length: 5 },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const result = await compressor.compressChunks([mixedChunk], mixedAtoms);
      
      // Check that different types are preserved
      expect(result.preservedEntities).toContain('entity1');
      expect(result.preservedEntities).toContain('ID123');
      expect(result.compressedChunks[0].text).toContain('2024');
    });
  });
});
