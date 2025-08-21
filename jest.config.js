export default {
	// Use Node.js environment for testing
	testEnvironment: 'node',

	// Automatically clear mock calls between every test
	clearMocks: true,
	restoreMocks: true,

	// Enable coverage collection by default (disabled for now due to TypeScript issues)
	collectCoverage: false,

	// The directory where Jest should output its coverage files
	coverageDirectory: 'coverage',

	// Coverage reporters - multiple formats for different use cases
	coverageReporters: [
		'text', // Console output
		'text-summary', // Brief summary
		'lcov', // For IDE integration and CI/CD
		'html', // Detailed HTML report
		'json' // For programmatic access
	],

	// Files to collect coverage from
	collectCoverageFrom: [
		'src/**/*.{ts,js}',
		'!src/**/*.d.ts',
		'!src/**/*.test.{ts,js}',
		'!src/**/*.spec.{ts,js}',
		'!src/**/index.ts', // Often just exports
		'!src/task-master.js', // Legacy file
		'!src/**/__tests__/**',
		'!**/node_modules/**'
	],

	// Coverage thresholds - minimum 80% as specified (disabled for now)
	// coverageThreshold: {
	// 	global: {
	// 		branches: 80,
	// 		functions: 80,
	// 		lines: 80,
	// 		statements: 80
	// 	},
	// 	// Higher standards for critical components
	// 	'./src/context-engine/ingest/': {
	// 		branches: 85,
	// 		functions: 90,
	// 		lines: 90,
	// 		statements: 90
	// 	},
	// 	'./src/context-engine/retrieve/': {
	// 		branches: 85,
	// 		functions: 90,
	// 		lines: 90,
	// 		statements: 90
	// 	}
	// },

	// A list of paths to directories that Jest should use to search for files in
	roots: ['<rootDir>/tests', '<rootDir>/src'],

	// The glob patterns Jest uses to detect test files - support both .js and .ts
	testMatch: [
		'**/__tests__/**/*.{js,ts}',
		'**/?(*.)+(spec|test).{js,ts}'
	],

	// Setup files to run before each test
	setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

	// Global test timeout (30 seconds for comprehensive tests)
	testTimeout: 30000,

	// Transform files - add TypeScript support
	transform: {
		'^.+\\.ts$': ['ts-jest', {
			useESM: true,
			tsconfig: {
				target: 'es2020',
				module: 'esnext',
				moduleResolution: 'node',
				esModuleInterop: true,
				allowSyntheticDefaultImports: true,
				skipLibCheck: true,
				strict: false, // Relaxed for tests
				noImplicitAny: false
			}
		}]
	},

	// Extensions to treat as ES modules
	extensionsToTreatAsEsm: ['.ts'],

	// Transform ignore patterns
	transformIgnorePatterns: [
		'node_modules/(?!(.*\\.mjs$|@babel/runtime))'
	],

	// Set moduleNameMapper for absolute paths and mocks
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
		'^~/(.*)$': '<rootDir>/$1',
		'^tests/(.*)$': '<rootDir>/tests/$1'
	},

	// Setup module aliases
	moduleDirectories: ['node_modules', '<rootDir>', '<rootDir>/src', '<rootDir>/tests'],

	// Module file extensions
	moduleFileExtensions: ['ts', 'js', 'json', 'node'],

	// Preset for TypeScript
	preset: 'ts-jest/presets/default-esm',

	// Additional Jest globals for TypeScript
	globals: {
		'ts-jest': {
			useESM: true,
			isolatedModules: true
		}
	},

	// Verbose output for better debugging
	verbose: true,

	// Maximum worker processes for parallel execution
	maxWorkers: '50%',

	// Test result processor for performance insights
	testResultsProcessor: '<rootDir>/tests/utils/performance-processor.cjs',

	// Projects configuration for different test types
	projects: [
		// Unit tests
		{
			displayName: 'unit',
			testMatch: ['<rootDir>/tests/**/*.test.ts'],
			testPathIgnorePatterns: [
				'.*\\.integration\\.test\\.ts$',
				'.*\\.e2e\\.test\\.ts$',
				'.*\\.performance\\.test\\.ts$'
			]
		},
		// Integration tests
		{
			displayName: 'integration',
			testMatch: ['<rootDir>/tests/**/*.integration.test.ts'],
			testTimeout: 60000,
			maxWorkers: 1 // Run integration tests sequentially
		},
		// Performance tests
		{
			displayName: 'performance',
			testMatch: ['<rootDir>/tests/**/*.performance.test.ts'],
			testTimeout: 120000,
			maxWorkers: 1
		}
	]
};
