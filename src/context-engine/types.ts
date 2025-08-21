/**
 * types.ts
 * Core TypeScript interfaces and types for the Context Engine
 * Implements the data structures defined in the PRD for MSE generation
 */

export type AtomType = 'ENT' | 'NUM' | 'DATE' | 'REL';

export interface Atom {
	id: string;
	chunkId: string;
	type: AtomType;
	text: string;
	confidence: number;
	metadata: Record<string, unknown>;
	provenance: {
		offset: number;
		length: number;
	};
	createdAt: string;
	updatedAt: string;
}

export interface Chunk {
	id: string;
	docId: string;
	documentId: string; // Added for hybrid retrieval compatibility
	chunkIndex: number; // Added for hybrid retrieval compatibility
	text: string;
	tokens: number;
	embedding?: number[];
	metadata: Record<string, unknown>;
	recency?: number;
	createdAt: string;
	updatedAt: string;
}

export interface Usefulness {
	rel: number;
	infoGain: number;
	trust: number;
	reusability: number;
	tokenCost: number;
	conflictRisk: number;
	score: number;
}

export interface Proof {
	coverage: number;
	conflicts: number;
	supportStyle: 'span' | 'paraphrase' | 'none';
	selected: Array<{
		chunkId: string;
		span?: [number, number];
	}>;
}

export interface QueryPlan {
	path: 'GraphFirst' | 'TreeFirst' | 'EvidenceFirst';
	multiQuery: string[];
	hyde?: string;
	budget: number;
}

export interface ContextResponse {
	brief: string;
	context: Chunk[];
	citations: Array<{
		id: string;
		uri: string;
	}>;
	proof: Proof;
	plannedTier: 'none' | 'small' | 'premium';
}

export interface Document {
	id: string;
	uri: string;
	title: string;
	content: string;
	authority: number;
	metadata: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
}

export interface GraphNode {
	id: string;
	type: string;
	label: string;
	metadata: Record<string, unknown>;
}

export interface GraphEdge {
	id: string;
	sourceId: string;
	targetId: string;
	type: string;
	weight: number;
	metadata: Record<string, unknown>;
}

export interface Summary {
	id: string;
	chunkIds: string[];
	text: string;
	tokens: number;
	metadata: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
}

export interface CoverageMatrix {
	id: string;
	chunkId: string;
	atomIds: string[];
	coverageScore: number;
	metadata: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
}

export interface PairwiseSignal {
	id: string;
	queryId: string;
	chunkId1: string;
	chunkId2: string;
	signal: number;
	weight: number;
	metadata: Record<string, unknown>;
	timestamp: string;
}

export interface AnswerMetrics {
	queryId: string;
	query: string;
	answer: string;
	relevanceScore: number;
	accuracyScore: number;
	completenessScore: number;
	tierUsed: string;
	metadata: Record<string, unknown>;
	timestamp: string;
}

export interface RetrievalCandidate {
	chunk: Chunk;
	score: number;
	source: 'bm25' | 'dense' | 'hybrid' | 'graph' | 'raptor';
	metadata?: Record<string, unknown>;
}

export interface PackingResult {
	selectedCandidates: Array<{
		id: string;
		candidate: any; // This should be more specific based on actual usage
		atomIds: string[];
		tokenCost: number;
		coverageGain: number;
		utilityScore: number;
		priority: 'high' | 'medium' | 'low';
		estimatedTokens: number;
	}>;
	totalTokens: number;
	totalCoverage: number;
	coveragePercentage: number;
	budgetUtilization: number;
	metadata: {
		algorithm: string;
		iterations: number;
		processingTime: number;
		coverageMatrixId: string;
	};
	// For compatibility with orchestrator
	chunks?: Chunk[];
}

export interface RouterDecision {
	tier: 'none' | 'small' | 'premium';
	reason: string;
	confidence: number;
	fallbackStrategy?: string;
}

export interface CompressionResult {
	originalChunks: Chunk[];
	compressedChunks: Chunk[];
	compressionRatio: number;
	preservedEntities: string[];
	tokenReduction: number;
}

export interface CacheEntry<T> {
	key: string;
	value: T;
	timestamp: number;
	ttl: number;
	accessCount: number;
}

export interface MetricsData {
	timestamp: string;
	operation: string;
	latency: number;
	tokensIn: number;
	tokensOut: number;
	tierUsed: string;
	cacheHit: boolean;
	success: boolean;
	error?: string;
}

export interface ConfigOptions {
	enabled: boolean;
	vectorBackend: 'sqlite' | 'pgvector';
	dbPath: string;
	cacheSize: number;
	graphEnabled: boolean;
	compressorUrl?: string;
	lateInteractionUrl?: string;
	usefulnessWeights: {
		alphaRel: number;
		betaIg: number;
		gammaTr: number;
		deltaRe: number;
		etaCost: number;
		zetaCfr: number;
	};
	routerThresholds: {
		none: {
			coverageMin: number;
			conflictsMax: number;
		};
		small: {
			fallbackWhen: string[];
		};
		premium: {
			escalateWhen: string[];
		};
	};
}
