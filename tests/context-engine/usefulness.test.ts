/**
 * usefulness.test.ts
 * Unit tests for Usefulness 2.0 Ranking System
 */

import { 
  UsefulnessRanker, 
  UtilityFactors,
  UtilityWeights,
  RankingCandidate,
  RankingResult,
  RankingOptions
} from '../../src/context-engine/rank/usefulness.js';
import { Chunk, Atom, Summary, GraphNode } from '../../src/context-engine/types.js';

// Mock data for testing
const mockChunk: Chunk = {
  id: 'chunk1',
  docId: 'doc1',
  text: 'Machine learning is a subset of artificial intelligence that focuses on algorithms and statistical models.',
  tokens: 25,
  metadata: { source: 'arxiv.org', confidence: 0.9, timestamp: '2024-01-01T00:00:00Z' },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

const mockAtom: Atom = {
  id: 'atom1',
  chunkId: 'chunk1',
  text: 'Machine learning',
  type: 'ENT',
  confidence: 0.95,
  metadata: { source: 'ieee.org' },
  provenance: { offset: 0, length: 18 },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

const mockSummary: Summary = {
  id: 'summary1',
  chunkIds: ['chunk1', 'chunk2'],
  text: 'AI and machine learning fundamentals with practical applications',
  tokens: 15,
  metadata: { level: 1, confidence: 0.85, source: 'nature.com' },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

const mockGraphNode: GraphNode = {
  id: 'node1',
  type: 'CONCEPT',
  label: 'Artificial Intelligence',
  metadata: { centrality: 0.8, source: 'acm.org' }
};

const mockExistingEvidence: Array<Chunk | Atom | Summary | GraphNode> = [
  {
    id: 'existing1',
    docId: 'doc2',
    text: 'Machine learning is effective for solving complex problems.',
    tokens: 20,
    metadata: { source: 'springer.com', confidence: 0.8 },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  } as Chunk
];

describe('UsefulnessRanker', () => {
  let ranker: UsefulnessRanker;

  beforeEach(() => {
    ranker = new UsefulnessRanker();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with default weights', () => {
      const weights = ranker.getWeights();
      expect(weights.relevance).toBeCloseTo(0.25, 2);
      expect(weights.informationGain).toBeCloseTo(0.20, 2);
      expect(weights.trust).toBeCloseTo(0.20, 2);
      expect(weights.reusability).toBeCloseTo(0.15, 2);
      expect(weights.tokenCost).toBeCloseTo(0.10, 2);
      expect(weights.conflictRisk).toBeCloseTo(0.10, 2);
    });

    it('should accept custom weights', () => {
      const customWeights: Partial<UtilityWeights> = {
        relevance: 0.5,
        informationGain: 0.3,
      };
      
      const customRanker = new UsefulnessRanker(customWeights);
      const weights = customRanker.getWeights();
      
      expect(weights.relevance).toBeGreaterThan(0.4);
      expect(weights.informationGain).toBeGreaterThan(0.25);
    });

    it('should normalize weights to sum to 1.0', () => {
      const customWeights: Partial<UtilityWeights> = {
        relevance: 0.6,
        informationGain: 0.4,
      };
      
      const customRanker = new UsefulnessRanker(customWeights);
      const weights = customRanker.getWeights();
      
      const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 2);
    });
  });

  describe('Utility Calculation', () => {
    it('should calculate utility for chunk candidates', () => {
      const query = 'machine learning algorithms';
      const context = {
        existingEvidence: [],
        queryComplexity: 0.7,
      };

      const { utility, factors } = ranker.calculateUtility(mockChunk, query, context);
      
      expect(utility).toBeGreaterThan(0);
      expect(utility).toBeLessThanOrEqual(1);
      expect(factors.relevance).toBeGreaterThan(0);
      expect(factors.informationGain).toBe(1.0); // First evidence
      expect(factors.trust).toBeGreaterThan(0.5);
      expect(factors.reusability).toBeGreaterThan(0);
      expect(factors.tokenCost).toBeGreaterThan(0);
      expect(factors.conflictRisk).toBe(0); // No existing evidence
    });

    it('should calculate utility for atom candidates', () => {
      const query = 'machine learning';
      const context = {
        existingEvidence: [],
        queryComplexity: 0.5,
      };

      const { utility, factors } = ranker.calculateUtility(mockAtom, query, context);
      
      expect(utility).toBeGreaterThan(0);
      expect(factors.relevance).toBeGreaterThan(0.8); // High relevance for exact match
      expect(factors.informationGain).toBe(1.0);
    });

    it('should calculate utility for summary candidates', () => {
      const query = 'AI fundamentals';
      const context = {
        existingEvidence: [],
        queryComplexity: 0.6,
      };

      const { utility, factors } = ranker.calculateUtility(mockSummary, query, context);
      
      expect(utility).toBeGreaterThan(0);
      expect(factors.relevance).toBeGreaterThan(0);
      expect(factors.reusability).toBeGreaterThan(0);
    });

    it('should calculate utility for graph node candidates', () => {
      const query = 'artificial intelligence';
      const context = {
        existingEvidence: [],
        queryComplexity: 0.4,
      };

      const { utility, factors } = ranker.calculateUtility(mockGraphNode, query, context);
      
      expect(utility).toBeGreaterThan(0);
      expect(factors.relevance).toBeGreaterThan(0.8); // High relevance for exact match
    });

    it('should handle existing evidence in information gain calculation', () => {
      const query = 'machine learning';
      const context = {
        existingEvidence: mockExistingEvidence,
        queryComplexity: 0.6,
      };

      const { utility, factors } = ranker.calculateUtility(mockChunk, query, context);
      
      expect(factors.informationGain).toBeLessThan(1.0); // Some overlap with existing evidence
      expect(factors.conflictRisk).toBe(0); // No conflict with existing evidence
    });

    it('should detect conflicts with existing evidence', () => {
      const conflictingChunk: Chunk = {
        id: 'chunk-conflict',
        docId: 'doc-conflict',
        text: 'Machine learning is not effective for solving complex problems.',
        tokens: 20,
        metadata: { type: 'paragraph', importance: 0.9 },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const query = 'machine learning effectiveness';
      const context = {
        existingEvidence: mockExistingEvidence,
        queryComplexity: 0.6,
      };

      const { utility, factors } = ranker.calculateUtility(conflictingChunk, query, context);
      
      expect(factors.conflictRisk).toBeGreaterThan(0); // Should detect conflict
      expect(factors.conflictRisk).toBeCloseTo(0.6, 1); // Based on our algorithm
    });
  });

  describe('Relevance Calculation', () => {
    it('should score exact keyword matches highly', () => {
      const query = 'machine learning';
      const context = { existingEvidence: [], queryComplexity: 0.5 };
      
      const { factors } = ranker.calculateUtility(mockChunk, query, context);
      expect(factors.relevance).toBeGreaterThan(0.7);
    });

    it('should score partial keyword matches moderately', () => {
      const query = 'artificial intelligence';
      const context = { existingEvidence: [], queryComplexity: 0.5 };
      
      const { factors } = ranker.calculateUtility(mockChunk, query, context);
      expect(factors.relevance).toBeGreaterThan(0.3);
    });

    it('should score non-matching content low', () => {
      const query = 'quantum physics';
      const context = { existingEvidence: [], queryComplexity: 0.5 };
      
      const { factors } = ranker.calculateUtility(mockChunk, query, context);
      expect(factors.relevance).toBeLessThan(0.5);
    });
  });

  describe('Information Gain Calculation', () => {
    it('should give maximum information gain to first evidence', () => {
      const query = 'test query';
      const context = { existingEvidence: [], queryComplexity: 0.5 };
      
      const { factors } = ranker.calculateUtility(mockChunk, query, context);
      expect(factors.informationGain).toBe(1.0);
    });

    it('should reduce information gain for overlapping content', () => {
      const query = 'test query';
      const context = { 
        existingEvidence: [mockChunk], // Same content
        queryComplexity: 0.5 
      };
      
      const { factors } = ranker.calculateUtility(mockChunk, query, context);
      expect(factors.informationGain).toBe(0.0); // Complete overlap
    });

    it('should calculate partial information gain for mixed overlap', () => {
      const query = 'test query';
      const partialOverlapChunk: Chunk = {
        id: 'chunk2',
        docId: 'doc2',
        text: 'Machine learning algorithms and deep learning techniques',
        tokens: 25,
        metadata: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const context = { 
        existingEvidence: [mockChunk],
        queryComplexity: 0.5 
      };
      
      const { factors } = ranker.calculateUtility(partialOverlapChunk, query, context);
      expect(factors.informationGain).toBeGreaterThan(0.0);
      expect(factors.informationGain).toBeLessThan(1.0);
    });
  });

  describe('Trust Calculation', () => {
    it('should score high-quality sources highly', () => {
      const highQualityChunk: Chunk = {
        id: 'chunk3',
        docId: 'doc3',
        text: 'Research findings on neural networks',
        tokens: 20,
        metadata: { source: 'nature.com', confidence: 0.95, citations: ['ref1', 'ref2'] },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const query = 'neural networks';
      const context = { existingEvidence: [], queryComplexity: 0.5 };
      
      const { factors } = ranker.calculateUtility(highQualityChunk, query, context);
      expect(factors.trust).toBeGreaterThan(0.8);
    });

    it('should score medium-quality sources moderately', () => {
      const mediumQualityChunk: Chunk = {
        id: 'chunk4',
        docId: 'doc4',
        text: 'Introduction to machine learning',
        tokens: 20,
        metadata: { source: 'wikipedia.org', confidence: 0.7 },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const query = 'machine learning';
      const context = { existingEvidence: [], queryComplexity: 0.5 };
      
      const { factors } = ranker.calculateUtility(mediumQualityChunk, query, context);
      expect(factors.trust).toBeGreaterThan(0.6);
      expect(factors.trust).toBeLessThan(0.8);
    });

    it('should consider confidence scores in trust calculation', () => {
      const highConfidenceChunk: Chunk = {
        id: 'chunk5',
        docId: 'doc5',
        text: 'Verified machine learning facts',
        tokens: 20,
        metadata: { source: 'unknown.org', confidence: 0.99 },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const query = 'machine learning';
      const context = { existingEvidence: [], queryComplexity: 0.5 };
      
      const { factors } = ranker.calculateUtility(highConfidenceChunk, query, context);
      expect(factors.trust).toBeGreaterThan(0.6);
    });
  });

  describe('Reusability Calculation', () => {
    it('should score general content higher than specific content', () => {
      const generalChunk: Chunk = {
        id: 'chunk6',
        docId: 'doc6',
        text: 'Machine learning is a field of study that focuses on algorithms and models.',
        tokens: 20,
        metadata: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const specificChunk: Chunk = {
        id: 'chunk7',
        docId: 'doc7',
        text: 'The ResNet-50 architecture uses skip connections and batch normalization.',
        tokens: 20,
        metadata: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const query = 'test query';
      const context = { existingEvidence: [], queryComplexity: 0.5 };
      
      const generalResult = ranker.calculateUtility(generalChunk, query, context);
      const specificResult = ranker.calculateUtility(specificChunk, query, context);
      
      expect(generalResult.factors.reusability).toBeGreaterThan(specificResult.factors.reusability);
    });

    it('should score well-structured content higher', () => {
      const structuredChunk: Chunk = {
        id: 'chunk8',
        docId: 'doc8',
        text: '# Machine Learning\n\n- Supervised learning\n- Unsupervised learning\n- Reinforcement learning\n\n```python\nmodel.fit(X, y)\n```',
        tokens: 20,
        metadata: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const plainChunk: Chunk = {
        id: 'chunk9',
        docId: 'doc9',
        text: 'Machine learning supervised learning unsupervised learning reinforcement learning model.fit X y',
        tokens: 20,
        metadata: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const query = 'test query';
      const context = { existingEvidence: [], queryComplexity: 0.5 };
      
      const structuredResult = ranker.calculateUtility(structuredChunk, query, context);
      const plainResult = ranker.calculateUtility(plainChunk, query, context);
      
      expect(structuredResult.factors.reusability).toBeGreaterThan(plainResult.factors.reusability);
    });
  });

  describe('Token Cost Calculation', () => {
    it('should score shorter content higher for efficiency', () => {
      const shortChunk: Chunk = {
        id: 'chunk10',
        docId: 'doc10',
        text: 'ML is AI subset.',
        tokens: 10,
        metadata: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const longChunk: Chunk = {
        id: 'chunk11',
        docId: 'doc11',
        text: 'Machine learning is a subset of artificial intelligence that focuses on algorithms and statistical models.',
        tokens: 25,
        metadata: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const query = 'test query';
      const context = { existingEvidence: [], queryComplexity: 0.5 };
      
      const shortResult = ranker.calculateUtility(shortChunk, query, context);
      const longResult = ranker.calculateUtility(longChunk, query, context);
      
      expect(shortResult.factors.tokenCost).toBeGreaterThan(longResult.factors.tokenCost);
    });

    it('should consider information density', () => {
      const denseChunk: Chunk = {
        id: 'chunk12',
        docId: 'doc12',
        text: 'ML: AI subset. DL: ML subset. NLP: AI language processing.',
        tokens: 15,
        metadata: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const verboseChunk: Chunk = {
        id: 'chunk13',
        docId: 'doc13',
        text: 'Machine learning is a subset of artificial intelligence. Deep learning is a subset of machine learning. Natural language processing is a subset of artificial intelligence that focuses on language.',
        tokens: 20,
        metadata: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const query = 'test query';
      const context = { existingEvidence: [], queryComplexity: 0.5 };
      
      const denseResult = ranker.calculateUtility(denseChunk, query, context);
      const verboseResult = ranker.calculateUtility(verboseChunk, query, context);
      
      expect(denseResult.factors.tokenCost).toBeGreaterThan(verboseResult.factors.tokenCost);
    });
  });

  describe('Conflict Risk Calculation', () => {
    it('should detect direct contradictions', () => {
      const positiveChunk: Chunk = {
        id: 'chunk14',
        docId: 'doc14',
        text: 'Machine learning is effective for this task.',
        tokens: 15,
        metadata: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const negativeChunk: Chunk = {
        id: 'chunk15',
        docId: 'doc15',
        text: 'Machine learning is not effective for this task.',
        tokens: 15,
        metadata: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const query = 'test query';
      const context = { 
        existingEvidence: [positiveChunk],
        queryComplexity: 0.5 
      };
      
      const { factors } = ranker.calculateUtility(negativeChunk, query, context);
      expect(factors.conflictRisk).toBeGreaterThan(0.3);
    });

    it('should handle no conflicts gracefully', () => {
      const compatibleChunk: Chunk = {
        id: 'chunk16',
        docId: 'doc16',
        text: 'Machine learning can be combined with other techniques.',
        tokens: 15,
        metadata: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const query = 'test query';
      const context = { 
        existingEvidence: [mockChunk],
        queryComplexity: 0.5 
      };
      
      const { factors } = ranker.calculateUtility(compatibleChunk, query, context);
      expect(factors.conflictRisk).toBeLessThan(0.3);
    });
  });

  describe('Ranking Functionality', () => {
    it('should rank candidates by utility score', () => {
      const candidates = [mockChunk, mockAtom, mockSummary, mockGraphNode];
      const query = 'machine learning';
      const context = {
        existingEvidence: [],
        queryComplexity: 0.6,
      };

      const result = ranker.rankCandidates(candidates, query, context);
      
      expect(result.candidates).toHaveLength(4);
      expect(result.metadata.totalCandidates).toBe(4);
      expect(result.metadata.averageUtility).toBeGreaterThan(0);
      
      // Verify sorting (descending by utility)
      for (let i = 1; i < result.candidates.length; i++) {
        expect(result.candidates[i-1].utilityScore).toBeGreaterThanOrEqual(result.candidates[i].utilityScore);
      }
    });

    it('should respect minimum utility threshold', () => {
      const candidates = [mockChunk, mockAtom, mockSummary, mockGraphNode];
      const query = 'machine learning';
      const context = {
        existingEvidence: [],
        queryComplexity: 0.6,
      };
      const options: RankingOptions = {
        minUtilityThreshold: 0.5,
      };

      const result = ranker.rankCandidates(candidates, query, context, options);
      
      result.candidates.forEach(candidate => {
        expect(candidate.utilityScore).toBeGreaterThanOrEqual(0.5);
      });
    });

    it('should respect maximum candidates limit', () => {
      const candidates = [mockChunk, mockAtom, mockSummary, mockGraphNode];
      const query = 'machine learning';
      const context = {
        existingEvidence: [],
        queryComplexity: 0.6,
      };
      const options: RankingOptions = {
        maxCandidates: 2,
      };

      const result = ranker.rankCandidates(candidates, query, context, options);
      
      expect(result.candidates).toHaveLength(2);
      expect(result.metadata.totalCandidates).toBe(2);
    });

    it('should calculate factor contributions correctly', () => {
      const candidates = [mockChunk, mockAtom];
      const query = 'machine learning';
      const context = {
        existingEvidence: [],
        queryComplexity: 0.6,
      };

      const result = ranker.rankCandidates(candidates, query, context);
      
      expect(result.metadata.factorContributions).toBeDefined();
      expect(result.metadata.factorContributions.relevance).toBeGreaterThan(0);
      expect(result.metadata.factorContributions.informationGain).toBeGreaterThan(0);
      expect(result.metadata.factorContributions.trust).toBeGreaterThan(0);
      expect(result.metadata.factorContributions.reusability).toBeGreaterThan(0);
      expect(result.metadata.factorContributions.tokenCost).toBeGreaterThan(0);
      expect(result.metadata.factorContributions.conflictRisk).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Weight Management', () => {
    it('should update weights correctly', () => {
      const newWeights: Partial<UtilityWeights> = {
        relevance: 0.4,
        informationGain: 0.3,
      };
      
      ranker.updateWeights(newWeights);
      const weights = ranker.getWeights();
      
      expect(weights.relevance).toBeGreaterThan(0.3);
      expect(weights.informationGain).toBeGreaterThan(0.25);
    });

    it('should normalize weights after update', () => {
      const newWeights: Partial<UtilityWeights> = {
        relevance: 0.8,
        informationGain: 0.6,
      };
      
      ranker.updateWeights(newWeights);
      const weights = ranker.getWeights();
      
      const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 2);
    });

    it('should reset weights to defaults', () => {
      // First update with custom weights
      ranker.updateWeights({ relevance: 0.5, informationGain: 0.3 });
      
      // Then reset
      ranker.resetWeights();
      const weights = ranker.getWeights();
      
      expect(weights.relevance).toBeCloseTo(0.25, 2);
      expect(weights.informationGain).toBeCloseTo(0.20, 2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty candidate lists', () => {
      const candidates: Array<Chunk | Atom | Summary | GraphNode> = [];
      const query = 'test query';
      const context = {
        existingEvidence: [],
        queryComplexity: 0.5,
      };

      const result = ranker.rankCandidates(candidates, query, context);
      
      expect(result.candidates).toHaveLength(0);
      expect(result.metadata.totalCandidates).toBe(0);
      expect(result.metadata.averageUtility).toBe(0);
    });

    it('should handle candidates with minimal content', () => {
      const minimalChunk: Chunk = {
        id: 'minimal',
        docId: 'doc',
        text: 'a',
        tokens: 1,
        metadata: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const query = 'test';
      const context = { existingEvidence: [], queryComplexity: 0.5 };
      
      const { utility, factors } = ranker.calculateUtility(minimalChunk, query, context);
      
      expect(utility).toBeGreaterThan(0);
      expect(factors.relevance).toBeGreaterThan(0);
      expect(factors.tokenCost).toBeGreaterThan(0);
    });

    it('should handle very long content gracefully', () => {
      const longContent = 'a '.repeat(10000); // Very long content
      const longChunk: Chunk = {
        id: 'long',
        docId: 'doc',
        text: longContent,
        tokens: 10000,
        metadata: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      
      const query = 'test query';
      const context = { existingEvidence: [], queryComplexity: 0.5 };
      
      const { utility, factors } = ranker.calculateUtility(longChunk, query, context);
      
      expect(utility).toBeGreaterThan(0);
      expect(factors.tokenCost).toBeLessThan(0.5); // Should penalize very long content
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of candidates efficiently', () => {
      const largeCandidateList: Chunk[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `chunk${i}`,
        docId: `doc${i}`,
        text: `Content for chunk ${i} with some machine learning content`,
        tokens: 20,
        metadata: { source: 'test.org', confidence: 0.8 },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }));
      
      const query = 'machine learning';
      const context = {
        existingEvidence: [],
        queryComplexity: 0.6,
      };

      const startTime = Date.now();
      const result = ranker.rankCandidates(largeCandidateList, query, context);
      const endTime = Date.now();
      
      expect(result.candidates).toHaveLength(1000);
      expect(result.metadata.processingTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should track processing time accurately', () => {
      const candidates = [mockChunk, mockAtom, mockSummary];
      const query = 'test query';
      const context = {
        existingEvidence: [],
        queryComplexity: 0.5,
      };

      const result = ranker.rankCandidates(candidates, query, context);
      
      expect(result.metadata.processingTime).toBeGreaterThan(0);
      expect(result.metadata.processingTime).toBeLessThan(100); // Should be very fast for small datasets
    });
  });
});
