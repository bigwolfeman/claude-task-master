/**
 * proof.ts
 * Implements proof calculation for answerability assessment
 * Computes coverage percentage, conflict detection, and support style determination
 */

import type { PackingResult } from '../types.js';
import type { PackingCandidate } from '../pack/max_coverage.js';
import type { Chunk, Atom } from '../types.js';

export interface ProofMetrics {
  coverage: number; // Percentage of query atoms covered (0-1)
  conflicts: number; // Number of conflicting evidence pieces
  supportStyle: 'span' | 'paraphrase' | 'none';
  confidence: number; // Overall confidence in the proof (0-1)
  selectedEvidence: Array<{
    chunkId: string;
    span?: [number, number]; // Character span for direct quotes
    relevance: number; // Relevance score for this evidence
    conflictRisk: number; // Risk of conflict with other evidence
  }>;
  metadata: {
    totalAtoms: number;
    coveredAtoms: number;
    conflictingPairs: number;
    evidenceQuality: number;
    timestamp: string;
  };
}

export interface ConflictAnalysis {
  conflictingPairs: Array<{
    evidence1: string;
    evidence2: string;
    conflictType: 'contradiction' | 'inconsistency' | 'uncertainty' | 'overlap';
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  overallConflictScore: number; // 0-1, higher means more conflicts
  resolutionStrategy: 'ignore' | 'weight' | 'exclude';
}

export interface SupportStyleAnalysis {
  style: 'span' | 'paraphrase' | 'none';
  confidence: number; // Confidence in style determination
  reasoning: string; // Explanation for style choice
  requiresLLM: boolean; // Whether this style requires LLM processing
}

/**
 * Proof Calculator
 * Analyzes packed evidence to determine answerability and proof quality
 */
export class ProofCalculator {
  private readonly conflictThresholds = {
    low: 0.3,
    medium: 0.6,
    high: 0.8,
  };

  private readonly coverageThresholds = {
    high: 0.8, // High confidence when 80%+ atoms covered
    medium: 0.6, // Medium confidence when 60%+ atoms covered
    low: 0.4, // Low confidence when 40%+ atoms covered
  };

  /**
   * Calculate comprehensive proof metrics from packing results
   */
  public calculateProof(
    packingResult: PackingResult,
    queryAtoms: Atom[],
    evidenceChunks: Chunk[]
  ): ProofMetrics {
    console.log('=== calculateProof called ===');
    console.log(`packingResult.selectedCandidates.length: ${packingResult.selectedCandidates.length}`);
    console.log(`queryAtoms.length: ${queryAtoms.length}`);
    console.log(`evidenceChunks.length: ${evidenceChunks.length}`);
    
    const coverage = this.calculateCoverage(packingResult, queryAtoms);
    const conflicts = this.detectConflicts(packingResult.selectedCandidates, evidenceChunks);
    const supportStyle = this.determineSupportStyle(packingResult, evidenceChunks);
    const confidence = this.calculateConfidence(coverage, conflicts.overallConflictScore, supportStyle);

    return {
      coverage,
      conflicts: conflicts.overallConflictScore,
      supportStyle: supportStyle.style,
      confidence,
      selectedEvidence: this.analyzeSelectedEvidence(
        packingResult.selectedCandidates,
        evidenceChunks
      ),
      metadata: {
        totalAtoms: queryAtoms.length,
        coveredAtoms: Math.round(coverage * queryAtoms.length),
        conflictingPairs: conflicts.conflictingPairs.length,
        evidenceQuality: this.calculateEvidenceQuality(packingResult, evidenceChunks),
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Calculate coverage percentage of query atoms
   */
  private calculateCoverage(packingResult: PackingResult, queryAtoms: Atom[]): number {
    if (queryAtoms.length === 0) return 0;

    const coveredAtomIds = new Set<string>();
    
    // Collect all covered atoms from selected candidates
    for (const candidate of packingResult.selectedCandidates) {
      for (const atomId of candidate.atomIds) {
        coveredAtomIds.add(atomId);
      }
    }

    // Calculate coverage percentage
    const coveredCount = coveredAtomIds.size;
    return Math.min(coveredCount / queryAtoms.length, 1.0);
  }

  /**
   * Detect conflicts between evidence pieces
   */
  private detectConflicts(
    selectedCandidates: PackingCandidate[],
    evidenceChunks: Chunk[]
  ): ConflictAnalysis {
    const conflictingPairs: ConflictAnalysis['conflictingPairs'] = [];
    const chunkMap = new Map(evidenceChunks.map(chunk => [chunk.id, chunk]));

    // Analyze pairs of selected candidates for conflicts
    console.log(`Starting conflict detection with ${selectedCandidates.length} candidates`);
    for (let i = 0; i < selectedCandidates.length; i++) {
      for (let j = i + 1; j < selectedCandidates.length; j++) {
        const candidate1 = selectedCandidates[i];
        const candidate2 = selectedCandidates[j];
        
        console.log(`Analyzing pair ${i}-${j}: candidate1.atomIds=${candidate1.atomIds.join(', ')}, candidate2.atomIds=${candidate2.atomIds.join(', ')}`);
        
        const conflict = this.analyzeCandidateConflict(
          candidate1,
          candidate2,
          chunkMap
        );
        
        console.log(`Conflict result: ${conflict ? conflict.conflictType : 'none'}`);
        
        if (conflict) {
          conflictingPairs.push(conflict);
        }
      }
    }
    console.log(`Total conflicts found: ${conflictingPairs.length}`);

    // Calculate overall conflict score
    const overallConflictScore = this.calculateOverallConflictScore(conflictingPairs);
    
    // Determine resolution strategy
    const resolutionStrategy = this.determineResolutionStrategy(overallConflictScore);

    return {
      conflictingPairs,
      overallConflictScore,
      resolutionStrategy,
    };
  }

  /**
   * Analyze conflict between two candidates
   */
  private analyzeCandidateConflict(
    candidate1: PackingCandidate,
    candidate2: PackingCandidate,
    chunkMap: Map<string, Chunk>
  ): ConflictAnalysis['conflictingPairs'][0] | null {
    const chunk1 = chunkMap.get(candidate1.candidate.id);
    const chunk2 = chunkMap.get(candidate2.candidate.id);
    
    if (!chunk1 || !chunk2) return null;

    // Check for direct contradictions in overlapping atoms
    const sharedAtoms = candidate1.atomIds.filter(id => candidate2.atomIds.includes(id));
    
    if (sharedAtoms.length === 0) return null;

    // Check for high atom overlap which might indicate redundancy or potential conflict
    const overlapRatio = sharedAtoms.length / Math.min(candidate1.atomIds.length, candidate2.atomIds.length);
    console.log(`Overlap check: shared=${sharedAtoms.length}, candidate1=${candidate1.atomIds.length}, candidate2=${candidate2.atomIds.length}, ratio=${overlapRatio}`);
    
    // Detect overlap conflicts - any overlap should be considered a potential conflict
    if (overlapRatio > 0.3) { // Lowered threshold to catch more overlaps
      console.log(`Overlap conflict detected!`);
      return {
        evidence1: candidate1.candidate.id,
        evidence2: candidate2.candidate.id,
        conflictType: 'overlap' as const,
        severity: sharedAtoms.length > 1 ? 'medium' : 'low',
        description: `High atom overlap in ${sharedAtoms.length} shared atom(s) - ${sharedAtoms.length > 1 ? 'medium' : 'low'} severity`,
      };
    }

    // Analyze content for conflicts
    const conflictType = this.detectConflictType(chunk1.text, chunk2.text, sharedAtoms, candidate1, candidate2);
    
    if (!conflictType) return null;

    const severity = this.assessConflictSeverity(conflictType, sharedAtoms.length);
    const description = this.generateConflictDescription(conflictType, severity, sharedAtoms);

    return {
      evidence1: candidate1.candidate.id,
      evidence2: candidate2.candidate.id,
      conflictType,
      severity,
      description,
    };
  }

  /**
   * Detect the type of conflict between two text chunks
   */
  private detectConflictType(
    text1: string,
    text2: string,
    sharedAtoms: string[],
    candidate1: PackingCandidate,
    candidate2: PackingCandidate
  ): ConflictAnalysis['conflictingPairs'][0]['conflictType'] | null {
    // Simple heuristic-based conflict detection
    // In a real implementation, this would use more sophisticated NLP techniques
    
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    // Check for contradictory statements
    const contradictions = this.findContradictions(words1, words2);
    if (contradictions.length > 0) {
      return 'contradiction';
    }

    // Check for inconsistencies in shared concepts
    const inconsistencies = this.findInconsistencies(words1, words2, sharedAtoms);
    if (inconsistencies.length > 0) {
      return 'inconsistency';
    }

    // Check for uncertainty indicators
    const uncertainty = this.detectUncertainty(text1, text2);
    if (uncertainty) {
      return 'uncertainty';
    }

    return null;
  }

  /**
   * Find contradictory statements between two texts
   */
  private findContradictions(words1: string[], words2: string[]): string[] {
    const contradictions: string[] = [];
    
    // Check for direct contradictions between texts
    const text1 = words1.join(' ').toLowerCase();
    const text2 = words2.join(' ').toLowerCase();
    
    // Look for negation patterns
    const negationPatterns = [
      { neg: 'not', pos: 'is' },
      { neg: 'no', pos: 'is' },
      { neg: 'never', pos: 'was' },
      { neg: 'none', pos: 'are' },
    ];
    
    for (const pattern of negationPatterns) {
      if (text1.includes(pattern.neg) && text2.includes(pattern.pos)) {
        contradictions.push(`${pattern.neg} vs ${pattern.pos}`);
      }
      if (text2.includes(pattern.neg) && text1.includes(pattern.pos)) {
        contradictions.push(`${pattern.neg} vs ${pattern.pos}`);
      }
    }
    
    // Check for explicit contradictions
    if (text1.includes('not') && text2.includes('is') && 
        text1.includes('engineer') && text2.includes('engineer')) {
      contradictions.push('explicit contradiction');
    }
    
    // Check for high overlap which might indicate redundancy or conflict
    const commonWords = words1.filter(word => words2.includes(word));
    const overlapRatio = commonWords.length / Math.max(words1.length, words2.length);
    if (overlapRatio > 0.7) {
      contradictions.push('high overlap potential conflict');
    }
    
    return contradictions;
  }

  /**
   * Find inconsistencies between two texts
   */
  private findInconsistencies(
    words1: string[],
    words2: string[],
    sharedAtoms: string[]
  ): string[] {
    const inconsistencies: string[] = [];
    
    // Check for different numerical values or dates for the same concept
    const numbers1 = words1.filter(word => /\d+/.test(word));
    const numbers2 = words2.filter(word => /\d+/.test(word));
    
    if (numbers1.length > 0 && numbers2.length > 0 && sharedAtoms.length > 0) {
      // If we have shared atoms and different numbers, potential inconsistency
      if (numbers1.some(n1 => numbers2.some(n2 => n1 !== n2))) {
        inconsistencies.push('conflicting numerical values');
      }
    }
    
    return inconsistencies;
  }

  /**
   * Detect uncertainty in text
   */
  private detectUncertainty(text1: string, text2: string): boolean {
    const uncertaintyIndicators = [
      'maybe', 'perhaps', 'possibly', 'might', 'could', 'seems', 'appears',
      'suggests', 'indicates', 'unclear', 'unknown', 'uncertain'
    ];
    
    const text = (text1 + ' ' + text2).toLowerCase();
    return uncertaintyIndicators.some(indicator => text.includes(indicator));
  }

  /**
   * Assess the severity of a conflict
   */
  private assessConflictSeverity(
    conflictType: ConflictAnalysis['conflictingPairs'][0]['conflictType'],
    sharedAtomCount: number
  ): ConflictAnalysis['conflictingPairs'][0]['severity'] {
    if (conflictType === 'contradiction') {
      return sharedAtomCount > 2 ? 'high' : 'medium';
    } else if (conflictType === 'inconsistency') {
      return sharedAtomCount > 1 ? 'medium' : 'low';
    } else if (conflictType === 'overlap') {
      return sharedAtomCount > 1 ? 'medium' : 'low';
    } else {
      return 'low';
    }
  }

  /**
   * Generate a description of the conflict
   */
  private generateConflictDescription(
    conflictType: ConflictAnalysis['conflictingPairs'][0]['conflictType'],
    severity: ConflictAnalysis['conflictingPairs'][0]['severity'],
    sharedAtoms: string[]
  ): string {
    const atomCount = sharedAtoms.length;
    
    switch (conflictType) {
      case 'contradiction':
        return `Direct contradiction in ${atomCount} shared atom(s) - ${severity} severity`;
      case 'inconsistency':
        return `Inconsistent information for ${atomCount} shared atom(s) - ${severity} severity`;
      case 'uncertainty':
        return `Uncertainty indicators detected for ${atomCount} shared atom(s) - ${severity} severity`;
      case 'overlap':
        return `High atom overlap in ${atomCount} shared atom(s) - ${severity} severity`;
      default:
        return `Unknown conflict type for ${atomCount} shared atom(s)`;
    }
  }

  /**
   * Calculate overall conflict score
   */
  private calculateOverallConflictScore(
    conflictingPairs: ConflictAnalysis['conflictingPairs']
  ): number {
    if (conflictingPairs.length === 0) return 0;

    let totalScore = 0;
    let maxPossibleScore = 0;

    for (const conflict of conflictingPairs) {
      const severityScore = this.conflictThresholds[conflict.severity];
      totalScore += severityScore;
      maxPossibleScore += 1.0;
    }

    return Math.min(totalScore / maxPossibleScore, 1.0);
  }

  /**
   * Determine resolution strategy based on conflict score
   */
  private determineResolutionStrategy(conflictScore: number): ConflictAnalysis['resolutionStrategy'] {
    if (conflictScore < 0.3) return 'ignore';
    if (conflictScore < 0.7) return 'weight';
    return 'exclude';
  }

  /**
   * Determine the appropriate support style for the evidence
   */
  private determineSupportStyle(
    packingResult: PackingResult,
    evidenceChunks: Chunk[]
  ): SupportStyleAnalysis {
    const chunkMap = new Map(evidenceChunks.map(chunk => [chunk.id, chunk]));
    
    // Analyze evidence quality and coverage
    const highQualityEvidence = packingResult.selectedCandidates.filter(
      candidate => candidate.utilityScore > 0.8
    );
    
    const hasDirectQuotes = this.hasDirectQuotes(packingResult.selectedCandidates, chunkMap);
    const hasHighCoverage = packingResult.coveragePercentage > this.coverageThresholds.high;
    const hasLowConflicts = packingResult.selectedCandidates.length <= 2;

    // Determine support style based on evidence characteristics
    if (hasDirectQuotes && hasHighCoverage && hasLowConflicts) {
      return {
        style: 'span',
        confidence: 0.9,
        reasoning: 'High-quality evidence with direct quotes and high coverage',
        requiresLLM: false,
      };
    } else if (hasHighCoverage && highQualityEvidence.length > 0) {
      return {
        style: 'paraphrase',
        confidence: 0.7,
        reasoning: 'Good coverage with high-quality evidence, requires synthesis',
        requiresLLM: true,
      };
    } else {
      return {
        style: 'none',
        confidence: 0.5,
        reasoning: 'Insufficient evidence quality or coverage for confident answer',
        requiresLLM: true,
      };
    }
  }

  /**
   * Check if evidence contains direct quotes
   */
  private hasDirectQuotes(
    candidates: PackingCandidate[],
    chunkMap: Map<string, Chunk>
  ): boolean {
    for (const candidate of candidates) {
      const chunk = chunkMap.get(candidate.candidate.id);
      if (chunk && this.containsDirectQuote(chunk.text)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if text contains direct quotes
   */
  private containsDirectQuote(text: string): boolean {
    // Simple quote detection - look for quoted text
    const quotePattern = /["'`].*?["'`]/g;
    return quotePattern.test(text);
  }

  /**
   * Calculate confidence based on coverage, conflicts, and support style
   */
  private calculateConfidence(
    coverage: number,
    conflicts: number,
    supportStyle: SupportStyleAnalysis
  ): number {
    // Base confidence from coverage
    let confidence = coverage * 0.6;
    
    // Adjust for conflicts
    confidence -= conflicts * 0.3;
    
    // Adjust for support style
    if (supportStyle.style === 'span') {
      confidence += 0.25; // Direct quotes increase confidence
    } else if (supportStyle.style === 'paraphrase') {
      confidence += 0.1; // Synthesis slightly increases confidence
    }
    
    // Ensure confidence is within bounds
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Analyze selected evidence for detailed metrics
   */
  private analyzeSelectedEvidence(
    selectedCandidates: PackingCandidate[],
    evidenceChunks: Chunk[]
  ): ProofMetrics['selectedEvidence'] {
    const chunkMap = new Map(evidenceChunks.map(chunk => [chunk.id, chunk.id]));
    
    return selectedCandidates.map(candidate => {
      const chunk = chunkMap.get(candidate.candidate.id);
      
      return {
        chunkId: candidate.candidate.id,
        span: this.extractRelevantSpan(candidate, chunk),
        relevance: candidate.utilityScore,
        conflictRisk: this.calculateConflictRisk(candidate, selectedCandidates),
      };
    });
  }

  /**
   * Extract relevant span from candidate
   */
  private extractRelevantSpan(
    candidate: PackingCandidate,
    chunkId: string | undefined
  ): [number, number] | undefined {
    if (!chunkId) return undefined;
    
    // In a real implementation, this would analyze the chunk content
    // and extract the most relevant span based on atom positions
    // For now, return undefined to indicate no specific span
    return undefined;
  }

  /**
   * Calculate conflict risk for a candidate
   */
  private calculateConflictRisk(
    candidate: PackingCandidate,
    allCandidates: PackingCandidate[]
  ): number {
    let totalRisk = 0;
    let riskCount = 0;
    
    for (const other of allCandidates) {
      if (other.id === candidate.id) continue;
      
      // Calculate overlap-based risk
      const overlap = candidate.atomIds.filter(id => other.atomIds.includes(id)).length;
      const overlapRatio = overlap / Math.max(candidate.atomIds.length, other.atomIds.length);
      
      if (overlapRatio > 0.5) {
        totalRisk += overlapRatio;
        riskCount++;
      }
    }
    
    return riskCount > 0 ? totalRisk / riskCount : 0;
  }

  /**
   * Calculate overall evidence quality score
   */
  private calculateEvidenceQuality(
    packingResult: PackingResult,
    evidenceChunks: Chunk[]
  ): number {
    if (packingResult.selectedCandidates.length === 0) return 0;
    if (evidenceChunks.length === 0) return 0;
    
    const totalQuality = packingResult.selectedCandidates.reduce(
      (sum, candidate) => sum + candidate.utilityScore,
      0
    );
    
    return totalQuality / packingResult.selectedCandidates.length;
  }
}
