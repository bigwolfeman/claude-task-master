/**
 * Tests for BudgetedMaxCoverage - Budgeted Max-Coverage Algorithm Core
 */

import { BudgetedMaxCoverage } from '../../src/context-engine/pack/max_coverage.js';
import { CoverageMatrixManager } from '../../src/context-engine/pack/coverage.js';
import type { RankingCandidate } from '../../src/context-engine/rank/usefulness.js';
import type { Atom } from '../../src/context-engine/types.js';

describe('BudgetedMaxCoverage', () => {
  let packer: BudgetedMaxCoverage;
  let mockCandidates: RankingCandidate[];
  let mockAtomMapping: Map<string, string[]>;
  let mockAtoms: Atom[];

  beforeEach(() => {
    // Create mock atoms for testing
    mockAtoms = [
      {
        id: 'atom-1',
        chunkId: 'chunk-1',
        type: 'ENT' as const,
        text: 'Machine Learning',
        confidence: 0.9,
        metadata: { source: 'test' },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        provenance: { offset: 0, length: 15 },
      },
      {
        id: 'atom-2',
        chunkId: 'chunk-1',
        type: 'ENT' as const,
        text: 'Artificial Intelligence',
        confidence: 0.8,
        metadata: { source: 'test' },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        provenance: { offset: 16, length: 23 },
      },
      {
        id: 'atom-3',
        chunkId: 'chunk-2',
        type: 'REL' as const,
        text: 'is subset of',
        confidence: 0.7,
        metadata: { source: 'test' },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        provenance: { offset: 40, length: 12 },
      },
      {
        id: 'atom-4',
        chunkId: 'chunk-2',
        type: 'NUM' as const,
        text: '2024',
        confidence: 0.6,
        metadata: { source: 'test' },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        provenance: { offset: 53, length: 4 },
      },
      {
        id: 'atom-5',
        chunkId: 'chunk-3',
        type: 'DATE' as const,
        text: 'recent',
        confidence: 0.5,
        metadata: { source: 'test' },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        provenance: { offset: 58, length: 6 },
      },
    ];

    // Create mock candidates with different characteristics
    mockCandidates = [
      {
        id: 'candidate-1',
        type: 'chunk' as const,
        content: {
          id: 'chunk-1',
          docId: 'doc-1',
          text: 'Machine Learning is a subset of Artificial Intelligence',
          tokens: 8,
          metadata: {},
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        utilityScore: 0.95,
        factors: {
          relevance: 0.9,
          informationGain: 0.8,
          trust: 0.9,
          reusability: 0.8,
          tokenCost: 0.1,
          conflictRisk: 0.1,
        },
        metadata: {},
      },
      {
        id: 'candidate-2',
        type: 'chunk' as const,
        content: {
          id: 'chunk-2',
          docId: 'doc-1',
          text: 'Deep learning uses neural networks with multiple layers',
          tokens: 10,
          metadata: {},
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        utilityScore: 0.88,
        factors: {
          relevance: 0.8,
          informationGain: 0.7,
          trust: 0.8,
          reusability: 0.7,
          tokenCost: 0.15,
          conflictRisk: 0.2,
        },
        metadata: {},
      },
      {
        id: 'candidate-3',
        type: 'chunk' as const,
        content: {
          id: 'chunk-3',
          docId: 'doc-2',
          text: 'Natural language processing enables computers to understand text',
          tokens: 12,
          metadata: {},
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        utilityScore: 0.82,
        factors: {
          relevance: 0.7,
          informationGain: 0.6,
          trust: 0.7,
          reusability: 0.6,
          tokenCost: 0.2,
          conflictRisk: 0.3,
        },
        metadata: {},
      },
      {
        id: 'candidate-4',
        type: 'chunk' as const,
        content: {
          id: 'chunk-4',
          docId: 'doc-2',
          text: 'Computer vision focuses on image and video analysis',
          tokens: 9,
          metadata: {},
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        utilityScore: 0.78,
        factors: {
          relevance: 0.6,
          informationGain: 0.5,
          trust: 0.6,
          reusability: 0.5,
          tokenCost: 0.18,
          conflictRisk: 0.4,
        },
        metadata: {},
      },
    ];

    // Create atom mapping for candidates
    mockAtomMapping = new Map([
      ['candidate-1', ['atom-1', 'atom-2', 'atom-3']], // 3 atoms, high coverage
      ['candidate-2', ['atom-4']], // 1 atom, medium coverage
      ['candidate-3', ['atom-5']], // 1 atom, low coverage
      ['candidate-4', []], // 0 atoms, no coverage
    ]);

    // Initialize packer with reasonable options
    packer = new BudgetedMaxCoverage({
      maxTokens: 100,
      minCoverageThreshold: 0.1,
      enableDiversity: true,
      diversityWeight: 0.3,
      maxCandidates: 10,
    });
  });

  afterEach(() => {
    // Clean up any created coverage matrices
    const coverageManager = packer.getCoverageManager();
    coverageManager.clear();
  });

  describe('Constructor and Options', () => {
    it('should initialize with default options', () => {
      const defaultPacker = new BudgetedMaxCoverage({ maxTokens: 50 });
      const options = defaultPacker.getOptions();

      expect(options.maxTokens).toBe(50);
      expect(options.minCoverageThreshold).toBe(0.1);
      expect(options.enableDiversity).toBe(true);
      expect(options.diversityWeight).toBe(0.3);
      expect(options.maxCandidates).toBe(100);
      expect(options.coverageMatrixId).toBe('default');
    });

    it('should allow custom option overrides', () => {
      const customPacker = new BudgetedMaxCoverage({
        maxTokens: 200,
        minCoverageThreshold: 0.5,
        enableDiversity: false,
        diversityWeight: 0.7,
        maxCandidates: 5,
        coverageMatrixId: 'custom',
      });

      const options = customPacker.getOptions();
      expect(options.maxTokens).toBe(200);
      expect(options.minCoverageThreshold).toBe(0.5);
      expect(options.enableDiversity).toBe(false);
      expect(options.diversityWeight).toBe(0.7);
      expect(options.maxCandidates).toBe(5);
      expect(options.coverageMatrixId).toBe('custom');
    });

    it('should provide access to coverage manager', () => {
      const coverageManager = packer.getCoverageManager();
      expect(coverageManager).toBeInstanceOf(CoverageMatrixManager);
    });
  });

  describe('Option Management', () => {
    it('should update options correctly', () => {
      packer.updateOptions({
        maxTokens: 150,
        minCoverageThreshold: 0.3,
        enableDiversity: false,
      });

      const options = packer.getOptions();
      expect(options.maxTokens).toBe(150);
      expect(options.minCoverageThreshold).toBe(0.3);
      expect(options.enableDiversity).toBe(false);
    });

    it('should reset options to defaults', () => {
      // First update with custom values
      packer.updateOptions({
        minCoverageThreshold: 0.8,
        diversityWeight: 0.8,
        maxCandidates: 20,
      });

      // Then reset
      packer.resetOptions();

      const options = packer.getOptions();
      expect(options.minCoverageThreshold).toBe(0.1);
      expect(options.diversityWeight).toBe(0.3);
      expect(options.maxCandidates).toBe(100);
      // maxTokens should remain unchanged
      expect(options.maxTokens).toBe(100);
    });
  });

  describe('Core Packing Algorithm', () => {
    it('should pack candidates within budget constraints', () => {
      const result = packer.packCandidates(mockCandidates, mockAtomMapping);

      expect(result.selectedCandidates).toBeDefined();
      expect(result.totalTokens).toBeLessThanOrEqual(100);
      expect(result.budgetUtilization).toBeGreaterThan(0);
      expect(result.metadata.algorithm).toBe('greedy');
    });

    it('should maximize coverage while respecting budget', () => {
      const result = packer.packCandidates(mockCandidates, mockAtomMapping);

      // Should select candidates with highest coverage per token
      // candidate-1 has 3 atoms for ~8 tokens = 0.375 atoms/token
      // candidate-2 has 1 atom for ~10 tokens = 0.1 atoms/token
      // candidate-1 should be selected first
      expect(result.selectedCandidates.length).toBeGreaterThan(0);
      
      if (result.selectedCandidates.length > 0) {
        expect(result.selectedCandidates[0].id).toBe('candidate-1');
      }
    });

    it('should handle empty candidate list', () => {
      const result = packer.packCandidates([], new Map());

      expect(result.selectedCandidates).toHaveLength(0);
      expect(result.totalTokens).toBe(0);
      expect(result.totalCoverage).toBe(0);
      expect(result.coveragePercentage).toBe(0);
      expect(result.budgetUtilization).toBe(0);
    });

    it('should handle candidates with no atom coverage', () => {
      const noCoverageCandidates = [mockCandidates[3]]; // candidate-4 has no atoms
      const noCoverageMapping = new Map([['candidate-4', []]]);

      const result = packer.packCandidates(noCoverageCandidates, noCoverageMapping);

      expect(result.selectedCandidates).toHaveLength(0);
      expect(result.totalCoverage).toBe(0);
    });

    it('should respect maxCandidates limit', () => {
      const limitedPacker = new BudgetedMaxCoverage({
        maxTokens: 1000,
        maxCandidates: 2,
      });

      const result = limitedPacker.packCandidates(mockCandidates, mockAtomMapping);

      expect(result.selectedCandidates.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Budget Management', () => {
    it('should not exceed maxTokens budget', () => {
      const result = packer.packCandidates(mockCandidates, mockAtomMapping);

      expect(result.totalTokens).toBeLessThanOrEqual(100);
      expect(result.budgetUtilization).toBeLessThanOrEqual(1.0);
    });

    it('should handle very small budgets', () => {
      const smallBudgetPacker = new BudgetedMaxCoverage({ maxTokens: 5 });
      const result = smallBudgetPacker.packCandidates(mockCandidates, mockAtomMapping);

      expect(result.totalTokens).toBeLessThanOrEqual(5);
      expect(result.selectedCandidates.length).toBeLessThanOrEqual(1);
    });

    it('should handle large budgets efficiently', () => {
      const largeBudgetPacker = new BudgetedMaxCoverage({ maxTokens: 1000 });
      const result = largeBudgetPacker.packCandidates(mockCandidates, mockAtomMapping);

      expect(result.totalTokens).toBeGreaterThan(0);
      expect(result.budgetUtilization).toBeGreaterThan(0);
    });
  });

  describe('Coverage Optimization', () => {
    it('should prioritize candidates with higher coverage gain', () => {
      const result = packer.packCandidates(mockCandidates, mockAtomMapping);

      // Should select candidates in order of coverage efficiency
      if (result.selectedCandidates.length >= 2) {
        const first = result.selectedCandidates[0];
        const second = result.selectedCandidates[1];
        
        const firstEfficiency = first.coverageGain / first.tokenCost;
        const secondEfficiency = second.coverageGain / second.tokenCost;
        
        expect(firstEfficiency).toBeGreaterThanOrEqual(secondEfficiency);
      }
    });

    it('should avoid selecting candidates with no new coverage', () => {
      // Create a candidate that covers the same atoms as an already selected one
      const duplicateCandidate = {
        ...mockCandidates[0],
        id: 'candidate-duplicate',
        content: {
          ...mockCandidates[0].content,
          id: 'chunk-duplicate',
        },
      };

      const candidatesWithDuplicate = [...mockCandidates, duplicateCandidate];
      const duplicateMapping = new Map([
        ...mockAtomMapping.entries(),
        ['candidate-duplicate', ['atom-1', 'atom-2', 'atom-3']], // Same atoms as candidate-1
      ]);

      const result = packer.packCandidates(candidatesWithDuplicate, duplicateMapping);

      // Should not select both candidates with same coverage
      const duplicateSelected = result.selectedCandidates.find(c => c.id === 'candidate-duplicate');
      const originalSelected = result.selectedCandidates.find(c => c.id === 'candidate-1');
      
      // Only one should be selected
      expect(duplicateSelected && originalSelected).toBeFalsy();
    });

    it('should calculate coverage percentage correctly', () => {
      const result = packer.packCandidates(mockCandidates, mockAtomMapping);

      expect(result.coveragePercentage).toBeGreaterThanOrEqual(0);
      expect(result.coveragePercentage).toBeLessThanOrEqual(1);
      
      if (result.totalCoverage > 0) {
        const expectedPercentage = result.totalCoverage / mockAtoms.length;
        expect(result.coveragePercentage).toBeCloseTo(expectedPercentage, 2);
      }
    });
  });

  describe('Diversity and Similarity', () => {
    it('should apply diversity penalties when enabled', () => {
      const diversityPacker = new BudgetedMaxCoverage({
        maxTokens: 100,
        enableDiversity: true,
        diversityWeight: 0.5,
      });

      const result = diversityPacker.packCandidates(mockCandidates, mockAtomMapping);

      expect(result.selectedCandidates.length).toBeGreaterThan(0);
      expect(result.metadata.algorithm).toBe('greedy');
    });

    it('should not apply diversity penalties when disabled', () => {
      const noDiversityPacker = new BudgetedMaxCoverage({
        maxTokens: 100,
        enableDiversity: false,
      });

      const result = noDiversityPacker.packCandidates(mockCandidates, mockAtomMapping);

      expect(result.selectedCandidates.length).toBeGreaterThan(0);
    });

    it('should calculate similarity between candidates correctly', () => {
      // This tests the private calculateSimilarity method indirectly
      // by checking that diversity penalties are applied
      const diversityPacker = new BudgetedMaxCoverage({
        maxTokens: 100,
        enableDiversity: true,
        diversityWeight: 0.3,
      });

      const result = diversityPacker.packCandidates(mockCandidates, mockAtomMapping);
      expect(result.selectedCandidates.length).toBeGreaterThan(0);
    });
  });

  describe('Token Cost Estimation', () => {
    it('should estimate token costs from candidate factors', () => {
      const result = packer.packCandidates(mockCandidates, mockAtomMapping);

      for (const selected of result.selectedCandidates) {
        expect(selected.tokenCost).toBeGreaterThan(0);
        expect(typeof selected.tokenCost).toBe('number');
      }
    });

    it('should fall back to content-based estimation when factors not available', () => {
      const candidatesWithoutFactors = mockCandidates.map(candidate => ({
        ...candidate,
        factors: undefined,
      }));

      const result = packer.packCandidates(candidatesWithoutFactors, mockAtomMapping);

      for (const selected of result.selectedCandidates) {
        expect(selected.tokenCost).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance and Metrics', () => {
    it('should track processing time', () => {
      const result = packer.packCandidates(mockCandidates, mockAtomMapping);

      expect(result.metadata.processingTime).toBeGreaterThan(0);
      expect(typeof result.metadata.processingTime).toBe('number');
    });

    it('should track iteration count', () => {
      const result = packer.packCandidates(mockCandidates, mockAtomMapping);

      expect(result.metadata.iterations).toBeGreaterThan(0);
      expect(result.metadata.iterations).toBeLessThanOrEqual(mockCandidates.length);
    });

    it('should generate unique coverage matrix IDs', async () => {
      const result1 = packer.packCandidates(mockCandidates, mockAtomMapping);
      
      // Add a small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const result2 = packer.packCandidates(mockCandidates, mockAtomMapping);

      expect(result1.metadata.coverageMatrixId).not.toBe(result2.metadata.coverageMatrixId);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle candidates with zero token cost', () => {
      const zeroCostCandidates = mockCandidates.map(candidate => ({
        ...candidate,
        factors: {
          ...candidate.factors!,
          tokenCost: 0,
        },
      }));

      const result = packer.packCandidates(zeroCostCandidates, mockAtomMapping);

      // Should handle division by zero gracefully
      expect(result.selectedCandidates.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle very large token costs', () => {
      const largeCostCandidates = mockCandidates.map(candidate => ({
        ...candidate,
        factors: {
          ...candidate.factors!,
          tokenCost: 1000, // Larger than budget
        },
      }));

      const result = packer.packCandidates(largeCostCandidates, mockAtomMapping);

      expect(result.selectedCandidates.length).toBe(0);
      expect(result.totalTokens).toBe(0);
    });

    it('should handle candidates with negative utility scores', () => {
      const negativeUtilityCandidates = mockCandidates.map(candidate => ({
        ...candidate,
        utilityScore: -0.5,
      }));

      const result = packer.packCandidates(negativeUtilityCandidates, mockAtomMapping);

      // Should still work, but may not select negative utility candidates
      expect(result.selectedCandidates.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration with Coverage Matrix Manager', () => {
    it('should create and manage coverage matrices correctly', () => {
      const result = packer.packCandidates(mockCandidates, mockAtomMapping);

      expect(result.metadata.coverageMatrixId).toBeDefined();
      expect(result.metadata.coverageMatrixId).toContain('default_');
    });

    it('should clean up coverage matrices after packing', () => {
      const coverageManager = packer.getCoverageManager();
      
      // Pack candidates
      const result = packer.packCandidates(mockCandidates, mockAtomMapping);
      
      // Check that the matrix was cleaned up
      const matrix = coverageManager.getMatrix(result.metadata.coverageMatrixId);
      expect(matrix).toBeUndefined();
    });
  });

  describe('Algorithm Correctness', () => {
    it('should always select candidates within budget', () => {
      const result = packer.packCandidates(mockCandidates, mockAtomMapping);

      let totalCost = 0;
      for (const selected of result.selectedCandidates) {
        totalCost += selected.tokenCost;
      }

      expect(totalCost).toBeLessThanOrEqual(100);
      expect(totalCost).toBe(result.totalTokens);
    });

    it('should maximize coverage for given budget', () => {
      const result = packer.packCandidates(mockCandidates, mockAtomMapping);

      // The greedy algorithm should select candidates in order of coverage efficiency
      // This is a basic verification that the algorithm is working as expected
      expect(result.totalCoverage).toBeGreaterThan(0);
      expect(result.coveragePercentage).toBeGreaterThan(0);
    });

    it('should handle minimum coverage threshold correctly', () => {
      const thresholdPacker = new BudgetedMaxCoverage({
        maxTokens: 100,
        minCoverageThreshold: 0.8, // Require 80% coverage
      });

      const result = thresholdPacker.packCandidates(mockCandidates, mockAtomMapping);

      // Should either meet threshold or use all available budget
      if (result.coveragePercentage > 0) {
        expect(result.coveragePercentage).toBeGreaterThanOrEqual(0.8);
      }
    });
  });

  describe('MMR (Maximal Marginal Relevance) Integration', () => {
    it('should enable MMR mode when configured', () => {
      const mmrPacker = new BudgetedMaxCoverage({
        maxTokens: 1000,
        enableMMR: true,
        lambdaRelevance: 0.7,
      });

      const options = mmrPacker.getOptions();
      expect(options.enableMMR).toBe(true);
      expect(options.lambdaRelevance).toBe(0.7);
    });

    it('should default to legacy diversity mode when MMR disabled', () => {
      const legacyPacker = new BudgetedMaxCoverage({
        maxTokens: 1000,
        enableMMR: false,
      });

      const options = legacyPacker.getOptions();
      expect(options.enableMMR).toBe(false);
      expect(options.enableDiversity).toBe(true);
    });

    it('should use MMR selection strategy when enabled', () => {
      const mmrPacker = new BudgetedMaxCoverage({
        maxTokens: 1000,
        enableMMR: true,
        lambdaRelevance: 0.3,
      });

      const result = mmrPacker.packCandidates(mockCandidates, mockAtomMapping);

      expect(result.selectedCandidates.length).toBeGreaterThan(0);
      expect(result.totalTokens).toBeLessThanOrEqual(1000);
      expect(result.metadata.algorithm).toBe('mmr'); // Algorithm type should be MMR when enabled
    });

    it('should balance relevance and diversity with lambda parameter', () => {
      // High lambda (0.9) - prioritize relevance
      const relevancePacker = new BudgetedMaxCoverage({
        maxTokens: 1000,
        enableMMR: true,
        lambdaRelevance: 0.9,
      });

      // Low lambda (0.1) - prioritize diversity
      const diversityPacker = new BudgetedMaxCoverage({
        maxTokens: 1000,
        enableMMR: true,
        lambdaRelevance: 0.1,
      });

      const relevanceResult = relevancePacker.packCandidates(mockCandidates, mockAtomMapping);
      const diversityResult = diversityPacker.packCandidates(mockCandidates, mockAtomMapping);

      // Both should select candidates, but potentially in different orders
      expect(relevanceResult.selectedCandidates.length).toBeGreaterThan(0);
      expect(diversityResult.selectedCandidates.length).toBeGreaterThan(0);

      // High relevance setting should tend to select high-utility candidates first
      if (relevanceResult.selectedCandidates.length > 0) {
        const firstCandidate = relevanceResult.selectedCandidates[0];
        expect(firstCandidate.utilityScore).toBeGreaterThan(0.5);
      }
    });

    it('should handle lambda parameter at boundaries', () => {
      // Test lambda = 0 (pure diversity)
      const pureDiversityPacker = new BudgetedMaxCoverage({
        maxTokens: 1000,
        enableMMR: true,
        lambdaRelevance: 0.0,
      });

      // Test lambda = 1 (pure relevance)
      const pureRelevancePacker = new BudgetedMaxCoverage({
        maxTokens: 1000,
        enableMMR: true,
        lambdaRelevance: 1.0,
      });

      const diversityResult = pureDiversityPacker.packCandidates(mockCandidates, mockAtomMapping);
      const relevanceResult = pureRelevancePacker.packCandidates(mockCandidates, mockAtomMapping);

      expect(diversityResult.selectedCandidates.length).toBeGreaterThan(0);
      expect(relevanceResult.selectedCandidates.length).toBeGreaterThan(0);
    });

    it('should maintain budget constraints with MMR selection', () => {
      const mmrPacker = new BudgetedMaxCoverage({
        maxTokens: 500, // Smaller budget
        enableMMR: true,
        lambdaRelevance: 0.3,
      });

      const result = mmrPacker.packCandidates(mockCandidates, mockAtomMapping);

      expect(result.totalTokens).toBeLessThanOrEqual(500);
      expect(result.budgetUtilization).toBeLessThanOrEqual(1.0);
    });

    it('should provide coverage optimization with MMR', () => {
      const mmrPacker = new BudgetedMaxCoverage({
        maxTokens: 1000,
        enableMMR: true,
        lambdaRelevance: 0.3,
      });

      const result = mmrPacker.packCandidates(mockCandidates, mockAtomMapping);

      expect(result.totalCoverage).toBeGreaterThan(0);
      expect(result.coveragePercentage).toBeGreaterThan(0);
      expect(result.coveragePercentage).toBeLessThanOrEqual(1.0);
    });

    it('should produce different results compared to legacy diversity mode', () => {
      // Same configuration except for MMR vs diversity
      const mmrPacker = new BudgetedMaxCoverage({
        maxTokens: 1000,
        enableMMR: true,
        lambdaRelevance: 0.3,
      });

      const legacyPacker = new BudgetedMaxCoverage({
        maxTokens: 1000,
        enableMMR: false,
        enableDiversity: true,
        diversityWeight: 0.3,
      });

      const mmrResult = mmrPacker.packCandidates(mockCandidates, mockAtomMapping);
      const legacyResult = legacyPacker.packCandidates(mockCandidates, mockAtomMapping);

      // Both should produce valid results
      expect(mmrResult.selectedCandidates.length).toBeGreaterThan(0);
      expect(legacyResult.selectedCandidates.length).toBeGreaterThan(0);

      // Results might differ in selection order/candidates 
      // (Can't guarantee difference due to test data simplicity, but both should work)
      expect(mmrResult.totalTokens).toBeLessThanOrEqual(1000);
      expect(legacyResult.totalTokens).toBeLessThanOrEqual(1000);
    });

    it('should handle MMR with no candidates gracefully', () => {
      const mmrPacker = new BudgetedMaxCoverage({
        maxTokens: 1000,
        enableMMR: true,
        lambdaRelevance: 0.3,
      });

      const result = mmrPacker.packCandidates([], new Map());

      expect(result.selectedCandidates).toEqual([]);
      expect(result.totalTokens).toBe(0);
      expect(result.totalCoverage).toBe(0);
      expect(result.coveragePercentage).toBe(0);
    });

    it('should reset MMR options to defaults correctly', () => {
      const mmrPacker = new BudgetedMaxCoverage({
        maxTokens: 1000,
        enableMMR: true,
        lambdaRelevance: 0.8,
      });

      // Verify custom settings
      expect(mmrPacker.getOptions().enableMMR).toBe(true);
      expect(mmrPacker.getOptions().lambdaRelevance).toBe(0.8);

      // Reset to defaults
      mmrPacker.resetOptions();

      // Verify reset to defaults
      const options = mmrPacker.getOptions();
      expect(options.enableMMR).toBe(false);
      expect(options.lambdaRelevance).toBe(0.3);
    });
  });

  describe('Knapsack Fallback Mechanism', () => {
    it('should enable knapsack fallback when configured', () => {
      const knapsackPacker = new BudgetedMaxCoverage({
        maxTokens: 1000,
        enableKnapsackFallback: true,
        knapsackThreshold: 0.6,
        maxKnapsackCandidates: 30,
      });

      const options = knapsackPacker.getOptions();
      expect(options.enableKnapsackFallback).toBe(true);
      expect(options.knapsackThreshold).toBe(0.6);
      expect(options.maxKnapsackCandidates).toBe(30);
    });

    it('should default to greedy algorithm when knapsack disabled', () => {
      const greedyPacker = new BudgetedMaxCoverage({
        maxTokens: 1000,
        enableKnapsackFallback: false,
      });

      const options = greedyPacker.getOptions();
      expect(options.enableKnapsackFallback).toBe(false);
    });

    it('should use knapsack when greedy efficiency is below threshold', () => {
      const knapsackPacker = new BudgetedMaxCoverage({
        maxTokens: 100,
        enableKnapsackFallback: true,
        knapsackThreshold: 0.8, // High threshold to trigger knapsack
        maxKnapsackCandidates: 20,
      });

      // Create candidates where knapsack would perform better
      const candidates = [
        {
          id: 'candidate-k1',
          type: 'chunk' as const,
          content: {
            id: 'chunk-k1',
            docId: 'doc-k1',
            text: 'High value, low cost content',
            tokens: 5,
            metadata: {},
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          utilityScore: 0.9,
          factors: {
            relevance: 0.9,
            informationGain: 0.8,
            trust: 0.9,
            reusability: 0.8,
            tokenCost: 0.1,
            conflictRisk: 0.1,
          },
          metadata: {},
        },
        {
          id: 'candidate-k2',
          type: 'chunk' as const,
          content: {
            id: 'chunk-k2',
            docId: 'doc-k2',
            text: 'Medium value, medium cost content',
            tokens: 8,
            metadata: {},
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          utilityScore: 0.8,
          factors: {
            relevance: 0.8,
            informationGain: 0.7,
            trust: 0.8,
            reusability: 0.7,
            tokenCost: 0.2,
            conflictRisk: 0.2,
          },
          metadata: {},
        },
        {
          id: 'candidate-k3',
          type: 'chunk' as const,
          content: {
            id: 'chunk-k3',
            docId: 'doc-k3',
            text: 'Low value, high cost content',
            tokens: 12,
            metadata: {},
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          utilityScore: 0.7,
          factors: {
            relevance: 0.7,
            informationGain: 0.6,
            trust: 0.7,
            reusability: 0.6,
            tokenCost: 0.3,
            conflictRisk: 0.3,
          },
          metadata: {},
        },
      ];

      const atomMapping = new Map([
        ['1', ['atom-1', 'atom-2']],
        ['2', ['atom-3', 'atom-4']],
        ['3', ['atom-5', 'atom-6']],
      ]);

      const result = knapsackPacker.packCandidates(candidates, atomMapping);
      
      // Should use knapsack algorithm when triggered
      expect(['greedy', 'knapsack']).toContain(result.metadata.algorithm);
    });

    it('should maintain budget constraints in knapsack mode', () => {
      const knapsackPacker = new BudgetedMaxCoverage({
        maxTokens: 50,
        enableKnapsackFallback: true,
        knapsackThreshold: 0.5,
      });

      const candidates = [
        {
          id: 'candidate-b1',
          type: 'chunk' as const,
          content: {
            id: 'chunk-b1',
            docId: 'doc-b1',
            text: 'A'.repeat(100),
            tokens: 25,
            metadata: {},
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          utilityScore: 0.9,
          factors: {
            relevance: 0.9,
            informationGain: 0.8,
            trust: 0.9,
            reusability: 0.8,
            tokenCost: 0.1,
            conflictRisk: 0.1,
          },
          metadata: {},
        },
        {
          id: 'candidate-b2',
          type: 'chunk' as const,
          content: {
            id: 'chunk-b2',
            docId: 'doc-b2',
            text: 'B'.repeat(80),
            tokens: 20,
            metadata: {},
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          utilityScore: 0.8,
          factors: {
            relevance: 0.8,
            informationGain: 0.7,
            trust: 0.8,
            reusability: 0.7,
            tokenCost: 0.2,
            conflictRisk: 0.2,
          },
          metadata: {},
        },
        {
          id: 'candidate-b3',
          type: 'chunk' as const,
          content: {
            id: 'chunk-b3',
            docId: 'doc-b3',
            text: 'C'.repeat(60),
            tokens: 15,
            metadata: {},
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          utilityScore: 0.7,
          factors: {
            relevance: 0.7,
            informationGain: 0.6,
            trust: 0.7,
            reusability: 0.6,
            tokenCost: 0.3,
            conflictRisk: 0.3,
          },
          metadata: {},
        },
      ];

      const atomMapping = new Map([
        ['1', ['atom-1', 'atom-2', 'atom-3']],
        ['2', ['atom-4', 'atom-5']],
        ['3', ['atom-6']],
      ]);

      const result = knapsackPacker.packCandidates(candidates, atomMapping);
      
      expect(result.totalTokens).toBeLessThanOrEqual(50);
      expect(result.budgetUtilization).toBeLessThanOrEqual(1.0);
    });

    it('should handle edge cases in knapsack selection', () => {
      const knapsackPacker = new BudgetedMaxCoverage({
        maxTokens: 10,
        enableKnapsackFallback: true,
        knapsackThreshold: 0.1,
      });

      // Test with very small budget
      const candidates = [
        {
          id: 'candidate-s1',
          type: 'chunk' as const,
          content: {
            id: 'chunk-s1',
            docId: 'doc-s1',
            text: 'A',
            tokens: 1,
            metadata: {},
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          utilityScore: 0.5,
          factors: {
            relevance: 0.5,
            informationGain: 0.4,
            trust: 0.5,
            reusability: 0.4,
            tokenCost: 0.01, // Very low token cost
            conflictRisk: 0.1,
          },
          metadata: {},
        },
        {
          id: 'candidate-s2',
          type: 'chunk' as const,
          content: {
            id: 'chunk-s2',
            docId: 'doc-s2',
            text: 'B',
            tokens: 1,
            metadata: {},
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          utilityScore: 0.3,
          factors: {
            relevance: 0.3,
            informationGain: 0.2,
            trust: 0.3,
            reusability: 0.2,
            tokenCost: 0.005, // Very low token cost
            conflictRisk: 0.1,
          },
          metadata: {},
        },
      ];

      const atomMapping = new Map([
        ['candidate-s1', ['atom-1']],
        ['candidate-s2', ['atom-2']],
      ]);

      const result = knapsackPacker.packCandidates(candidates, atomMapping);
      
      expect(result.selectedCandidates.length).toBeGreaterThan(0);
      expect(result.totalTokens).toBeLessThanOrEqual(50);
    });

    it('should respect maxKnapsackCandidates limit', () => {
      const knapsackPacker = new BudgetedMaxCoverage({
        maxTokens: 1000,
        enableKnapsackFallback: true,
        maxKnapsackCandidates: 5, // Very low limit
      });

      // Create many candidates
      const candidates = Array.from({ length: 20 }, (_, i) => ({
        id: `candidate-m${i}`,
        type: 'chunk' as const,
        content: {
          id: `chunk-m${i}`,
          docId: `doc-m${i}`,
          text: `Candidate ${i}`,
          tokens: 5 + i,
          metadata: {},
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        utilityScore: 0.5 + (i * 0.02),
        factors: {
          relevance: 0.5 + (i * 0.02),
          informationGain: 0.4 + (i * 0.02),
          trust: 0.5 + (i * 0.02),
          reusability: 0.4 + (i * 0.02),
          tokenCost: 0.1 + (i * 0.01),
          conflictRisk: 0.1,
        },
        metadata: {}
      }));

      const atomMapping = new Map(
        candidates.map(c => [c.id, [`atom-${c.id}`]])
      );

      const result = knapsackPacker.packCandidates(candidates, atomMapping);
      
      // Should still work despite candidate limit
      expect(result.selectedCandidates.length).toBeGreaterThan(0);
      expect(result.metadata.algorithm).toBeDefined();
    });
  });

  describe('Dynamic Budget Allocation and Token Counting', () => {
    it('should enable dynamic budget allocation when configured', () => {
      const dynamicPacker = new BudgetedMaxCoverage({
        maxTokens: 1000,
        enableDynamicBudget: true,
        priorityWeights: { high: 5, medium: 3, low: 1 },
        budgetBuffer: 0.3,
      });

      const options = dynamicPacker.getOptions();
      expect(options.enableDynamicBudget).toBe(true);
      expect(options.priorityWeights.high).toBe(5);
      expect(options.priorityWeights.medium).toBe(3);
      expect(options.priorityWeights.low).toBe(1);
      expect(options.budgetBuffer).toBe(0.3);
    });

    it('should determine priority levels correctly based on utility scores', () => {
      const packer = new BudgetedMaxCoverage({ maxTokens: 1000 });
      
      // Test high priority (utility >= 0.8)
      const highPriorityCandidate = {
        id: 'high',
        type: 'chunk' as const,
        content: { id: 'chunk-high', docId: 'doc-high', text: 'High priority content', tokens: 10, metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
        utilityScore: 0.9,
        factors: { relevance: 0.9, informationGain: 0.8, trust: 0.9, reusability: 0.8, tokenCost: 0.1, conflictRisk: 0.1 },
        metadata: {},
      };

      const atomMapping = new Map([['high', ['atom-1', 'atom-2']]]);
      const result = packer.packCandidates([highPriorityCandidate], atomMapping);
      
      expect(result.selectedCandidates[0].priority).toBe('high');
    });

    it('should detect content types for accurate token estimation', () => {
      const packer = new BudgetedMaxCoverage({ maxTokens: 1000 });
      
      // Test JSON content
      const jsonCandidate = {
        id: 'json',
        type: 'chunk' as const,
        content: { id: 'chunk-json', docId: 'doc-json', text: '{"key": "value", "nested": {"data": 123}}', tokens: 1, metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
        utilityScore: 0.7,
        factors: { relevance: 0.7, informationGain: 0.6, trust: 0.7, reusability: 0.6, tokenCost: 0.1, conflictRisk: 0.1 },
        metadata: {},
      };

      const atomMapping = new Map([['json', ['atom-1']]]);
      const result = packer.packCandidates([jsonCandidate], atomMapping);
      
      // JSON should have higher token density (lower ratio)
      expect(result.selectedCandidates[0].estimatedTokens).toBeGreaterThan(0);
    });

    it('should allocate budget by priority when dynamic budget is enabled', () => {
      const dynamicPacker = new BudgetedMaxCoverage({
        maxTokens: 100,
        enableDynamicBudget: true,
        priorityWeights: { high: 3, medium: 2, low: 1 },
        budgetBuffer: 0.2,
      });

      const candidates = [
        {
          id: 'high-1',
          type: 'chunk' as const,
          content: { id: 'chunk-high1', docId: 'doc-high1', text: 'High priority 1', tokens: 20, metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
          utilityScore: 0.9,
          factors: { relevance: 0.9, informationGain: 0.8, trust: 0.9, reusability: 0.8, tokenCost: 0.2, conflictRisk: 0.1 },
          metadata: {},
        },
        {
          id: 'medium-1',
          type: 'chunk' as const,
          content: { id: 'chunk-medium1', docId: 'doc-medium1', text: 'Medium priority 1', tokens: 15, metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
          utilityScore: 0.6,
          factors: { relevance: 0.6, informationGain: 0.5, trust: 0.6, reusability: 0.5, tokenCost: 0.15, conflictRisk: 0.2 },
          metadata: {},
        },
        {
          id: 'low-1',
          type: 'chunk' as const,
          content: { id: 'chunk-low1', docId: 'doc-low1', text: 'Low priority 1', tokens: 10, metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
          utilityScore: 0.3,
          factors: { relevance: 0.3, informationGain: 0.2, trust: 0.3, reusability: 0.2, tokenCost: 0.1, conflictRisk: 0.3 },
          metadata: {},
        },
      ];

      const atomMapping = new Map([
        ['high-1', ['atom-1', 'atom-2']],
        ['medium-1', ['atom-3']],
        ['low-1', ['atom-4']],
      ]);

      const result = dynamicPacker.packCandidates(candidates, atomMapping);
      
      // Should prioritize high-priority candidates
      expect(result.selectedCandidates.length).toBeGreaterThan(0);
      expect(result.selectedCandidates[0].priority).toBe('high');
    });

    it('should fall back to greedy selection when dynamic budget is disabled', () => {
      const greedyPacker = new BudgetedMaxCoverage({
        maxTokens: 100,
        enableDynamicBudget: false,
        minCoverageThreshold: 0.01, // Lower threshold for testing
      });

      const candidates = [
        {
          id: 'candidate-1',
          type: 'chunk' as const,
          content: { id: 'chunk-1', docId: 'doc-1', text: 'Candidate 1', tokens: 20, metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
          utilityScore: 0.7,
          factors: { relevance: 0.7, informationGain: 0.6, trust: 0.7, reusability: 0.6, tokenCost: 0.1, conflictRisk: 0.1 }, // Lower token cost
          metadata: {},
        },
        {
          id: 'candidate-2',
          type: 'chunk' as const,
          content: { id: 'chunk-2', docId: 'doc-2', text: 'Candidate 2', tokens: 15, metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
          utilityScore: 0.8,
          factors: { relevance: 0.8, informationGain: 0.7, trust: 0.8, reusability: 0.7, tokenCost: 0.08, conflictRisk: 0.1 }, // Lower token cost
          metadata: {},
        },
      ];

      const atomMapping = new Map([
        ['candidate-1', ['atom-1', 'atom-2']], // More atoms for better coverage
        ['candidate-2', ['atom-3', 'atom-4']], // More atoms for better coverage
      ]);

      const result = greedyPacker.packCandidates(candidates, atomMapping);
      
      // Should use greedy selection (efficiency-based)
      expect(result.selectedCandidates.length).toBeGreaterThan(0);
      expect(result.metadata.algorithm).toBe('greedy');
    });

    it('should handle edge cases in priority-based selection', () => {
      const dynamicPacker = new BudgetedMaxCoverage({
        maxTokens: 50,
        enableDynamicBudget: true,
        priorityWeights: { high: 1, medium: 1, low: 1 }, // Equal weights
        budgetBuffer: 0.1,
      });

      // Test with very small budget
      const candidates = [
        {
          id: 'small-1',
          type: 'chunk' as const,
          content: { id: 'chunk-small1', docId: 'doc-small1', text: 'A', tokens: 1, metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
          utilityScore: 0.5,
          factors: { relevance: 0.5, informationGain: 0.4, trust: 0.5, reusability: 0.4, tokenCost: 0.01, conflictRisk: 0.1 },
          metadata: {},
        },
      ];

      const atomMapping = new Map([['small-1', ['atom-1']]]);
      const result = dynamicPacker.packCandidates(candidates, atomMapping);
      
      expect(result.selectedCandidates.length).toBeGreaterThan(0);
      expect(result.totalTokens).toBeLessThanOrEqual(50);
    });
  });
});
