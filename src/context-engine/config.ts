/**
 * Context Engine Configuration
 * Centralized configuration management for the context engine
 */

export interface ContextEngineConfig {
	// Storage configuration
	storage: {
		path: string;
		maxDocuments: number;
		maxChunksPerDocument: number;
		chunkSize: number;
		overlap: number;
	};

	// Retrieval configuration
	retrieval: {
		maxResults: number;
		hybridWeight: number; // Weight for hybrid retrieval (0-1)
		bm25Weight: number;   // Weight for BM25 (0-1)
		embeddingWeight: number; // Weight for embeddings (0-1)
		rerankTopK: number;   // Number of results to rerank
	};

	// Ranking configuration
	ranking: {
		utilityThreshold: number; // Minimum utility score
		maxCandidates: number;    // Maximum candidates to rank
		enableBubbleStabilize: boolean; // Enable bubble sort stabilization
	};

	// Packing configuration
	packing: {
		maxTokens: number;        // Maximum tokens for packed evidence
		coverageThreshold: number; // Minimum coverage percentage
		enableMMR: boolean;       // Enable Maximal Marginal Relevance
		mmrLambda: number;        // MMR lambda parameter (0-1)
	};

	// Compression configuration
	compression: {
		enabled: boolean;         // Enable compression
		maxCompressedTokens: number; // Maximum tokens after compression
		preserveEntities: boolean;    // Preserve named entities
		preserveNumbers: boolean;     // Preserve numerical values
		preserveIds: boolean;         // Preserve IDs and references
	};

	// Proof calculation configuration
	proof: {
		confidenceThreshold: number; // Minimum confidence score
		conflictPenalty: number;     // Penalty for conflicting evidence
		supportStyleWeight: number;  // Weight for support style
		evidenceQualityWeight: number; // Weight for evidence quality
	};

	// Caching configuration
	caching: {
		enabled: boolean;           // Enable caching
		maxSize: number;            // Maximum cache size in MB
		ttl: number;                // Time to live in seconds
		persistToDisk: boolean;     // Persist cache to disk
	};

	// Performance configuration
	performance: {
		parallelProcessing: boolean; // Enable parallel processing
		maxWorkers: number;          // Maximum worker threads
		timeout: number;             // Operation timeout in ms
		batchSize: number;           // Batch size for operations
	};
}

/**
 * Default configuration for the context engine
 */
export const defaultConfig: ContextEngineConfig = {
	storage: {
		path: '.taskmaster/context-engine.db',
		maxDocuments: 10000,
		maxChunksPerDocument: 1000,
		chunkSize: 512,
		overlap: 50
	},

	retrieval: {
		maxResults: 100,
		hybridWeight: 0.4,
		bm25Weight: 0.3,
		embeddingWeight: 0.3,
		rerankTopK: 20
	},

	ranking: {
		utilityThreshold: 0.1,
		maxCandidates: 200,
		enableBubbleStabilize: true
	},

	packing: {
		maxTokens: 4000,
		coverageThreshold: 0.7,
		enableMMR: true,
		mmrLambda: 0.3
	},

	compression: {
		enabled: true,
		maxCompressedTokens: 2000,
		preserveEntities: true,
		preserveNumbers: true,
		preserveIds: true
	},

	proof: {
		confidenceThreshold: 0.6,
		conflictPenalty: 0.3,
		supportStyleWeight: 0.4,
		evidenceQualityWeight: 0.6
	},

	caching: {
		enabled: true,
		maxSize: 100, // 100 MB
		ttl: 3600,    // 1 hour
		persistToDisk: true
	},

	performance: {
		parallelProcessing: true,
		maxWorkers: 4,
		timeout: 30000, // 30 seconds
		batchSize: 100
	}
};

/**
 * Configuration manager for the context engine
 */
export class ContextEngineConfigManager {
	private config: ContextEngineConfig;
	private configPath: string;

	constructor(configPath?: string) {
		this.config = { ...defaultConfig };
		this.configPath = configPath || '.taskmaster/context-engine-config.json';
	}

	/**
	 * Load configuration from file
	 */
	async loadConfig(): Promise<void> {
		try {
			// In a real implementation, this would load from the config file
			// For now, we'll use the default config
			this.config = { ...defaultConfig };
		} catch (error) {
			console.warn('Failed to load config, using defaults:', error);
			this.config = { ...defaultConfig };
		}
	}

	/**
	 * Save configuration to file
	 */
	async saveConfig(): Promise<void> {
		try {
			// In a real implementation, this would save to the config file
			console.log('Configuration saved (mock implementation)');
		} catch (error) {
			console.error('Failed to save config:', error);
		}
	}

	/**
	 * Get the current configuration
	 */
	getConfig(): ContextEngineConfig {
		return { ...this.config };
	}

	/**
	 * Update configuration
	 */
	updateConfig(updates: Partial<ContextEngineConfig>): void {
		this.config = { ...this.config, ...updates };
	}

	/**
	 * Get a specific configuration section
	 */
	getStorageConfig() {
		return this.config.storage;
	}

	getRetrievalConfig() {
		return this.config.retrieval;
	}

	getRankingConfig() {
		return this.config.ranking;
	}

	getPackingConfig() {
		return this.config.packing;
	}

	getCompressionConfig() {
		return this.config.compression;
	}

	getProofConfig() {
		return this.config.proof;
	}

	getCachingConfig() {
		return this.config.caching;
	}

	getPerformanceConfig() {
		return this.config.performance;
	}

	/**
	 * Reset configuration to defaults
	 */
	resetToDefaults(): void {
		this.config = { ...defaultConfig };
	}

	/**
	 * Validate configuration
	 */
	validateConfig(): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		// Validate storage config
		if (this.config.storage.maxDocuments <= 0) {
			errors.push('maxDocuments must be positive');
		}
		if (this.config.storage.chunkSize <= 0) {
			errors.push('chunkSize must be positive');
		}
		if (this.config.storage.overlap < 0) {
			errors.push('overlap must be non-negative');
		}

		// Validate retrieval config
		if (this.config.retrieval.maxResults <= 0) {
			errors.push('maxResults must be positive');
		}
		if (this.config.retrieval.hybridWeight < 0 || this.config.retrieval.hybridWeight > 1) {
			errors.push('hybridWeight must be between 0 and 1');
		}

		// Validate packing config
		if (this.config.packing.maxTokens <= 0) {
			errors.push('maxTokens must be positive');
		}
		if (this.config.packing.coverageThreshold < 0 || this.config.packing.coverageThreshold > 1) {
			errors.push('coverageThreshold must be between 0 and 1');
		}

		// Validate proof config
		if (this.config.proof.confidenceThreshold < 0 || this.config.proof.confidenceThreshold > 1) {
			errors.push('confidenceThreshold must be between 0 and 1');
		}

		return {
			valid: errors.length === 0,
			errors
		};
	}
}

/**
 * Create a configuration manager instance
 */
export function createConfigManager(configPath?: string): ContextEngineConfigManager {
	return new ContextEngineConfigManager(configPath);
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): ContextEngineConfig {
	return { ...defaultConfig };
}
