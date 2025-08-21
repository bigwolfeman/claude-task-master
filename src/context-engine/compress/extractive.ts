/**
 * extractive.ts
 * Implements LLMLingua-style extractive compression with entity/number preservation
 * Maintains ≤160 tokens per snippet while preserving critical information
 */

import type { Chunk, CompressionResult, Atom } from '../types.js';

export interface CompressionConfig {
  maxTokensPerSnippet: number;
  preserveEntities: boolean;
  preserveNumbers: boolean;
  preserveIds: boolean;
  compressionRatio: number;
  qualityThreshold: number;
  sidecarUrl?: string;
  sidecarTimeout: number;
  enableFallback: boolean;
}

export interface CompressionMetrics {
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;
  entitiesPreserved: number;
  numbersPreserved: number;
  idsPreserved: number;
  qualityScore: number;
  processingTime: number;
}

export interface SidecarResponse {
  compressedText: string;
  preservedEntities: string[];
  preservedNumbers: string[];
  preservedIds: string[];
  compressionRatio: number;
  qualityScore: number;
}

export interface CompressionQuality {
  semanticPreservation: number;
  entityRetention: number;
  numberAccuracy: number;
  readabilityScore: number;
  overallScore: number;
}

/**
 * Extractive Compression System
 * Implements intelligent text compression while preserving critical information
 */
export class ExtractiveCompressor {
  private config: CompressionConfig;
  private readonly defaultConfig: CompressionConfig = {
    maxTokensPerSnippet: 160,
    preserveEntities: true,
    preserveNumbers: true,
    preserveIds: true,
    compressionRatio: 0.6, // Target 60% compression
    qualityThreshold: 0.8,
    sidecarTimeout: 5000, // 5 seconds
    enableFallback: true,
  };

  constructor(config?: Partial<CompressionConfig>) {
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * Compress chunks using extractive compression
   */
  public async compressChunks(
    chunks: Chunk[],
    atoms?: Atom[]
  ): Promise<CompressionResult> {
    const startTime = Date.now();
    
    try {
      // Try sidecar service first if available
      if (this.config.sidecarUrl) {
        try {
          const sidecarResult = await this.compressWithSidecar(chunks, atoms);
          if (sidecarResult) {
            return this.createCompressionResult(chunks, sidecarResult, startTime);
          }
          // If sidecar returns null, it means it failed but handled the error internally
          // Only fallback if fallback is enabled
          if (!this.config.enableFallback) {
            throw new Error('Sidecar service failed and fallback is disabled');
          }
          console.warn('Sidecar service failed, falling back to local compression');
        } catch (sidecarError) {
          console.warn('Sidecar service failed:', sidecarError);
          if (!this.config.enableFallback) {
            throw sidecarError;
          }
          // Only log fallback message if fallback is enabled
          console.warn('Falling back to local compression');
        }
      }

      // Fallback to local compression
      return this.compressLocally(chunks, atoms, startTime);
    } catch (error) {
      console.error('Compression failed:', error);
      
      if (this.config.enableFallback) {
        return this.compressLocally(chunks, atoms, startTime);
      }
      
      throw new Error(`Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compress using external sidecar service
   */
  private async compressWithSidecar(
    chunks: Chunk[],
    atoms?: Atom[]
  ): Promise<SidecarResponse | null> {
    if (!this.config.sidecarUrl) return null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.sidecarTimeout);

      const response = await fetch(`${this.config.sidecarUrl}/compress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chunks: chunks.map(chunk => ({
            id: chunk.id,
            text: chunk.text,
            tokens: chunk.tokens,
          })),
          atoms: atoms?.map(atom => ({
            id: atom.id,
            type: atom.type,
            text: atom.text,
          })),
          config: {
            maxTokens: this.config.maxTokensPerSnippet,
            preserveEntities: this.config.preserveEntities,
            preserveNumbers: this.config.preserveNumbers,
            preserveIds: this.config.preserveIds,
            targetRatio: this.config.compressionRatio,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Sidecar service error: ${response.status} ${response.statusText}`);
      }

      const result: SidecarResponse = await response.json();
      
      // Validate sidecar response
      if (this.validateSidecarResponse(result)) {
        return result;
      }
      
      throw new Error('Invalid sidecar response format');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Sidecar service timeout, falling back to local compression');
      } else {
        console.warn('Sidecar service failed, falling back to local compression:', error);
      }
      return null;
    }
  }

  /**
   * Validate sidecar service response
   */
  private validateSidecarResponse(response: any): response is SidecarResponse {
    return (
      typeof response === 'object' &&
      typeof response.compressedText === 'string' &&
      Array.isArray(response.preservedEntities) &&
      Array.isArray(response.preservedNumbers) &&
      Array.isArray(response.preservedIds) &&
      typeof response.compressionRatio === 'number' &&
      typeof response.qualityScore === 'number'
    );
  }

  /**
   * Local compression implementation
   */
  private compressLocally(
    chunks: Chunk[],
    atoms?: Atom[],
    startTime?: number
  ): CompressionResult {
    const start = startTime || Date.now();
    
    const compressedChunks: Chunk[] = [];
    const preservedEntities: string[] = [];
    const preservedNumbers: string[] = [];
    const preservedIds: string[] = [];

    // Extract entities, numbers, and IDs to preserve
    if (atoms) {
      for (const atom of atoms) {
        if (this.config.preserveEntities && atom.type === 'ENT') {
          preservedEntities.push(atom.text);
        } else if (this.config.preserveNumbers && atom.type === 'NUM') {
          preservedNumbers.push(atom.text);
        } else if (this.config.preserveIds && atom.id) {
          preservedIds.push(atom.id);
        }
      }
    }

    // Compress each chunk
    for (const chunk of chunks) {
      const compressedChunk = this.compressChunk(
        chunk,
        preservedEntities,
        preservedNumbers,
        preservedIds
      );
      compressedChunks.push(compressedChunk);
    }

    // Calculate metrics
    const originalTokens = chunks.reduce((sum, chunk) => sum + chunk.tokens, 0);
    const compressedTokens = compressedChunks.reduce((sum, chunk) => sum + chunk.tokens, 0);
    const compressionRatio = originalTokens > 0 ? compressedTokens / originalTokens : 1;
    const tokenReduction = originalTokens - compressedTokens;

    return {
      originalChunks: chunks,
      compressedChunks,
      compressionRatio,
      preservedEntities,
      tokenReduction,
    };
  }

  /**
   * Compress individual chunk
   */
  private compressChunk(
    chunk: Chunk,
    preservedEntities: string[],
    preservedNumbers: string[],
    preservedIds: string[]
  ): Chunk {
    let compressedText = chunk.text;
    
    // Apply compression techniques while preserving critical information
    compressedText = this.applyCompressionTechniques(
      compressedText,
      preservedEntities,
      preservedNumbers,
      preservedIds
    );

    // Apply compression ratio-based adjustments
    const targetTokens = Math.floor(chunk.tokens * this.config.compressionRatio);
    if (this.estimateTokens(compressedText) > targetTokens) {
      compressedText = this.enforceTokenLimit(
        compressedText,
        preservedEntities,
        preservedNumbers,
        preservedIds,
        targetTokens
      );
    }

    // Ensure absolute token limit compliance
    const estimatedTokens = this.estimateTokens(compressedText);
    if (estimatedTokens > this.config.maxTokensPerSnippet) {
      compressedText = this.enforceTokenLimit(
        compressedText,
        preservedEntities,
        preservedNumbers,
        preservedIds,
        this.config.maxTokensPerSnippet
      );
    }

    // Create compressed chunk
    return {
      ...chunk,
      text: compressedText,
      tokens: this.estimateTokens(compressedText),
      metadata: {
        ...chunk.metadata,
        compressed: true,
        originalTokens: chunk.tokens,
        compressionRatio: this.estimateTokens(compressedText) / chunk.tokens,
      },
    };
  }

  /**
   * Apply compression techniques
   */
  private applyCompressionTechniques(
    text: string,
    preservedEntities: string[],
    preservedNumbers: string[],
    preservedIds: string[]
  ): string {
    let compressed = text;

    // Remove redundant whitespace
    compressed = compressed.replace(/\s+/g, ' ').trim();

    // Create a set of all preserved content for quick lookup
    const preservedContent = new Set([
      ...preservedEntities,
      ...preservedNumbers,
      ...preservedIds,
    ]);

    // Remove common filler words (while preserving entities/numbers)
    // More aggressive compression removes more filler words
    const aggressiveFillerWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
    ];
    
    const conservativeFillerWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by'
    ];
    
    // Choose filler words based on compression ratio
    const fillerWords = this.config.compressionRatio < 0.5 
      ? aggressiveFillerWords 
      : conservativeFillerWords;

    // Remove filler words, but preserve important content
    for (const filler of fillerWords) {
      const fillerRegex = new RegExp(`\\b${filler}\\b`, 'gi');
      compressed = compressed.replace(fillerRegex, (match, offset) => {
        // Check if removing this filler would break preserved content
        const beforeMatch = compressed.substring(0, offset);
        const afterMatch = compressed.substring(offset + match.length);
        
        // Check if any preserved content would be broken by removing this filler
        for (const preserved of preservedContent) {
          const beforePreserved = beforeMatch.includes(preserved);
          const afterPreserved = afterMatch.includes(preserved);
          
          // If preserved content exists in both parts, removing the filler might break it
          if (beforePreserved && afterPreserved) {
            return match; // Keep the filler to preserve content
          }
        }
        
        return ''; // Safe to remove
      });
    }

    // Remove punctuation that doesn't affect meaning
    compressed = compressed.replace(/[.,;:!?]+/g, (match) => {
      // Keep punctuation that might be part of preserved content
      for (const preserved of preservedContent) {
        if (compressed.includes(preserved + match) || compressed.includes(match + preserved)) {
          return match; // Keep punctuation that's part of preserved content
        }
      }
      return ''; // Safe to remove
    });

    // Clean up multiple spaces again
    compressed = compressed.replace(/\s+/g, ' ').trim();

    return compressed;
  }

  /**
   * Enforce token limit while preserving critical information
   */
  private enforceTokenLimit(
    text: string,
    preservedEntities: string[],
    preservedNumbers: string[],
    preservedIds: string[],
    targetTokens: number = this.config.maxTokensPerSnippet
  ): string {
    const words = text.split(/\s+/);
    const preservedContent = [
      ...preservedEntities,
      ...preservedNumbers,
      ...preservedIds,
    ];

    // Find positions of preserved content
    const preservedPositions = new Set<number>();
    for (const content of preservedContent) {
      const contentWords = content.split(/\s+/);
      for (let i = 0; i <= words.length - contentWords.length; i++) {
        if (contentWords.every((word, j) => words[i + j] === word)) {
          for (let j = 0; j < contentWords.length; j++) {
            preservedPositions.add(i + j);
          }
        }
      }
    }

    // Truncate while preserving critical content
    let truncatedWords: string[] = [];
    let currentTokens = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordTokens = this.estimateTokens(word);
      
      if (currentTokens + wordTokens <= this.config.maxTokensPerSnippet) {
        truncatedWords.push(word);
        currentTokens += wordTokens;
      } else if (preservedPositions.has(i)) {
        // If we hit a preserved word, try to fit it by removing some previous non-preserved words
        const spaceNeeded = wordTokens - (this.config.maxTokensPerSnippet - currentTokens);
        let removedTokens = 0;
        
        // Remove non-preserved words from the end to make space
        while (removedTokens < spaceNeeded && truncatedWords.length > 0) {
          const lastWord = truncatedWords[truncatedWords.length - 1];
          const lastWordTokens = this.estimateTokens(lastWord);
          
          if (!preservedPositions.has(truncatedWords.length - 1)) {
            truncatedWords.pop();
            removedTokens += lastWordTokens;
            currentTokens -= lastWordTokens;
          } else {
            break; // Can't remove preserved content
          }
        }
        
        // Add the preserved word if we made enough space
        if (currentTokens + wordTokens <= this.config.maxTokensPerSnippet) {
          truncatedWords.push(word);
          currentTokens += wordTokens;
        }
      }
      
      if (currentTokens >= this.config.maxTokensPerSnippet) {
        break;
      }
    }

    return truncatedWords.join(' ');
  }

  /**
   * Estimate token count (simplified implementation)
   */
  private estimateTokens(text: string): number {
    // Simple token estimation: split by whitespace and count
    // In production, this would use a proper tokenizer
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Create compression result with metrics
   */
  private createCompressionResult(
    originalChunks: Chunk[],
    sidecarResult: SidecarResponse,
    startTime: number
  ): CompressionResult {
    const processingTime = Date.now() - startTime;
    
    // Create compressed chunks from sidecar response
    const compressedChunks: Chunk[] = originalChunks.map((chunk, index) => ({
      ...chunk,
      text: sidecarResult.compressedText,
      tokens: this.estimateTokens(sidecarResult.compressedText),
      metadata: {
        ...chunk.metadata,
        compressed: true,
        originalTokens: chunk.tokens,
        compressionRatio: sidecarResult.compressionRatio,
        qualityScore: sidecarResult.qualityScore,
        processingTime,
      },
    }));

    const originalTokens = originalChunks.reduce((sum, chunk) => sum + chunk.tokens, 0);
    const compressedTokens = compressedChunks.reduce((sum, chunk) => sum + chunk.tokens, 0);
    const tokenReduction = originalTokens - compressedTokens;

    return {
      originalChunks,
      compressedChunks,
      compressionRatio: sidecarResult.compressionRatio,
      preservedEntities: sidecarResult.preservedEntities,
      tokenReduction,
    };
  }

  /**
   * Check sidecar service health
   */
  public async checkSidecarHealth(): Promise<boolean> {
    if (!this.config.sidecarUrl) return false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout for health check

      const response = await fetch(`${this.config.sidecarUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get compression metrics
   */
  public getCompressionMetrics(result: CompressionResult): CompressionMetrics {
    const originalTokens = result.originalChunks.reduce((sum, chunk) => sum + chunk.tokens, 0);
    const compressedTokens = result.compressedChunks.reduce((sum, chunk) => sum + chunk.tokens, 0);
    
    return {
      originalTokens,
      compressedTokens,
      compressionRatio: result.compressionRatio,
      entitiesPreserved: result.preservedEntities.length,
      numbersPreserved: 0, // Would need to extract from preservedEntities
      idsPreserved: 0, // Would need to extract from preservedEntities
      qualityScore: this.calculateQualityScore(result),
      processingTime: 0, // Would need to track during compression
    };
  }

  /**
   * Calculate compression quality score
   */
  private calculateQualityScore(result: CompressionResult): number {
    // Simple quality scoring based on compression ratio and preservation
    const ratioScore = Math.max(0, 1 - Math.abs(result.compressionRatio - this.config.compressionRatio));
    const preservationScore = result.preservedEntities.length > 0 ? 0.8 : 0.5;
    
    return (ratioScore + preservationScore) / 2;
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<CompressionConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current configuration
   */
  public getConfig(): CompressionConfig {
    return { ...this.config };
  }
}
