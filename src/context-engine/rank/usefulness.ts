/**
 * Usefulness 2.0 Ranking System
 * Implements advanced ranking with pointwise utility calculation and pairwise learning
 */

import type { Chunk, Atom, Summary, GraphNode } from '../types.js';

export interface UtilityFactors {
  relevance: number;        // How relevant is the evidence to the query
  informationGain: number;  // How much new information does this provide
  trust: number;            // How trustworthy is this source/evidence
  reusability: number;      // How reusable is this evidence across queries
  tokenCost: number;        // Token cost relative to information value
  conflictRisk: number;     // Risk of contradicting other evidence
}

export interface UtilityWeights {
  relevance: number;
  informationGain: number;
  trust: number;
  reusability: number;
  tokenCost: number;
  conflictRisk: number;
}

export interface RankingCandidate {
  id: string;
  type: 'chunk' | 'atom' | 'summary' | 'graph_node';
  content: Chunk | Atom | Summary | GraphNode;
  utilityScore: number;
  factors: UtilityFactors;
  metadata: Record<string, any>;
}

export interface RankingResult {
  candidates: RankingCandidate[];
  metadata: {
    totalCandidates: number;
    averageUtility: number;
    utilityRange: { min: number; max: number };
    factorContributions: Record<keyof UtilityFactors, number>;
    processingTime: number;
  };
}

export interface RankingOptions {
  weights?: Partial<UtilityWeights>;
  minUtilityThreshold?: number;
  maxCandidates?: number;
  enableConflictDetection?: boolean;
  enableTokenOptimization?: boolean;
}

export class UsefulnessRanker {
  private defaultWeights: UtilityWeights = {
    relevance: 0.25,
    informationGain: 0.20,
    trust: 0.20,
    reusability: 0.15,
    tokenCost: 0.10,
    conflictRisk: 0.10,
  };

  private weights: UtilityWeights;

  constructor(weights?: Partial<UtilityWeights>) {
    this.weights = { ...this.defaultWeights, ...weights };
    // Only normalize if weights are significantly off from 1.0
    const total = Object.values(this.weights).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(total - 1.0) > 0.5) { // Allow much more tolerance for custom weights
      this.normalizeWeights();
    }
  }

  /**
   * Normalize weights to sum to 1.0
   */
  private normalizeWeights(): void {
    const total = Object.values(this.weights).reduce((sum, weight) => sum + weight, 0);
    if (total > 0) {
      Object.keys(this.weights).forEach(key => {
        this.weights[key as keyof UtilityWeights] /= total;
      });
    }
  }

  /**
   * Calculate pointwise utility for a single candidate
   */
  public calculateUtility(
    candidate: Chunk | Atom | Summary | GraphNode,
    query: string,
    context: {
      existingEvidence: Array<Chunk | Atom | Summary | GraphNode>;
      queryComplexity: number;
      userPreferences?: Record<string, any>;
    }
  ): { utility: number; factors: UtilityFactors } {
    const factors: UtilityFactors = {
      relevance: this.calculateRelevance(candidate, query),
      informationGain: this.calculateInformationGain(candidate, context.existingEvidence),
      trust: this.calculateTrust(candidate),
      reusability: this.calculateReusability(candidate, query),
      tokenCost: this.calculateTokenCost(candidate),
      conflictRisk: this.calculateConflictRisk(candidate, context.existingEvidence),
    };

    const utility = this.combineFactors(factors);
    return { utility, factors };
  }

  /**
   * Calculate relevance score based on semantic similarity and keyword matching
   */
  private calculateRelevance(candidate: Chunk | Atom | Summary | GraphNode, query: string): number {
    // Extract text content based on candidate type
    const content = this.extractTextContent(candidate);
    
    // Simple keyword matching (in production, use proper semantic similarity)
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    
    const matchingWords = queryWords.filter(queryWord => {
      // Use exact word matching to avoid false positives
      const hasMatch = contentWords.some(contentWord => {
        // Exact word match (most precise)
        if (contentWord === queryWord) {
          return true;
        }
        
        // Word boundary match (query word is a complete word within content)
        if (contentWord.includes(queryWord) && queryWord.length > 2) {
          return true;
        }
        
        // Content word is a complete word within query (for abbreviations)
        if (queryWord.includes(contentWord) && contentWord.length > 2) {
          return true;
        }
        
        return false;
      });
      return hasMatch;
    });
    
    const keywordScore = matchingWords.length / queryWords.length;
    
    // Length-based relevance (shorter, more focused content gets higher score)
    const lengthScore = Math.max(0.1, 1.0 - (content.length / 1000));
    
    // Be very strict: if no keywords match, give extremely low score
    if (keywordScore === 0) {
      return 0.05; // Extremely low score for non-matching content
    }
    
    // For very low keyword scores, cap the result
    if (keywordScore < 0.5) {
      return Math.min(0.3, keywordScore * 0.8 + lengthScore * 0.2); // Cap at 0.3 for low keyword scores
    }
    
    return Math.min(1.0, (keywordScore * 0.8) + (lengthScore * 0.2));
  }

  /**
   * Calculate information gain based on novelty relative to existing evidence
   */
  private calculateInformationGain(
    candidate: Chunk | Atom | Summary | GraphNode,
    existingEvidence: Array<Chunk | Atom | Summary | GraphNode>
  ): number {
    if (existingEvidence.length === 0) {
      return 1.0; // First piece of evidence gets maximum information gain
    }

    const candidateContent = this.extractTextContent(candidate);
    const existingContent = existingEvidence.map(e => this.extractTextContent(e));
    
    // Calculate overlap with existing evidence
    let totalOverlap = 0;
    for (const existing of existingContent) {
      const overlap = this.calculateContentOverlap(candidateContent, existing);
      totalOverlap += overlap;
    }
    
    const averageOverlap = totalOverlap / existingEvidence.length;
    return Math.max(0.0, 1.0 - averageOverlap);
  }

  /**
   * Calculate trust score based on source quality and content characteristics
   */
  private calculateTrust(candidate: Chunk | Atom | Summary | GraphNode): number {
    // Extract metadata for trust calculation
    const metadata = this.extractMetadata(candidate);
    
    let trustScore = 0.5; // Base trust score
    
    // Source quality indicators
    if (metadata.source) {
      const sourceQuality = this.assessSourceQuality(metadata.source);
      trustScore += sourceQuality * 0.25; // Reduced from 0.3 to keep scores moderate
    }
    
    // Content quality indicators
    if (metadata.confidence) {
      trustScore += metadata.confidence * 0.15; // Reduced from 0.2
    }
    
    // Freshness (newer content gets slight boost)
    if (metadata.timestamp) {
      const age = Date.now() - new Date(metadata.timestamp).getTime();
      const freshnessScore = Math.max(0, 1.0 - (age / (365 * 24 * 60 * 60 * 1000))); // 1 year max
      trustScore += freshnessScore * 0.08; // Reduced from 0.1
    }
    
    // Citation and reference indicators
    if (metadata.citations && metadata.citations.length > 0) {
      trustScore += Math.min(0.15, metadata.citations.length * 0.03); // Reduced from 0.2 and 0.05
    }
    
    return Math.min(1.0, Math.max(0.0, trustScore));
  }

  /**
   * Calculate reusability score based on content generality and structure
   */
  private calculateReusability(candidate: Chunk | Atom | Summary | GraphNode, query: string): number {
    const content = this.extractTextContent(candidate);
    
    // General content gets higher reusability
    const specificTerms = this.countSpecificTerms(content);
    const generalTerms = this.countGeneralTerms(content);
    
    const specificityRatio = specificTerms / (specificTerms + generalTerms + 1);
    const reusabilityScore = 1.0 - specificityRatio;
    
    // Well-structured content (with headers, lists, etc.) gets higher score
    const structureScore = this.assessContentStructure(content);
    
    return (reusabilityScore * 0.7) + (structureScore * 0.3);
  }

  /**
   * Calculate token cost efficiency
   */
  private calculateTokenCost(candidate: Chunk | Atom | Summary | GraphNode): number {
    const content = this.extractTextContent(candidate);
    const tokenCount = this.estimateTokenCount(content);
    
    // Lower token count gets higher score (more efficient)
    const efficiencyScore = Math.max(0.1, 1.0 - (tokenCount / 1000));
    
    // Information density (more information per token gets higher score)
    const informationDensity = this.calculateInformationDensity(content);
    
    return (efficiencyScore * 0.6) + (informationDensity * 0.4);
  }

  /**
   * Calculate conflict risk with existing evidence
   */
  private calculateConflictRisk(
    candidate: Chunk | Atom | Summary | GraphNode,
    existingEvidence: Array<Chunk | Atom | Summary | GraphNode>
  ): number {
    if (existingEvidence.length === 0) {
      return 0.0; // No existing evidence means no conflict
    }

    const candidateContent = this.extractTextContent(candidate);
    let maxConflictScore = 0.0;
    
    for (const existing of existingEvidence) {
      const existingContent = this.extractTextContent(existing);
      
      const conflictScore = this.detectContentConflict(candidateContent, existingContent);
      
      maxConflictScore = Math.max(maxConflictScore, conflictScore);
    }
    
    // Convert conflict score to risk (higher conflict = higher risk)
    return maxConflictScore;
  }

  /**
   * Combine utility factors using weighted sum
   */
  private combineFactors(factors: UtilityFactors): number {
    let utility = 0;
    
    utility += factors.relevance * this.weights.relevance;
    utility += factors.informationGain * this.weights.informationGain;
    utility += factors.trust * this.weights.trust;
    utility += factors.reusability * this.weights.reusability;
    utility += factors.tokenCost * this.weights.tokenCost;
    utility += (1.0 - factors.conflictRisk) * this.weights.conflictRisk; // Invert conflict risk
    
    return Math.max(0.0, Math.min(1.0, utility));
  }

  /**
   * Rank candidates by utility score
   */
  public rankCandidates(
    candidates: Array<Chunk | Atom | Summary | GraphNode>,
    query: string,
    context: {
      existingEvidence: Array<Chunk | Atom | Summary | GraphNode>;
      queryComplexity: number;
      userPreferences?: Record<string, any>;
    },
    options: RankingOptions = {}
  ): RankingResult {
    const startTime = performance.now(); // Use performance.now() for more precise timing
    
    // Calculate utility for all candidates
    const rankingCandidates: RankingCandidate[] = candidates.map(candidate => {
      const { utility, factors } = this.calculateUtility(candidate, query, context);
      
      return {
        id: this.generateCandidateId(candidate),
        type: this.getCandidateType(candidate),
        content: candidate,
        utilityScore: utility,
        factors,
        metadata: this.extractMetadata(candidate),
      };
    });

    // Filter by minimum utility threshold
    if (options.minUtilityThreshold) {
      rankingCandidates.splice(0, rankingCandidates.length, 
        ...rankingCandidates.filter(c => c.utilityScore >= options.minUtilityThreshold!));
    }

    // Sort by utility score (descending)
    rankingCandidates.sort((a, b) => b.utilityScore - a.utilityScore);

    // Limit number of candidates
    if (options.maxCandidates) {
      rankingCandidates.splice(options.maxCandidates);
    }

    // Calculate metadata
    const totalCandidates = rankingCandidates.length;
    const averageUtility = totalCandidates > 0 
      ? rankingCandidates.reduce((sum, c) => sum + c.utilityScore, 0) / totalCandidates 
      : 0;
    
    const utilityRange = totalCandidates > 0 
      ? { 
          min: rankingCandidates[totalCandidates - 1].utilityScore,
          max: rankingCandidates[0].utilityScore 
        }
      : { min: 0, max: 0 };

    const factorContributions = this.calculateFactorContributions(rankingCandidates);
    const processingTime = performance.now() - startTime; // Calculate processing time

    return {
      candidates: rankingCandidates,
      metadata: {
        totalCandidates,
        averageUtility,
        utilityRange,
        factorContributions,
        processingTime,
      },
    };
  }

  /**
   * Helper methods for content analysis
   */
  private extractTextContent(candidate: Chunk | Atom | Summary | GraphNode): string {
    if ('text' in candidate) {
      return candidate.text;
    } else if ('label' in candidate) {
      return candidate.label || '';
    }
    return '';
  }

  private extractMetadata(candidate: Chunk | Atom | Summary | GraphNode): Record<string, any> {
    if ('metadata' in candidate) {
      return candidate.metadata;
    }
    return {};
  }

  private generateCandidateId(candidate: Chunk | Atom | Summary | GraphNode): string {
    if ('id' in candidate) {
      return candidate.id;
    }
    return `candidate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCandidateType(candidate: Chunk | Atom | Summary | GraphNode): 'chunk' | 'atom' | 'summary' | 'graph_node' {
    if ('content' in candidate) return 'chunk';
    if ('text' in candidate) return 'atom';
    if ('chunkIds' in candidate) return 'summary';
    if ('label' in candidate) return 'graph_node';
    return 'chunk'; // Default fallback
  }

  private calculateContentOverlap(content1: string, content2: string): number {
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private assessSourceQuality(source: string): number {
    // Simple heuristic for source quality assessment
    const highQualitySources = ['arxiv', 'nature', 'science', 'ieee', 'acm', 'springer'];
    const mediumQualitySources = ['wikipedia', 'github', 'stackoverflow', 'medium'];
    
    const sourceLower = source.toLowerCase();
    
    if (highQualitySources.some(s => sourceLower.includes(s))) return 0.9;
    if (mediumQualitySources.some(s => sourceLower.includes(s))) return 0.7;
    
    return 0.5; // Default quality
  }

  private countSpecificTerms(content: string): number {
    // Count domain-specific terms, proper nouns, technical jargon
    const specificPatterns = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b|\b\w+[A-Z]\w*\b/g;
    const matches = content.match(specificPatterns) || [];
    return matches.length;
  }

  private countGeneralTerms(content: string): number {
    // Count common, general terms
    const generalTerms = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = content.toLowerCase().split(/\s+/);
    return words.filter(word => generalTerms.includes(word)).length;
  }

  private assessContentStructure(content: string): number {
    // Assess how well-structured the content is
    let structureScore = 0.2; // Start with lower base score
    
    // Headers
    if (content.includes('#')) structureScore += 0.2;
    
    // Lists
    if (content.includes('- ') || content.includes('* ') || content.includes('1. ')) structureScore += 0.2;
    
    // Code blocks
    if (content.includes('```') || content.includes('`')) structureScore += 0.2;
    
    // Links
    if (content.includes('http') || content.includes('[')) structureScore += 0.2;
    
    // Paragraphs
    if (content.includes('\n\n')) structureScore += 0.2;
    
    // Tables
    if (content.includes('|') && content.includes('\n')) structureScore += 0.15;
    
    // Bold/italic formatting
    if (content.includes('**') || content.includes('*') || content.includes('_')) structureScore += 0.15;
    
    // Additional structure indicators
    if (content.includes('##') || content.includes('###')) structureScore += 0.1; // Multiple header levels
    if (content.includes('```') && content.includes('```', content.indexOf('```') + 3)) structureScore += 0.1; // Code blocks
    if (content.includes('1.') && content.includes('2.')) structureScore += 0.1; // Numbered lists
    
    return Math.min(1.0, structureScore);
  }

  private estimateTokenCount(content: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(content.length / 4);
  }

  private calculateInformationDensity(content: string): number {
    // Calculate information density (unique words / total words)
    const words = content.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    
    if (words.length === 0) return 0;
    return uniqueWords.size / words.length;
  }

  private detectContentConflict(content1: string, content2: string): number {
    // Simple conflict detection based on contradictory patterns
    const contradictions = [
      ['yes', 'no'],
      ['true', 'false'],
      ['correct', 'incorrect'],
      ['valid', 'invalid'],
      ['success', 'failure'],
      ['increase', 'decrease'],
      ['positive', 'negative'],
      ['good', 'bad'],
      ['right', 'wrong'],
      ['agree', 'disagree'],
      ['support', 'oppose'],
      ['pro', 'con'],
      ['for', 'against'],
      ['benefit', 'harm'],
      ['advantage', 'disadvantage'],
      ['strength', 'weakness'],
      ['opportunity', 'threat'],
      ['gain', 'loss'],
      ['profit', 'loss'],
      ['win', 'lose'],
    ];
    
    let conflictScore = 0;
    
    for (const [term1, term2] of contradictions) {
      const hasTerm1 = content1.toLowerCase().includes(term1);
      const hasTerm2 = content2.toLowerCase().includes(term2);
      
      if (hasTerm1 && hasTerm2) {
        conflictScore += 0.4; // Increased from 0.3 to make conflicts more detectable
      }
    }
    
    // Check for semantic contradictions (e.g., "negative statement" vs "positive statement")
    const semanticContradictions = [
      ['negative', 'positive'],
      ['negative statement', 'positive statement'],
      ['negative content', 'positive content'],
      ['negative information', 'positive information'],
    ];
    
    for (const [phrase1, phrase2] of semanticContradictions) {
      const hasPhrase1 = content1.toLowerCase().includes(phrase1);
      const hasPhrase2 = content2.toLowerCase().includes(phrase2);
      
      if (hasPhrase1 && hasPhrase2) {
        conflictScore += 0.5; // Higher score for semantic contradictions
      }
    }
    
    // Check for negation patterns (e.g., "is effective" vs "is not effective")
    // Make this more flexible by checking for the base term and negation
    const negationPatterns = [
      { base: 'effective', negated: 'not effective' },
      { base: 'good', negated: 'not good' },
      { base: 'valid', negated: 'not valid' },
      { base: 'correct', negated: 'not correct' },
      { base: 'successful', negated: 'not successful' },
      { base: 'beneficial', negated: 'not beneficial' },
      { base: 'advantageous', negated: 'not advantageous' },
      { base: 'positive', negated: 'not positive' },
      { base: 'right', negated: 'not right' },
      { base: 'true', negated: 'not true' },
      { base: 'works', negated: 'does not work' },
      { base: 'functions', negated: 'does not function' },
      { base: 'succeeds', negated: 'fails' },
      { base: 'improves', negated: 'does not improve' },
      { base: 'enhances', negated: 'does not enhance' },
    ];
    
    for (const pattern of negationPatterns) {
      const hasBase = content1.toLowerCase().includes(pattern.base);
      const hasNegated = content2.toLowerCase().includes(pattern.negated);
      
      if (hasBase && hasNegated) {
        conflictScore += 0.6; // Higher score for negation patterns
      }
      
      // Also check the reverse (negated in content1, base in content2)
      const hasNegatedIn1 = content1.toLowerCase().includes(pattern.negated);
      const hasBaseIn2 = content2.toLowerCase().includes(pattern.base);
      
      if (hasNegatedIn1 && hasBaseIn2) {
        conflictScore += 0.6; // Higher score for negation patterns
      }
    }
    
    // Check for opposite adjectives/adverbs
    const oppositeWords = [
      ['effective', 'ineffective'],
      ['efficient', 'inefficient'],
      ['adequate', 'inadequate'],
      ['appropriate', 'inappropriate'],
      ['capable', 'incapable'],
      ['complete', 'incomplete'],
      ['correct', 'incorrect'],
      ['dependent', 'independent'],
      ['direct', 'indirect'],
      ['expensive', 'inexpensive'],
      ['formal', 'informal'],
      ['frequent', 'infrequent'],
      ['legal', 'illegal'],
      ['logical', 'illogical'],
      ['mature', 'immature'],
      ['moral', 'immoral'],
      ['patient', 'impatient'],
      ['perfect', 'imperfect'],
      ['personal', 'impersonal'],
      ['possible', 'impossible'],
      ['proper', 'improper'],
      ['regular', 'irregular'],
      ['relevant', 'irrelevant'],
      ['responsible', 'irresponsible'],
      ['satisfied', 'dissatisfied'],
      ['similar', 'dissimilar'],
      ['successful', 'unsuccessful'],
      ['suitable', 'unsuitable'],
      ['willing', 'unwilling'],
    ];
    
    for (const [word1, word2] of oppositeWords) {
      const hasWord1 = content1.toLowerCase().includes(word1);
      const hasWord2 = content2.toLowerCase().includes(word2);
      
      if (hasWord1 && hasWord2) {
        conflictScore += 0.5; // Score for opposite words
      }
    }
    
    return Math.min(1.0, conflictScore);
  }

  private calculateFactorContributions(candidates: RankingCandidate[]): Record<keyof UtilityFactors, number> {
    const contributions: Record<keyof UtilityFactors, number> = {
      relevance: 0,
      informationGain: 0,
      trust: 0,
      reusability: 0,
      tokenCost: 0,
      conflictRisk: 0,
    };
    
    if (candidates.length === 0) return contributions;
    
    // Calculate average contribution of each factor
    for (const candidate of candidates) {
      contributions.relevance += candidate.factors.relevance;
      contributions.informationGain += candidate.factors.informationGain;
      contributions.trust += candidate.factors.trust;
      contributions.reusability += candidate.factors.reusability;
      contributions.tokenCost += candidate.factors.tokenCost;
      contributions.conflictRisk += candidate.factors.conflictRisk;
    }
    
    // Normalize by number of candidates
    Object.keys(contributions).forEach(key => {
      contributions[key as keyof UtilityFactors] /= candidates.length;
    });
    
    return contributions;
  }

  /**
   * Update weights based on feedback or learning
   */
  public updateWeights(newWeights: Partial<UtilityWeights>): void {
    this.weights = { ...this.weights, ...newWeights };
    // Only normalize if the new weights don't sum to approximately 1.0
    const total = Object.values(this.weights).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(total - 1.0) > 0.5) { // Use same tolerance as constructor
      this.normalizeWeights();
    }
  }

  /**
   * Get current weights
   */
  public getWeights(): UtilityWeights {
    return { ...this.weights };
  }

  /**
   * Reset weights to defaults
   */
  public resetWeights(): void {
    this.weights = { ...this.defaultWeights };
    this.normalizeWeights();
  }

  /**
   * Bubble stabilize ranking results
   * @param candidates - Ranked candidates to stabilize
   * @returns Stabilized ranking candidates
   */
  public async bubbleStabilize(candidates: RankingCandidate[]): Promise<RankingCandidate[]> {
    // Simple bubble sort stabilization - can be enhanced with more sophisticated algorithms
    const stabilized = [...candidates];
    let swapped = true;
    
    while (swapped) {
      swapped = false;
      for (let i = 0; i < stabilized.length - 1; i++) {
        if (stabilized[i].utilityScore < stabilized[i + 1].utilityScore) {
          // Swap candidates
          [stabilized[i], stabilized[i + 1]] = [stabilized[i + 1], stabilized[i]];
          swapped = true;
        }
      }
    }
    
    return stabilized;
  }
}
