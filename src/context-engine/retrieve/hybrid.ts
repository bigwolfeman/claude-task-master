/**
 * Hybrid Retrieval System
 * Combines BM25, dense embeddings, and fusion techniques for optimal retrieval
 */

import type { Chunk, Document, GraphNode, Summary } from '../types.js';

export interface RetrievalResult {
  chunkId: string;
  score: number;
  source: 'bm25' | 'dense' | 'hybrid';
  metadata: {
    documentId: string;
    chunkIndex: number;
    relevance: number;
    confidence: number;
  };
}

export interface HybridRetrievalOptions {
  bm25Weight: number;
  denseWeight: number;
  rrfConstant: number;
  maxResults: number;
  enableHyDE: boolean;
  enableMultiQuery: boolean;
  strategy: 'GraphFirst' | 'TreeFirst' | 'EvidenceFirst';
}

export interface QueryExpansion {
  originalQuery: string;
  expandedQueries: string[];
  hydeQueries?: string[];
}

export class HybridRetrievalSystem {
  private options: HybridRetrievalOptions;
  private embeddingCache: Map<string, number[]> = new Map();
  private bm25Cache: Map<string, Map<string, number>> = new Map();

  constructor(options: Partial<HybridRetrievalOptions> = {}) {
    this.options = {
      bm25Weight: 0.4,
      denseWeight: 0.6,
      rrfConstant: 60, // RRF constant as specified
      maxResults: 100,
      enableHyDE: true,
      enableMultiQuery: true,
      strategy: 'EvidenceFirst',
      ...options
    };
  }

  /**
   * Main retrieval method that combines multiple retrieval strategies
   */
  async retrieve(
    query: string,
    documents: Document[],
    chunks: Chunk[],
    graphNodes?: GraphNode[],
    summaries?: Summary[]
  ): Promise<RetrievalResult[]> {
    try {
      // Generate query expansions
      const queryExpansion = await this.expandQuery(query);
      
      // Execute retrieval based on strategy
      let results: RetrievalResult[] = [];
      
      switch (this.options.strategy) {
        case 'GraphFirst':
          results = await this.executeGraphFirstStrategy(queryExpansion, chunks, graphNodes);
          break;
        case 'TreeFirst':
          results = await this.executeTreeFirstStrategy(queryExpansion, chunks, summaries);
          break;
        case 'EvidenceFirst':
        default:
          results = await this.executeEvidenceFirstStrategy(queryExpansion, chunks);
          break;
      }

      // Apply RRF fusion if we have multiple result sets
      if (results.length > 0) {
        results = this.applyRRFFusion(results);
      }

      // Sort by final score and limit results
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, this.options.maxResults);

    } catch (error) {
      console.error('Error in hybrid retrieval:', error);
      throw new Error(`Hybrid retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute GraphFirst strategy - prioritize graph-based retrieval
   */
  private async executeGraphFirstStrategy(
    queryExpansion: QueryExpansion,
    chunks: Chunk[],
    graphNodes?: GraphNode[]
  ): Promise<RetrievalResult[]> {
    const results: RetrievalResult[] = [];
    
    // Start with graph-based retrieval if available
    if (graphNodes && graphNodes.length > 0) {
      const graphResults = await this.retrieveFromGraph(queryExpansion, chunks, graphNodes);
      results.push(...graphResults);
    }
    
    // Fall back to evidence-based retrieval
    const evidenceResults = await this.executeEvidenceFirstStrategy(queryExpansion, chunks);
    results.push(...evidenceResults);
    
    return results;
  }

  /**
   * Execute TreeFirst strategy - prioritize RAPTOR tree-based retrieval
   */
  private async executeTreeFirstStrategy(
    queryExpansion: QueryExpansion,
    chunks: Chunk[],
    summaries?: Summary[]
  ): Promise<RetrievalResult[]> {
    const results: RetrievalResult[] = [];
    
    // Start with tree-based retrieval if available
    if (summaries && summaries.length > 0) {
      const treeResults = await this.retrieveFromTree(queryExpansion, chunks, summaries);
      results.push(...treeResults);
    }
    
    // Fall back to evidence-based retrieval
    const evidenceResults = await this.executeEvidenceFirstStrategy(queryExpansion, chunks);
    results.push(...evidenceResults);
    
    return results;
  }

  /**
   * Execute EvidenceFirst strategy - standard retrieval approach
   */
  private async executeEvidenceFirstStrategy(
    queryExpansion: QueryExpansion,
    chunks: Chunk[]
  ): Promise<RetrievalResult[]> {
    const results: RetrievalResult[] = [];
    
    // Execute BM25 retrieval
    const bm25Results = await this.retrieveWithBM25(queryExpansion, chunks);
    results.push(...bm25Results);
    
    // Execute dense retrieval
    const denseResults = await this.retrieveWithDenseEmbeddings(queryExpansion, chunks);
    results.push(...denseResults);
    
    return results;
  }

  /**
   * Query expansion with multi-query generation and HyDE support
   */
  private async expandQuery(query: string): Promise<QueryExpansion> {
    const expandedQueries: string[] = [query];
    
    if (this.options.enableMultiQuery) {
      // Generate additional query variations
      const variations = await this.generateQueryVariations(query);
      expandedQueries.push(...variations);
    }
    
    let hydeQueries: string[] | undefined;
    if (this.options.enableHyDE) {
      hydeQueries = await this.generateHyDEQueries(query);
    }
    
    return {
      originalQuery: query,
      expandedQueries,
      hydeQueries
    };
  }

  /**
   * Generate query variations for better retrieval coverage
   */
  private async generateQueryVariations(query: string): Promise<string[]> {
    // Simple query variations - in a real implementation, this would use LLM
    const variations: string[] = [];
    
    // Add synonyms and related terms
    if (query.toLowerCase().includes('how')) {
      variations.push(query.replace(/how/gi, 'what'));
      variations.push(query.replace(/how/gi, 'why'));
    }
    
    if (query.toLowerCase().includes('what')) {
      variations.push(query.replace(/what/gi, 'how'));
      variations.push(query.replace(/what/gi, 'why'));
    }
    
    // Add question variations
    if (!query.includes('?')) {
      variations.push(query + '?');
    }
    
    return variations;
  }

  /**
   * Generate Hypothetical Document Embeddings (HyDE) queries
   */
  private async generateHyDEQueries(query: string): Promise<string[]> {
    // In a real implementation, this would use an LLM to generate hypothetical answers
    // For now, we'll create simple variations
    const hydeQueries: string[] = [];
    
    // Create hypothetical answer-like queries
    if (query.toLowerCase().includes('how')) {
      hydeQueries.push(`Steps to ${query.replace(/how/gi, '').trim()}`);
      hydeQueries.push(`Process for ${query.replace(/how/gi, '').trim()}`);
    }
    
    if (query.toLowerCase().includes('what')) {
      hydeQueries.push(`Definition of ${query.replace(/what/gi, '').trim()}`);
      hydeQueries.push(`Examples of ${query.replace(/what/gi, '').trim()}`);
    }
    
    return hydeQueries;
  }

  /**
   * BM25 retrieval implementation
   */
  private async retrieveWithBM25(
    queryExpansion: QueryExpansion,
    chunks: Chunk[]
  ): Promise<RetrievalResult[]> {
    const results: RetrievalResult[] = [];
    
    for (const chunk of chunks) {
      let totalScore = 0;
      
      for (const query of queryExpansion.expandedQueries) {
        const score = this.calculateBM25Score(query, chunk);
        totalScore += score;
      }
      
      // Average score across all queries
      const avgScore = totalScore / queryExpansion.expandedQueries.length;
      
      if (avgScore > 0) {
        results.push({
          chunkId: chunk.id,
          score: avgScore * this.options.bm25Weight,
          source: 'bm25',
          metadata: {
            documentId: chunk.documentId,
            chunkIndex: chunk.chunkIndex,
            relevance: avgScore,
            confidence: Math.min(avgScore / 10, 1.0) // Normalize confidence
          }
        });
      }
    }
    
    return results;
  }

  /**
   * Calculate BM25 score for a query-chunk pair
   */
  private calculateBM25Score(query: string, chunk: Chunk): number {
    const k1 = 1.2; // BM25 parameter
    const b = 0.75; // BM25 parameter
    
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    const chunkText = chunk.text.toLowerCase();
    const chunkLength = chunk.text.length;
    
    let score = 0;
    
    for (const term of queryTerms) {
      const termFreq = (chunkText.match(new RegExp(term, 'g')) || []).length;
      if (termFreq > 0) {
        const tf = termFreq / (termFreq + k1 * (1 - b + b * (chunkLength / 500))); // 500 is avg chunk length
        score += tf;
      }
    }
    
    return score;
  }

  /**
   * Dense retrieval using embeddings
   */
  private async retrieveWithDenseEmbeddings(
    queryExpansion: QueryExpansion,
    chunks: Chunk[]
  ): Promise<RetrievalResult[]> {
    const results: RetrievalResult[] = [];
    
    for (const chunk of chunks) {
      let totalScore = 0;
      
      for (const query of queryExpansion.expandedQueries) {
        const score = await this.calculateDenseScore(query, chunk);
        totalScore += score;
      }
      
      // Average score across all queries
      const avgScore = totalScore / queryExpansion.expandedQueries.length;
      
      if (avgScore > 0) {
        results.push({
          chunkId: chunk.id,
          score: avgScore * this.options.denseWeight,
          source: 'dense',
          metadata: {
            documentId: chunk.documentId,
            chunkIndex: chunk.chunkIndex,
            relevance: avgScore,
            confidence: Math.min(avgScore / 10, 1.0) // Normalize confidence
          }
        });
      }
    }
    
    return results;
  }

  /**
   * Calculate dense similarity score between query and chunk
   */
  private async calculateDenseScore(query: string, chunk: Chunk): Promise<number> {
    try {
      // Get or compute query embedding
      const queryEmbedding = await this.getQueryEmbedding(query);
      
      // Get or compute chunk embedding
      const chunkEmbedding = await this.getChunkEmbedding(chunk);
      
      if (!queryEmbedding || !chunkEmbedding) {
        return 0;
      }
      
      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(queryEmbedding, chunkEmbedding);
      
      return similarity;
      
    } catch (error) {
      console.warn(`Error calculating dense score: ${error}`);
      return 0;
    }
  }

  /**
   * Get query embedding (with caching)
   */
  private async getQueryEmbedding(query: string): Promise<number[] | null> {
    const cacheKey = `query:${query}`;
    
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey) || null;
    }
    
    try {
      // In a real implementation, this would call an embedding service
      // For now, we'll create a simple hash-based embedding
      const embedding = this.createSimpleEmbedding(query);
      this.embeddingCache.set(cacheKey, embedding);
      return embedding;
    } catch (error) {
      console.warn(`Error getting query embedding: ${error}`);
      return null;
    }
  }

  /**
   * Get chunk embedding (with caching)
   */
  private async getChunkEmbedding(chunk: Chunk): Promise<number[] | null> {
    const cacheKey = `chunk:${chunk.id}`;
    
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey) || null;
    }
    
    try {
      // In a real implementation, this would call an embedding service
      // For now, we'll create a simple hash-based embedding
      const embedding = this.createSimpleEmbedding(chunk.text);
      this.embeddingCache.set(cacheKey, embedding);
      return embedding;
    } catch (error) {
      console.warn(`Error getting chunk embedding: ${error}`);
      return null;
    }
  }

  /**
   * Create simple hash-based embedding for demonstration
   * In production, this would use a proper embedding model
   */
  private createSimpleEmbedding(text: string): number[] {
    const embedding: number[] = [];
    const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    // Create a simple 128-dimensional embedding based on word hashes
    for (let i = 0; i < 128; i++) {
      let value = 0;
      for (const word of words) {
        const hash = this.simpleHash(word + i.toString());
        value += hash;
      }
      embedding.push((value % 1000) / 1000); // Normalize to [0, 1]
    }
    
    return embedding;
  }

  /**
   * Simple hash function for demonstration
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Retrieve from graph nodes (for GraphFirst strategy)
   */
  private async retrieveFromGraph(
    queryExpansion: QueryExpansion,
    chunks: Chunk[],
    graphNodes: GraphNode[]
  ): Promise<RetrievalResult[]> {
    const results: RetrievalResult[] = [];
    
    // Find chunks that contain graph nodes
    for (const node of graphNodes) {
      const relevantChunks = chunks.filter(chunk => 
        chunk.text.toLowerCase().includes(node.label.toLowerCase())
      );
      
      for (const chunk of relevantChunks) {
        const score = this.calculateGraphRelevanceScore(node, chunk);
        
        if (score > 0) {
          results.push({
            chunkId: chunk.id,
            score: score * 0.8, // Slightly lower weight for graph-based results
            source: 'hybrid',
            metadata: {
              documentId: chunk.documentId,
              chunkIndex: chunk.chunkIndex,
              relevance: score,
              confidence: Math.min(score / 10, 1.0)
            }
          });
        }
      }
    }
    
    return results;
  }

  /**
   * Retrieve from RAPTOR tree summaries (for TreeFirst strategy)
   */
  private async retrieveFromTree(
    queryExpansion: QueryExpansion,
    chunks: Chunk[],
    summaries: Summary[]
  ): Promise<RetrievalResult[]> {
    const results: RetrievalResult[] = [];
    
    for (const summary of summaries) {
      const relevantChunks = chunks.filter(chunk => 
        summary.chunkIds.includes(chunk.id)
      );
      
      for (const chunk of relevantChunks) {
        const score = this.calculateTreeRelevanceScore(summary, chunk, queryExpansion);
        
        if (score > 0) {
          results.push({
            chunkId: chunk.id,
            score: score * 0.9, // Slightly lower weight for tree-based results
            source: 'hybrid',
            metadata: {
              documentId: chunk.documentId,
              chunkIndex: chunk.chunkIndex,
              relevance: score,
              confidence: Math.min(score / 10, 1.0)
            }
          });
        }
      }
    }
    
    return results;
  }

  /**
   * Calculate graph relevance score
   */
  private calculateGraphRelevanceScore(node: GraphNode, chunk: Chunk): number {
    const nodeLabel = node.label.toLowerCase();
    const chunkText = chunk.text.toLowerCase();
    
    // Count occurrences and calculate relevance
    const occurrences = (chunkText.match(new RegExp(nodeLabel, 'g')) || []).length;
    const textLength = chunk.text.length;
    
    return (occurrences * 10) / Math.sqrt(textLength);
  }

  /**
   * Calculate tree relevance score
   */
  private calculateTreeRelevanceScore(
    summary: Summary,
    chunk: Chunk,
    queryExpansion: QueryExpansion
  ): number {
    let score = 0;
    
    // Check if chunk text contains query terms
    for (const query of queryExpansion.expandedQueries) {
      const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
      
      for (const term of queryTerms) {
        if (chunk.text.toLowerCase().includes(term)) {
          score += 1;
        }
      }
    }
    
    // Bonus for chunks that are part of important summaries
    if (summary.metadata?.importance) {
      score += summary.metadata.importance * 0.5;
    }
    
    return score;
  }

  /**
   * Apply Reciprocal Rank Fusion (RRF) to combine multiple result sets
   */
  private applyRRFFusion(results: RetrievalResult[]): RetrievalResult[] {
    const fusedResults = new Map<string, RetrievalResult>();
    
    // Group results by chunk ID
    for (const result of results) {
      if (fusedResults.has(result.chunkId)) {
        const existing = fusedResults.get(result.chunkId)!;
        existing.score += this.calculateRRFScore(result.score, this.options.rrfConstant);
      } else {
        const fusedResult = {
          ...result,
          score: this.calculateRRFScore(result.score, this.options.rrfConstant)
        };
        fusedResults.set(result.chunkId, fusedResult);
      }
    }
    
    return Array.from(fusedResults.values());
  }

  /**
   * Calculate RRF score
   */
  private calculateRRFScore(score: number, constant: number): number {
    return constant / (constant + score);
  }

  /**
   * Clear caches
   */
  clearCaches(): void {
    this.embeddingCache.clear();
    this.bm25Cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { embeddingSize: number; bm25Size: number } {
    return {
      embeddingSize: this.embeddingCache.size,
      bm25Size: this.bm25Cache.size
    };
  }

  /**
   * Update retrieval options
   */
  updateOptions(newOptions: Partial<HybridRetrievalOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Get current options
   */
  getOptions(): HybridRetrievalOptions {
    return { ...this.options };
  }
}
