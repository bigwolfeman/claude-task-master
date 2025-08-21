export default {
	// Use Node.js environment for testing
	testEnvironment: 'node',

	// Automatically clear mock calls between every test
	clearMocks: true,
	restoreMocks: true,

	// A list of paths to directories that Jest should use to search for files in
	roots: ['<rootDir>/tests', '<rootDir>/src'],

	// The glob patterns Jest uses to detect test files
	testMatch: [
		'**/__tests__/**/*.{js,ts}',
		'**/?(*.)+(spec|test).{js,ts}'
	],

	// Setup files to run before each test
	setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

	// Global test timeout
	testTimeout: 30000,

	// Transform files - TypeScript support
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
				strict: false,
				noImplicitAny: false
			}
		}]
	},

	// Extensions to treat as ES modules
	extensionsToTreatAsEsm: ['.ts'],

	// Transform ignore patterns
	transformIgnorePatterns: [
		'node_modules/(?!(.*\\.mjs$))'
	],

	// Module file extensions
	moduleFileExtensions: ['ts', 'js', 'json', 'node'],

	// Preset for TypeScript with ES modules
	preset: 'ts-jest/presets/default-esm',

	// Module name mapping for TypeScript imports
	moduleNameMapper: {
		'^(\\.{1,2}/.*)\\.js$': '$1',
		'^(\\.{1,2}/.*)\\.ts$': '$1'
	},

	// Verbose output for better debugging
	verbose: true
};
