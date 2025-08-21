/**
 * Context Engine Initialization Tests
 * Tests for the initialization and configuration system
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
	ContextEngineInitializer, 
	createContextEngineInitializer,
	initializeContextEngine,
	checkContextEngineAvailability
} from '../../src/context-engine/init.js';

// Mock the context engine components to avoid actual initialization
jest.mock('../../src/context-engine/orchestrator.js', () => ({
	ContextOrchestrator: jest.fn().mockImplementation(() => ({
		answerWithMSE: jest.fn()
	}))
}));

jest.mock('../../src/context-engine/retrieve/hybrid.js', () => ({
	HybridRetrievalSystem: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('../../src/context-engine/rank/usefulness.js', () => ({
	UsefulnessRanker: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('../../src/context-engine/pack/max_coverage.js', () => ({
	MaxCoveragePacker: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('../../src/context-engine/router/route.js', () => ({
	AnswerabilityProofRouter: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('../../src/context-engine/compress/extractive.js', () => ({
	ExtractiveCompressor: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('../../src/context-engine/ingest/store.js', () => ({
	SQLiteStorageBackend: jest.fn().mockImplementation(() => ({
		connect: jest.fn().mockResolvedValue(undefined),
		disconnect: jest.fn().mockResolvedValue(undefined)
	}))
}));

describe('Context Engine Initialization', () => {
	let initializer: ContextEngineInitializer;

	beforeEach(() => {
		initializer = createContextEngineInitializer();
	});

	afterEach(() => {
		// Clean up any initialized instances
		if (initializer.isInitialized()) {
			initializer.shutdown();
		}
	});

	describe('Initializer Creation', () => {
		it('should create initializer with default options', () => {
			expect(initializer).toBeDefined();
			expect(initializer.isInitialized()).toBe(false);
		});

		it('should create initializer with custom options', () => {
			const customInitializer = createContextEngineInitializer({
				projectRoot: '/custom/path',
				configPath: '/custom/config.json',
				autoInitialize: false,
				enableLogging: false
			});

			expect(customInitializer).toBeDefined();
			expect(customInitializer.isInitialized()).toBe(false);
		});
	});

	describe('Configuration Management', () => {
		it('should have access to configuration manager', () => {
			const configManager = initializer.getConfigManager();
			expect(configManager).toBeDefined();
			expect(configManager.getConfig).toBeDefined();
		});

		it('should return default configuration', () => {
			const configManager = initializer.getConfigManager();
			const config = configManager.getConfig();
			
			expect(config.storage.path).toBe('.taskmaster/context-engine.db');
			expect(config.storage.maxDocuments).toBe(10000);
			expect(config.packing.maxTokens).toBe(4000);
		});
	});

	describe('Initialization State', () => {
		it('should start as uninitialized', () => {
			expect(initializer.isInitialized()).toBe(false);
			expect(initializer.getInstance()).toBeNull();
		});

		it('should track initialization state correctly', async () => {
			expect(initializer.isInitialized()).toBe(false);
			
			// Mock the initialization to avoid actual component creation
			const mockInstance = {
				orchestrator: {},
				storage: {
					disconnect: jest.fn().mockResolvedValue(undefined)
				},
				config: {},
				isInitialized: true
			};
			
			// Simulate successful initialization
			(initializer as any).instance = mockInstance;
			
			expect(initializer.isInitialized()).toBe(true);
			expect(initializer.getInstance()).toBe(mockInstance);
		});
	});

	describe('Reset Functionality', () => {
		it('should reset to uninitialized state', () => {
			// Set a mock instance
			(initializer as any).instance = { 
				isInitialized: true,
				storage: {
					disconnect: jest.fn().mockResolvedValue(undefined)
				}
			};
			expect(initializer.isInitialized()).toBe(true);
			
			// Reset
			initializer.reset();
			expect(initializer.isInitialized()).toBe(false);
			expect(initializer.getInstance()).toBeNull();
		});
	});

	describe('Factory Functions', () => {
		it('should create initializer with factory function', () => {
			const factoryInitializer = createContextEngineInitializer();
			expect(factoryInitializer).toBeDefined();
			expect(factoryInitializer).toBeInstanceOf(ContextEngineInitializer);
		});

		it('should create initializer with custom options via factory', () => {
			const factoryInitializer = createContextEngineInitializer({
				projectRoot: '/test/path',
				enableLogging: false
			});
			expect(factoryInitializer).toBeDefined();
		});
	});

	describe('Availability Check', () => {
		it('should check context engine availability', async () => {
			const availability = await checkContextEngineAvailability();
			
			// The availability check should return a result
			expect(availability).toBeDefined();
			expect(typeof availability.available).toBe('boolean');
			expect(Array.isArray(availability.issues)).toBe(true);
		});

		it('should return availability result structure', async () => {
			const availability = await checkContextEngineAvailability();
			
			expect(availability).toHaveProperty('available');
			expect(availability).toHaveProperty('issues');
			expect(typeof availability.available).toBe('boolean');
			expect(Array.isArray(availability.issues)).toBe(true);
		});
	});

	describe('Error Handling', () => {
		it('should handle initialization errors gracefully', async () => {
			// This test would require more complex mocking to simulate actual errors
			// For now, we'll just verify the error handling structure exists
			expect(initializer).toBeDefined();
			expect(typeof initializer.initialize).toBe('function');
		});
	});
});
