/**
 * database-helpers.ts
 * Utilities for database testing, seeding, and cleanup
 */

import fs from 'fs';
import path from 'path';
import { jest } from '@jest/globals';
import type { Document, Chunk, Atom, GraphNode, GraphEdge, Summary, StorageBackend } from '../../src/context-engine/types.js';
import { allTestDocuments, allTestChunks, allTestAtoms } from '../fixtures/index.js';

export interface DatabaseTestConfig {
	useInMemory: boolean;
	enableWAL: boolean;
	tempDir?: string;
	seedData: boolean;
	cleanupAfterTest: boolean;
}

export class DatabaseTestHelper {
	private testDbPath: string | ':memory:';
	private config: DatabaseTestConfig;
	private createdFiles: string[] = [];

	constructor(config: Partial<DatabaseTestConfig> = {}) {
		this.config = {
			useInMemory: false,
			enableWAL: true,
			seedData: true,
			cleanupAfterTest: true,
			...config
		};

		if (this.config.useInMemory) {
			this.testDbPath = ':memory:';
		} else {
			const testDir = this.config.tempDir || path.join(process.cwd(), 'tests', 'tmp');
			this.ensureDirectoryExists(testDir);
			this.testDbPath = path.join(testDir, `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.db`);
		}
	}

	private ensureDirectoryExists(dir: string): void {
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
	}

	/**
	 * Create a test database instance
	 */
	async createTestDatabase(): Promise<StorageBackend> {
		// Import dynamically to avoid circular dependencies in tests
		const { SQLiteStorageBackend } = await import('../../src/context-engine/ingest/store.js');
		
		const storage = new SQLiteStorageBackend(this.testDbPath, {
			journalMode: this.config.enableWAL ? 'WAL' : 'DELETE',
			synchronous: 'NORMAL',
			cacheSize: 1000 // Smaller cache for tests
		});

		await storage.connect();
		await storage.migrate();

		if (this.config.seedData) {
			await this.seedDatabase(storage);
		}

		// Track file for cleanup
		if (this.testDbPath !== ':memory:' && !this.createdFiles.includes(this.testDbPath)) {
			this.createdFiles.push(this.testDbPath);
		}

		return storage;
	}

	/**
	 * Seed database with test data
	 */
	async seedDatabase(storage: StorageBackend): Promise<void> {
		// Seed documents
		for (const doc of allTestDocuments) {
			await storage.createDocument(doc);
		}

		// Seed chunks
		for (const chunk of allTestChunks) {
			await storage.createChunk(chunk);
		}

		// Seed atoms
		for (const atom of allTestAtoms) {
			await storage.createAtom(atom);
		}

		// Seed some test graph nodes
		const testGraphNodes: GraphNode[] = [
			{
				id: 'node-ml',
				type: 'entity',
				label: 'machine learning',
				metadata: { category: 'technology', confidence: 0.9 },
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			},
			{
				id: 'node-ai',
				type: 'entity', 
				label: 'artificial intelligence',
				metadata: { category: 'technology', confidence: 0.85 },
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}
		];

		for (const node of testGraphNodes) {
			await storage.createGraphNode(node);
		}

		// Seed graph edges
		const testGraphEdges: GraphEdge[] = [
			{
				id: 'edge-ml-ai',
				sourceId: 'node-ml',
				targetId: 'node-ai',
				type: 'subset_of',
				metadata: { confidence: 0.9 },
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}
		];

		for (const edge of testGraphEdges) {
			await storage.createGraphEdge(edge);
		}

		// Seed summaries
		const testSummaries: Summary[] = [
			{
				id: 'summary-ml',
				chunkIds: ['chunk-text-1', 'chunk-text-2'],
				text: 'Overview of machine learning concepts including supervised and unsupervised learning approaches.',
				metadata: { importance: 0.9, level: 1 },
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}
		];

		for (const summary of testSummaries) {
			await storage.createSummary(summary);
		}
	}

	/**
	 * Clean up test databases and files
	 */
	async cleanup(): Promise<void> {
		if (!this.config.cleanupAfterTest) {
			return;
		}

		for (const filePath of this.createdFiles) {
			try {
				if (fs.existsSync(filePath)) {
					fs.unlinkSync(filePath);
				}
				// Also clean up WAL and SHM files
				const walFile = filePath + '-wal';
				const shmFile = filePath + '-shm';
				if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
				if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
			} catch (error) {
				console.warn(`Failed to clean up test file ${filePath}:`, error);
			}
		}
		this.createdFiles = [];
	}

	/**
	 * Create isolated test for each test case
	 */
	async withTestDatabase<T>(
		testFn: (storage: StorageBackend) => Promise<T>
	): Promise<T> {
		const storage = await this.createTestDatabase();
		
		try {
			return await testFn(storage);
		} finally {
			await storage.disconnect();
			await this.cleanup();
		}
	}

	/**
	 * Measure database operation performance
	 */
	async measureDatabaseOperation<T>(
		operation: () => Promise<T>,
		operationName: string
	): Promise<{ result: T; metrics: { duration: number; memory: number } }> {
		const startTime = performance.now();
		const startMemory = process.memoryUsage().heapUsed;

		const result = await operation();

		const endTime = performance.now();
		const endMemory = process.memoryUsage().heapUsed;

		return {
			result,
			metrics: {
				duration: endTime - startTime,
				memory: endMemory - startMemory
			}
		};
	}

	/**
	 * Assert database state matches expectations
	 */
	async assertDatabaseState(
		storage: StorageBackend,
		expectations: {
			documentCount?: number;
			chunkCount?: number;
			atomCount?: number;
			graphNodeCount?: number;
			graphEdgeCount?: number;
			summaryCount?: number;
		}
	): Promise<void> {
		if (expectations.documentCount !== undefined) {
			const docs = await storage.getAllDocuments();
			expect(docs.length).toBe(expectations.documentCount);
		}

		if (expectations.chunkCount !== undefined) {
			const chunks = await storage.getAllChunks();
			expect(chunks.length).toBe(expectations.chunkCount);
		}

		if (expectations.atomCount !== undefined) {
			const atoms = await storage.getAllAtoms();
			expect(atoms.length).toBe(expectations.atomCount);
		}

		if (expectations.graphNodeCount !== undefined) {
			const nodes = await storage.getAllGraphNodes();
			expect(nodes.length).toBe(expectations.graphNodeCount);
		}

		if (expectations.graphEdgeCount !== undefined) {
			const edges = await storage.getAllGraphEdges();
			expect(edges.length).toBe(expectations.graphEdgeCount);
		}

		if (expectations.summaryCount !== undefined) {
			const summaries = await storage.getAllSummaries();
			expect(summaries.length).toBe(expectations.summaryCount);
		}
	}
}

/**
 * Global database helper instance for tests
 */
export const dbHelper = new DatabaseTestHelper();

/**
 * Setup and teardown helpers for Jest
 */
export const dbTestSetup = {
	beforeEach: async () => {
		// Reset any existing state
		await dbHelper.cleanup();
	},

	afterEach: async () => {
		// Clean up after each test
		await dbHelper.cleanup();
	},

	beforeAll: async () => {
		// Global setup if needed
	},

	afterAll: async () => {
		// Final cleanup
		await dbHelper.cleanup();
	}
};

/**
 * Mock storage backend for unit tests that don't need real database
 */
export function createMockStorageBackend(): jest.Mocked<StorageBackend> {
	return {
		connect: jest.fn().mockResolvedValue(undefined),
		disconnect: jest.fn().mockResolvedValue(undefined),
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
		getGraphNodesByType: jest.fn().mockResolvedValue([]),
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
	};
}
