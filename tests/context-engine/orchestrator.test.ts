/**
 * orchestrator.test.ts
 * Tests for the Context Engine Orchestrator
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ContextOrchestrator } from '../../src/context-engine/orchestrator.js';
import { SQLiteStorageBackend } from '../../src/context-engine/ingest/store.js';

// Mock implementations for testing
class MockRetriever {
	async retrieve() {
		return [];
	}
}

class MockRanker {
	async rankCandidates() {
		return [];
	}
	
	async bubbleStabilize() {
		return [];
	}
}

class MockPacker {
	async packMaxCoverage() {
		return {
			chunks: [],
			totalTokens: 0,
			coverage: 0,
			atomsCovered: [],
			mmrScore: 0
		};
	}
}

class MockRouter {
	async computeProof() {
		return {
			coverage: 0.8,
			conflicts: 0,
			supportStyle: 'span' as const,
			selected: []
		};
	}
	
	decideTier() {
		return 'none' as const;
	}
}

describe('ContextOrchestrator', () => {
	let orchestrator: ContextOrchestrator;
	let mockStore: SQLiteStorageBackend;
	let mockRetriever: MockRetriever;
	let mockRanker: MockRanker;
	let mockPacker: MockPacker;
	let mockRouter: MockRouter;

	beforeEach(() => {
		mockStore = new SQLiteStorageBackend();
		mockRetriever = new MockRetriever();
		mockRanker = new MockRanker();
		mockPacker = new MockPacker();
		mockRouter = new MockRouter();

		orchestrator = new ContextOrchestrator(
			mockStore,
			mockRetriever as any,
			mockRanker as any,
			mockPacker as any,
			mockRouter as any
		);
	});

	describe('constructor', () => {
		it('should create orchestrator with default configuration', () => {
			const config = orchestrator.getConfig();
			expect(config.enabled).toBe(true);
			expect(config.vectorBackend).toBe('sqlite');
			expect(config.cacheSize).toBe(1000);
		});

		it('should accept configuration overrides', () => {
			const customOrchestrator = new ContextOrchestrator(
				mockStore,
				mockRetriever as any,
				mockRanker as any,
				mockPacker as any,
				mockRouter as any,
				undefined,
				{ cacheSize: 2000 }
			);
			
			const config = customOrchestrator.getConfig();
			expect(config.cacheSize).toBe(2000);
		});
	});

	describe('healthCheck', () => {
		it('should return health status for all components', async () => {
			const health = await orchestrator.healthCheck();
			
			expect(health.healthy).toBe(true);
			expect(health.components).toHaveProperty('store');
			expect(health.components).toHaveProperty('retriever');
			expect(health.components).toHaveProperty('ranker');
			expect(health.components).toHaveProperty('packer');
			expect(health.components).toHaveProperty('router');
			expect(health.components).toHaveProperty('compressor');
		});
	});

	describe('configuration', () => {
		it('should allow configuration updates', () => {
			orchestrator.updateConfig({ cacheSize: 5000 });
			const config = orchestrator.getConfig();
			expect(config.cacheSize).toBe(5000);
		});

		it('should preserve other configuration values when updating', () => {
			const originalConfig = orchestrator.getConfig();
			orchestrator.updateConfig({ cacheSize: 5000 });
			const updatedConfig = orchestrator.getConfig();
			
			expect(updatedConfig.cacheSize).toBe(5000);
			expect(updatedConfig.vectorBackend).toBe(originalConfig.vectorBackend);
			expect(updatedConfig.graphEnabled).toBe(originalConfig.graphEnabled);
		});
	});

	describe('answerWithMSE', () => {
		it('should throw error for unimplemented components', async () => {
			// This test will fail until the actual implementations are ready
			// It's here to document the expected behavior
			await expect(
				orchestrator.answerWithMSE('test query', 1000)
			).rejects.toThrow();
		});
	});
});
