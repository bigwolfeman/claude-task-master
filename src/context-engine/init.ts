/**
 * Context Engine Initialization
 * Handles setup, configuration loading, and component initialization
 */

import path from 'path';
import fs from 'fs/promises';
import { ContextEngineConfigManager, createConfigManager } from './config.js';
import { ContextOrchestrator } from './orchestrator.js';
import { HybridRetrievalSystem } from './retrieve/hybrid.js';
import { UsefulnessRanker } from './rank/usefulness.js';
import { MaxCoveragePacker } from './pack/max_coverage.js';
import { AnswerabilityProofRouter } from './router/route.js';
import { ExtractiveCompressor } from './compress/extractive.js';
import { SQLiteStorageBackend } from './ingest/store.js';
import { ContextEngineConfig } from './config.js';

export interface ContextEngineInitOptions {
	projectRoot?: string;
	configPath?: string;
	autoInitialize?: boolean;
	enableLogging?: boolean;
}

export interface ContextEngineInstance {
	orchestrator: ContextOrchestrator;
	storage: SQLiteStorageBackend;
	config: ContextEngineConfigManager;
	isInitialized: boolean;
}

/**
 * Context Engine Initializer
 * Manages the complete initialization process for the context engine
 */
export class ContextEngineInitializer {
	private options: Required<ContextEngineInitOptions>;
	private configManager: ContextEngineConfigManager;
	private instance: ContextEngineInstance | null = null;

	constructor(options: ContextEngineInitOptions = {}) {
		this.options = {
			projectRoot: options.projectRoot || process.cwd(),
			configPath: options.configPath || '.taskmaster/context-engine-config.json',
			autoInitialize: options.autoInitialize ?? true,
			enableLogging: options.enableLogging ?? true
		};

		this.configManager = createConfigManager(this.options.configPath);
	}

	/**
	 * Initialize the context engine
	 */
	async initialize(): Promise<ContextEngineInstance> {
		if (this.instance?.isInitialized) {
			return this.instance;
		}

		try {
			if (this.options.enableLogging) {
				console.log('🚀 Initializing Context Engine...');
			}

			// Load configuration
			await this.configManager.loadConfig();
			const config = this.configManager.getConfig();

			if (this.options.enableLogging) {
				console.log('📋 Configuration loaded');
			}

			// Validate configuration
			const validation = this.configManager.validateConfig();
			if (!validation.valid) {
				throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
			}

			// Ensure storage directory exists
			await this.ensureStorageDirectory();

					// Initialize storage backend
		const storagePath = path.resolve(this.options.projectRoot, config.storage.path);
		const storage = new SQLiteStorageBackend({ dbPath: storagePath });
		await storage.connect();

			if (this.options.enableLogging) {
				console.log('💾 Storage backend initialized');
			}

			// Initialize components with configuration
			const retriever = this.createRetriever(storage, config);
			const ranker = this.createRanker(config);
			const packer = this.createPacker(config);
			const router = this.createRouter(config);
			const compressor = this.createCompressor(config);

			if (this.options.enableLogging) {
				console.log('🔧 Components initialized');
			}

					// Create orchestrator
		const orchestrator = new ContextOrchestrator(
			storage,
			retriever,
			ranker,
			packer,
			router,
			compressor
		);

			if (this.options.enableLogging) {
				console.log('🎯 Orchestrator created');
			}

			// Create instance
			this.instance = {
				orchestrator,
				storage,
				config: this.configManager,
				isInitialized: true
			};

			if (this.options.enableLogging) {
				console.log('✅ Context Engine initialization complete!');
			}

			return this.instance;

		} catch (error) {
			if (this.options.enableLogging) {
				console.error('❌ Context Engine initialization failed:', error);
			}
			throw error;
		}
	}

	/**
	 * Create and configure the retrieval system
	 */
		private createRetriever(storage: SQLiteStorageBackend, config: ContextEngineConfig): HybridRetrievalSystem {
		const retriever = new HybridRetrievalSystem();
	
		// Configure retrieval parameters
		// Note: The actual HybridRetrievalSystem would need methods to configure these
		// For now, we'll just return the basic instance
	
		return retriever;
	}

	/**
	 * Create and configure the ranking system
	 */
	private createRanker(config: ContextEngineConfig): UsefulnessRanker {
		const ranker = new UsefulnessRanker();
		
		// Configure ranking parameters
		// Note: The actual UsefulnessRanker would need methods to configure these
		// For now, we'll just return the basic instance
		
		return ranker;
	}

	/**
	 * Create and configure the packing system
	 */
	private createPacker(config: ContextEngineConfig): MaxCoveragePacker {
		const packer = new MaxCoveragePacker({
			maxTokens: config.packing.maxTokens,
			enableMMR: config.packing.enableMMR,
			lambdaRelevance: config.packing.mmrLambda
		});
		
		return packer;
	}

	/**
	 * Create and configure the routing system
	 */
	private createRouter(config: ContextEngineConfig): AnswerabilityProofRouter {
		const router = new AnswerabilityProofRouter();
		
		// Configure routing parameters
		// Note: The actual AnswerabilityProofRouter would need methods to configure these
		// For now, we'll just return the basic instance
		
		return router;
	}

	/**
	 * Create and configure the compression system
	 */
	private createCompressor(config: ContextEngineConfig): ExtractiveCompressor {
		const compressor = new ExtractiveCompressor();
		
		// Configure compression parameters
		// Note: The actual ExtractiveCompressor would need methods to configure these
		// For now, we'll just return the basic instance
		
		return compressor;
	}

	/**
	 * Ensure the storage directory exists
	 */
	private async ensureStorageDirectory(): Promise<void> {
		const config = this.configManager.getConfig();
		const storageDir = path.dirname(path.resolve(this.options.projectRoot, config.storage.path));
		
		try {
			await fs.access(storageDir);
		} catch {
			await fs.mkdir(storageDir, { recursive: true });
		}
	}

	/**
	 * Get the current instance
	 */
	getInstance(): ContextEngineInstance | null {
		return this.instance;
	}

	/**
	 * Check if the context engine is initialized
	 */
	isInitialized(): boolean {
		return this.instance?.isInitialized ?? false;
	}

	/**
	 * Shutdown the context engine
	 */
	async shutdown(): Promise<void> {
		if (this.instance?.storage) {
			await this.instance.storage.disconnect();
		}
		this.instance = null;
		
		if (this.options.enableLogging) {
			console.log('🔄 Context Engine shutdown complete');
		}
	}

	/**
	 * Reset the context engine to uninitialized state
	 */
	reset(): void {
		this.instance = null;
	}

	/**
	 * Get the configuration manager
	 */
	getConfigManager(): ContextEngineConfigManager {
		return this.configManager;
	}

	/**
	 * Update configuration and reinitialize if needed
	 */
	async updateConfig(updates: Partial<ContextEngineConfig>): Promise<void> {
		this.configManager.updateConfig(updates);
		
		// If already initialized, reinitialize with new config
		if (this.isInitialized()) {
			await this.shutdown();
			await this.initialize();
		}
	}
}

/**
 * Create a context engine initializer
 */
export function createContextEngineInitializer(options?: ContextEngineInitOptions): ContextEngineInitializer {
	return new ContextEngineInitializer(options);
}

/**
 * Quick initialization function for simple use cases
 */
export async function initializeContextEngine(options?: ContextEngineInitOptions): Promise<ContextEngineInstance> {
	const initializer = createContextEngineInitializer(options);
	return await initializer.initialize();
}

/**
 * Check if context engine is available in the current environment
 */
export async function checkContextEngineAvailability(): Promise<{
	available: boolean;
	issues: string[];
}> {
	const issues: string[] = [];

	try {
		// Check if required modules can be imported
		await import('./orchestrator.js');
		await import('./retrieve/hybrid.js');
		await import('./rank/usefulness.js');
		await import('./pack/max_coverage.js');
		await import('./router/route.js');
		await import('./compress/extractive.js');
		await import('./ingest/store.js');
	} catch (error) {
		issues.push(`Module import failed: ${error}`);
	}

	// Check if SQLite is available
	try {
		await import('better-sqlite3');
	} catch (error) {
		issues.push('SQLite not available: better-sqlite3 module not found');
	}

	return {
		available: issues.length === 0,
		issues
	};
}
