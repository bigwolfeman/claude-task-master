/**
 * Context Engine Configuration Tests
 * Tests for the configuration management system
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { 
	ContextEngineConfigManager, 
	createConfigManager, 
	getDefaultConfig,
	defaultConfig 
} from '../../src/context-engine/config.js';

describe('Context Engine Configuration', () => {
	let configManager: ContextEngineConfigManager;

	beforeEach(() => {
		configManager = createConfigManager();
	});

	describe('Default Configuration', () => {
		it('should have valid default configuration', () => {
			const config = getDefaultConfig();
			
			expect(config.storage.path).toBe('.taskmaster/context-engine.db');
			expect(config.storage.maxDocuments).toBe(10000);
			expect(config.storage.chunkSize).toBe(512);
			expect(config.retrieval.maxResults).toBe(100);
			expect(config.packing.maxTokens).toBe(4000);
			expect(config.compression.enabled).toBe(true);
		});

		it('should have valid default config from manager', () => {
			const config = configManager.getConfig();
			
			expect(config.storage.path).toBe('.taskmaster/context-engine.db');
			expect(config.storage.maxDocuments).toBe(10000);
			expect(config.storage.chunkSize).toBe(512);
		});
	});

	describe('Configuration Management', () => {
		it('should update configuration correctly', () => {
			const updates = {
				storage: {
					path: '.taskmaster/context-engine.db',
					maxDocuments: 5000,
					maxChunksPerDocument: 1000,
					chunkSize: 256,
					overlap: 50
				},
				packing: {
					maxTokens: 2000,
					coverageThreshold: 0.7,
					enableMMR: true,
					mmrLambda: 0.3
				}
			};

			configManager.updateConfig(updates);
			const config = configManager.getConfig();

			expect(config.storage.maxDocuments).toBe(5000);
			expect(config.storage.chunkSize).toBe(256);
			expect(config.packing.maxTokens).toBe(2000);
			
			// Other values should remain unchanged
			expect(config.storage.overlap).toBe(50);
			expect(config.retrieval.maxResults).toBe(100);
		});

		it('should reset to defaults', () => {
			// First update some values
			configManager.updateConfig({
				storage: {
					path: '.taskmaster/context-engine.db',
					maxDocuments: 9999,
					maxChunksPerDocument: 1000,
					chunkSize: 512,
					overlap: 50
				},
				packing: {
					maxTokens: 9999,
					coverageThreshold: 0.7,
					enableMMR: true,
					mmrLambda: 0.3
				}
			});

			// Verify they were updated
			expect(configManager.getConfig().storage.maxDocuments).toBe(9999);
			expect(configManager.getConfig().packing.maxTokens).toBe(9999);

			// Reset to defaults
			configManager.resetToDefaults();

			// Verify they were reset
			expect(configManager.getConfig().storage.maxDocuments).toBe(10000);
			expect(configManager.getConfig().packing.maxTokens).toBe(4000);
		});
	});

	describe('Configuration Validation', () => {
		it('should validate correct configuration', () => {
			const validation = configManager.validateConfig();
			expect(validation.valid).toBe(true);
			expect(validation.errors).toHaveLength(0);
		});

		it('should detect invalid storage configuration', () => {
			configManager.updateConfig({
				storage: {
					path: '.taskmaster/context-engine.db',
					maxDocuments: -1,
					maxChunksPerDocument: 1000,
					chunkSize: 0,
					overlap: -5
				}
			});

			const validation = configManager.validateConfig();
			expect(validation.valid).toBe(false);
			expect(validation.errors).toContain('maxDocuments must be positive');
			expect(validation.errors).toContain('chunkSize must be positive');
			expect(validation.errors).toContain('overlap must be non-negative');
		});

		it('should detect invalid retrieval configuration', () => {
			configManager.updateConfig({
				retrieval: {
					maxResults: 0,
					hybridWeight: 1.5,
					bm25Weight: 0.3,
					embeddingWeight: 0.3,
					rerankTopK: 20
				}
			});

			const validation = configManager.validateConfig();
			expect(validation.valid).toBe(false);
			expect(validation.errors).toContain('maxResults must be positive');
			expect(validation.errors).toContain('hybridWeight must be between 0 and 1');
		});

		it('should detect invalid packing configuration', () => {
			configManager.updateConfig({
				packing: {
					maxTokens: -100,
					coverageThreshold: 2.0,
					enableMMR: true,
					mmrLambda: 0.3
				}
			});

			const validation = configManager.validateConfig();
			expect(validation.valid).toBe(false);
			expect(validation.errors).toContain('maxTokens must be positive');
			expect(validation.errors).toContain('coverageThreshold must be between 0 and 1');
		});

		it('should detect invalid proof configuration', () => {
			configManager.updateConfig({
				proof: {
					confidenceThreshold: -0.1,
					conflictPenalty: 0.3,
					supportStyleWeight: 0.4,
					evidenceQualityWeight: 0.6
				}
			});

			const validation = configManager.validateConfig();
			expect(validation.valid).toBe(false);
			expect(validation.errors).toContain('confidenceThreshold must be between 0 and 1');
		});
	});

	describe('Configuration Sections', () => {
		it('should return storage configuration', () => {
			const storageConfig = configManager.getStorageConfig();
			expect(storageConfig.path).toBe('.taskmaster/context-engine.db');
			expect(storageConfig.maxDocuments).toBe(10000);
			expect(storageConfig.chunkSize).toBe(512);
		});

		it('should return retrieval configuration', () => {
			const retrievalConfig = configManager.getRetrievalConfig();
			expect(retrievalConfig.maxResults).toBe(100);
			expect(retrievalConfig.hybridWeight).toBe(0.4);
			expect(retrievalConfig.bm25Weight).toBe(0.3);
		});

		it('should return ranking configuration', () => {
			const rankingConfig = configManager.getRankingConfig();
			expect(rankingConfig.utilityThreshold).toBe(0.1);
			expect(rankingConfig.maxCandidates).toBe(200);
			expect(rankingConfig.enableBubbleStabilize).toBe(true);
		});

		it('should return packing configuration', () => {
			const packingConfig = configManager.getPackingConfig();
			expect(packingConfig.maxTokens).toBe(4000);
			expect(packingConfig.coverageThreshold).toBe(0.7);
			expect(packingConfig.enableMMR).toBe(true);
		});

		it('should return compression configuration', () => {
			const compressionConfig = configManager.getCompressionConfig();
			expect(compressionConfig.enabled).toBe(true);
			expect(compressionConfig.maxCompressedTokens).toBe(2000);
			expect(compressionConfig.preserveEntities).toBe(true);
		});

		it('should return proof configuration', () => {
			const proofConfig = configManager.getProofConfig();
			expect(proofConfig.confidenceThreshold).toBe(0.6);
			expect(proofConfig.conflictPenalty).toBe(0.3);
			expect(proofConfig.supportStyleWeight).toBe(0.4);
		});

		it('should return caching configuration', () => {
			const cachingConfig = configManager.getCachingConfig();
			expect(cachingConfig.enabled).toBe(true);
			expect(cachingConfig.maxSize).toBe(100);
			expect(cachingConfig.ttl).toBe(3600);
		});

		it('should return performance configuration', () => {
			const performanceConfig = configManager.getPerformanceConfig();
			expect(performanceConfig.parallelProcessing).toBe(true);
			expect(performanceConfig.maxWorkers).toBe(4);
			expect(performanceConfig.timeout).toBe(30000);
		});
	});

	describe('Configuration Manager Factory', () => {
		it('should create config manager with custom path', () => {
			const customPath = '/custom/path/config.json';
			const customManager = createConfigManager(customPath);
			
			// The custom path should be stored internally
			// We can't directly access it, but we can verify the manager works
			const config = customManager.getConfig();
			expect(config.storage.path).toBe('.taskmaster/context-engine.db'); // Default value
		});

		it('should create independent config managers', () => {
			const manager1 = createConfigManager();
			const manager2 = createConfigManager();

			// Update first manager
			manager1.updateConfig({ 
				storage: { 
					path: '.taskmaster/context-engine.db',
					maxDocuments: 5000,
					maxChunksPerDocument: 1000,
					chunkSize: 512,
					overlap: 50
				} 
			});

			// Second manager should still have defaults
			expect(manager2.getConfig().storage.maxDocuments).toBe(10000);

			// First manager should have updated value
			expect(manager1.getConfig().storage.maxDocuments).toBe(5000);
		});
	});
});
