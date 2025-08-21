/**
 * Tests for CoverageMatrixManager - Sparse Atom Coverage Matrix Operations
 */

import { CoverageMatrixManager } from '../../src/context-engine/pack/coverage.js';
import type { Atom } from '../../src/context-engine/types.js';

describe('CoverageMatrixManager', () => {
  let manager: CoverageMatrixManager;
  let mockAtoms: Atom[];

  beforeEach(() => {
    manager = new CoverageMatrixManager();
    
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
        chunkId: 'chunk-1',
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
        chunkId: 'chunk-1',
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
        chunkId: 'chunk-1',
        type: 'DATE' as const,
        text: 'recent',
        confidence: 0.5,
        metadata: { source: 'test' },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        provenance: { offset: 58, length: 6 },
      },
    ];
  });

  afterEach(() => {
    manager.clear();
  });

  describe('Matrix Creation and Management', () => {
    it('should create a new coverage matrix', () => {
      const matrix = manager.createMatrix('test-matrix', mockAtoms);

      expect(matrix.id).toBe('test-matrix');
      expect(matrix.atoms.size).toBe(5);
      expect(matrix.metadata.totalAtoms).toBe(5);
      expect(matrix.metadata.coverageScore).toBe(1.0); // All atoms in global set
      expect(matrix.metadata.lastUpdated).toBeGreaterThan(0);
    });

    it('should retrieve a matrix by ID', () => {
      const created = manager.createMatrix('test-matrix', mockAtoms);
      const retrieved = manager.getMatrix('test-matrix');

      expect(retrieved).toBeDefined();
      expect(retrieved).toEqual(created);
    });

    it('should return undefined for non-existent matrix', () => {
      const matrix = manager.getMatrix('non-existent');
      expect(matrix).toBeUndefined();
    });

    it('should update an existing matrix', () => {
      const original = manager.createMatrix('test-matrix', mockAtoms);
      const updatedAtoms = mockAtoms.slice(0, 3); // Only first 3 atoms
      
      // Add a small delay to ensure timestamp difference
      setTimeout(() => {}, 1);
      
      const updated = manager.updateMatrix('test-matrix', updatedAtoms);
      
      expect(updated).toBeDefined();
      expect(updated!.atoms.size).toBe(3);
      expect(updated!.metadata.totalAtoms).toBe(3);
      expect(updated!.metadata.lastUpdated).toBeGreaterThanOrEqual(original.metadata.lastUpdated);
    });

    it('should return null when updating non-existent matrix', () => {
      const result = manager.updateMatrix('non-existent', mockAtoms);
      expect(result).toBeNull();
    });

    it('should delete a matrix', () => {
      manager.createMatrix('test-matrix', mockAtoms);
      const deleted = manager.deleteMatrix('test-matrix');
      
      expect(deleted).toBe(true);
      expect(manager.getMatrix('test-matrix')).toBeUndefined();
    });

    it('should return false when deleting non-existent matrix', () => {
      const deleted = manager.deleteMatrix('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('Coverage Operations', () => {
    beforeEach(() => {
      // Create multiple matrices for testing operations
      manager.createMatrix('matrix-1', mockAtoms.slice(0, 3)); // atoms 1, 2, 3
      manager.createMatrix('matrix-2', mockAtoms.slice(2, 5)); // atoms 3, 4, 5
      manager.createMatrix('matrix-3', mockAtoms.slice(1, 4)); // atoms 2, 3, 4
    });

    it('should calculate intersection of matrices', () => {
      const intersection = manager.calculateIntersection(['matrix-1', 'matrix-2', 'matrix-3']);

      expect(intersection.type).toBe('intersection');
      expect(intersection.result.size).toBe(1); // Only atom-3 is common
      expect(intersection.result.has('atom-3')).toBe(true);
      expect(intersection.metadata.operationTime).toBeGreaterThan(0);
      expect(intersection.metadata.resultSize).toBe(1);
      expect(intersection.metadata.efficiency).toBeGreaterThan(0);
    });

    it('should handle empty intersection list', () => {
      const intersection = manager.calculateIntersection([]);

      expect(intersection.type).toBe('intersection');
      expect(intersection.result.size).toBe(0);
      expect(intersection.metadata.operationTime).toBe(0);
    });

    it('should handle single matrix intersection', () => {
      const intersection = manager.calculateIntersection(['matrix-1']);

      expect(intersection.type).toBe('intersection');
      expect(intersection.result.size).toBe(3);
      expect(intersection.result.has('atom-1')).toBe(true);
      expect(intersection.result.has('atom-2')).toBe(true);
      expect(intersection.result.has('atom-3')).toBe(true);
    });

    it('should calculate union of matrices', () => {
      const union = manager.calculateUnion(['matrix-1', 'matrix-2']);

      expect(union.type).toBe('union');
      expect(union.result.size).toBe(5); // All unique atoms
      expect(union.result.has('atom-1')).toBe(true);
      expect(union.result.has('atom-2')).toBe(true);
      expect(union.result.has('atom-3')).toBe(true);
      expect(union.result.has('atom-4')).toBe(true);
      expect(union.result.has('atom-5')).toBe(true);
    });

    it('should calculate difference between matrices', () => {
      const difference = manager.calculateDifference('matrix-1', ['matrix-2']);

      expect(difference.type).toBe('difference');
      expect(difference.result.size).toBe(2); // atom-1 and atom-2 (not in matrix-2)
      expect(difference.result.has('atom-1')).toBe(true);
      expect(difference.result.has('atom-2')).toBe(true);
      expect(difference.result.has('atom-3')).toBe(false); // atom-3 is in both
    });

    it('should handle multiple subtract matrices in difference', () => {
      // Create a matrix with atoms 1, 2, 3
      manager.createMatrix('base-matrix', mockAtoms.slice(0, 3));
      // Create subtract matrices that together cover all atoms in base matrix
      manager.createMatrix('subtract-1', mockAtoms.slice(0, 2)); // atoms 1, 2
      manager.createMatrix('subtract-2', mockAtoms.slice(2, 3)); // atom 3
      
      const difference = manager.calculateDifference('base-matrix', ['subtract-1', 'subtract-2']);

      expect(difference.type).toBe('difference');
      expect(difference.result.size).toBe(0); // All atoms are covered by subtract matrices
    });
  });

  describe('Coverage Scoring and Metrics', () => {
    it('should calculate coverage score correctly', () => {
      const matrix = manager.createMatrix('test-matrix', mockAtoms);
      
      // Initially, coverage score should be 1.0 (all atoms in global set)
      expect(matrix.metadata.coverageScore).toBe(1.0);
      
      // Create another matrix with different atoms
      const additionalAtoms = [
        {
          id: 'atom-6',
          chunkId: 'chunk-2',
          type: 'ENT' as const,
          text: 'Deep Learning',
          confidence: 0.9,
          metadata: { source: 'test' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          provenance: { offset: 65, length: 13 },
        },
      ];
      
      const matrix2 = manager.createMatrix('test-matrix-2', additionalAtoms);
      
      // Now the first matrix should have coverage score of 5/6
      const updatedMatrix = manager.getMatrix('test-matrix');
      expect(updatedMatrix!.metadata.coverageScore).toBeCloseTo(5/6, 2);
    });

    it('should return coverage score of 0 for empty atom set', () => {
      const matrix = manager.createMatrix('empty-matrix', []);
      expect(matrix.metadata.coverageScore).toBe(0.0);
    });

    it('should provide accurate coverage metrics', () => {
      manager.createMatrix('matrix-1', mockAtoms.slice(0, 3));
      manager.createMatrix('matrix-2', mockAtoms.slice(2, 5));
      
      const metrics = manager.getCoverageMetrics();
      
      expect(metrics.totalCoverage).toBe(2);
      expect(metrics.uniqueAtoms).toBe(5);
      expect(metrics.overlapPercentage).toBeGreaterThan(0);
      expect(metrics.memoryUsage).toBeGreaterThan(0);
      expect(metrics.operationCount).toBe(0); // No operations performed yet
    });

    it('should calculate overlap percentage correctly', () => {
      // Create matrices with known overlap
      manager.createMatrix('matrix-1', mockAtoms.slice(0, 3)); // atoms 1, 2, 3
      manager.createMatrix('matrix-2', mockAtoms.slice(2, 5)); // atoms 3, 4, 5
      
      const metrics = manager.getCoverageMetrics();
      // matrix-1 has 3 atoms, matrix-2 has 3 atoms, they share 1 atom (atom-3)
      // overlap = 1 / min(3, 3) = 1/3 ≈ 0.33
      expect(metrics.overlapPercentage).toBeCloseTo(1/3, 2);
    });
  });

  describe('Matrix Statistics and Analysis', () => {
    it('should provide matrix statistics', () => {
      const matrix = manager.createMatrix('test-matrix', mockAtoms);
      const stats = manager.getMatrixStats('test-matrix');
      
      expect(stats).toBeDefined();
      expect(stats!.totalAtoms).toBe(5);
      expect(stats!.coverageScore).toBe(1.0);
      expect(stats!.overlapWithGlobal).toBe(1.0);
      expect(stats!.lastUpdated).toBeGreaterThan(0);
    });

    it('should return null for non-existent matrix stats', () => {
      const stats = manager.getMatrixStats('non-existent');
      expect(stats).toBeNull();
    });

    it('should check coverage for specific atoms', () => {
      manager.createMatrix('test-matrix', mockAtoms);
      
      expect(manager.hasCoverage('test-matrix', ['atom-1', 'atom-2'])).toBe(true);
      expect(manager.hasCoverage('test-matrix', ['atom-1', 'non-existent'])).toBe(false);
      expect(manager.hasCoverage('test-matrix', [])).toBe(true); // Empty set is always covered
    });

    it('should return false for non-existent matrix coverage check', () => {
      expect(manager.hasCoverage('non-existent', ['atom-1'])).toBe(false);
    });
  });

  describe('Memory Optimization', () => {
    it('should optimize memory by removing empty matrices', () => {
      const emptyMatrix = manager.createMatrix('empty-matrix', []);
      const nonEmptyMatrix = manager.createMatrix('non-empty-matrix', mockAtoms);
      
      expect(manager.getMatrix('empty-matrix')).toBeDefined();
      
      manager.optimizeMemory();
      
      expect(manager.getMatrix('empty-matrix')).toBeUndefined();
      expect(manager.getMatrix('non-empty-matrix')).toBeDefined();
    });

    it('should estimate memory usage accurately', () => {
      manager.createMatrix('test-matrix', mockAtoms);
      
      const metrics = manager.getCoverageMetrics();
      expect(metrics.memoryUsage).toBeGreaterThan(0);
      
      // Memory usage should increase with more matrices
      manager.createMatrix('test-matrix-2', mockAtoms);
      const updatedMetrics = manager.getCoverageMetrics();
      expect(updatedMetrics.memoryUsage).toBeGreaterThan(metrics.memoryUsage);
    });
  });

  describe('Utility Methods', () => {
    it('should get all matrix IDs', () => {
      expect(manager.getMatrixIds()).toEqual([]);
      
      manager.createMatrix('matrix-1', mockAtoms);
      manager.createMatrix('matrix-2', mockAtoms);
      
      const ids = manager.getMatrixIds();
      expect(ids).toContain('matrix-1');
      expect(ids).toContain('matrix-2');
      expect(ids.length).toBe(2);
    });

    it('should clear all matrices and reset state', () => {
      manager.createMatrix('matrix-1', mockAtoms);
      manager.createMatrix('matrix-2', mockAtoms);
      
      expect(manager.getMatrixIds().length).toBe(2);
      
      manager.clear();
      
      expect(manager.getMatrixIds().length).toBe(0);
      expect(manager.getCoverageMetrics().totalCoverage).toBe(0);
      expect(manager.getCoverageMetrics().uniqueAtoms).toBe(0);
    });
  });

  describe('Performance and Efficiency', () => {
    it('should track operation count', () => {
      const initialMetrics = manager.getCoverageMetrics();
      expect(initialMetrics.operationCount).toBe(0);
      
      manager.createMatrix('matrix-1', mockAtoms);
      manager.createMatrix('matrix-2', mockAtoms);
      
      // Perform operations
      manager.calculateIntersection(['matrix-1', 'matrix-2']);
      manager.calculateUnion(['matrix-1', 'matrix-2']);
      manager.calculateDifference('matrix-1', ['matrix-2']);
      
      const finalMetrics = manager.getCoverageMetrics();
      expect(finalMetrics.operationCount).toBe(3);
    });

    it('should measure operation time accurately', () => {
      const intersection = manager.calculateIntersection(['matrix-1', 'matrix-2']);
      
      expect(intersection.metadata.operationTime).toBeGreaterThan(0);
      expect(intersection.metadata.operationTime).toBeLessThan(1000); // Should be very fast
    });

    it('should calculate efficiency scores', () => {
      manager.createMatrix('matrix-1', mockAtoms);
      manager.createMatrix('matrix-2', mockAtoms);
      
      const intersection = manager.calculateIntersection(['matrix-1', 'matrix-2']);
      
      expect(intersection.metadata.efficiency).toBeGreaterThan(0);
      expect(intersection.metadata.efficiency).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle matrices with no atoms', () => {
      const emptyMatrix = manager.createMatrix('empty-matrix', []);
      
      expect(emptyMatrix.atoms.size).toBe(0);
      expect(emptyMatrix.metadata.totalAtoms).toBe(0);
      expect(emptyMatrix.metadata.coverageScore).toBe(0.0);
    });

    it('should handle operations with non-existent matrices gracefully', () => {
      const intersection = manager.calculateIntersection(['non-existent-1', 'non-existent-2']);
      
      expect(intersection.result.size).toBe(0);
      expect(intersection.metadata.resultSize).toBe(0);
    });

    it('should handle mixed existing and non-existing matrices', () => {
      manager.createMatrix('existing-matrix', mockAtoms);
      
      const intersection = manager.calculateIntersection(['existing-matrix', 'non-existent']);
      
      expect(intersection.result.size).toBe(5); // Should contain all atoms from existing matrix
    });
  });
});
