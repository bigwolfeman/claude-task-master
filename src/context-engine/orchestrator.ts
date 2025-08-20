/**
 * orchestrator.ts
 * Main Context Engine orchestrator that coordinates all components for MSE generation
 * Implements the end-to-end pipeline: retrieval → ranking → packing → routing → compression
 */

import type {
	ContextResponse,
	QueryPlan,
	Chunk,
	Proof,
	RetrievalCandidate,
	PackingResult,
	RouterDecision,
	CompressionResult,
	ConfigOptions
} from './types.js';

export interface StorageBackend {
	// Placeholder interface - will be implemented in store.ts
	connect(): Promise<void>;
	disconnect(): Promise<void>;
}

export interface HybridRetriever {
	// Placeholder interface - will be implemented in retrieve/hybrid.ts
	retrieve(plan: QueryPlan): Promise<RetrievalCandidate[]>;
}

export interface UsefulnessRanker {
	// Placeholder interface - will be implemented in rank/usefulness.ts
	rankCandidates(candidates: RetrievalCandidate[], query: string): Promise<RetrievalCandidate[]>;
	bubbleStabilize(candidates: RetrievalCandidate[]): Promise<RetrievalCandidate[]>;
}

export interface MaxCoveragePacker {
	// Placeholder interface - will be implemented in pack/max_coverage.ts
	packMaxCoverage(
		candidates: RetrievalCandidate[],
		atoms: string[],
		budget: number,
		options: { mmr: number }
	): Promise<PackingResult>;
}

export interface AnswerabilityRouter {
	// Placeholder interface - will be implemented in router/route.ts
	computeProof(packed: PackingResult, query: string): Promise<Proof>;
	decideTier(proof: Proof, plan: QueryPlan, budget: number): 'none' | 'small' | 'premium';
}

export interface ExtractiveCompressor {
	// Placeholder interface - will be implemented in compress/extractive.ts
	compress(chunks: Chunk[], budget: number): Promise<CompressionResult>;
}

/**
 * Context Engine Orchestrator
 * Coordinates all components for end-to-end Minimum Sufficient Evidence generation
 */
export class ContextOrchestrator {
	private store: StorageBackend;
	private retriever: HybridRetriever;
	private ranker: UsefulnessRanker;
	private packer: MaxCoveragePacker;
	private router: AnswerabilityRouter;
	private compressor?: ExtractiveCompressor;
	private config: ConfigOptions;

	constructor(
		store: StorageBackend,
		retriever: HybridRetriever,
		ranker: UsefulnessRanker,
		packer: MaxCoveragePacker,
		router: AnswerabilityRouter,
		compressor?: ExtractiveCompressor,
		config?: Partial<ConfigOptions>
	) {
		this.store = store;
		this.retriever = retriever;
		this.ranker = ranker;
		this.packer = packer;
		this.router = router;
		this.compressor = compressor;
		this.config = this.getDefaultConfig(config);
	}

	/**
	 * Main method for generating Minimum Sufficient Evidence
	 * @param query - User query string
	 * @param budget - Token budget constraint
	 * @returns ContextResponse with MSE and routing decision
	 */
	async answerWithMSE(query: string, budget: number): Promise<ContextResponse> {
		try {
			// Step 1: Query Planning
			const plan = await this.analyzeQuery(query, budget);
			
			// Step 2: Retrieval
			const candidates = await this.retriever.retrieve(plan);
			
			// Step 3: Ranking
			const reranked = await this.ranker.rankCandidates(candidates, query);
			const stabilized = await this.ranker.bubbleStabilize(reranked);
			
			// Step 4: Atom Extraction
			const atoms = await this.extractAtoms(stabilized);
			
			// Step 5: Packing
			const packed = await this.packer.packMaxCoverage(stabilized, atoms, budget, { mmr: 0.3 });
			
			// Step 6: Proof Computation
			const proof = await this.router.computeProof(packed, query);
			
			// Step 7: Tier Decision
			const tier = this.router.decideTier(proof, plan, budget);

			// Step 8: Response Generation
			if (tier === 'none') {
				return this.generateDeterministicResponse(packed, query, proof, tier);
			}

			// Step 9: Compression (if compressor available)
			const compressed = this.compressor 
				? await this.compressor.compress(packed.chunks, Math.floor(budget * 0.8))
				: { compressedChunks: packed.chunks, originalChunks: packed.chunks } as CompressionResult;

			// Step 10: LLM Generation (placeholder for now)
			const brief = await this.generateWithTier(query, compressed.compressedChunks, tier);
			
			return {
				brief,
				context: compressed.compressedChunks,
				citations: this.generateCitations(compressed.compressedChunks),
				proof,
				plannedTier: tier
			};
		} catch (error) {
			// Error handling and fallback
			console.error('Error in answerWithMSE:', error);
			throw new Error(`Failed to generate MSE: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Analyze query and create execution plan
	 */
	private async analyzeQuery(query: string, budget: number): Promise<QueryPlan> {
		// Simple query analysis - can be enhanced with LLM-based analysis
		const path = this.determineQueryPath(query);
		const multiQuery = this.generateMultiQueries(query);
		const hyde = this.shouldUseHyde(query) ? this.generateHyde(query) : undefined;

		return {
			path,
			multiQuery,
			hyde,
			budget
		};
	}

	/**
	 * Determine optimal execution path based on query characteristics
	 */
	private determineQueryPath(query: string): 'GraphFirst' | 'TreeFirst' | 'EvidenceFirst' {
		const lowerQuery = query.toLowerCase();
		
		// Graph-first for relationship/entity queries
		if (lowerQuery.includes('relationship') || lowerQuery.includes('connection') || 
			lowerQuery.includes('how') || lowerQuery.includes('why')) {
			return 'GraphFirst';
		}
		
		// Tree-first for hierarchical/summary queries
		if (lowerQuery.includes('overview') || lowerQuery.includes('summary') || 
			lowerQuery.includes('structure') || lowerQuery.includes('hierarchy')) {
			return 'TreeFirst';
		}
		
		// Evidence-first for factoid queries
		return 'EvidenceFirst';
	}

	/**
	 * Generate multiple query variations for better retrieval
	 */
	private generateMultiQueries(query: string): string[] {
		const queries = [query];
		
		// Add query expansion based on common patterns
		if (query.includes('how')) {
			queries.push(query.replace('how', 'what steps'));
			queries.push(query.replace('how', 'what process'));
		}
		
		if (query.includes('why')) {
			queries.push(query.replace('why', 'what causes'));
			queries.push(query.replace('why', 'what reasons'));
		}
		
		return queries.slice(0, 3); // Limit to 3 queries
	}

	/**
	 * Determine if HyDE (Hypothetical Document Embeddings) should be used
	 */
	private shouldUseHyde(query: string): boolean {
		// Use HyDE for creative/exploratory queries
		const creativeKeywords = ['design', 'create', 'build', 'implement', 'develop'];
		return creativeKeywords.some(keyword => query.toLowerCase().includes(keyword));
	}

	/**
	 * Generate HyDE prompt for creative queries
	 */
	private generateHyde(query: string): string {
		return `Imagine a document that would answer: "${query}". What would it contain?`;
	}

	/**
	 * Extract atoms from ranked candidates
	 */
	private async extractAtoms(candidates: RetrievalCandidate[]): Promise<string[]> {
		// Placeholder implementation - will be enhanced with actual atom extraction
		const atoms: string[] = [];
		
		for (const candidate of candidates) {
			// Simple tokenization for now - will be replaced with proper NLP
			const tokens = candidate.chunk.text.split(/\s+/);
			atoms.push(...tokens.slice(0, 10)); // Limit atoms per chunk
		}
		
		return [...new Set(atoms)]; // Remove duplicates
	}

	/**
	 * Generate deterministic response for tier=none cases
	 */
	private generateDeterministicResponse(
		packed: PackingResult,
		query: string,
		proof: Proof,
		tier: 'none'
	): ContextResponse {
		// Simple template-based response generation
		const brief = this.synthesizeDeterministic(packed, query);
		
		return {
			brief,
			context: packed.chunks,
			citations: this.generateCitations(packed.chunks),
			proof,
			plannedTier: tier
		};
	}

	/**
	 * Synthesize deterministic answer from packed evidence
	 */
	private synthesizeDeterministic(packed: PackingResult, query: string): string {
		// Simple extractive summarization
		const relevantTexts = packed.chunks
			.map(chunk => chunk.text)
			.join(' ')
			.substring(0, 500); // Limit length
		
		return `Based on the available evidence: ${relevantTexts}...`;
	}

	/**
	 * Generate citations for chunks
	 */
	private generateCitations(chunks: Chunk[]): Array<{ id: string; uri: string }> {
		return chunks.map(chunk => ({
			id: chunk.id,
			uri: `chunk://${chunk.docId}#${chunk.id}`
		}));
	}

	/**
	 * Generate response with specific LLM tier
	 */
	private async generateWithTier(
		query: string,
		chunks: Chunk[],
		tier: 'small' | 'premium'
	): Promise<string> {
		// Placeholder for LLM integration
		// Will be implemented with actual model triad integration
		return `Generated response using ${tier} tier for query: "${query}" with ${chunks.length} context chunks.`;
	}

	/**
	 * Get default configuration with overrides
	 */
	private getDefaultConfig(overrides?: Partial<ConfigOptions>): ConfigOptions {
		const defaults: ConfigOptions = {
			enabled: true,
			vectorBackend: 'sqlite',
			dbPath: '~/.taskmaster/kb/context.db',
			cacheSize: 1000,
			graphEnabled: true,
			usefulnessWeights: {
				alphaRel: 0.45,
				betaIg: 0.20,
				gammaTr: 0.15,
				deltaRe: 0.10,
				etaCost: 0.08,
				zetaCfr: 0.02
			},
			routerThresholds: {
				none: {
					coverageMin: 0.80,
					conflictsMax: 0
				},
				small: {
					fallbackWhen: ['coverage_below', 'minor_conflict']
				},
				premium: {
					escalateWhen: ['low_support', 'multi_hop_reasoning', 'legal_safety']
				}
			}
		};

		return { ...defaults, ...overrides };
	}

	/**
	 * Get current configuration
	 */
	getConfig(): ConfigOptions {
		return { ...this.config };
	}

	/**
	 * Update configuration
	 */
	updateConfig(updates: Partial<ConfigOptions>): void {
		this.config = { ...this.config, ...updates };
	}

	/**
	 * Health check for all components
	 */
	async healthCheck(): Promise<{ healthy: boolean; components: Record<string, boolean> }> {
		const components: Record<string, boolean> = {
			store: true, // Placeholder
			retriever: true, // Placeholder
			ranker: true, // Placeholder
			packer: true, // Placeholder
			router: true, // Placeholder
			compressor: !!this.compressor
		};

		const healthy = Object.values(components).every(status => status);
		
		return { healthy, components };
	}
}
