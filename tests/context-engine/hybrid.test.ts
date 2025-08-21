/**
 * hybrid.test.ts
 * Unit tests for HybridRetrievalSystem
 */

import { HybridRetrievalSystem, type RetrievalResult, type HybridRetrievalOptions } from '../../src/context-engine/retrieve/hybrid.js';
import type { Chunk, Document, GraphNode, Summary } from '../../src/context-engine/types.js';

// Mock data for testing
const mockDocuments: Document[] = [
  {
    id: 'doc1',
    title: 'Test Document 1',
    content: 'This is a test document about machine learning and artificial intelligence.',
    metadata: { author: 'Test Author', date: '2024-01-01' },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'doc2',
    title: 'Test Document 2',
    content: 'This document covers database systems and SQL optimization techniques.',
    metadata: { author: 'Test Author', date: '2024-01-02' },
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  }
];

const mockChunks: Chunk[] = [
  {
    id: 'chunk1',
    documentId: 'doc1',
    chunkIndex: 0,
    text: 'This is a test document about machine learning and artificial intelligence.',
    metadata: { type: 'paragraph', importance: 0.8 },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'chunk2',
    documentId: 'doc1',
    chunkIndex: 1,
    text: 'Machine learning algorithms include supervised learning, unsupervised learning, and reinforcement learning.',
    metadata: { type: 'paragraph', importance: 0.9 },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'chunk3',
    documentId: 'doc2',
    chunkIndex: 0,
    text: 'This document covers database systems and SQL optimization techniques.',
    metadata: { type: 'paragraph', importance: 0.7 },
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  },
  {
    id: 'chunk4',
    documentId: 'doc2',
    chunkIndex: 1,
    text: 'SQL optimization involves query planning, indexing strategies, and performance tuning.',
    metadata: { type: 'paragraph', importance: 0.8 },
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  }
];

const mockGraphNodes: GraphNode[] = [
  {
    id: 'node1',
    type: 'entity',
    label: 'machine learning',
    metadata: { category: 'technology', confidence: 0.9 },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'node2',
    type: 'entity',
    label: 'artificial intelligence',
    metadata: { category: 'technology', confidence: 0.8 },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

const mockSummaries: Summary[] = [
  {
    id: 'summary1',
    chunkIds: ['chunk1', 'chunk2'],
    text: 'Overview of machine learning and AI concepts',
    metadata: { importance: 0.9, level: 1 },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'summary2',
    chunkIds: ['chunk3', 'chunk4'],
    text: 'Database systems and SQL optimization overview',
    metadata: { importance: 0.8, level: 1 },
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  }
];

describe('HybridRetrievalSystem', () => {
  let retrievalSystem: HybridRetrievalSystem;
  let defaultOptions: HybridRetrievalOptions;

  beforeEach(() => {
    defaultOptions = {
      bm25Weight: 0.4,
      denseWeight: 0.6,
      rrfConstant: 60,
      maxResults: 100,
      enableHyDE: true,
      enableMultiQuery: true,
      strategy: 'EvidenceFirst'
    };
    
    retrievalSystem = new HybridRetrievalSystem(defaultOptions);
  });

  describe('Constructor', () => {
    it('should create system with default options', () => {
      expect(retrievalSystem).toBeInstanceOf(HybridRetrievalSystem);
      expect(retrievalSystem.getOptions()).toEqual(defaultOptions);
    });

    it('should create system with custom options', () => {
      const customOptions: Partial<HybridRetrievalOptions> = {
        bm25Weight: 0.6,
        denseWeight: 0.4,
        rrfConstant: 50,
        strategy: 'GraphFirst'
      };
      
      const customSystem = new HybridRetrievalSystem(customOptions);
      const options = customSystem.getOptions();
      
      expect(options.bm25Weight).toBe(0.6);
      expect(options.denseWeight).toBe(0.4);
      expect(options.rrfConstant).toBe(50);
      expect(options.strategy).toBe('GraphFirst');
    });
  });

  describe('Query Expansion', () => {
    it('should expand queries with variations when enabled', async () => {
      const query = 'How does machine learning work?';
      const results = await retrievalSystem.retrieve(query, mockDocuments, mockChunks);
      
      expect(results.length).toBeGreaterThan(0);
      // Should find chunks related to machine learning
      const mlChunks = results.filter(r => r.metadata.documentId === 'doc1');
      expect(mlChunks.length).toBeGreaterThan(0);
    });

    it('should handle queries without question marks', async () => {
      const query = 'machine learning algorithms';
      const results = await retrievalSystem.retrieve(query, mockDocuments, mockChunks);
      
      expect(results.length).toBeGreaterThan(0);
    });

    it('should generate HyDE queries when enabled', async () => {
      const query = 'How to implement machine learning?';
      const results = await retrievalSystem.retrieve(query, mockDocuments, mockChunks);
      
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('BM25 Retrieval', () => {
    it('should calculate BM25 scores correctly', async () => {
      const query = 'machine learning';
      const results = await retrievalSystem.retrieve(query, mockDocuments, mockChunks);
      
      // Should find chunks with machine learning content
      const mlResults = results.filter(r => r.source === 'bm25' && r.metadata.documentId === 'doc1');
      expect(mlResults.length).toBeGreaterThan(0);
      
      // Scores should be positive for relevant chunks
      for (const result of mlResults) {
        expect(result.score).toBeGreaterThan(0);
        expect(result.metadata.relevance).toBeGreaterThan(0);
      }
    });

    it('should handle queries with multiple terms', async () => {
      const query = 'machine learning artificial intelligence';
      const results = await retrievalSystem.retrieve(query, mockDocuments, mockChunks);
      
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle empty queries gracefully', async () => {
      const query = '';
      const results = await retrievalSystem.retrieve(query, mockDocuments, mockChunks);
      
      expect(results.length).toBe(0);
    });
  });

  describe('Dense Retrieval', () => {
    it('should calculate dense similarity scores', async () => {
      const query = 'machine learning algorithms';
      const results = await retrievalSystem.retrieve(query, mockDocuments, mockChunks);
      
      // Should find chunks with dense retrieval
      const denseResults = results.filter(r => r.source === 'dense');
      expect(denseResults.length).toBeGreaterThan(0);
      
      // Scores should be normalized
      for (const result of denseResults) {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      }
    });

    it('should cache embeddings for performance', async () => {
      const query = 'test query';
      await retrievalSystem.retrieve(query, mockDocuments, mockChunks);
      
      const cacheStats = retrievalSystem.getCacheStats();
      expect(cacheStats.embeddingSize).toBeGreaterThan(0);
    });
  });

  describe('Strategy Execution', () => {
    it('should execute EvidenceFirst strategy by default', async () => {
      const query = 'machine learning';
      const results = await retrievalSystem.retrieve(query, mockDocuments, mockChunks);
      
      expect(results.length).toBeGreaterThan(0);
      
      // Should have both BM25 and dense results
      const bm25Results = results.filter(r => r.source === 'bm25');
      const denseResults = results.filter(r => r.source === 'dense');
      
      expect(bm25Results.length).toBeGreaterThan(0);
      expect(denseResults.length).toBeGreaterThan(0);
    });

    it('should execute GraphFirst strategy when specified', async () => {
      const graphSystem = new HybridRetrievalSystem({ strategy: 'GraphFirst' });
      const query = 'machine learning';
      const results = await graphSystem.retrieve(query, mockDocuments, mockChunks, mockGraphNodes);
      
      expect(results.length).toBeGreaterThan(0);
      
      // Should have hybrid results from graph
      const hybridResults = results.filter(r => r.source === 'hybrid');
      expect(hybridResults.length).toBeGreaterThan(0);
    });

    it('should execute TreeFirst strategy when specified', async () => {
      const treeSystem = new HybridRetrievalSystem({ strategy: 'TreeFirst' });
      const query = 'machine learning';
      const results = await treeSystem.retrieve(query, mockDocuments, mockChunks, undefined, mockSummaries);
      
      expect(results.length).toBeGreaterThan(0);
      
      // Should have hybrid results from tree
      const hybridResults = results.filter(r => r.source === 'hybrid');
      expect(hybridResults.length).toBeGreaterThan(0);
    });
  });

  describe('RRF Fusion', () => {
    it('should apply RRF fusion correctly', async () => {
      const query = 'machine learning';
      const results = await retrievalSystem.retrieve(query, mockDocuments, mockChunks);
      
      expect(results.length).toBeGreaterThan(0);
      
      // Results should be sorted by score
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should respect maxResults limit', async () => {
      const limitedSystem = new HybridRetrievalSystem({ maxResults: 2 });
      const query = 'machine learning';
      const results = await limitedSystem.retrieve(query, mockDocuments, mockChunks);
      
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Graph-Based Retrieval', () => {
    it('should retrieve from graph nodes', async () => {
      const query = 'machine learning';
      const results = await retrievalSystem.retrieve(query, mockDocuments, mockChunks, mockGraphNodes);
      
      expect(results.length).toBeGreaterThan(0);
      
      // Should find chunks containing graph node labels
      const graphResults = results.filter(r => 
        r.text.toLowerCase().includes('machine learning') ||
        r.text.toLowerCase().includes('artificial intelligence')
      );
      expect(graphResults.length).toBeGreaterThan(0);
    });

    it('should calculate graph relevance scores', async () => {
      const query = 'machine learning';
      const results = await retrievalSystem.retrieve(query, mockDocuments, mockChunks, mockGraphNodes);
      
      for (const result of results) {
        expect(result.metadata.relevance).toBeGreaterThan(0);
        expect(result.metadata.confidence).toBeGreaterThan(0);
        expect(result.metadata.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Tree-Based Retrieval', () => {
    it('should retrieve from RAPTOR summaries', async () => {
      const query = 'machine learning';
      const results = await retrievalSystem.retrieve(query, mockDocuments, mockChunks, undefined, mockSummaries);
      
      expect(results.length).toBeGreaterThan(0);
      
      // Should find chunks that are part of summaries
      const summaryResults = results.filter(r => 
        mockSummaries.some(summary => summary.chunkIds.includes(r.chunkId))
      );
      expect(summaryResults.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle retrieval errors gracefully', async () => {
      // Mock a scenario that might cause an error
      const invalidChunks = [
        {
          ...mockChunks[0],
          text: undefined as any // Invalid text
        }
      ];
      
      const query = 'test query';
      await expect(
        retrievalSystem.retrieve(query, mockDocuments, invalidChunks)
      ).rejects.toThrow('Hybrid retrieval failed');
    });

    it('should handle empty document/chunk arrays', async () => {
      const query = 'test query';
      const results = await retrievalSystem.retrieve(query, [], []);
      
      expect(results.length).toBe(0);
    });
  });

  describe('Cache Management', () => {
    it('should clear caches when requested', () => {
      // First, populate cache
      retrievalSystem.retrieve('test query', mockDocuments, mockChunks);
      
      const initialStats = retrievalSystem.getCacheStats();
      expect(initialStats.embeddingSize).toBeGreaterThan(0);
      
      // Clear cache
      retrievalSystem.clearCaches();
      
      const clearedStats = retrievalSystem.getCacheStats();
      expect(clearedStats.embeddingSize).toBe(0);
      expect(clearedStats.bm25Size).toBe(0);
    });

    it('should provide cache statistics', () => {
      const stats = retrievalSystem.getCacheStats();
      
      expect(stats).toHaveProperty('embeddingSize');
      expect(stats).toHaveProperty('bm25Size');
      expect(typeof stats.embeddingSize).toBe('number');
      expect(typeof stats.bm25Size).toBe('number');
    });
  });

  describe('Options Management', () => {
    it('should update options correctly', () => {
      const newOptions = {
        bm25Weight: 0.8,
        denseWeight: 0.2,
        rrfConstant: 40
      };
      
      retrievalSystem.updateOptions(newOptions);
      const updatedOptions = retrievalSystem.getOptions();
      
      expect(updatedOptions.bm25Weight).toBe(0.8);
      expect(updatedOptions.denseWeight).toBe(0.2);
      expect(updatedOptions.rrfConstant).toBe(40);
    });

    it('should preserve existing options when updating', () => {
      const originalOptions = retrievalSystem.getOptions();
      const newOptions = { maxResults: 50 };
      
      retrievalSystem.updateOptions(newOptions);
      const updatedOptions = retrievalSystem.getOptions();
      
      // Should preserve other options
      expect(updatedOptions.bm25Weight).toBe(originalOptions.bm25Weight);
      expect(updatedOptions.denseWeight).toBe(originalOptions.denseWeight);
      expect(updatedOptions.rrfConstant).toBe(originalOptions.rrfConstant);
      
      // Should update specified option
      expect(updatedOptions.maxResults).toBe(50);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of chunks efficiently', async () => {
      // Create many chunks
      const manyChunks: Chunk[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `chunk${i}`,
        documentId: `doc${Math.floor(i / 100)}`,
        chunkIndex: i % 100,
        text: `This is chunk ${i} with some content about machine learning and AI.`,
        metadata: { type: 'paragraph', importance: 0.5 },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }));
      
      const query = 'machine learning';
      const startTime = Date.now();
      const results = await retrievalSystem.retrieve(query, mockDocuments, manyChunks);
      const endTime = Date.now();
      
      expect(results.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should maintain performance with repeated queries', async () => {
      const query = 'machine learning';
      
      // First query
      const startTime1 = Date.now();
      const results1 = await retrievalSystem.retrieve(query, mockDocuments, mockChunks);
      const endTime1 = Date.now();
      const time1 = endTime1 - startTime1;
      
      // Second query (should be faster due to caching)
      const startTime2 = Date.now();
      const results2 = await retrievalSystem.retrieve(query, mockDocuments, mockChunks);
      const endTime2 = Date.now();
      const time2 = endTime2 - startTime2;
      
      expect(results1.length).toBe(results2.length);
      expect(time2).toBeLessThanOrEqual(time1); // Second query should not be slower
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long queries', async () => {
      const longQuery = 'a '.repeat(1000) + 'machine learning';
      const results = await retrievalSystem.retrieve(longQuery, mockDocuments, mockChunks);
      
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle queries with special characters', async () => {
      const specialQuery = 'machine-learning & AI (artificial intelligence)';
      const results = await retrievalSystem.retrieve(specialQuery, mockDocuments, mockChunks);
      
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle queries with numbers', async () => {
      const numericQuery = 'machine learning 2024 version 2.0';
      const results = await retrievalSystem.retrieve(numericQuery, mockDocuments, mockChunks);
      
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
