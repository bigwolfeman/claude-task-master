/**
 * Bubble Stabilization Algorithm
 * Implements efficient bubble sort stabilization for ranking refinement
 * with early termination conditions and pass limit controls
 */

import type { Chunk, Atom, Summary, GraphNode } from '../types.js';
import type { RankingCandidate, RankingResult } from './usefulness.js';

export interface BubbleStabilizationOptions {
  maxPasses: number;           // Maximum number of passes (default: 2)
  earlyCutoffThreshold: number; // Stop if less than this % of items change (default: 0.05)
  stabilityThreshold: number;   // Consider stable if less than this % change (default: 0.01)
  enableOptimization: boolean;  // Enable optimization techniques (default: true)
  progressCallback?: (pass: number, changes: number, totalItems: number) => void;
}

export interface StabilizationResult {
  stabilizedCandidates: RankingCandidate[];
  passesCompleted: number;
  totalSwaps: number;
  stabilityScore: number;
  earlyTermination: boolean;
  metadata: {
    initialOrder: string[];
    finalOrder: string[];
    changesPerPass: number[];
    processingTime: number;
  };
}

export interface StabilityMetrics {
  pass: number;
  swaps: number;
  totalItems: number;
  changePercentage: number;
  isStable: boolean;
  earlyTermination: boolean;
}

/**
 * Bubble Stabilization Algorithm
 * Efficiently stabilizes rankings using bubble sort with early termination
 */
export class BubbleStabilizer {
  private options: Required<Omit<BubbleStabilizationOptions, 'progressCallback'>> & {
    progressCallback?: (pass: number, changes: number, totalItems: number) => void;
  };

  constructor(options: Partial<BubbleStabilizationOptions> = {}) {
    this.options = {
      maxPasses: options.maxPasses ?? 2,
      earlyCutoffThreshold: options.earlyCutoffThreshold ?? 0.05,
      stabilityThreshold: options.stabilityThreshold ?? 0.01,
      enableOptimization: options.enableOptimization ?? true,
      progressCallback: options.progressCallback,
    };
  }

  /**
   * Stabilize ranking using bubble sort with early termination
   */
  public stabilize(
    candidates: RankingCandidate[],
    comparisonFunction: (a: RankingCandidate, b: RankingCandidate) => number
  ): StabilizationResult {
    const startTime = performance.now();
    const initialOrder = candidates.map(c => c.id);
    
    // Create a copy to avoid modifying the original
    const workingCandidates = [...candidates];
    const totalItems = workingCandidates.length;
    
    let totalSwaps = 0;
    let passesCompleted = 0;
    let earlyTermination = false;
    const changesPerPass: number[] = [];
    
    // Early termination if no candidates or single candidate
    if (totalItems <= 1) {
      return {
        stabilizedCandidates: workingCandidates,
        passesCompleted: 0,
        totalSwaps: 0,
        stabilityScore: 1.0,
        earlyTermination: false,
        metadata: {
          initialOrder,
          finalOrder: workingCandidates.map(c => c.id),
          changesPerPass: [],
          processingTime: performance.now() - startTime,
        },
      };
    }

    // Main stabilization loop
    for (let pass = 0; pass < this.options.maxPasses; pass++) {
      let passSwaps = 0;
      let swapped = false;
      
      // Single pass of bubble sort
      for (let i = 0; i < totalItems - 1; i++) {
        const comparison = comparisonFunction(workingCandidates[i], workingCandidates[i + 1]);
        
        // If items are in wrong order, swap them
        if (comparison > 0) {
          [workingCandidates[i], workingCandidates[i + 1]] = 
            [workingCandidates[i + 1], workingCandidates[i]];
          passSwaps++;
          swapped = true;
        }
      }
      
      totalSwaps += passSwaps;
      passesCompleted = pass + 1;
      
      // Calculate change percentage for this pass
      const changePercentage = passSwaps / totalItems;
      changesPerPass.push(passSwaps);
      
      // Call progress callback if provided
      if (this.options.progressCallback) {
        this.options.progressCallback(pass + 1, passSwaps, totalItems);
      }
      
      // Check for early termination conditions
      if (this.shouldTerminateEarly(passSwaps, totalItems, pass)) {
        earlyTermination = true;
        break;
      }
      
      // Check for stability (no swaps in this pass)
      if (!swapped) {
        break;
      }
    }
    
    // Calculate final stability score
    const stabilityScore = this.calculateStabilityScore(totalSwaps, totalItems, passesCompleted);
    
    const result: StabilizationResult = {
      stabilizedCandidates: workingCandidates,
      passesCompleted,
      totalSwaps,
      stabilityScore,
      earlyTermination,
      metadata: {
        initialOrder,
        finalOrder: workingCandidates.map(c => c.id),
        changesPerPass,
        processingTime: performance.now() - startTime,
      },
    };
    
    return result;
  }

  /**
   * Determine if early termination should occur
   */
  private shouldTerminateEarly(
    passSwaps: number,
    totalItems: number,
    currentPass: number
  ): boolean {
    const changePercentage = passSwaps / totalItems;
    
    // Early cutoff threshold: stop if very few items are changing
    if (changePercentage < this.options.earlyCutoffThreshold) {
      return true;
    }
    
    // Stability threshold: consider stable if minimal changes
    if (changePercentage < this.options.stabilityThreshold) {
      return true;
    }
    
    // Optimization: if we're on the second pass and changes are minimal, stop
    if (this.options.enableOptimization && currentPass >= 1 && changePercentage < 0.1) {
      return true;
    }
    
    return false;
  }

  /**
   * Calculate stability score (0 = unstable, 1 = perfectly stable)
   */
  private calculateStabilityScore(
    totalSwaps: number,
    totalItems: number,
    passesCompleted: number
  ): number {
    // Perfect stability: no swaps needed
    if (totalSwaps === 0) {
      return 1.0;
    }
    
    // Base stability: fewer swaps = more stable
    const swapPenalty = totalSwaps / (totalItems * passesCompleted);
    
    // Pass efficiency: fewer passes = more stable
    const passPenalty = passesCompleted / this.options.maxPasses;
    
    // Combine penalties into stability score
    const stabilityScore = Math.max(0, 1 - (swapPenalty + passPenalty) / 2);
    
    return stabilityScore;
  }

  /**
   * Optimized bubble sort with early termination
   */
  public stabilizeOptimized(
    candidates: RankingCandidate[],
    comparisonFunction: (a: RankingCandidate, b: RankingCandidate) => number
  ): StabilizationResult {
    if (!this.options.enableOptimization) {
      return this.stabilize(candidates, comparisonFunction);
    }

    const startTime = performance.now();
    const initialOrder = candidates.map(c => c.id);
    
    // Create a copy to avoid modifying the original
    const workingCandidates = [...candidates];
    const totalItems = workingCandidates.length;
    
    let totalSwaps = 0;
    let passesCompleted = 0;
    let earlyTermination = false;
    const changesPerPass: number[] = [];
    
    // Early termination if no candidates or single candidate
    if (totalItems <= 1) {
      return {
        stabilizedCandidates: workingCandidates,
        passesCompleted: 0,
        totalSwaps: 0,
        stabilityScore: 1.0,
        earlyTermination: false,
        metadata: {
          initialOrder,
          finalOrder: workingCandidates.map(c => c.id),
          changesPerPass: [],
          processingTime: performance.now() - startTime,
        },
      };
    }

    // Track the last swapped position for optimization
    let lastSwapPosition = totalItems - 1;
    
    for (let pass = 0; pass < this.options.maxPasses; pass++) {
      let passSwaps = 0;
      let swapped = false;
      let currentLastSwap = 0;
      
      // Optimized bubble sort: only check up to the last swapped position
      for (let i = 0; i < lastSwapPosition; i++) {
        const comparison = comparisonFunction(workingCandidates[i], workingCandidates[i + 1]);
        
        if (comparison > 0) {
          [workingCandidates[i], workingCandidates[i + 1]] = 
            [workingCandidates[i + 1], workingCandidates[i]];
          passSwaps++;
          swapped = true;
          currentLastSwap = i;
        }
      }
      
      // Update last swap position for next pass
      lastSwapPosition = currentLastSwap;
      
      totalSwaps += passSwaps;
      passesCompleted = pass + 1;
      
      // Calculate change percentage for this pass
      const changePercentage = passSwaps / totalItems;
      changesPerPass.push(passSwaps);
      
      // Call progress callback if provided
      if (this.options.progressCallback) {
        this.options.progressCallback(pass + 1, passSwaps, totalItems);
      }
      
      // Check for early termination conditions
      if (this.shouldTerminateEarly(passSwaps, totalItems, pass)) {
        earlyTermination = true;
        break;
      }
      
      // Check for stability (no swaps in this pass)
      if (!swapped) {
        break;
      }
      
      // Optimization: if no swaps occurred, we're done
      if (passSwaps === 0) {
        break;
      }
    }
    
    // Calculate final stability score
    const stabilityScore = this.calculateStabilityScore(totalSwaps, totalItems, passesCompleted);
    
    return {
      stabilizedCandidates: workingCandidates,
      passesCompleted,
      totalSwaps,
      stabilityScore,
      earlyTermination,
      metadata: {
        initialOrder,
        finalOrder: workingCandidates.map(c => c.id),
        changesPerPass,
        processingTime: performance.now() - startTime,
      },
    };
  }

  /**
   * Batch stabilization for multiple ranking results
   */
  public stabilizeBatch(
    rankingResults: RankingResult[],
    comparisonFunction: (a: RankingCandidate, b: RankingCandidate) => number
  ): StabilizationResult[] {
    return rankingResults.map(result => 
      this.stabilize(result.candidates, comparisonFunction)
    );
  }

  /**
   * Get stabilization metrics for analysis
   */
  public getStabilityMetrics(
    candidates: RankingCandidate[],
    comparisonFunction: (a: RankingCandidate, b: RankingCandidate) => number
  ): StabilityMetrics[] {
    const metrics: StabilityMetrics[] = [];
    const workingCandidates = [...candidates];
    const totalItems = workingCandidates.length;
    
    if (totalItems <= 1) {
      return [{
        pass: 0,
        swaps: 0,
        totalItems,
        changePercentage: 0,
        isStable: true,
        earlyTermination: false,
      }];
    }
    
    let totalSwaps = 0;
    
    for (let pass = 0; pass < this.options.maxPasses; pass++) {
      let passSwaps = 0;
      let swapped = false;
      
      // Single pass of bubble sort
      for (let i = 0; i < totalItems - 1; i++) {
        const comparison = comparisonFunction(workingCandidates[i], workingCandidates[i + 1]);
        
        if (comparison > 0) {
          [workingCandidates[i], workingCandidates[i + 1]] = 
            [workingCandidates[i + 1], workingCandidates[i]];
          passSwaps++;
          swapped = true;
        }
      }
      
      totalSwaps += passSwaps;
      const changePercentage = passSwaps / totalItems;
      const isStable = changePercentage < this.options.stabilityThreshold;
      const earlyTermination = this.shouldTerminateEarly(passSwaps, totalItems, pass);
      
      metrics.push({
        pass: pass + 1,
        swaps: passSwaps,
        totalItems,
        changePercentage,
        isStable,
        earlyTermination,
      });
      
      // Stop if stable or early termination
      if (isStable || earlyTermination || !swapped) {
        break;
      }
    }
    
    return metrics;
  }

  /**
   * Update stabilization options
   */
  public updateOptions(newOptions: Partial<BubbleStabilizationOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Get current options
   */
  public getOptions(): Required<Omit<BubbleStabilizationOptions, 'progressCallback'>> & {
    progressCallback?: (pass: number, changes: number, totalItems: number) => void;
  } {
    return { ...this.options };
  }

  /**
   * Reset options to defaults
   */
  public resetOptions(): void {
    this.options = {
      maxPasses: 2,
      earlyCutoffThreshold: 0.05,
      stabilityThreshold: 0.01,
      enableOptimization: true,
      progressCallback: undefined,
    };
  }
}

/**
 * Factory for creating bubble stabilizers with common configurations
 */
export class BubbleStabilizerFactory {
  /**
   * Create a conservative stabilizer (more passes, higher thresholds)
   */
  static createConservative(): BubbleStabilizer {
    return new BubbleStabilizer({
      maxPasses: 3,
      earlyCutoffThreshold: 0.1,
      stabilityThreshold: 0.05,
      enableOptimization: true,
    });
  }

  /**
   * Create an aggressive stabilizer (fewer passes, lower thresholds)
   */
  static createAggressive(): BubbleStabilizer {
    return new BubbleStabilizer({
      maxPasses: 1,
      earlyCutoffThreshold: 0.02,
      stabilityThreshold: 0.005,
      enableOptimization: true,
    });
  }

  /**
   * Create a balanced stabilizer (default settings)
   */
  static createBalanced(): BubbleStabilizer {
    return new BubbleStabilizer();
  }

  /**
   * Create a custom stabilizer with specific options
   */
  static createCustom(options: BubbleStabilizationOptions): BubbleStabilizer {
    return new BubbleStabilizer(options);
  }
}
