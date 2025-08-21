/**
 * Test Fixtures Index
 * Centralized access to all test data fixtures
 */

// Document fixtures
export * from './documents.js';

// Chunk fixtures  
export * from './chunks.js';

// Atom fixtures
export * from './atoms.js';

// Combined test data sets
export const testData = {
	// Small dataset for quick tests
	small: {
		documents: 1,
		chunks: 5,
		atoms: 10
	},
	
	// Medium dataset for comprehensive tests
	medium: {
		documents: 4,
		chunks: 20,
		atoms: 50
	},
	
	// Large dataset for performance tests
	large: {
		documents: 10,
		chunks: 100,
		atoms: 500
	}
};

// Test scenarios
export const testScenarios = {
	// Basic functionality testing
	basic: {
		name: 'Basic Functionality',
		description: 'Test core features with simple data',
		expectedTime: 1000, // ms
		expectedMemory: 50 // MB
	},
	
	// Complex content testing
	complex: {
		name: 'Complex Content',
		description: 'Test with research papers and technical content',
		expectedTime: 5000, // ms
		expectedMemory: 100 // MB
	},
	
	// Performance and stress testing
	performance: {
		name: 'Performance Testing',
		description: 'Test system limits and performance characteristics',
		expectedTime: 30000, // ms
		expectedMemory: 500 // MB
	},
	
	// Integration testing
	integration: {
		name: 'Integration Testing',
		description: 'Test component interactions and workflows',
		expectedTime: 10000, // ms
		expectedMemory: 200 // MB
	}
};
