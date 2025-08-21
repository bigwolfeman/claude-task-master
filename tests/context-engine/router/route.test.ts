/**
 * route.test.ts
 * Tests for AnswerabilityProofRouter class
 */

import { AnswerabilityProofRouter } from '../../../src/context-engine/router/route.js';
import { ProofCalculator } from '../../../src/context-engine/router/proof.js';
import type { PackingResult } from '../../../src/context-engine/pack/max_coverage.js';
import type { Chunk, Atom } from '../../../src/context-engine/types.js';
import type { ProofMetrics } from '../../../src/context-engine/router/proof.js';
import type { LLMTier } from '../../../src/context-engine/router/route.js';

describe('AnswerabilityProofRouter', () => {
  let router: AnswerabilityProofRouter;
  let proofCalculator: ProofCalculator;
  let mockPackingResult: PackingResult;
  let mockQueryAtoms: Atom[];
  let mockEvidenceChunks: Chunk[];
  let mockProofMetrics: ProofMetrics;

  beforeEach(() => {
    router = new AnswerabilityProofRouter();
    proofCalculator = new ProofCalculator();
    
    // Create mock data
    mockQueryAtoms = [
      {
        id: 'atom-1',
        chunkId: 'chunk-1',
        type: 'ENT',
        text: 'John Doe',
        confidence: 0.95,
        metadata: {},
        provenance: { offset: 0, length: 8 },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'atom-2',
        chunkId: 'chunk-1',
        type: 'ENT',
        text: 'Software Engineer',
        confidence: 0.9,
        metadata: {},
        provenance: { offset: 10, length: 16 },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'atom-3',
        chunkId: 'chunk-2',
        type: 'ENT',
        text: 'Tech Company',
        confidence: 0.85,
        metadata: {},
        provenance: { offset: 0, length: 11 },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    mockEvidenceChunks = [
      {
        id: 'chunk-1',
        docId: 'doc-1',
        text: 'John Doe is a "Software Engineer"',
        tokens: 6,
        metadata: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'chunk-2',
        docId: 'doc-2',
        text: 'Tech Company employs many engineers',
        tokens: 6,
        metadata: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    mockPackingResult = {
      selectedCandidates: [
        {
          id: 'candidate-1',
          candidate: {
            id: 'chunk-1',
            type: 'chunk',
            factors: { relevance: 0.9, informationGain: 0.8, trust: 0.95, reusability: 0.7, tokenCost: 6, conflictRisk: 0.1 },
            metadata: {},
            content: { id: 'chunk-1', docId: 'doc-1', text: 'John Doe is a "Software Engineer"', tokens: 6, metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
            utilityScore: 0.85,
          },
          atomIds: ['atom-1', 'atom-2'],
          tokenCost: 6,
          coverageGain: 0.8,
          utilityScore: 0.85,
          priority: 'high',
          estimatedTokens: 6,
        },
        {
          id: 'candidate-2',
          candidate: {
            id: 'chunk-2',
            type: 'chunk',
            factors: { relevance: 0.7, informationGain: 0.6, trust: 0.8, reusability: 0.5, tokenCost: 6, conflictRisk: 0.2 },
            metadata: {},
            content: { id: 'chunk-2', docId: 'doc-2', text: 'Tech Company employs many engineers', tokens: 6, metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
            utilityScore: 0.65,
          },
          atomIds: ['atom-3'],
          tokenCost: 6,
          coverageGain: 0.4,
          utilityScore: 0.65,
          priority: 'medium',
          estimatedTokens: 6,
        },
      ],
      totalTokens: 12,
      totalCoverage: 1.2,
      coveragePercentage: 1.0,
      budgetUtilization: 0.8,
      metadata: {
        algorithm: 'greedy',
        iterations: 2,
        processingTime: 10,
        coverageMatrixId: 'matrix-1',
      },
    };

    mockProofMetrics = {
      coverage: 1.0,
      conflicts: 0,
      supportStyle: 'span',
      confidence: 0.95,
      selectedEvidence: [
        {
          chunkId: 'chunk-1',
          span: undefined,
          relevance: 0.85,
          conflictRisk: 0.1,
        },
        {
          chunkId: 'chunk-2',
          span: undefined,
          relevance: 0.65,
          conflictRisk: 0.2,
        },
      ],
      metadata: {
        totalAtoms: 3,
        coveredAtoms: 3,
        conflictingPairs: 0,
        evidenceQuality: 0.75,
        timestamp: '2024-01-01T00:00:00Z',
      },
    };
  });

  describe('constructor and configuration', () => {
    it('should initialize with default configuration', () => {
      const defaultRouter = new AnswerabilityProofRouter();
      const config = defaultRouter.getTierConfig('none');
      
      expect(config.coverageMin).toBe(0.9);
      expect(config.conflictsMax).toBe(0.1);
      expect(config.confidenceMin).toBe(0.95);
      expect(config.supportStyle).toBe('span');
    });

    it('should allow custom configuration override', () => {
      const customConfig = {
        none: {
          coverageMin: 0.8,
          conflictsMax: 0.2,
          confidenceMin: 0.9,
          supportStyle: 'span' as const,
        },
      };
      
      const customRouter = new AnswerabilityProofRouter(customConfig);
      const config = customRouter.getTierConfig('none');
      
      expect(config.coverageMin).toBe(0.8);
      expect(config.conflictsMax).toBe(0.2);
      expect(config.confidenceMin).toBe(0.9);
    });
  });

  describe('routeQuery', () => {
    it('should route to none tier for high-confidence deterministic answers', () => {
      const decision = router.routeQuery(mockProofMetrics, mockPackingResult, mockQueryAtoms, mockEvidenceChunks);
      
      expect(decision.tier).toBe('none');
      expect(decision.confidence).toBe(0.95);
      expect(decision.reasoning).toContain('High-confidence deterministic answer possible');
      expect(decision.fallbackStrategy).toBeUndefined();
    });

    it('should route to small tier for good coverage with synthesis needs', () => {
      const smallTierMetrics: ProofMetrics = {
        ...mockProofMetrics,
        coverage: 0.75,
        confidence: 0.82,
        supportStyle: 'paraphrase',
      };

      const decision = router.routeQuery(smallTierMetrics, mockPackingResult, mockQueryAtoms, mockEvidenceChunks);
      
      expect(decision.tier).toBe('small');
      expect(decision.reasoning).toContain('Small tier appropriate');
      expect(decision.fallbackStrategy).toBeDefined();
    });

    it('should route to premium tier for complex cases', () => {
      const premiumTierMetrics: ProofMetrics = {
        ...mockProofMetrics,
        coverage: 0.45,
        confidence: 0.65,
        supportStyle: 'none',
        conflicts: 0.4,
      };

      const decision = router.routeQuery(premiumTierMetrics, mockPackingResult, mockQueryAtoms, mockEvidenceChunks);
      
      expect(decision.tier).toBe('premium');
      expect(decision.reasoning).toContain('Premium tier required');
      expect(decision.fallbackStrategy).toBeDefined();
    });

    it('should include routing factors in metadata', () => {
      const decision = router.routeQuery(mockProofMetrics, mockPackingResult, mockQueryAtoms, mockEvidenceChunks);
      
      expect(decision.metadata.routingFactors).toBeDefined();
      expect(decision.metadata.routingFactors.coverage).toBe(1.0);
      expect(decision.metadata.routingFactors.conflicts).toBe(0);
      expect(decision.metadata.routingFactors.supportStyle).toBe('span');
      expect(decision.metadata.routingFactors.evidenceQuality).toBe(0.75);
    });
  });

  describe('tier determination logic', () => {
    it('should determine none tier for very high confidence and coverage', () => {
      const highConfidenceMetrics: ProofMetrics = {
        ...mockProofMetrics,
        coverage: 0.95,
        confidence: 0.98,
        conflicts: 0.05,
        supportStyle: 'span',
      };

      const decision = router.routeQuery(highConfidenceMetrics, mockPackingResult, mockQueryAtoms, mockEvidenceChunks);
      expect(decision.tier).toBe('none');
    });

    it('should determine small tier for moderate confidence and good coverage', () => {
      const moderateMetrics: ProofMetrics = {
        ...mockProofMetrics,
        coverage: 0.75,
        confidence: 0.82,
        conflicts: 0.2,
        supportStyle: 'paraphrase',
      };

      const decision = router.routeQuery(moderateMetrics, mockPackingResult, mockQueryAtoms, mockEvidenceChunks);
      expect(decision.tier).toBe('small');
    });

    it('should determine premium tier for low confidence or high conflicts', () => {
      const lowConfidenceMetrics: ProofMetrics = {
        ...mockProofMetrics,
        coverage: 0.45,
        confidence: 0.55,
        conflicts: 0.5,
        supportStyle: 'none',
      };

      const decision = router.routeQuery(lowConfidenceMetrics, mockPackingResult, mockQueryAtoms, mockEvidenceChunks);
      expect(decision.tier).toBe('premium');
    });
  });

  describe('fallback strategy determination', () => {
    it('should determine escalation strategy for small tier with insufficient coverage', () => {
      const insufficientCoverageMetrics: ProofMetrics = {
        ...mockProofMetrics,
        coverage: 0.65, // Below 0.7 threshold
        confidence: 0.82,
        supportStyle: 'paraphrase',
      };

      const decision = router.routeQuery(insufficientCoverageMetrics, mockPackingResult, mockQueryAtoms, mockEvidenceChunks);
      
      expect(decision.tier).toBe('small');
      expect(decision.fallbackStrategy).toContain('escalate_to_premium_due_to_insufficient_coverage');
    });

    it('should determine escalation strategy for small tier with high conflicts', () => {
      const highConflictMetrics: ProofMetrics = {
        ...mockProofMetrics,
        coverage: 0.75,
        confidence: 0.82,
        conflicts: 0.35, // Above 0.3 threshold
        supportStyle: 'paraphrase',
      };

      const decision = router.routeQuery(highConflictMetrics, mockPackingResult, mockQueryAtoms, mockEvidenceChunks);
      
      expect(decision.tier).toBe('small');
      expect(decision.fallbackStrategy).toContain('escalate_to_premium_for_conflict_resolution');
    });

    it('should determine premium tier fallback strategies', () => {
      const premiumMetrics: ProofMetrics = {
        ...mockProofMetrics,
        coverage: 0.35, // Below 0.4 threshold
        confidence: 0.55, // Below 0.6 threshold
        conflicts: 0.7, // Above 0.6 threshold
        supportStyle: 'none',
      };

      const decision = router.routeQuery(premiumMetrics, mockPackingResult, mockQueryAtoms, mockEvidenceChunks);
      
      expect(decision.tier).toBe('premium');
      expect(decision.fallbackStrategy).toContain('request_more_evidence_or_clarification');
    });
  });

  describe('deterministic answer generation', () => {
    it('should generate deterministic answer for span support style', () => {
      const deterministicMetrics: ProofMetrics = {
        ...mockProofMetrics,
        supportStyle: 'span',
        confidence: 0.98,
      };

      const answer = router.generateDeterministicAnswer(deterministicMetrics, mockPackingResult, mockEvidenceChunks);
      
      expect(answer.answer).toBeDefined();
      expect(answer.confidence).toBe(0.98);
      expect(answer.evidence).toHaveLength(2);
      expect(answer.reasoning).toContain('Direct answer generated');
      expect(answer.requiresVerification).toBe(false);
    });

    it('should throw error for non-span support style', () => {
      const nonSpanMetrics: ProofMetrics = {
        ...mockProofMetrics,
        supportStyle: 'paraphrase',
      };

      expect(() => {
        router.generateDeterministicAnswer(nonSpanMetrics, mockPackingResult, mockEvidenceChunks);
      }).toThrow('Deterministic answers require span support style');
    });

    it('should require verification for borderline confidence', () => {
      const borderlineMetrics: ProofMetrics = {
        ...mockProofMetrics,
        supportStyle: 'span',
        confidence: 0.97, // Below 0.98 threshold
      };

      const answer = router.generateDeterministicAnswer(borderlineMetrics, mockPackingResult, mockEvidenceChunks);
      expect(answer.requiresVerification).toBe(true);
    });

    it('should require verification when conflicts exist', () => {
      const conflictMetrics: ProofMetrics = {
        ...mockProofMetrics,
        supportStyle: 'span',
        confidence: 0.99,
        metadata: {
          ...mockProofMetrics.metadata,
          conflictingPairs: 1,
        },
      };

      const answer = router.generateDeterministicAnswer(conflictMetrics, mockPackingResult, mockEvidenceChunks);
      expect(answer.requiresVerification).toBe(true);
    });
  });

  describe('configuration management', () => {
    it('should allow updating tier configuration', () => {
      const newConfig = {
        coverageMin: 0.85,
        conflictsMax: 0.15,
        confidenceMin: 0.92,
        supportStyle: 'span' as const,
      };

      router.updateTierConfig('none', newConfig);
      const updatedConfig = router.getTierConfig('none');
      
      expect(updatedConfig.coverageMin).toBe(0.85);
      expect(updatedConfig.conflictsMax).toBe(0.15);
      expect(updatedConfig.confidenceMin).toBe(0.92);
    });

    it('should preserve other tier configurations when updating one', () => {
      const originalSmallConfig = router.getTierConfig('small');
      const originalPremiumConfig = router.getTierConfig('premium');
      
      router.updateTierConfig('none', { coverageMin: 0.8 });
      
      expect(router.getTierConfig('small')).toEqual(originalSmallConfig);
      expect(router.getTierConfig('premium')).toEqual(originalPremiumConfig);
    });
  });

  describe('routing decision validation', () => {
    it('should validate consistent routing decisions', () => {
      const decision = router.routeQuery(mockProofMetrics, mockPackingResult, mockQueryAtoms, mockEvidenceChunks);
      const isValid = router.validateRoutingDecision(decision);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid routing decisions', () => {
      const invalidMetrics: ProofMetrics = {
        ...mockProofMetrics,
        coverage: 0.85, // Below 0.9 threshold for none tier
        confidence: 0.98,
        supportStyle: 'span',
      };

      const decision = router.routeQuery(invalidMetrics, mockPackingResult, mockQueryAtoms, mockEvidenceChunks);
      
      // This should route to a different tier, but if we manually set it to 'none', it should be invalid
      const invalidDecision = { ...decision, tier: 'none' as LLMTier };
      const isValid = router.validateRoutingDecision(invalidDecision);
      
      expect(isValid).toBe(false);
    });
  });

  describe('routing statistics', () => {
    it('should provide routing statistics structure', () => {
      const stats = router.getRoutingStats();
      
      expect(stats.totalRoutings).toBe(0);
      expect(stats.tierDistribution).toEqual({ none: 0, small: 0, premium: 0 });
      expect(stats.averageConfidence).toEqual({ none: 0, small: 0, premium: 0 });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty evidence chunks', () => {
      const emptyChunks: Chunk[] = [];
      const decision = router.routeQuery(mockProofMetrics, mockPackingResult, mockQueryAtoms, emptyChunks);
      
      expect(decision.tier).toBeDefined();
      expect(decision.metadata.routingFactors.evidenceQuality).toBe(0);
    });

    it('should handle very low confidence scenarios', () => {
      const veryLowConfidenceMetrics: ProofMetrics = {
        ...mockProofMetrics,
        coverage: 0.3,
        confidence: 0.3,
        conflicts: 0.8,
        supportStyle: 'none',
      };

      const decision = router.routeQuery(veryLowConfidenceMetrics, mockPackingResult, mockQueryAtoms, mockEvidenceChunks);
      
      expect(decision.tier).toBe('premium');
      expect(decision.fallbackStrategy).toContain('apply_uncertainty_quantification');
    });

    it('should handle borderline tier decisions', () => {
      const borderlineMetrics: ProofMetrics = {
        ...mockProofMetrics,
        coverage: 0.69, // Just below 0.7 threshold for small tier
        confidence: 0.79, // Just below 0.8 threshold for small tier
        supportStyle: 'paraphrase',
      };

      const decision = router.routeQuery(borderlineMetrics, mockPackingResult, mockQueryAtoms, mockEvidenceChunks);
      
      expect(decision.tier).toBe('premium');
    });
  });

  describe('integration with proof calculator', () => {
    it('should work with proof calculator output', () => {
      const calculatedProof = proofCalculator.calculateProof(mockPackingResult, mockQueryAtoms, mockEvidenceChunks);
      const decision = router.routeQuery(calculatedProof, mockPackingResult, mockQueryAtoms, mockEvidenceChunks);
      
      expect(decision.tier).toBeDefined();
      expect(decision.confidence).toBe(calculatedProof.confidence);
      expect(decision.metadata.proofMetrics).toEqual(calculatedProof);
    });
  });
});
