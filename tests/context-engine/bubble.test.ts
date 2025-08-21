/**
 * Unit tests for Bubble Stabilization Algorithm
 * Tests efficient bubble sort stabilization with early termination
 */

import {
  BubbleStabilizer,
  BubbleStabilizerFactory,
  type BubbleStabilizationOptions,
  type StabilizationResult,
  type StabilityMetrics,
} from '../../src/context-engine/rank/bubble.js';
import type { RankingCandidate } from '../../src/context-engine/rank/usefulness.js';

describe('Bubble Stabilization Algorithm', () => {
  let mockCandidates: RankingCandidate[];
  let comparisonFunction: (a: RankingCandidate, b: RankingCandidate) => number;

  beforeEach(() => {
    mockCandidates = [
      {
        id: 'candidate-1',
        type: 'chunk',
        content: global.testUtils.createMockChunk({ id: 'chunk-1', text: 'High relevance content' }),
        utilityScore: 0.9,
        factors: {
          relevance: 0.9,
          informationGain: 0.8,
          trust: 0.7,
          reusability: 0.6,
          tokenCost: 0.3,
          conflictRisk: 0.1,
        },
        metadata: { source: 'test' },
      },
      {
        id: 'candidate-2',
        type: 'chunk',
        content: global.testUtils.createMockChunk({ id: 'chunk-2', text: 'Medium relevance content' }),
        utilityScore: 0.6,
        factors: {
          relevance: 0.6,
          informationGain: 0.5,
          trust: 0.6,
          reusability: 0.4,
          tokenCost: 0.5,
          conflictRisk: 0.2,
        },
        metadata: { source: 'test' },
      },
      {
        id: 'candidate-3',
        type: 'chunk',
        content: global.testUtils.createMockChunk({ id: 'chunk-3', text: 'Low relevance content' }),
        utilityScore: 0.3,
        factors: {
          relevance: 0.3,
          informationGain: 0.2,
          trust: 0.4,
          reusability: 0.3,
          tokenCost: 0.7,
          conflictRisk: 0.4,
        },
        metadata: { source: 'test' },
      },
      {
        id: 'candidate-4',
        type: 'chunk',
        content: global.testUtils.createMockChunk({ id: 'chunk-4', text: 'Very low relevance content' }),
        utilityScore: 0.1,
        factors: {
          relevance: 0.1,
          informationGain: 0.1,
          trust: 0.2,
          reusability: 0.1,
          tokenCost: 0.9,
          conflictRisk: 0.6,
        },
        metadata: { source: 'test' },
      },
    ];

    comparisonFunction = (a: RankingCandidate, b: RankingCandidate) => {
      // Higher utility score should come first (descending order)
      return b.utilityScore - a.utilityScore;
    };
  });

  describe('BubbleStabilizer', () => {
    let stabilizer: BubbleStabilizer;

    beforeEach(() => {
      stabilizer = new BubbleStabilizer();
    });

    describe('constructor', () => {
      it('should initialize with default options', () => {
        const options = stabilizer.getOptions();
        expect(options.maxPasses).toBe(2);
        expect(options.earlyCutoffThreshold).toBe(0.05);
        expect(options.stabilityThreshold).toBe(0.01);
        expect(options.enableOptimization).toBe(true);
        expect(options.progressCallback).toBeUndefined();
      });

      it('should accept custom options', () => {
        const customOptions: BubbleStabilizationOptions = {
          maxPasses: 5,
          earlyCutoffThreshold: 0.1,
          stabilityThreshold: 0.02,
          enableOptimization: false,
          progressCallback: jest.fn(),
        };

        const customStabilizer = new BubbleStabilizer(customOptions);
        const options = customStabilizer.getOptions();
        expect(options.maxPasses).toBe(5);
        expect(options.earlyCutoffThreshold).toBe(0.1);
        expect(options.stabilityThreshold).toBe(0.02);
        expect(options.enableOptimization).toBe(false);
        expect(options.progressCallback).toBeDefined();
      });
    });

    describe('stabilize', () => {
      it('should stabilize candidates in correct order', () => {
        const result = stabilizer.stabilize(mockCandidates, comparisonFunction);

        expect(result.stabilizedCandidates).toBeDefined();
        expect(result.stabilizedCandidates.length).toBe(mockCandidates.length);
        expect(result.passesCompleted).toBeGreaterThan(0);
        expect(result.totalSwaps).toBeGreaterThanOrEqual(0);
        expect(result.stabilityScore).toBeGreaterThanOrEqual(0);
        expect(result.stabilityScore).toBeLessThanOrEqual(1);
        expect(result.earlyTermination).toBeDefined();
        expect(result.metadata).toBeDefined();

        // Check that candidates are in descending order by utility score
        for (let i = 0; i < result.stabilizedCandidates.length - 1; i++) {
          expect(result.stabilizedCandidates[i].utilityScore).toBeGreaterThanOrEqual(
            result.stabilizedCandidates[i + 1].utilityScore
          );
        }
      });

      it('should handle single candidate', () => {
        const singleCandidate = [mockCandidates[0]];
        const result = stabilizer.stabilize(singleCandidate, comparisonFunction);

        expect(result.stabilizedCandidates).toEqual(singleCandidate);
        expect(result.passesCompleted).toBe(0);
        expect(result.totalSwaps).toBe(0);
        expect(result.stabilityScore).toBe(1.0);
        expect(result.earlyTermination).toBe(false);
      });

      it('should handle empty candidates array', () => {
        const result = stabilizer.stabilize([], comparisonFunction);

        expect(result.stabilizedCandidates).toEqual([]);
        expect(result.passesCompleted).toBe(0);
        expect(result.totalSwaps).toBe(0);
        expect(result.stabilityScore).toBe(1.0);
        expect(result.earlyTermination).toBe(false);
      });

      it('should call progress callback when provided', () => {
        const progressCallback = jest.fn();
        const customStabilizer = new BubbleStabilizer({ progressCallback });

        customStabilizer.stabilize(mockCandidates, comparisonFunction);

        expect(progressCallback).toHaveBeenCalled();
        const calls = progressCallback.mock.calls;
        calls.forEach(call => {
          expect(call[0]).toBeGreaterThan(0); // pass number
          expect(call[1]).toBeGreaterThanOrEqual(0); // changes
          expect(call[2]).toBe(mockCandidates.length); // total items
        });
      });

      it('should respect max passes limit', () => {
        const limitedStabilizer = new BubbleStabilizer({ maxPasses: 1 });
        const result = limitedStabilizer.stabilize(mockCandidates, comparisonFunction);

        expect(result.passesCompleted).toBeLessThanOrEqual(1);
      });

      it('should handle early termination conditions', () => {
        const aggressiveStabilizer = new BubbleStabilizer({
          earlyCutoffThreshold: 0.5,
          stabilityThreshold: 0.1,
        });

        const result = aggressiveStabilizer.stabilize(mockCandidates, comparisonFunction);

        expect(result.earlyTermination).toBeDefined();
        // Early termination should occur with these aggressive thresholds
        expect(result.passesCompleted).toBeLessThanOrEqual(2);
      });
    });

    describe('stabilizeOptimized', () => {
      it('should use optimization when enabled', () => {
        const optimizedStabilizer = new BubbleStabilizer({ enableOptimization: true });
        const result = optimizedStabilizer.stabilizeOptimized(mockCandidates, comparisonFunction);

        expect(result.stabilizedCandidates).toBeDefined();
        expect(result.stabilizedCandidates.length).toBe(mockCandidates.length);
        expect(result.passesCompleted).toBeGreaterThanOrEqual(0);
        expect(result.totalSwaps).toBeGreaterThanOrEqual(0);
      });

      it('should fall back to regular stabilization when optimization disabled', () => {
        const nonOptimizedStabilizer = new BubbleStabilizer({ enableOptimization: false });
        const result = nonOptimizedStabilizer.stabilizeOptimized(mockCandidates, comparisonFunction);

        expect(result.stabilizedCandidates).toBeDefined();
        expect(result.stabilizedCandidates.length).toBe(mockCandidates.length);
      });
    });

    describe('stabilizeBatch', () => {
      it('should stabilize multiple ranking results', () => {
        const rankingResults = [
          { 
            candidates: [...mockCandidates], 
            metadata: { 
              totalCandidates: mockCandidates.length,
              averageUtility: mockCandidates.reduce((sum, c) => sum + c.utilityScore, 0) / mockCandidates.length,
              utilityRange: { 
                min: Math.min(...mockCandidates.map(c => c.utilityScore)), 
                max: Math.max(...mockCandidates.map(c => c.utilityScore)) 
              },
              factorContributions: {
                relevance: 0.25,
                informationGain: 0.20,
                trust: 0.20,
                reusability: 0.15,
                tokenCost: 0.10,
                conflictRisk: 0.10,
              },
              processingTime: 0
            } 
          },
          { 
            candidates: [...mockCandidates].reverse(), 
            metadata: { 
              totalCandidates: mockCandidates.length,
              averageUtility: mockCandidates.reduce((sum, c) => sum + c.utilityScore, 0) / mockCandidates.length,
              utilityRange: { 
                min: Math.min(...mockCandidates.map(c => c.utilityScore)), 
                max: Math.max(...mockCandidates.map(c => c.utilityScore)) 
              },
              factorContributions: {
                relevance: 0.25,
                informationGain: 0.20,
                trust: 0.20,
                reusability: 0.15,
                tokenCost: 0.10,
                conflictRisk: 0.10,
              },
              processingTime: 0
            } 
          },
        ];

        const results = stabilizer.stabilizeBatch(rankingResults, comparisonFunction);

        expect(results).toHaveLength(2);
        results.forEach(result => {
          expect(result.stabilizedCandidates).toBeDefined();
          expect(result.stabilizedCandidates.length).toBe(mockCandidates.length);
          expect(result.passesCompleted).toBeGreaterThanOrEqual(0);
        });
      });
    });

    describe('getStabilityMetrics', () => {
      it('should return detailed stability metrics', () => {
        const metrics = stabilizer.getStabilityMetrics(mockCandidates, comparisonFunction);

        expect(metrics).toBeDefined();
        expect(metrics.length).toBeGreaterThan(0);

        metrics.forEach(metric => {
          expect(metric.pass).toBeGreaterThan(0);
          expect(metric.swaps).toBeGreaterThanOrEqual(0);
          expect(metric.totalItems).toBe(mockCandidates.length);
          expect(metric.changePercentage).toBeGreaterThanOrEqual(0);
          expect(metric.isStable).toBeDefined();
          expect(metric.earlyTermination).toBeDefined();
        });
      });
    });

    describe('options management', () => {
      it('should update options correctly', () => {
        const newOptions: Partial<BubbleStabilizationOptions> = {
          maxPasses: 10,
          earlyCutoffThreshold: 0.2,
        };

        stabilizer.updateOptions(newOptions);
        const updatedOptions = stabilizer.getOptions();

        expect(updatedOptions.maxPasses).toBe(10);
        expect(updatedOptions.earlyCutoffThreshold).toBe(0.2);
        // Other options should remain unchanged
        expect(updatedOptions.stabilityThreshold).toBe(0.01);
        expect(updatedOptions.enableOptimization).toBe(true);
      });

      it('should reset options to defaults', () => {
        // First change some options
        stabilizer.updateOptions({ maxPasses: 10, earlyCutoffThreshold: 0.2 });
        
        // Then reset
        stabilizer.resetOptions();
        const options = stabilizer.getOptions();

        expect(options.maxPasses).toBe(2);
        expect(options.earlyCutoffThreshold).toBe(0.05);
        expect(options.stabilityThreshold).toBe(0.01);
        expect(options.enableOptimization).toBe(true);
        expect(options.progressCallback).toBeUndefined();
      });
    });

    describe('Edge Cases and Performance', () => {
      it('should handle already sorted candidates efficiently', () => {
        const sortedCandidates = [...mockCandidates].sort(comparisonFunction);
        const result = stabilizer.stabilize(sortedCandidates, comparisonFunction);

        expect(result.passesCompleted).toBe(1); // Should only need one pass to verify
        expect(result.totalSwaps).toBe(0); // No swaps needed
        expect(result.stabilityScore).toBe(1.0); // Perfect stability
      });

      it('should handle reverse sorted candidates', () => {
        // Create candidates in reverse order (lowest utility first, which is wrong for our comparison function)
        const reverseSortedCandidates = [...mockCandidates].sort((a, b) => a.utilityScore - b.utilityScore);
        
        // Use a custom stabilizer with more appropriate thresholds for small arrays
        const customStabilizer = new BubbleStabilizer({
          maxPasses: 3,
          earlyCutoffThreshold: 0.01, // Very low threshold to allow completion
          stabilityThreshold: 0.001,   // Very low threshold to allow completion
          enableOptimization: false,   // Disable optimization to ensure full sorting
        });
        
        const result = customStabilizer.stabilize(reverseSortedCandidates, comparisonFunction);

        expect(result.passesCompleted).toBeGreaterThan(0);
        expect(result.totalSwaps).toBeGreaterThan(0);
        
        // Check final order
        for (let i = 0; i < result.stabilizedCandidates.length - 1; i++) {
          expect(result.stabilizedCandidates[i].utilityScore).toBeGreaterThanOrEqual(
            result.stabilizedCandidates[i + 1].utilityScore
          );
        }
      });

      it('should handle candidates with equal utility scores', () => {
        const equalCandidates = mockCandidates.map(c => ({
          ...c,
          utilityScore: 0.5, // All same score
        }));

        const result = stabilizer.stabilize(equalCandidates, comparisonFunction);

        expect(result.stabilizedCandidates).toBeDefined();
        expect(result.stabilizedCandidates.length).toBe(equalCandidates.length);
        expect(result.totalSwaps).toBe(0); // No swaps needed for equal scores
      });

      it('should handle large number of candidates', () => {
        const largeCandidates = Array.from({ length: 100 }, (_, i) => ({
          id: `candidate-${i}`,
          type: 'chunk' as const,
          content: global.testUtils.createMockChunk({ id: `chunk-${i}`, text: `Content ${i}` }),
          utilityScore: Math.random(),
          factors: {
            relevance: Math.random(),
            informationGain: Math.random(),
            trust: Math.random(),
            reusability: Math.random(),
            tokenCost: Math.random(),
            conflictRisk: Math.random(),
          },
          metadata: { source: 'test' },
        }));

        const result = stabilizer.stabilize(largeCandidates, comparisonFunction);

        expect(result.stabilizedCandidates).toBeDefined();
        expect(result.stabilizedCandidates.length).toBe(100);
        expect(result.passesCompleted).toBeGreaterThan(0);
        expect(result.totalSwaps).toBeGreaterThanOrEqual(0);
      });

      it('should maintain candidate integrity during stabilization', () => {
        const originalCandidates = [...mockCandidates];
        const result = stabilizer.stabilize(mockCandidates, comparisonFunction);

        // Original array should not be modified
        expect(mockCandidates).toEqual(originalCandidates);

        // Result should contain the same candidates (possibly reordered)
        const originalIds = new Set(originalCandidates.map(c => c.id));
        const resultIds = new Set(result.stabilizedCandidates.map(c => c.id));
        expect(originalIds).toEqual(resultIds);

        // Content should be preserved
        result.stabilizedCandidates.forEach(resultCandidate => {
          const originalCandidate = originalCandidates.find(c => c.id === resultCandidate.id);
          expect(originalCandidate).toBeDefined();
          expect(resultCandidate.content).toEqual(originalCandidate!.content);
          expect(resultCandidate.factors).toEqual(originalCandidate!.factors);
          expect(resultCandidate.metadata).toEqual(originalCandidate!.metadata);
        });
      });
    });

    describe('Integration with Ranking System', () => {
      it('should work with different comparison functions', () => {
        // Test with different comparison logic
        const relevanceComparison = (a: RankingCandidate, b: RankingCandidate) => {
          return b.factors.relevance - a.factors.relevance;
        };

        const trustComparison = (a: RankingCandidate, b: RankingCandidate) => {
          return b.factors.trust - a.factors.trust;
        };

        const relevanceResult = stabilizer.stabilize(mockCandidates, relevanceComparison);
        const trustResult = stabilizer.stabilize(mockCandidates, trustComparison);

        // Results should be different due to different comparison functions
        expect(relevanceResult.stabilizedCandidates).toBeDefined();
        expect(trustResult.stabilizedCandidates).toBeDefined();

        // Check that the ordering reflects the comparison function
        for (let i = 0; i < relevanceResult.stabilizedCandidates.length - 1; i++) {
          expect(relevanceResult.stabilizedCandidates[i].factors.relevance).toBeGreaterThanOrEqual(
            relevanceResult.stabilizedCandidates[i + 1].factors.relevance
          );
        }

        for (let i = 0; i < trustResult.stabilizedCandidates.length - 1; i++) {
          expect(trustResult.stabilizedCandidates[i].factors.trust).toBeGreaterThanOrEqual(
            trustResult.stabilizedCandidates[i + 1].factors.trust
          );
        }
      });

      it('should handle mixed candidate types', () => {
        const mixedCandidates = [
          ...mockCandidates,
          {
            id: 'atom-candidate',
            type: 'atom' as const,
            content: global.testUtils.createMockAtom({ id: 'atom-1', text: 'Atom content' }),
            utilityScore: 0.75,
            factors: {
              relevance: 0.75,
              informationGain: 0.6,
              trust: 0.5,
              reusability: 0.4,
              tokenCost: 0.2,
              conflictRisk: 0.1,
            },
            metadata: { source: 'test' },
          },
        ];

        const result = stabilizer.stabilize(mixedCandidates, comparisonFunction);

        expect(result.stabilizedCandidates).toBeDefined();
        expect(result.stabilizedCandidates.length).toBe(mixedCandidates.length);
        expect(result.passesCompleted).toBeGreaterThan(0);
      });
    });
  });

  describe('BubbleStabilizerFactory', () => {
    describe('createConservative', () => {
      it('should create conservative stabilizer', () => {
        const stabilizer = BubbleStabilizerFactory.createConservative();
        const options = stabilizer.getOptions();

        expect(options.maxPasses).toBe(3);
        expect(options.earlyCutoffThreshold).toBe(0.1);
        expect(options.stabilityThreshold).toBe(0.05);
        expect(options.enableOptimization).toBe(true);
      });
    });

    describe('createAggressive', () => {
      it('should create aggressive stabilizer', () => {
        const stabilizer = BubbleStabilizerFactory.createAggressive();
        const options = stabilizer.getOptions();

        expect(options.maxPasses).toBe(1);
        expect(options.earlyCutoffThreshold).toBe(0.02);
        expect(options.stabilityThreshold).toBe(0.005);
        expect(options.enableOptimization).toBe(true);
      });
    });

    describe('createBalanced', () => {
      it('should create balanced stabilizer with default options', () => {
        const stabilizer = BubbleStabilizerFactory.createBalanced();
        const options = stabilizer.getOptions();

        expect(options.maxPasses).toBe(2);
        expect(options.earlyCutoffThreshold).toBe(0.05);
        expect(options.stabilityThreshold).toBe(0.01);
        expect(options.enableOptimization).toBe(true);
      });
    });

    describe('createCustom', () => {
      it('should create custom stabilizer with specific options', () => {
        const customOptions: BubbleStabilizationOptions = {
          maxPasses: 7,
          earlyCutoffThreshold: 0.15,
          stabilityThreshold: 0.03,
          enableOptimization: false,
          progressCallback: jest.fn(),
        };

        const stabilizer = BubbleStabilizerFactory.createCustom(customOptions);
        const options = stabilizer.getOptions();

        expect(options.maxPasses).toBe(7);
        expect(options.earlyCutoffThreshold).toBe(0.15);
        expect(options.stabilityThreshold).toBe(0.03);
        expect(options.enableOptimization).toBe(false);
        expect(options.progressCallback).toBeDefined();
      });
    });
  });
});
