/**
 * proof.test.ts
 * Tests for ProofCalculator class
 */

import { ProofCalculator } from '../../../src/context-engine/router/proof.js';
import type { PackingResult, PackingCandidate } from '../../../src/context-engine/pack/max_coverage.js';
import type { Chunk, Atom } from '../../../src/context-engine/types.js';

describe('ProofCalculator', () => {
  let proofCalculator: ProofCalculator;
  let mockPackingResult: PackingResult;
  let mockQueryAtoms: Atom[];
  let mockEvidenceChunks: Chunk[];

  beforeEach(() => {
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
  });

  describe('calculateProof', () => {
    it('should calculate comprehensive proof metrics', () => {
      const result = proofCalculator.calculateProof(mockPackingResult, mockQueryAtoms, mockEvidenceChunks);

      expect(result.coverage).toBe(1.0); // All atoms covered
      expect(result.conflicts).toBe(0); // No conflicts
      expect(result.supportStyle).toBe('span'); // High coverage, direct quotes
      expect(result.confidence).toBeGreaterThan(0.8); // High confidence
      expect(result.selectedEvidence).toHaveLength(2);
      expect(result.metadata.totalAtoms).toBe(3);
      expect(result.metadata.coveredAtoms).toBe(3);
      expect(result.metadata.conflictingPairs).toBe(0);
    });

    it('should handle empty query atoms', () => {
      const result = proofCalculator.calculateProof(mockPackingResult, [], mockEvidenceChunks);

      expect(result.coverage).toBe(0);
      expect(result.metadata.totalAtoms).toBe(0);
      expect(result.metadata.coveredAtoms).toBe(0);
    });

    it('should handle empty packing result', () => {
      const emptyPackingResult: PackingResult = {
        ...mockPackingResult,
        selectedCandidates: [],
        totalCoverage: 0,
        coveragePercentage: 0,
      };

      const result = proofCalculator.calculateProof(emptyPackingResult, mockQueryAtoms, mockEvidenceChunks);

      expect(result.coverage).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.selectedEvidence).toHaveLength(0);
    });
  });

  describe('coverage calculation', () => {
    it('should calculate coverage percentage correctly', () => {
      const result = proofCalculator.calculateProof(mockPackingResult, mockQueryAtoms, mockEvidenceChunks);
      expect(result.coverage).toBe(1.0); // 3/3 atoms covered
    });

    it('should handle partial coverage', () => {
      const partialAtoms = mockQueryAtoms.slice(0, 2); // Only 2 atoms
      const result = proofCalculator.calculateProof(mockPackingResult, partialAtoms, mockEvidenceChunks);
      expect(result.coverage).toBe(1.0); // 2/2 atoms covered
    });

    it('should handle no coverage', () => {
      const noCoverageResult: PackingResult = {
        ...mockPackingResult,
        selectedCandidates: [],
        totalCoverage: 0,
        coveragePercentage: 0,
      };

      const result = proofCalculator.calculateProof(noCoverageResult, mockQueryAtoms, mockEvidenceChunks);
      expect(result.coverage).toBe(0);
    });
  });

  describe('conflict detection', () => {
    it('should detect no conflicts when evidence is consistent', () => {
      const result = proofCalculator.calculateProof(mockPackingResult, mockQueryAtoms, mockEvidenceChunks);
      expect(result.conflicts).toBe(0);
    });

    it('should detect conflicts when evidence overlaps significantly', () => {
      const conflictingPackingResult: PackingResult = {
        ...mockPackingResult,
        selectedCandidates: [
          {
            ...mockPackingResult.selectedCandidates[0],
            candidate: { ...mockPackingResult.selectedCandidates[0].candidate, id: 'chunk-1' },
            atomIds: ['atom-1', 'atom-2'],
          },
          {
            ...mockPackingResult.selectedCandidates[1],
            candidate: { ...mockPackingResult.selectedCandidates[1].candidate, id: 'chunk-2' },
            atomIds: ['atom-1', 'atom-3'], // Overlaps with atom-1
          },
        ],
      };

      const result = proofCalculator.calculateProof(conflictingPackingResult, mockQueryAtoms, mockEvidenceChunks);
      expect(result.conflicts).toBeGreaterThan(0);
    });

    it('should handle conflicting evidence with different content', () => {
      const conflictingChunks: Chunk[] = [
        {
          id: 'chunk-1',
          docId: 'doc-1',
          text: 'John Doe is a Software Engineer',
          tokens: 6,
          metadata: {},
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'chunk-2',
          docId: 'doc-2',
          text: 'John Doe is NOT a Software Engineer', // Contradiction
          tokens: 7,
          metadata: {},
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const conflictingPackingResult: PackingResult = {
        ...mockPackingResult,
        selectedCandidates: [
          {
            ...mockPackingResult.selectedCandidates[0],
            candidate: { ...mockPackingResult.selectedCandidates[0].candidate, id: 'chunk-1' },
          },
          {
            ...mockPackingResult.selectedCandidates[1],
            candidate: { ...mockPackingResult.selectedCandidates[1].candidate, id: 'chunk-2' },
            atomIds: ['atom-1'], // Same atom, different content
          },
        ],
      };

      const result = proofCalculator.calculateProof(conflictingPackingResult, mockQueryAtoms, conflictingChunks);
      expect(result.conflicts).toBeGreaterThan(0);
    });
  });

  describe('support style determination', () => {
    it('should determine span style for high-quality evidence with direct quotes', () => {
      const result = proofCalculator.calculateProof(mockPackingResult, mockQueryAtoms, mockEvidenceChunks);
      expect(result.supportStyle).toBe('span');
    });

    it('should determine paraphrase style for good coverage without direct quotes', () => {
      const noQuotesChunks: Chunk[] = mockEvidenceChunks.map(chunk => ({
        ...chunk,
        text: chunk.text.replace(/["'`]/g, ''), // Remove quotes
      }));

      const result = proofCalculator.calculateProof(mockPackingResult, mockQueryAtoms, noQuotesChunks);
      expect(result.supportStyle).toBe('paraphrase');
    });

    it('should determine none style for insufficient evidence quality', () => {
      const lowQualityPackingResult: PackingResult = {
        ...mockPackingResult,
        selectedCandidates: mockPackingResult.selectedCandidates.map(candidate => ({
          ...candidate,
          utilityScore: 0.3, // Low utility
        })),
        coveragePercentage: 0.3, // Low coverage
      };

      const result = proofCalculator.calculateProof(lowQualityPackingResult, mockQueryAtoms, mockEvidenceChunks);
      expect(result.supportStyle).toBe('none');
    });
  });

  describe('confidence calculation', () => {
    it('should calculate high confidence for high coverage and low conflicts', () => {
      const result = proofCalculator.calculateProof(mockPackingResult, mockQueryAtoms, mockEvidenceChunks);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should reduce confidence for conflicts', () => {
      const conflictingPackingResult: PackingResult = {
        ...mockPackingResult,
        selectedCandidates: [
          {
            ...mockPackingResult.selectedCandidates[0],
            atomIds: ['atom-1', 'atom-2'],
          },
          {
            ...mockPackingResult.selectedCandidates[1],
            atomIds: ['atom-1', 'atom-3'], // Overlaps with atom-1
          },
        ],
      };

      const result = proofCalculator.calculateProof(conflictingPackingResult, mockQueryAtoms, mockEvidenceChunks);
      expect(result.confidence).toBeLessThan(0.8);
    });

    it('should increase confidence for span support style', () => {
      const result = proofCalculator.calculateProof(mockPackingResult, mockQueryAtoms, mockEvidenceChunks);
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('evidence analysis', () => {
    it('should analyze selected evidence correctly', () => {
      const result = proofCalculator.calculateProof(mockPackingResult, mockQueryAtoms, mockEvidenceChunks);
      
      expect(result.selectedEvidence).toHaveLength(2);
      expect(result.selectedEvidence[0].chunkId).toBe('chunk-1');
      expect(result.selectedEvidence[0].relevance).toBe(0.85);
      expect(result.selectedEvidence[1].chunkId).toBe('chunk-2');
      expect(result.selectedEvidence[1].relevance).toBe(0.65);
    });

    it('should calculate evidence quality correctly', () => {
      const result = proofCalculator.calculateProof(mockPackingResult, mockQueryAtoms, mockEvidenceChunks);
      
      // Average of 0.85 and 0.65
      const expectedQuality = (0.85 + 0.65) / 2;
      expect(result.metadata.evidenceQuality).toBeCloseTo(expectedQuality, 2);
    });
  });

  describe('edge cases', () => {
    it('should handle single evidence piece', () => {
      const singleEvidenceResult: PackingResult = {
        ...mockPackingResult,
        selectedCandidates: [mockPackingResult.selectedCandidates[0]],
        totalTokens: 6,
        totalCoverage: 0.8,
        coveragePercentage: 0.67, // 2/3 atoms
      };

      const result = proofCalculator.calculateProof(singleEvidenceResult, mockQueryAtoms, mockEvidenceChunks);
      expect(result.selectedEvidence).toHaveLength(1);
      expect(result.coverage).toBeCloseTo(0.67, 2);
    });

    it('should handle evidence with no atom overlap', () => {
      const noOverlapResult: PackingResult = {
        ...mockPackingResult,
        selectedCandidates: [
          {
            ...mockPackingResult.selectedCandidates[0],
            atomIds: ['atom-1'],
          },
          {
            ...mockPackingResult.selectedCandidates[1],
            atomIds: ['atom-3'], // No overlap with atom-1
          },
        ],
      };

      const result = proofCalculator.calculateProof(noOverlapResult, mockQueryAtoms, mockEvidenceChunks);
      expect(result.conflicts).toBe(0); // No conflicts when no overlap
    });

    it('should handle very high conflict scenarios', () => {
      const highConflictResult: PackingResult = {
        ...mockPackingResult,
        selectedCandidates: [
          {
            ...mockPackingResult.selectedCandidates[0],
            atomIds: ['atom-1', 'atom-2'],
          },
          {
            ...mockPackingResult.selectedCandidates[1],
            atomIds: ['atom-1', 'atom-2'], // Complete overlap
          },
        ],
      };

      const result = proofCalculator.calculateProof(highConflictResult, mockQueryAtoms, mockEvidenceChunks);
      expect(result.conflicts).toBeGreaterThan(0);
    });
  });

  describe('performance and scalability', () => {
    it('should handle large numbers of candidates efficiently', () => {
      const largePackingResult: PackingResult = {
        ...mockPackingResult,
        selectedCandidates: Array.from({ length: 100 }, (_, i) => ({
          id: `candidate-${i}`,
                     candidate: {
             id: `chunk-${i}`,
             type: 'chunk',
             factors: { relevance: 0.8, informationGain: 0.7, trust: 0.9, reusability: 0.6, tokenCost: 5, conflictRisk: 0.1 },
             metadata: {},
             content: { id: `chunk-${i}`, docId: `doc-${i}`, text: `Evidence ${i}`, tokens: 5, metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
             utilityScore: 0.75,
           },
          atomIds: [`atom-${i}`],
          tokenCost: 5,
          coverageGain: 0.5,
          utilityScore: 0.75,
          priority: 'medium',
          estimatedTokens: 5,
        })),
        totalTokens: 500,
        totalCoverage: 50,
        coveragePercentage: 0.5,
        budgetUtilization: 0.8,
        metadata: {
          algorithm: 'greedy',
          iterations: 100,
          processingTime: 50,
          coverageMatrixId: 'matrix-large',
        },
      };

      const startTime = performance.now();
      const result = proofCalculator.calculateProof(largePackingResult, mockQueryAtoms, mockEvidenceChunks);
      const endTime = performance.now();

      expect(result.selectedEvidence).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
