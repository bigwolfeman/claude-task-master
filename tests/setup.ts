/**
 * setup.ts
 * Global test setup for Context Engine tests
 */

import { jest } from '@jest/globals';
import { setupCustomMatchers } from './utils/assertion-helpers.js';

// Global test configuration
beforeAll(async () => {
	// Set test timeout
	jest.setTimeout(30000);
	
	// Setup test environment variables
	process.env.NODE_ENV = 'test';
	process.env.TASKMASTER_LOG_LEVEL = 'error'; // Reduce log noise during tests
	
	// Setup custom Jest matchers
	setupCustomMatchers();
});

beforeEach(() => {
	// Clear all mocks before each test
	jest.clearAllMocks();
	jest.clearAllTimers();
	
	// Reset any module mocks
	jest.resetModules();
});

afterEach(() => {
	// Restore all mocks after each test
	jest.restoreAllMocks();
	
	// Clean up any remaining timers
	jest.runOnlyPendingTimers();
	jest.useRealTimers();
});

afterAll(() => {
	// Final cleanup
	jest.clearAllMocks();
	jest.clearAllTimers();
	jest.restoreAllMocks();
});

// Enhanced console mocking for tests
const originalConsole = global.console;
global.console = {
	...originalConsole,
	// Keep error and warn for debugging
	log: jest.fn(),
	debug: jest.fn(),
	info: jest.fn(),
	// Allow error and warn through for test debugging
	error: originalConsole.error,
	warn: originalConsole.warn,
};

// Global test utilities
global.testUtils = {
	// Create test timeout wrapper
	withTimeout: async (fn: () => Promise<any>, timeout = 5000) => {
		return Promise.race([
			fn(),
			new Promise((_, reject) => 
				setTimeout(() => reject(new Error(`Test timed out after ${timeout}ms`)), timeout)
			)
		]);
	},
	
	// Create mock data helpers
	createMockDocument: (overrides = {}) => ({
		id: 'test-doc-1',
		title: 'Test Document',
		content: 'This is test content for testing purposes.',
		metadata: { type: 'test', source: 'unit-test' },
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z',
		...overrides
	}),
	
	createMockChunk: (overrides = {}) => ({
		id: 'test-chunk-1',
		documentId: 'test-doc-1',
		chunkIndex: 0,
		text: 'This is a test chunk with some content.',
		metadata: { type: 'paragraph', importance: 0.8 },
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z',
		...overrides
	}),
	
	createMockAtom: (overrides = {}) => ({
		id: 'test-atom-1',
		chunkId: 'test-chunk-1',
		type: 'ENT',
		text: 'test entity',
		metadata: { confidence: 0.9, source: 'extraction' },
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z',
		...overrides
	}),
	
	// Performance measurement helpers
	measurePerformance: async (fn: () => Promise<any>, iterations = 1) => {
		const times: number[] = [];
		
		for (let i = 0; i < iterations; i++) {
			const start = performance.now();
			await fn();
			const end = performance.now();
			times.push(end - start);
		}
		
		return {
			avg: times.reduce((a, b) => a + b) / times.length,
			min: Math.min(...times),
			max: Math.max(...times),
			times
		};
	},
	
	// Mock storage backend
	createMockStorage: () => ({
		connect: jest.fn().mockResolvedValue(undefined),
		disconnect: jest.fn().mockResolvedValue(undefined),
		runMigrations: jest.fn().mockResolvedValue(undefined),
		migrate: jest.fn().mockResolvedValue(undefined),
		
		// Document operations
		createDocument: jest.fn().mockResolvedValue(undefined),
		getDocument: jest.fn().mockResolvedValue(null),
		getAllDocuments: jest.fn().mockResolvedValue([]),
		updateDocument: jest.fn().mockResolvedValue(undefined),
		deleteDocument: jest.fn().mockResolvedValue(undefined),
		
		// Chunk operations
		createChunk: jest.fn().mockResolvedValue(undefined),
		getChunk: jest.fn().mockResolvedValue(null),
		getAllChunks: jest.fn().mockResolvedValue([]),
		getChunksByDocument: jest.fn().mockResolvedValue([]),
		updateChunk: jest.fn().mockResolvedValue(undefined),
		deleteChunk: jest.fn().mockResolvedValue(undefined),
		
		// Atom operations
		createAtom: jest.fn().mockResolvedValue(undefined),
		getAtom: jest.fn().mockResolvedValue(null),
		getAllAtoms: jest.fn().mockResolvedValue([]),
		getAtomsByChunk: jest.fn().mockResolvedValue([]),
		updateAtom: jest.fn().mockResolvedValue(undefined),
		deleteAtom: jest.fn().mockResolvedValue(undefined),
		
		// Graph operations
		createGraphNode: jest.fn().mockResolvedValue(undefined),
		getGraphNode: jest.fn().mockResolvedValue(null),
		getAllGraphNodes: jest.fn().mockResolvedValue([]),
		updateGraphNode: jest.fn().mockResolvedValue(undefined),
		deleteGraphNode: jest.fn().mockResolvedValue(undefined),
		
		createGraphEdge: jest.fn().mockResolvedValue(undefined),
		getGraphEdge: jest.fn().mockResolvedValue(null),
		getAllGraphEdges: jest.fn().mockResolvedValue([]),
		getGraphEdgesByNode: jest.fn().mockResolvedValue([]),
		updateGraphEdge: jest.fn().mockResolvedValue(undefined),
		deleteGraphEdge: jest.fn().mockResolvedValue(undefined),
		
		// Summary operations
		createSummary: jest.fn().mockResolvedValue(undefined),
		getSummary: jest.fn().mockResolvedValue(null),
		getAllSummaries: jest.fn().mockResolvedValue([]),
		updateSummary: jest.fn().mockResolvedValue(undefined),
		deleteSummary: jest.fn().mockResolvedValue(undefined),
		
		// Cluster operations
		createCluster: jest.fn().mockResolvedValue(undefined),
		getCluster: jest.fn().mockResolvedValue(null),
		getAllClusters: jest.fn().mockResolvedValue([]),
		updateCluster: jest.fn().mockResolvedValue(undefined),
		deleteCluster: jest.fn().mockResolvedValue(undefined)
	})
};

// Type declarations for global utilities
declare global {
	var testUtils: {
		withTimeout: (fn: () => Promise<any>, timeout?: number) => Promise<any>;
		createMockDocument: (overrides?: any) => any;
		createMockChunk: (overrides?: any) => any;
		createMockAtom: (overrides?: any) => any;
		measurePerformance: (fn: () => Promise<any>, iterations?: number) => Promise<{
			avg: number;
			min: number;
			max: number;
			times: number[];
		}>;
		createMockStorage: () => any;
	};
}
