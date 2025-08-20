export default {
	// Use Node.js environment for testing
	testEnvironment: 'node',

	// Automatically clear mock calls between every test
	clearMocks: true,

	// Indicates whether the coverage information should be collected while executing the test
	collectCoverage: false,

	// The directory where Jest should output its coverage files
	coverageDirectory: 'coverage',

	// A list of paths to directories that Jest should use to search for files in
	roots: ['<rootDir>/tests'],

	// The glob patterns Jest uses to detect test files - support both .js and .ts
	testMatch: [
		'**/__tests__/**/*.{js,ts}',
		'**/?(*.)+(spec|test).{js,ts}'
	],

	// Transform files - add TypeScript support
	transform: {
		'^.+\\.ts$': ['ts-jest', {
			useESM: true
		}]
	},

	// Disable transformations for node_modules
	transformIgnorePatterns: ['/node_modules/'],

	// Set moduleNameMapper for absolute paths
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/$1'
	},

	// Setup module aliases
	moduleDirectories: ['node_modules', '<rootDir>'],

	// Module file extensions
	moduleFileExtensions: ['js', 'ts', 'json'],

	// Preset for TypeScript
	preset: 'ts-jest'
};
