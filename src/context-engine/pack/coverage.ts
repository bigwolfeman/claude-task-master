/**
 * Sparse Atom Coverage Matrix Operations
 * Implements memory-efficient coverage matrix operations for atom coverage tracking
 * and optimization in the max-coverage packing algorithm
 */

import type { Atom } from '../types.js';

export interface CoverageMatrix {
  id: string;
  atoms: Set<string>; // Set of atom IDs for efficient lookup
  metadata: {
    totalAtoms: number;
    coverageScore: number;
    lastUpdated: number;
  };
}

export interface CoverageOperation {
  type: 'intersection' | 'union' | 'difference';
  result: Set<string>;
  metadata: {
    operationTime: number;
    resultSize: number;
    efficiency: number; // Memory efficiency of the operation
  };
}

export interface CoverageMetrics {
  totalCoverage: number;
  uniqueAtoms: number;
  overlapPercentage: number;
  memoryUsage: number;
  operationCount: number;
}

/**
 * Sparse Coverage Matrix Manager
 * Handles efficient atom coverage operations using sparse data structures
 */
export class CoverageMatrixManager {
  private matrices: Map<string, CoverageMatrix> = new Map();
  private globalAtomSet: Set<string> = new Set();
  private metrics: CoverageMetrics = {
    totalCoverage: 0,
    uniqueAtoms: 0,
    overlapPercentage: 0,
    memoryUsage: 0,
    operationCount: 0,
  };

  constructor() {
    this.updateMetrics();
  }

  /**
   * Create a new coverage matrix from atoms
   */
  public createMatrix(id: string, atoms: Atom[]): CoverageMatrix {
    const atomIds = new Set(atoms.map(atom => atom.id));
    const matrix: CoverageMatrix = {
      id,
      atoms: atomIds,
      metadata: {
        totalAtoms: atomIds.size,
        coverageScore: this.calculateCoverageScore(atomIds),
        lastUpdated: Date.now(),
      },
    };

    this.matrices.set(id, matrix);
    this.updateGlobalAtomSet();
    this.updateAllCoverageScores();
    this.updateMetrics();
    
    return matrix;
  }

  /**
   * Get a coverage matrix by ID
   */
  public getMatrix(id: string): CoverageMatrix | undefined {
    return this.matrices.get(id);
  }

  /**
   * Update an existing coverage matrix
   */
  public updateMatrix(id: string, atoms: Atom[]): CoverageMatrix | null {
    const existing = this.matrices.get(id);
    if (!existing) {
      return null;
    }

    const atomIds = new Set(atoms.map(atom => atom.id));
    existing.atoms = atomIds;
    existing.metadata.totalAtoms = atomIds.size;
    existing.metadata.coverageScore = this.calculateCoverageScore(atomIds);
    existing.metadata.lastUpdated = Date.now();

    this.updateGlobalAtomSet();
    this.updateAllCoverageScores();
    this.updateMetrics();
    
    return existing;
  }

  /**
   * Delete a coverage matrix
   */
  public deleteMatrix(id: string): boolean {
    const deleted = this.matrices.delete(id);
    if (deleted) {
      this.updateGlobalAtomSet();
      this.updateAllCoverageScores();
      this.updateMetrics();
    }
    return deleted;
  }

  /**
   * Calculate intersection of multiple coverage matrices
   */
  public calculateIntersection(matrixIds: string[]): CoverageOperation {
    const startTime = performance.now();
    
    if (matrixIds.length === 0) {
      return {
        type: 'intersection',
        result: new Set(),
        metadata: {
          operationTime: 0,
          resultSize: 0,
          efficiency: 1.0,
        },
      };
    }

    if (matrixIds.length === 1) {
      const matrix = this.matrices.get(matrixIds[0]);
      return {
        type: 'intersection',
        result: new Set(matrix?.atoms || []),
        metadata: {
          operationTime: performance.now() - startTime,
          resultSize: matrix?.atoms.size || 0,
          efficiency: 1.0,
        },
      };
    }

    // Start with the first matrix
    let result = new Set(this.matrices.get(matrixIds[0])?.atoms || []);
    
    // Intersect with remaining matrices
    for (let i = 1; i < matrixIds.length; i++) {
      const matrix = this.matrices.get(matrixIds[i]);
      if (matrix) {
        result = this.intersectSets(result, matrix.atoms);
      }
    }

    this.metrics.operationCount++;
    
    return {
      type: 'intersection',
      result,
      metadata: {
        operationTime: performance.now() - startTime,
        resultSize: result.size,
        efficiency: this.calculateEfficiency(result.size, matrixIds.length),
      },
    };
  }

  /**
   * Calculate union of multiple coverage matrices
   */
  public calculateUnion(matrixIds: string[]): CoverageOperation {
    const startTime = performance.now();
    
    if (matrixIds.length === 0) {
      return {
        type: 'union',
        result: new Set(),
        metadata: {
          operationTime: 0,
          resultSize: 0,
          efficiency: 1.0,
        },
      };
    }

    if (matrixIds.length === 1) {
      const matrix = this.matrices.get(matrixIds[0]);
      return {
        type: 'union',
        result: new Set(matrix?.atoms || []),
        metadata: {
          operationTime: performance.now() - startTime,
          resultSize: matrix?.atoms.size || 0,
          efficiency: 1.0,
        },
      };
    }

    // Start with the first matrix
    let result = new Set(this.matrices.get(matrixIds[0])?.atoms || []);
    
    // Union with remaining matrices
    for (let i = 1; i < matrixIds.length; i++) {
      const matrix = this.matrices.get(matrixIds[i]);
      if (matrix) {
        result = this.unionSets(result, matrix.atoms);
      }
    }

    this.metrics.operationCount++;
    
    return {
      type: 'union',
      result,
      metadata: {
        operationTime: performance.now() - startTime,
        resultSize: result.size,
        efficiency: this.calculateEfficiency(result.size, matrixIds.length),
      },
    };
  }

  /**
   * Calculate difference between coverage matrices
   */
  public calculateDifference(baseMatrixId: string, subtractMatrixIds: string[]): CoverageOperation {
    const startTime = performance.now();
    
    const baseMatrix = this.matrices.get(baseMatrixId);
    if (!baseMatrix) {
      return {
        type: 'difference',
        result: new Set(),
        metadata: {
          operationTime: performance.now() - startTime,
          resultSize: 0,
          efficiency: 1.0,
        },
      };
    }

    let result = new Set(baseMatrix.atoms);
    
    // Subtract each matrix
    for (const matrixId of subtractMatrixIds) {
      const matrix = this.matrices.get(matrixId);
      if (matrix) {
        result = this.differenceSets(result, matrix.atoms);
      }
    }

    this.metrics.operationCount++;
    
    return {
      type: 'difference',
      result,
      metadata: {
        operationTime: performance.now() - startTime,
        resultSize: result.size,
        efficiency: this.calculateEfficiency(result.size, subtractMatrixIds.length + 1),
      },
    };
  }

  /**
   * Calculate coverage score for a set of atoms
   */
  public calculateCoverageScore(atoms: Set<string>): number {
    if (this.globalAtomSet.size === 0) {
      return atoms.size > 0 ? 1.0 : 0.0;
    }
    
    return atoms.size / this.globalAtomSet.size;
  }

  /**
   * Get coverage metrics for optimization analysis
   */
  public getCoverageMetrics(): CoverageMetrics {
    return { ...this.metrics };
  }

  /**
   * Get all matrix IDs
   */
  public getMatrixIds(): string[] {
    return Array.from(this.matrices.keys());
  }

  /**
   * Check if a matrix covers specific atoms
   */
  public hasCoverage(matrixId: string, atomIds: string[]): boolean {
    const matrix = this.matrices.get(matrixId);
    if (!matrix) {
      return false;
    }
    
    return atomIds.every(atomId => matrix.atoms.has(atomId));
  }

  /**
   * Get coverage statistics for a matrix
   */
  public getMatrixStats(matrixId: string): {
    totalAtoms: number;
    coverageScore: number;
    overlapWithGlobal: number;
    lastUpdated: number;
  } | null {
    const matrix = this.matrices.get(matrixId);
    if (!matrix) {
      return null;
    }

    const overlapWithGlobal = this.calculateOverlap(matrix.atoms, this.globalAtomSet);
    
    return {
      totalAtoms: matrix.metadata.totalAtoms,
      coverageScore: matrix.metadata.coverageScore,
      overlapWithGlobal,
      lastUpdated: matrix.metadata.lastUpdated,
    };
  }

  /**
   * Optimize memory usage by compressing sparse matrices
   */
  public optimizeMemory(): void {
    // Remove empty matrices
    for (const [id, matrix] of this.matrices.entries()) {
      if (matrix.atoms.size === 0) {
        this.matrices.delete(id);
      }
    }
    
    this.updateGlobalAtomSet();
    this.updateAllCoverageScores();
    this.updateMetrics();
  }

  /**
   * Clear all matrices and reset state
   */
  public clear(): void {
    this.matrices.clear();
    this.globalAtomSet.clear();
    this.metrics = {
      totalCoverage: 0,
      uniqueAtoms: 0,
      overlapPercentage: 0,
      memoryUsage: 0,
      operationCount: 0,
    };
  }

  // Private helper methods

  private intersectSets(setA: Set<string>, setB: Set<string>): Set<string> {
    const result = new Set<string>();
    for (const item of setA) {
      if (setB.has(item)) {
        result.add(item);
      }
    }
    return result;
  }

  private unionSets(setA: Set<string>, setB: Set<string>): Set<string> {
    const result = new Set(setA);
    for (const item of setB) {
      result.add(item);
    }
    return result;
  }

  private differenceSets(setA: Set<string>, setB: Set<string>): Set<string> {
    const result = new Set(setA);
    for (const item of setB) {
      result.delete(item);
    }
    return result;
  }

  private calculateOverlap(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 || setB.size === 0) {
      return 0;
    }
    
    let overlap = 0;
    for (const item of setA) {
      if (setB.has(item)) {
        overlap++;
      }
    }
    
    return overlap / Math.min(setA.size, setB.size);
  }

  private calculateEfficiency(resultSize: number, operationCount: number): number {
    // Efficiency based on result size relative to operation complexity
    if (operationCount === 0) {
      return 1.0;
    }
    
    return Math.min(1.0, resultSize / operationCount);
  }

  private updateGlobalAtomSet(): void {
    this.globalAtomSet.clear();
    for (const matrix of this.matrices.values()) {
      for (const atomId of matrix.atoms) {
        this.globalAtomSet.add(atomId);
      }
    }
  }

  private updateAllCoverageScores(): void {
    for (const matrix of this.matrices.values()) {
      matrix.metadata.coverageScore = this.calculateCoverageScore(matrix.atoms);
      matrix.metadata.lastUpdated = Date.now();
    }
  }

  private updateMetrics(): void {
    this.metrics.totalCoverage = this.matrices.size;
    this.metrics.uniqueAtoms = this.globalAtomSet.size;
    this.metrics.memoryUsage = this.estimateMemoryUsage();
    
    // Calculate overlap percentage across all matrices
    if (this.matrices.size > 1) {
      let totalOverlap = 0;
      let comparisonCount = 0;
      
      const matrixArray = Array.from(this.matrices.values());
      for (let i = 0; i < matrixArray.length; i++) {
        for (let j = i + 1; j < matrixArray.length; j++) {
          totalOverlap += this.calculateOverlap(matrixArray[i].atoms, matrixArray[j].atoms);
          comparisonCount++;
        }
      }
      
      this.metrics.overlapPercentage = comparisonCount > 0 ? totalOverlap / comparisonCount : 0;
    } else {
      this.metrics.overlapPercentage = 0;
    }
  }

  private estimateMemoryUsage(): number {
    // Rough estimate of memory usage in bytes
    let totalBytes = 0;
    
    // Matrix metadata overhead
    totalBytes += this.matrices.size * 200; // Rough estimate for metadata
    
    // Atom ID storage (assuming average 20 bytes per string)
    for (const matrix of this.matrices.values()) {
      totalBytes += matrix.atoms.size * 20;
    }
    
    return totalBytes;
  }
}
