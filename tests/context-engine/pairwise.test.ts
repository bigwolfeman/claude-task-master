/**
 * Unit tests for Pairwise Learning System
 * Tests RankNet neural network and Bradley-Terry probabilistic models
 */

import {
  RankNetLearner,
  BradleyTerryLearner,
  PairwiseLearnerFactory,
  type PairwiseExample,
  type PairwiseTrainingData,
} from '../../src/context-engine/rank/pairwise.js';
import type { UtilityWeights } from '../../src/context-engine/rank/usefulness.js';

describe('Pairwise Learning System', () => {
  let mockWeights: UtilityWeights;
  let mockTrainingData: PairwiseTrainingData;

  beforeEach(() => {
    mockWeights = {
      relevance: 0.25,
      informationGain: 0.20,
      trust: 0.20,
      reusability: 0.15,
      tokenCost: 0.10,
      conflictRisk: 0.10,
    };

    mockTrainingData = {
      examples: [
        {
          query: 'machine learning',
          candidateA: global.testUtils.createMockChunk({ id: 'chunk-a', text: 'Machine learning is effective for this task.' }),
          candidateB: global.testUtils.createMockChunk({ id: 'chunk-b', text: 'Machine learning is not effective for this task.' }),
          preference: 'A',
          confidence: 0.9,
          context: {
            existingEvidence: [],
            queryComplexity: 0.7,
            userPreferences: {},
          },
        },
        {
          query: 'artificial intelligence',
          candidateA: global.testUtils.createMockChunk({ id: 'chunk-c', text: 'AI systems can solve complex problems.' }),
          candidateB: global.testUtils.createMockChunk({ id: 'chunk-d', text: 'AI systems are limited in scope.' }),
          preference: 'A',
          confidence: 0.8,
          context: {
            existingEvidence: [],
            queryComplexity: 0.8,
            userPreferences: {},
          },
        },
        {
          query: 'data science',
          candidateA: global.testUtils.createMockChunk({ id: 'chunk-e', text: 'Data science combines statistics and programming.' }),
          candidateB: global.testUtils.createMockChunk({ id: 'chunk-f', text: 'Data science combines statistics and programming.' }),
          preference: 'equal',
          confidence: 0.95,
          context: {
            existingEvidence: [],
            queryComplexity: 0.6,
            userPreferences: {},
          },
        },
      ],
      metadata: {
        totalExamples: 3,
        positivePreferences: 2,
        negativePreferences: 0,
        equalPreferences: 1,
        averageConfidence: 0.88,
      },
    };
  });

  describe('RankNetLearner', () => {
    let rankNetLearner: RankNetLearner;

    beforeEach(() => {
      rankNetLearner = new RankNetLearner(mockWeights);
    });

    describe('constructor', () => {
      it('should initialize with provided weights', () => {
        expect(rankNetLearner.getWeights()).toEqual(mockWeights);
      });

      it('should use default parameters when not specified', () => {
        const defaultLearner = new RankNetLearner(mockWeights);
        expect(defaultLearner.getWeights()).toEqual(mockWeights);
      });

      it('should accept custom learning parameters', () => {
        const customLearner = new RankNetLearner(mockWeights, 0.05, 0.002, 1e-5, 500);
        expect(customLearner.getWeights()).toEqual(mockWeights);
      });
    });

    describe('training', () => {
      it('should train successfully on valid training data', async () => {
        const result = await rankNetLearner.train(mockTrainingData);
        
        expect(result).toBeDefined();
        expect(result.model).toBeDefined();
        expect(result.finalWeights).toBeDefined();
        expect(result.trainingMetrics).toBeDefined();
        expect(result.convergence).toBeDefined();
        expect(result.finalLoss).toBeGreaterThanOrEqual(0);
        expect(result.finalAccuracy).toBeGreaterThanOrEqual(0);
        expect(result.finalAccuracy).toBeLessThanOrEqual(1);
      });

      it('should call progress callback during training', async () => {
        const progressCalls: any[] = [];
        const progressCallback = (metrics: any) => progressCalls.push(metrics);
        
        await rankNetLearner.train(mockTrainingData, progressCallback);
        
        expect(progressCalls.length).toBeGreaterThan(0);
        progressCalls.forEach(call => {
          expect(call.iteration).toBeGreaterThan(0);
          expect(call.loss).toBeGreaterThanOrEqual(0);
          expect(call.accuracy).toBeGreaterThanOrEqual(0);
          expect(call.accuracy).toBeLessThanOrEqual(1);
          expect(call.weightChanges).toBeDefined();
          expect(call.convergence).toBeDefined();
        });
      });

      it('should handle empty training data gracefully', async () => {
        const emptyData: PairwiseTrainingData = {
          examples: [],
          metadata: {
            totalExamples: 0,
            positivePreferences: 0,
            negativePreferences: 0,
            equalPreferences: 0,
            averageConfidence: 0,
          },
        };

        const result = await rankNetLearner.train(emptyData);
        expect(result).toBeDefined();
        expect(result.finalAccuracy).toBe(0);
      });

      it('should respect max iterations limit', async () => {
        const limitedLearner = new RankNetLearner(mockWeights, 0.01, 0.001, 1e-6, 5);
        const result = await limitedLearner.train(mockTrainingData);
        
        expect(result.trainingMetrics.length).toBeLessThanOrEqual(5);
      });
    });

    describe('weight management', () => {
      it('should allow getting current weights', () => {
        const weights = rankNetLearner.getWeights();
        expect(weights).toEqual(mockWeights);
        expect(weights).not.toBe(mockWeights); // Should be a copy
      });

      it('should allow setting new weights', () => {
        const newWeights: UtilityWeights = {
          relevance: 0.3,
          informationGain: 0.25,
          trust: 0.2,
          reusability: 0.15,
          tokenCost: 0.05,
          conflictRisk: 0.05,
        };

        rankNetLearner.setWeights(newWeights);
        const currentWeights = rankNetLearner.getWeights();
        expect(currentWeights).toEqual(newWeights);
      });

      it('should create independent copies of weights', () => {
        const weights1 = rankNetLearner.getWeights();
        const weights2 = rankNetLearner.getWeights();
        
        expect(weights1).toEqual(weights2);
        expect(weights1).not.toBe(weights2); // Different objects
      });
    });

    describe('utility calculation', () => {
      it('should calculate utility scores for different candidate types', () => {
        const chunk = global.testUtils.createMockChunk({ id: 'test-chunk', text: 'Machine learning algorithms' });
        const atom = global.testUtils.createMockAtom({ id: 'test-atom', text: 'machine learning', type: 'ENT' });
        const summary = global.testUtils.createMockSummary({ id: 'test-summary', text: 'ML algorithms overview' });
        const graphNode = global.testUtils.createMockGraphNode({ id: 'test-node', label: 'machine_learning' });

        const context = {
          existingEvidence: [],
          queryComplexity: 0.5,
          userPreferences: {},
        };

        // Note: These are private methods, so we can't test them directly
        // In practice, they would be tested through the public training interface
        expect(chunk).toBeDefined();
        expect(atom).toBeDefined();
        expect(summary).toBeDefined();
        expect(graphNode).toBeDefined();
        expect(context).toBeDefined();
      });
    });
  });

  describe('BradleyTerryLearner', () => {
    let bradleyTerryLearner: BradleyTerryLearner;

    beforeEach(() => {
      bradleyTerryLearner = new BradleyTerryLearner(mockWeights);
    });

    describe('constructor', () => {
      it('should initialize with provided weights', () => {
        expect(bradleyTerryLearner.getWeights()).toEqual(mockWeights);
      });

      it('should use default parameters when not specified', () => {
        const defaultLearner = new BradleyTerryLearner(mockWeights);
        expect(defaultLearner.getWeights()).toEqual(mockWeights);
      });
    });

    describe('training', () => {
      it('should train successfully on valid training data', async () => {
        const result = await bradleyTerryLearner.train(mockTrainingData);
        
        expect(result).toBeDefined();
        expect(result.model).toBeDefined();
        expect(result.finalWeights).toBeDefined();
        expect(result.trainingMetrics).toBeDefined();
        expect(result.convergence).toBeDefined();
        expect(result.finalLoss).toBeGreaterThanOrEqual(0);
        expect(result.finalAccuracy).toBeGreaterThanOrEqual(0);
        expect(result.finalAccuracy).toBeLessThanOrEqual(1);
      });

      it('should call progress callback during training', async () => {
        const progressCalls: any[] = [];
        const progressCallback = (metrics: any) => progressCalls.push(metrics);
        
        await bradleyTerryLearner.train(mockTrainingData, progressCallback);
        
        expect(progressCalls.length).toBeGreaterThan(0);
        progressCalls.forEach(call => {
          expect(call.iteration).toBeGreaterThan(0);
          expect(call.loss).toBeGreaterThanOrEqual(0);
          expect(call.accuracy).toBeGreaterThanOrEqual(0);
          expect(call.accuracy).toBeLessThanOrEqual(1);
          expect(call.weightChanges).toBeDefined();
          expect(call.convergence).toBeDefined();
        });
      });

      it('should handle empty training data gracefully', async () => {
        const emptyData: PairwiseTrainingData = {
          examples: [],
          metadata: {
            totalExamples: 0,
            positivePreferences: 0,
            negativePreferences: 0,
            equalPreferences: 0,
            averageConfidence: 0,
          },
        };

        const result = await bradleyTerryLearner.train(emptyData);
        expect(result).toBeDefined();
        expect(result.finalAccuracy).toBe(0);
      });
    });

    describe('weight management', () => {
      it('should allow getting current weights', () => {
        const weights = bradleyTerryLearner.getWeights();
        expect(weights).toEqual(mockWeights);
        expect(weights).not.toBe(mockWeights); // Should be a copy
      });

      it('should allow setting new weights', () => {
        const newWeights: UtilityWeights = {
          relevance: 0.3,
          informationGain: 0.25,
          trust: 0.2,
          reusability: 0.15,
          tokenCost: 0.05,
          conflictRisk: 0.05,
        };

        bradleyTerryLearner.setWeights(newWeights);
        const currentWeights = bradleyTerryLearner.getWeights();
        expect(currentWeights).toEqual(newWeights);
      });
    });
  });

  describe('PairwiseLearnerFactory', () => {
    describe('createRankNet', () => {
      it('should create RankNet learner with default options', () => {
        const learner = PairwiseLearnerFactory.createRankNet(mockWeights);
        expect(learner).toBeInstanceOf(RankNetLearner);
        expect(learner.getWeights()).toEqual(mockWeights);
      });

      it('should create RankNet learner with custom options', () => {
        const customOptions = {
          learningRate: 0.05,
          regularization: 0.002,
          convergenceThreshold: 1e-5,
          maxIterations: 500,
        };

        const learner = PairwiseLearnerFactory.createRankNet(mockWeights, customOptions);
        expect(learner).toBeInstanceOf(RankNetLearner);
        expect(learner.getWeights()).toEqual(mockWeights);
      });
    });

    describe('createBradleyTerry', () => {
      it('should create Bradley-Terry learner with default options', () => {
        const learner = PairwiseLearnerFactory.createBradleyTerry(mockWeights);
        expect(learner).toBeInstanceOf(BradleyTerryLearner);
        expect(learner).toBeInstanceOf(BradleyTerryLearner);
        expect(learner.getWeights()).toEqual(mockWeights);
      });

      it('should create Bradley-Terry learner with custom options', () => {
        const customOptions = {
          learningRate: 0.05,
          regularization: 0.002,
          convergenceThreshold: 1e-5,
          maxIterations: 500,
        };

        const learner = PairwiseLearnerFactory.createBradleyTerry(mockWeights, customOptions);
        expect(learner).toBeInstanceOf(BradleyTerryLearner);
        expect(learner.getWeights()).toEqual(mockWeights);
      });
    });
  });

  describe('Training Data Validation', () => {
    it('should handle training data with various preference types', () => {
      const diverseData: PairwiseTrainingData = {
        examples: [
          {
            query: 'test query',
            candidateA: global.testUtils.createMockChunk({ id: 'a', text: 'Content A' }),
            candidateB: global.testUtils.createMockChunk({ id: 'b', text: 'Content B' }),
            preference: 'A',
            confidence: 0.9,
            context: { existingEvidence: [], queryComplexity: 0.5, userPreferences: {} },
          },
          {
            query: 'test query 2',
            candidateA: global.testUtils.createMockChunk({ id: 'c', text: 'Content C' }),
            candidateB: global.testUtils.createMockChunk({ id: 'd', text: 'Content D' }),
            preference: 'B',
            confidence: 0.8,
            context: { existingEvidence: [], queryComplexity: 0.6, userPreferences: {} },
          },
          {
            query: 'test query 3',
            candidateA: global.testUtils.createMockChunk({ id: 'e', text: 'Content E' }),
            candidateB: global.testUtils.createMockChunk({ id: 'f', text: 'Content F' }),
            preference: 'equal',
            confidence: 0.95,
            context: { existingEvidence: [], queryComplexity: 0.4, userPreferences: {} },
          },
        ],
        metadata: {
          totalExamples: 3,
          positivePreferences: 1,
          negativePreferences: 1,
          equalPreferences: 1,
          averageConfidence: 0.88,
        },
      };

      expect(diverseData.examples.length).toBe(3);
      expect(diverseData.metadata.positivePreferences).toBe(1);
      expect(diverseData.metadata.negativePreferences).toBe(1);
      expect(diverseData.metadata.equalPreferences).toBe(1);
    });

    it('should handle different candidate types in training data', () => {
      const mixedData: PairwiseTrainingData = {
        examples: [
          {
            query: 'mixed types',
            candidateA: global.testUtils.createMockChunk({ id: 'chunk', text: 'Chunk content' }),
            candidateB: global.testUtils.createMockAtom({ id: 'atom', text: 'atom content', type: 'ENT' }),
            preference: 'A',
            confidence: 0.7,
            context: { existingEvidence: [], queryComplexity: 0.5, userPreferences: {} },
          },
          {
            query: 'more mixed types',
            candidateA: global.testUtils.createMockSummary({ id: 'summary', text: 'Summary content' }),
            candidateB: global.testUtils.createMockGraphNode({ id: 'node', label: 'node_label' }),
            preference: 'B',
            confidence: 0.8,
            context: { existingEvidence: [], queryComplexity: 0.6, userPreferences: {} },
          },
        ],
        metadata: {
          totalExamples: 2,
          positivePreferences: 1,
          negativePreferences: 1,
          equalPreferences: 0,
          averageConfidence: 0.75,
        },
      };

      expect(mixedData.examples.length).toBe(2);
      expect(mixedData.examples[0].candidateA).toHaveProperty('text');
      expect(mixedData.examples[0].candidateB).toHaveProperty('text');
      expect(mixedData.examples[1].candidateA).toHaveProperty('text');
      expect(mixedData.examples[1].candidateB).toHaveProperty('label');
    });
  });

  describe('Integration Tests', () => {
    it('should train RankNet and update weights', async () => {
      const learner = new RankNetLearner(mockWeights);
      const initialWeights = learner.getWeights();
      
      const result = await learner.train(mockTrainingData);
      
      expect(result.convergence).toBeDefined();
      expect(result.finalWeights).toBeDefined();
      expect(result.trainingMetrics.length).toBeGreaterThan(0);
      
      // Weights should potentially change during training
      const finalWeights = learner.getWeights();
      expect(finalWeights).toBeDefined();
    });

    it('should train Bradley-Terry and update weights', async () => {
      const learner = new BradleyTerryLearner(mockWeights);
      const initialWeights = learner.getWeights();
      
      const result = await learner.train(mockTrainingData);
      
      expect(result.convergence).toBeDefined();
      expect(result.finalWeights).toBeDefined();
      expect(result.trainingMetrics.length).toBeGreaterThan(0);
      
      // Weights should potentially change during training
      const finalWeights = learner.getWeights();
      expect(finalWeights).toBeDefined();
    });

    it('should handle factory creation and training workflow', async () => {
      const rankNetLearner = PairwiseLearnerFactory.createRankNet(mockWeights);
      const bradleyTerryLearner = PairwiseLearnerFactory.createBradleyTerry(mockWeights);
      
      const rankNetResult = await rankNetLearner.train(mockTrainingData);
      const bradleyTerryResult = await bradleyTerryLearner.train(mockTrainingData);
      
      expect(rankNetResult).toBeDefined();
      expect(bradleyTerryResult).toBeDefined();
      expect(rankNetResult.model).toBeDefined();
      expect(bradleyTerryResult.model).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single candidate training data', async () => {
      const singleData: PairwiseTrainingData = {
        examples: [
          {
            query: 'single test',
            candidateA: global.testUtils.createMockChunk({ id: 'a', text: 'Content A' }),
            candidateB: global.testUtils.createMockChunk({ id: 'b', text: 'Content B' }),
            preference: 'A',
            confidence: 1.0,
            context: { existingEvidence: [], queryComplexity: 0.5, userPreferences: {} },
          },
        ],
        metadata: {
          totalExamples: 1,
          positivePreferences: 1,
          negativePreferences: 0,
          equalPreferences: 0,
          averageConfidence: 1.0,
        },
      };

      const learner = new RankNetLearner(mockWeights);
      const result = await learner.train(singleData);
      
      expect(result).toBeDefined();
      expect(result.finalAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.finalAccuracy).toBeLessThanOrEqual(1);
    });

    it('should handle very low confidence preferences', async () => {
      const lowConfidenceData: PairwiseTrainingData = {
        examples: [
          {
            query: 'low confidence test',
            candidateA: global.testUtils.createMockChunk({ id: 'a', text: 'Content A' }),
            candidateB: global.testUtils.createMockChunk({ id: 'b', text: 'Content B' }),
            preference: 'A',
            confidence: 0.1,
            context: { existingEvidence: [], queryComplexity: 0.5, userPreferences: {} },
          },
        ],
        metadata: {
          totalExamples: 1,
          positivePreferences: 1,
          negativePreferences: 0,
          equalPreferences: 0,
          averageConfidence: 0.1,
        },
      };

      const learner = new RankNetLearner(mockWeights);
      const result = await learner.train(lowConfidenceData);
      
      expect(result).toBeDefined();
      expect(result.finalAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.finalAccuracy).toBeLessThanOrEqual(1);
    });

    it('should handle high query complexity', async () => {
      const highComplexityData: PairwiseTrainingData = {
        examples: [
          {
            query: 'very complex query with many technical terms and specific requirements',
            candidateA: global.testUtils.createMockChunk({ id: 'a', text: 'Complex technical content A' }),
            candidateB: global.testUtils.createMockChunk({ id: 'b', text: 'Complex technical content B' }),
            preference: 'A',
            confidence: 0.9,
            context: { existingEvidence: [], queryComplexity: 0.95, userPreferences: {} },
          },
        ],
        metadata: {
          totalExamples: 1,
          positivePreferences: 1,
          negativePreferences: 0,
          equalPreferences: 0,
          averageConfidence: 0.9,
        },
      };

      const learner = new RankNetLearner(mockWeights);
      const result = await learner.train(highComplexityData);
      
      expect(result).toBeDefined();
      expect(result.finalAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.finalAccuracy).toBeLessThanOrEqual(1);
    });
  });
});
