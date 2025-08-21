/**
 * setup.ts
 * Global test setup for Context Engine tests
 */

import { jest } from '@jest/globals';

// Global test configuration
beforeAll(async () => {
	// Set test timeout
	jest.setTimeout(30000);
	
	// Setup test environment variables
	process.env.NODE_ENV = 'test';
	process.env.TASKMASTER_LOG_LEVEL = 'error'; // Reduce log noise during tests
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
	log: jest.fn(), // Re-enabled now that debugging is complete
	warn: jest.fn(),
	error: jest.fn(),
	info: jest.fn(),
	debug: jest.fn(),
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
		docId: 'test-doc-1',
		text: 'This is a test chunk with some content.',
		tokens: 10,
		metadata: { type: 'paragraph', importance: 0.8 },
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z',
		...overrides
	}),
	
	createMockAtom: (overrides = {}) => ({
		id: 'test-atom-1',
		chunkId: 'test-chunk-1',
		type: 'ENT' as const,
		text: 'test entity',
		confidence: 0.9,
		metadata: { source: 'extraction' },
		provenance: {
			offset: 0,
			length: 10
		},
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z',
		...overrides
	}),
	
	createMockSummary: (overrides = {}) => ({
		id: 'test-summary-1',
		chunkIds: ['test-chunk-1', 'test-chunk-2'],
		text: 'This is a test summary of multiple chunks.',
		metadata: { type: 'abstractive', level: 1 },
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z',
		...overrides
	}),
	
	createMockGraphNode: (overrides = {}) => ({
		id: 'test-node-1',
		type: 'entity',
		label: 'test entity',
		metadata: { source: 'extraction', confidence: 0.9 },
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
	}
};

// Type declarations for global utilities
declare global {
	var testUtils: {
		withTimeout: (fn: () => Promise<any>, timeout?: number) => Promise<any>;
		createMockDocument: (overrides?: any) => any;
		createMockChunk: (overrides?: any) => any;
		createMockAtom: (overrides?: any) => any;
		createMockSummary: (overrides?: any) => any;
		createMockGraphNode: (overrides?: any) => any;
		measurePerformance: (fn: () => Promise<any>, iterations?: number) => Promise<{
			avg: number;
			min: number;
			max: number;
			times: number[];
		}>;
	};
}
