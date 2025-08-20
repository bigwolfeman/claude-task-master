/**
 * index.ts
 * Main export file for the Context Engine module
 * Provides access to all public APIs and types
 */

// Core types and interfaces
export type {
	AtomType,
	Atom,
	Chunk,
	Usefulness,
	Proof,
	QueryPlan,
	ContextResponse,
	Document,
	GraphNode,
	GraphEdge,
	Summary,
	CoverageMatrix,
	PairwiseSignal,
	AnswerMetrics,
	RetrievalCandidate,
	PackingResult,
	RouterDecision,
	CompressionResult,
	CacheEntry,
	MetricsData,
	ConfigOptions
} from './types.js';

// Main orchestrator
export { ContextOrchestrator } from './orchestrator.js';

// Component interfaces
export type {
	StorageBackend,
	HybridRetriever,
	UsefulnessRanker,
	MaxCoveragePacker,
	AnswerabilityRouter,
	ExtractiveCompressor
} from './orchestrator.js';

// Default configuration
export const DEFAULT_CONFIG = {
	enabled: true,
	vectorBackend: 'sqlite' as const,
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
} as const;

// Version information
export const VERSION = '0.1.0';

// Module metadata
export const MODULE_INFO = {
	name: 'Context Engine',
	version: VERSION,
	description: 'Minimum Sufficient Evidence generation with tri-index memory and intelligent routing',
	author: 'Task Master AI',
	license: 'MIT WITH Commons-Clause'
} as const;
