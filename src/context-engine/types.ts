/**
 * types.ts
 * Core TypeScript interfaces and types for the Context Engine
 * Implements the data structures defined in the PRD for MSE generation
 */

export type AtomType = 'ENT' | 'NUM' | 'DATE' | 'REL';

export interface Atom {
	id: string;
	type: AtomType;
	surface: string;
	norm: string;
	provenance: {
		chunkId: string;
		offset: number;
	};
}

export interface Chunk {
	id: string;
	docId: string;
	text: string;
	tokens: number;
	embedding?: number[];
	start?: number;
	end?: number;
	authority?: number;
	recency?: number;
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
	authority: number;
	createdAt: string;
}

export interface GraphNode {
	id: string;
	type: string;
	label: string;
	metadata: Record<string, unknown>;
}

export interface GraphEdge {
	sourceId: string;
	targetId: string;
	edgeType: string;
	weight: number;
}

export interface Summary {
	id: string;
	level: number;
	parentId?: string;
	summary: string;
	childChunks: string[];
	tokens: number;
}

export interface CoverageMatrix {
	chunkId: string;
	atomIds: string[];
	coverageScore: number;
}

export interface PairwiseSignal {
	queryId: string;
	winnerId: string;
	loserId: string;
	signal: string;
	weight: number;
	timestamp: string;
}

export interface AnswerMetrics {
	queryId: string;
	coverage: number;
	conflicts: number;
	supportStyle: string;
	decidedBy: string;
	tokensSaved: number;
	tierUsed: string;
}

export interface RetrievalCandidate {
	chunk: Chunk;
	score: number;
	source: 'bm25' | 'dense' | 'hybrid' | 'graph' | 'raptor';
	metadata?: Record<string, unknown>;
}

export interface PackingResult {
	chunks: Chunk[];
	totalTokens: number;
	coverage: number;
	atomsCovered: string[];
	mmrScore: number;
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
