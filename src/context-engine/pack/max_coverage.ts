/**
 * Budgeted Max-Coverage Algorithm Core
 * Implements intelligent packing of evidence under strict token budgets
 * with atom coverage maximization using greedy selection strategy
 */

import type { RankingCandidate } from '../rank/usefulness.js';
import { CoverageMatrixManager, type CoverageMatrix } from './coverage.js';
import type { Chunk, PackingResult } from '../types.js';

export interface PackingCandidate {
  id: string;
  candidate: RankingCandidate;
  atomIds: string[];
  tokenCost: number;
  coverageGain: number;
  utilityScore: number;
  actualCoverageGain?: number; // Actual coverage gain after accounting for overlaps
  priority: 'high' | 'medium' | 'low'; // Priority level for budget allocation
  estimatedTokens: number; // Accurate token count estimation
}



export interface PackingOptions {
  maxTokens: number;
  minCoverageThreshold?: number;
  enableDiversity?: boolean;
  diversityWeight?: number;
  maxCandidates?: number;
  coverageMatrixId?: string;
  // MMR (Maximal Marginal Relevance) parameters
  enableMMR?: boolean;
  lambdaRelevance?: number; // λ parameter for MMR: λ × Relevance - (1-λ) × Diversity
  // Knapsack fallback parameters
  enableKnapsackFallback?: boolean;
  knapsackThreshold?: number; // Performance threshold to trigger knapsack fallback
  maxKnapsackCandidates?: number; // Maximum candidates to consider in knapsack (for performance)
  // Dynamic budget allocation parameters
  enableDynamicBudget?: boolean;
  priorityWeights?: {
    high: number;
    medium: number;
    low: number;
  };
  budgetBuffer?: number; // Percentage of budget to reserve for high-priority items
}

/**
 * Budgeted Max-Coverage Algorithm
 * Efficiently packs evidence candidates under token budget constraints
 * while maximizing atom coverage using greedy selection strategy
 */
export class BudgetedMaxCoverage {
  private coverageManager: CoverageMatrixManager;
  private options: Required<PackingOptions>;

  constructor(options: PackingOptions) {
    this.coverageManager = new CoverageMatrixManager();
    this.options = {
      maxTokens: options.maxTokens,
      minCoverageThreshold: options.minCoverageThreshold ?? 0.1,
      enableDiversity: options.enableDiversity ?? true,
      diversityWeight: options.diversityWeight ?? 0.3,
      maxCandidates: options.maxCandidates ?? 100,
      coverageMatrixId: options.coverageMatrixId ?? 'default',
      enableMMR: options.enableMMR ?? false,
      lambdaRelevance: options.lambdaRelevance ?? 0.3,
      enableKnapsackFallback: options.enableKnapsackFallback ?? false,
      knapsackThreshold: options.knapsackThreshold ?? 0.8,
      maxKnapsackCandidates: options.maxKnapsackCandidates ?? 50,
      enableDynamicBudget: options.enableDynamicBudget ?? false,
      priorityWeights: options.priorityWeights ?? { high: 3, medium: 2, low: 1 },
      budgetBuffer: options.budgetBuffer ?? 0.2, // 20% buffer for high-priority items
    };
  }

  /**
   * Pack candidates using budgeted max-coverage algorithm
   */
  public packCandidates(
    candidates: RankingCandidate[],
    atomMapping: Map<string, string[]> // candidate ID -> atom IDs
  ): PackingResult {
    const startTime = performance.now();
    
    // Create coverage matrix for this packing operation
    const coverageMatrixId = `${this.options.coverageMatrixId}_${Date.now()}`;
    this.createCoverageMatrix(coverageMatrixId, candidates, atomMapping);
    
    // Convert candidates to packing candidates
    const packingCandidates = this.createPackingCandidates(candidates, atomMapping);
    
    // Choose selection strategy based on configuration
    const selectedCandidates: PackingCandidate[] = [];
    let remainingTokens = this.options.maxTokens;
    let coveredAtoms = new Set<string>();
    let iterations = 0;
    
    let algorithmUsed: 'greedy' | 'mmr' | 'priority' | 'knapsack' = 'greedy';
    
    if (this.options.enableMMR) {
      // MMR-based selection: select best candidate at each iteration
      selectedCandidates.push(...this.selectWithMMR(packingCandidates, remainingTokens, coveredAtoms));
      iterations = selectedCandidates.length;
      algorithmUsed = 'mmr';
    } else if (this.options.enableDynamicBudget) {
      // Priority-based budget allocation
      selectedCandidates.push(...this.selectWithPriorityBudget(packingCandidates, remainingTokens));
      iterations = selectedCandidates.length;
      algorithmUsed = 'priority';
      
      // Calculate actual coverage gains and update covered atoms
      for (const candidate of selectedCandidates) {
        const actualCoverageGain = this.calculateActualCoverageGain(
          candidate.atomIds,
          coveredAtoms
        );
        candidate.actualCoverageGain = actualCoverageGain;
        
        // Update covered atoms
        for (const atomId of candidate.atomIds) {
          coveredAtoms.add(atomId);
        }
      }
    } else {
      // Original greedy selection with efficiency sorting
      packingCandidates.sort((a, b) => {
        const efficiencyA = a.coverageGain / Math.max(a.tokenCost, 1);
        const efficiencyB = b.coverageGain / Math.max(b.tokenCost, 1);
        return efficiencyB - efficiencyA;
      });
      
      for (const candidate of packingCandidates) {
        if (selectedCandidates.length >= this.options.maxCandidates) {
          break;
        }
        
        if (candidate.tokenCost > remainingTokens) {
          continue;
        }
        
        // Calculate actual coverage gain for this candidate
        const actualCoverageGain = this.calculateActualCoverageGain(
          candidate.atomIds,
          coveredAtoms
        );
        
        if (actualCoverageGain === 0) {
          continue; // No new coverage
        }
        
        // Apply diversity penalty if enabled
        let adjustedUtility = candidate.utilityScore;
        if (this.options.enableDiversity) {
          const diversityPenalty = this.calculateDiversityPenalty(
            candidate,
            selectedCandidates
          );
          adjustedUtility *= (1 - this.options.diversityWeight * diversityPenalty);
        }
        
        // Check if this candidate provides sufficient value
        const efficiency = actualCoverageGain / candidate.tokenCost;
        if (efficiency < this.options.minCoverageThreshold) {
          continue;
        }
        
        // Select this candidate
        selectedCandidates.push(candidate);
        remainingTokens -= candidate.tokenCost;
        
        // Update covered atoms
        for (const atomId of candidate.atomIds) {
          coveredAtoms.add(atomId);
        }
        
        iterations++;
        
        // Check if we've reached sufficient coverage
        if (this.options.minCoverageThreshold > 0 && 
            coveredAtoms.size >= this.options.minCoverageThreshold * this.getTotalAtoms()) {
          break;
        }
      }
    }
    
    // Check if knapsack fallback should be triggered
    let finalSelectedCandidates = selectedCandidates;
    
    if (this.shouldUseKnapsackFallback(packingCandidates, selectedCandidates)) {
      // Try knapsack optimization as fallback
      const knapsackResult = this.selectWithKnapsack(packingCandidates, this.options.maxTokens);
      
      // Compare results and use the better one
      const greedyEfficiency = this.calculateEfficiency(selectedCandidates);
      const knapsackEfficiency = this.calculateEfficiency(knapsackResult);
      
      if (knapsackEfficiency > greedyEfficiency) {
        finalSelectedCandidates = knapsackResult;
        algorithmUsed = 'knapsack';
        iterations = knapsackResult.length;
      }
    }
    
    // Recalculate final token usage and coverage
    remainingTokens = this.options.maxTokens;
    coveredAtoms.clear();
    for (const selected of finalSelectedCandidates) {
      remainingTokens -= selected.tokenCost;
      for (const atomId of selected.atomIds) {
        coveredAtoms.add(atomId);
      }
    }
    
    // Calculate final metrics
    const totalTokens = this.options.maxTokens - remainingTokens;
    const totalCoverage = coveredAtoms.size;
    const totalAtoms = this.getTotalAtoms();
    const coveragePercentage = totalAtoms > 0 ? totalCoverage / totalAtoms : 0;
    const budgetUtilization = totalTokens / this.options.maxTokens;
    
    // Create a local result object with the properties we need
    const localResult = {
      selectedCandidates: finalSelectedCandidates,
      totalTokens,
      totalCoverage,
      coveragePercentage,
      budgetUtilization,
      metadata: {
        algorithm: algorithmUsed,
        iterations,
        processingTime: performance.now() - startTime,
        coverageMatrixId,
      },
    };
    
    // Clean up coverage matrix
    this.coverageManager.deleteMatrix(coverageMatrixId);
    
    return localResult;
  }

  /**
   * Create packing candidates with coverage information
   */
  private createPackingCandidates(
    candidates: RankingCandidate[],
    atomMapping: Map<string, string[]>
  ): PackingCandidate[] {
    const packingCandidates: PackingCandidate[] = [];
    
    for (const candidate of candidates) {
      const atomIds = atomMapping.get(candidate.id) || [];
      const tokenCost = this.estimateTokenCost(candidate);
      const coverageGain = atomIds.length; // Initial coverage gain
      const priority = this.determinePriority(candidate);
      const estimatedTokens = this.estimateTokenCost(candidate);
      
      packingCandidates.push({
        id: candidate.id,
        candidate,
        atomIds,
        tokenCost,
        coverageGain,
        utilityScore: candidate.utilityScore,
        priority,
        estimatedTokens,
      });
    }
    
    return packingCandidates;
  }

  /**
   * Create coverage matrix for the packing operation
   */
  private createCoverageMatrix(
    matrixId: string,
    candidates: RankingCandidate[],
    atomMapping: Map<string, string[]>
  ): void {
    // Collect all unique atoms
    const allAtoms = new Set<string>();
    for (const atomIds of atomMapping.values()) {
      for (const atomId of atomIds) {
        allAtoms.add(atomId);
      }
    }
    
    // Create mock atoms for coverage tracking
    // In a real implementation, these would come from the actual atom store
    const mockAtoms = Array.from(allAtoms).map(atomId => ({
      id: atomId,
      chunkId: 'packing-chunk',
      type: 'ENT' as const,
      text: `Atom ${atomId}`,
      confidence: 0.8,
      metadata: { source: 'packing' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      provenance: { offset: 0, length: 10 },
    }));
    
    this.coverageManager.createMatrix(matrixId, mockAtoms);
  }

  /**
   * Calculate actual coverage gain considering already covered atoms
   */
  private calculateActualCoverageGain(
    candidateAtomIds: string[],
    coveredAtoms: Set<string>
  ): number {
    let gain = 0;
    for (const atomId of candidateAtomIds) {
      if (!coveredAtoms.has(atomId)) {
        gain++;
      }
    }
    return gain;
  }

  /**
   * Calculate diversity penalty to encourage variety in selection
   */
  private calculateDiversityPenalty(
    candidate: PackingCandidate,
    selectedCandidates: PackingCandidate[]
  ): number {
    if (selectedCandidates.length === 0) {
      return 0;
    }
    
    let totalSimilarity = 0;
    for (const selected of selectedCandidates) {
      const similarity = this.calculateSimilarity(candidate, selected);
      totalSimilarity += similarity;
    }
    
    return totalSimilarity / selectedCandidates.length;
  }

  /**
   * Calculate similarity between two candidates
   */
  private calculateSimilarity(
    candidateA: PackingCandidate,
    candidateB: PackingCandidate
  ): number {
    // Simple Jaccard similarity based on atom overlap
    const intersection = new Set(
      candidateA.atomIds.filter(id => candidateB.atomIds.includes(id))
    );
    const union = new Set([...candidateA.atomIds, ...candidateB.atomIds]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Calculate MMR (Maximal Marginal Relevance) score for a candidate
   * MMR = λ × Relevance - (1-λ) × max_similarity_to_selected
   */
  private calculateMMRScore(
    candidate: PackingCandidate,
    selectedCandidates: PackingCandidate[]
  ): number {
    const lambda = this.options.lambdaRelevance;
    const relevance = candidate.utilityScore;
    
    // If no candidates selected yet, return pure relevance
    if (selectedCandidates.length === 0) {
      return lambda * relevance;
    }
    
    // Find maximum similarity to any selected candidate
    let maxSimilarity = 0;
    for (const selected of selectedCandidates) {
      const similarity = this.calculateSimilarity(candidate, selected);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
    
    // MMR formula: λ × Relevance - (1-λ) × max_similarity
    return lambda * relevance - (1 - lambda) * maxSimilarity;
  }

  /**
   * Select candidates using MMR (Maximal Marginal Relevance) strategy
   */
  private selectWithMMR(
    candidates: PackingCandidate[],
    remainingTokens: number,
    coveredAtoms: Set<string>
  ): PackingCandidate[] {
    const selected: PackingCandidate[] = [];
    const available = [...candidates]; // Copy to avoid modifying original
    let tokensLeft = remainingTokens;
    
    while (available.length > 0 && selected.length < this.options.maxCandidates) {
      let bestCandidate: PackingCandidate | null = null;
      let bestScore = -Infinity;
      let bestIndex = -1;
      
      // Find candidate with highest MMR score that fits budget and adds coverage
      for (let i = 0; i < available.length; i++) {
        const candidate = available[i];
        
        // Check budget constraint
        if (candidate.tokenCost > tokensLeft) {
          continue;
        }
        
        // Calculate actual coverage gain
        const actualCoverageGain = this.calculateActualCoverageGain(
          candidate.atomIds,
          coveredAtoms
        );
        
        // Skip if no new coverage
        if (actualCoverageGain === 0) {
          continue;
        }
        
        // Check minimum coverage threshold
        const efficiency = actualCoverageGain / candidate.tokenCost;
        if (efficiency < this.options.minCoverageThreshold) {
          continue;
        }
        
        // Calculate MMR score
        const mmrScore = this.calculateMMRScore(candidate, selected);
        
        // Weight MMR score by coverage gain to prefer candidates with actual value
        const weightedScore = mmrScore * (actualCoverageGain / candidate.coverageGain);
        
        if (weightedScore > bestScore) {
          bestScore = weightedScore;
          bestCandidate = candidate;
          bestIndex = i;
        }
      }
      
      // If no suitable candidate found, break
      if (!bestCandidate) {
        break;
      }
      
      // Select the best candidate
      selected.push(bestCandidate);
      tokensLeft -= bestCandidate.tokenCost;
      
      // Update covered atoms
      for (const atomId of bestCandidate.atomIds) {
        coveredAtoms.add(atomId);
      }
      
      // Remove selected candidate from available list
      available.splice(bestIndex, 1);
      
      // Check if we've reached sufficient coverage
      if (this.options.minCoverageThreshold > 0 && 
          coveredAtoms.size >= this.options.minCoverageThreshold * this.getTotalAtoms()) {
        break;
      }
    }
    
    return selected;
  }

  /**
   * Select candidates using knapsack optimization (0/1 knapsack problem)
   * Provides optimal subset selection under budget constraints
   */
  private selectWithKnapsack(
    candidates: PackingCandidate[],
    maxTokens: number
  ): PackingCandidate[] {
    // Limit candidates for performance reasons
    const limitedCandidates = candidates.slice(0, this.options.maxKnapsackCandidates);
    
    // Use dynamic programming to solve 0/1 knapsack
    const n = limitedCandidates.length;
    const W = maxTokens;
    
    // Create DP table: dp[i][w] = max value achievable with first i items and weight w
    const dp: number[][] = Array(n + 1).fill(null).map(() => Array(W + 1).fill(0));
    
    // Fill DP table
    for (let i = 1; i <= n; i++) {
      const candidate = limitedCandidates[i - 1];
      const weight = candidate.tokenCost;
      const value = candidate.coverageGain;
      
      for (let w = 0; w <= W; w++) {
        if (weight <= w) {
          // Can include this candidate
          dp[i][w] = Math.max(
            dp[i - 1][w], // Don't include
            dp[i - 1][w - weight] + value // Include
          );
        } else {
          // Cannot include this candidate
          dp[i][w] = dp[i - 1][w];
        }
      }
    }
    
    // Backtrack to find selected candidates
    const selected: PackingCandidate[] = [];
    let w = W;
    for (let i = n; i > 0; i--) {
      if (dp[i][w] !== dp[i - 1][w]) {
        // This candidate was included
        const candidate = limitedCandidates[i - 1];
        selected.unshift(candidate);
        w -= candidate.tokenCost;
      }
    }
    
    // Calculate actual coverage gains for selected candidates
    let coveredAtoms = new Set<string>();
    for (const candidate of selected) {
      const actualCoverageGain = this.calculateActualCoverageGain(
        candidate.atomIds,
        coveredAtoms
      );
      candidate.actualCoverageGain = actualCoverageGain;
      
      // Update covered atoms
      for (const atomId of candidate.atomIds) {
        coveredAtoms.add(atomId);
      }
    }
    
    return selected;
  }

  /**
   * Determine if knapsack fallback should be triggered
   * Based on performance metrics and configuration
   */
  private shouldUseKnapsackFallback(
    candidates: PackingCandidate[],
    greedyResult: PackingCandidate[]
  ): boolean {
    if (!this.options.enableKnapsackFallback) {
      return false;
    }
    
    // Check if we have enough candidates to make knapsack worthwhile
    if (candidates.length < 10) {
      return false;
    }
    
    // Check if greedy result meets performance threshold
    const totalCoverage = greedyResult.reduce((sum, c) => sum + (c.actualCoverageGain || 0), 0);
    const totalTokens = greedyResult.reduce((sum, c) => sum + c.tokenCost, 0);
    const efficiency = totalCoverage / Math.max(totalTokens, 1);
    
    // If efficiency is below threshold, try knapsack
    return efficiency < this.options.knapsackThreshold;
  }

  /**
   * Calculate efficiency score for a set of candidates
   * Higher score = better coverage per token
   */
  private calculateEfficiency(candidates: PackingCandidate[]): number {
    if (candidates.length === 0) {
      return 0;
    }
    
    const totalCoverage = candidates.reduce((sum, c) => sum + (c.actualCoverageGain || 0), 0);
    const totalTokens = candidates.reduce((sum, c) => sum + c.tokenCost, 0);
    
    return totalTokens > 0 ? totalCoverage / totalTokens : 0;
  }

  /**
   * Estimate token cost for a candidate with enhanced accuracy
   */
  private estimateTokenCost(candidate: RankingCandidate): number {
    // Use the token cost from factors if available
    if (candidate.factors && typeof candidate.factors.tokenCost === 'number') {
      return Math.max(1, Math.round(candidate.factors.tokenCost * 100));
    }
    
    // Enhanced estimation based on content type and length
    const content = this.extractContent(candidate);
    const contentType = this.detectContentType(content);
    
    // Different token ratios for different content types
    const tokenRatios = {
      'text': 4,      // General text: ~4 chars per token
      'code': 3,      // Code: ~3 chars per token (more dense)
      'json': 2.5,    // JSON: ~2.5 chars per token (very dense)
      'markdown': 3.5, // Markdown: ~3.5 chars per token
    };
    
    const ratio = tokenRatios[contentType] || 4;
    return Math.max(1, Math.ceil(content.length / ratio));
  }

  /**
   * Detect content type for more accurate token estimation
   */
  private detectContentType(content: string): 'text' | 'code' | 'json' | 'markdown' {
    if (content.includes('{') && content.includes('}') && content.includes('"')) {
      return 'json';
    }
    if (content.includes('```') || content.includes('function') || content.includes('const ')) {
      return 'code';
    }
    if (content.includes('#') || content.includes('*') || content.includes('[')) {
      return 'markdown';
    }
    return 'text';
  }

  /**
   * Determine priority level for a candidate based on utility and other factors
   */
  private determinePriority(candidate: RankingCandidate): 'high' | 'medium' | 'low' {
    const utilityScore = candidate.utilityScore;
    
    // High priority: utility score >= 0.8
    if (utilityScore >= 0.8) {
      return 'high';
    }
    
    // Medium priority: utility score >= 0.5
    if (utilityScore >= 0.5) {
      return 'medium';
    }
    
    // Low priority: utility score < 0.5
    return 'low';
  }

  /**
   * Allocate budget dynamically based on priority levels
   */
  private allocateBudgetByPriority(
    candidates: PackingCandidate[],
    totalBudget: number
  ): Map<'high' | 'medium' | 'low', number> {
    const priorityCounts = {
      high: 0,
      medium: 0,
      low: 0,
    };
    
    // Count candidates by priority
    for (const candidate of candidates) {
      priorityCounts[candidate.priority]++;
    }
    
    const weights = this.options.priorityWeights;
    const buffer = this.options.budgetBuffer;
    
    // Reserve buffer for high-priority items
    const reservedBudget = totalBudget * buffer;
    const remainingBudget = totalBudget - reservedBudget;
    
    // Calculate weighted allocation
    const totalWeight = weights.high * priorityCounts.high + 
                       weights.medium * priorityCounts.medium + 
                       weights.low * priorityCounts.low;
    
    if (totalWeight === 0) {
      // Fallback to equal distribution
      return new Map([
        ['high', reservedBudget + remainingBudget / 3],
        ['medium', remainingBudget / 3],
        ['low', remainingBudget / 3],
      ]);
    }
    
    const highBudget = reservedBudget + (remainingBudget * weights.high * priorityCounts.high) / totalWeight;
    const mediumBudget = (remainingBudget * weights.medium * priorityCounts.medium) / totalWeight;
    const lowBudget = (remainingBudget * weights.low * priorityCounts.low) / totalWeight;
    
    return new Map([
      ['high', Math.max(0, highBudget)],
      ['medium', Math.max(0, mediumBudget)],
      ['low', Math.max(0, lowBudget)],
    ]);
  }

  /**
   * Select candidates with priority-based budget enforcement
   */
  private selectWithPriorityBudget(
    candidates: PackingCandidate[],
    totalBudget: number
  ): PackingCandidate[] {
    if (!this.options.enableDynamicBudget) {
      // Fall back to regular selection
      return this.selectWithGreedy(candidates, totalBudget);
    }
    
    // Sort candidates by priority (high first) then by utility score
    const sortedCandidates = [...candidates].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      
      // Within same priority, sort by utility score
      return b.utilityScore - a.utilityScore;
    });
    
    // Allocate budget by priority
    const budgetAllocation = this.allocateBudgetByPriority(sortedCandidates, totalBudget);
    
    const selected: PackingCandidate[] = [];
    const remainingBudget = new Map(budgetAllocation);
    
    // Select candidates within their priority budget
    for (const candidate of sortedCandidates) {
      const priority = candidate.priority;
      const availableBudget = remainingBudget.get(priority) || 0;
      
      if (candidate.tokenCost <= availableBudget) {
        selected.push(candidate);
        remainingBudget.set(priority, availableBudget - candidate.tokenCost);
      }
    }
    
    return selected;
  }

  /**
   * Fallback greedy selection method
   */
  private selectWithGreedy(candidates: PackingCandidate[], totalBudget: number): PackingCandidate[] {
    // Sort by efficiency (coverage gain per token)
    const sortedCandidates = [...candidates].sort((a, b) => {
      const efficiencyA = a.coverageGain / Math.max(a.tokenCost, 1);
      const efficiencyB = b.coverageGain / Math.max(b.tokenCost, 1);
      return efficiencyB - efficiencyA;
    });
    
    const selected: PackingCandidate[] = [];
    let remainingBudget = totalBudget;
    
    for (const candidate of sortedCandidates) {
      if (candidate.tokenCost <= remainingBudget) {
        selected.push(candidate);
        remainingBudget -= candidate.tokenCost;
      }
    }
    
    return selected;
  }

  /**
   * Extract content from candidate for token estimation
   */
  private extractContent(candidate: RankingCandidate): string {
    if (candidate.content && typeof candidate.content === 'object') {
      if ('text' in candidate.content) {
        return candidate.content.text;
      }
      if ('label' in candidate.content) {
        return candidate.content.label || '';
      }
    }
    return '';
  }

  /**
   * Get total number of atoms in the system
   */
  private getTotalAtoms(): number {
    const metrics = this.coverageManager.getCoverageMetrics();
    return metrics.uniqueAtoms;
  }

  /**
   * Get current packing options
   */
  public getOptions(): Required<PackingOptions> {
    return { ...this.options };
  }

  /**
   * Update packing options
   */
  public updateOptions(newOptions: Partial<PackingOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Reset options to defaults
   */
  public resetOptions(): void {
    this.options = {
      maxTokens: this.options.maxTokens,
      minCoverageThreshold: 0.1,
      enableDiversity: true,
      diversityWeight: 0.3,
      maxCandidates: 100,
      coverageMatrixId: 'default',
      enableMMR: false,
      lambdaRelevance: 0.3,
      enableKnapsackFallback: false,
      knapsackThreshold: 0.8,
      maxKnapsackCandidates: 50,
      enableDynamicBudget: false,
      priorityWeights: { high: 3, medium: 2, low: 1 },
      budgetBuffer: 0.2,
    };
  }

  /**
   * Get coverage manager for external operations
   */
  public getCoverageManager(): CoverageMatrixManager {
    return this.coverageManager;
  }
}

/**
 * MaxCoveragePacker - Wrapper class for BudgetedMaxCoverage
 * Provides the interface expected by the ContextOrchestrator
 */
export class MaxCoveragePacker {
  private budgetedPacker: BudgetedMaxCoverage;

  constructor(options: PackingOptions) {
    this.budgetedPacker = new BudgetedMaxCoverage(options);
  }

  /**
   * Pack candidates using max coverage algorithm
   * @param candidates - Ranked candidates to pack
   * @param atoms - Available atoms for coverage
   * @param budget - Token budget constraint
   * @param options - Additional packing options
   * @returns PackingResult compatible with types.ts interface
   */
  public packMaxCoverage(
    candidates: RankingCandidate[],
    atoms: string[],
    budget: number,
    options: { mmr?: number } = {}
  ): PackingResult {
    // Create atom mapping from candidates to atoms
    const atomMapping = new Map<string, string[]>();
    
    // For now, create a simple mapping - each candidate covers some atoms
    // This is a placeholder implementation
    candidates.forEach((candidate, index) => {
      const candidateAtoms = atoms.slice(index * 2, (index + 1) * 2); // Simple distribution
      atomMapping.set(candidate.id, candidateAtoms);
    });

    // Update packer options with budget and MMR settings
    const packerOptions: PackingOptions = {
      maxTokens: budget,
      enableMMR: options.mmr !== undefined,
      lambdaRelevance: options.mmr || 0.3
    };

    // Create a new packer instance with updated options
    const packer = new BudgetedMaxCoverage(packerOptions);
    
    // Pack candidates
    const result = packer.packCandidates(candidates, atomMapping);
    
    // Create chunks for compatibility with types.ts interface
    const chunks = candidates.map(candidate => {
      if (candidate.type === 'chunk') {
        return candidate.content as Chunk;
      }
      // For other types, create a placeholder chunk
      return {
        id: candidate.id,
        docId: 'placeholder',
        text: this.extractTextFromCandidate(candidate),
        tokens: 0,
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as Chunk;
    });
    
    // Add chunks property for compatibility with orchestrator
    return {
      ...result,
      chunks
    };
  }

  /**
   * Extract text from a ranking candidate
   */
  private extractTextFromCandidate(candidate: RankingCandidate): string {
    if (candidate.type === 'chunk' && 'text' in candidate.content) {
      return candidate.content.text;
    } else if (candidate.type === 'atom' && 'text' in candidate.content) {
      return candidate.content.text;
    } else if (candidate.type === 'summary' && 'text' in candidate.content) {
      return candidate.content.text;
    } else if (candidate.type === 'graph_node' && 'label' in candidate.content) {
      return candidate.content.label || '';
    }
    return '';
  }

  /**
   * Get the underlying budgeted packer
   */
  public getBudgetedPacker(): BudgetedMaxCoverage {
    return this.budgetedPacker;
  }
}

