/**
 * Context Engine - Main Export File
 * Provides access to all public APIs and types
 */

// Core types and interfaces
export * from './types.js';

// Main orchestrator
export * from './orchestrator.js';

// Ingest pipeline components
export * from './ingest/index.js';

// Retrieval components
export * from './retrieve/index.js';

// Ranking components
export * from './rank/index.js';

// Packing components
export * from './pack/index.js';

// Router components
export * from './router/index.js';

// Compression components
export * from './compress/index.js';

// Caching components
export * from './cache/index.js';

// Metrics components
export * from './metrics/index.js';

// Graph-specific modules (Task 5)
export * from './ingest/graph.js';
export * from './ingest/temporal.js';
export * from './ingest/community-detection.js';
export * from './ingest/neighborhood-expansion.js';
export * from './ingest/graph-optimization.js';

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
