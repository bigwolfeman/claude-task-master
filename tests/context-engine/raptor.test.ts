/**
 * raptor.test.ts
 * Unit tests for RAPTOR hierarchical summarization system
 */

import { RaptorSystem, type RaptorOptions, type Cluster, type Summary } from '../../src/context-engine/ingest/raptor.js';
import type { Chunk, StorageBackend } from '../../src/context-engine/types.js';

// Mock storage backend
const mockStorageBackend: jest.Mocked<StorageBackend> = {
	connect: jest.fn(),
	disconnect: jest.fn(),
	createDocument: jest.fn(),
	getDocument: jest.fn(),
	updateDocument: jest.fn(),
	deleteDocument: jest.fn(),
	getAllDocuments: jest.fn(),
	createChunk: jest.fn(),
	getChunk: jest.fn(),
	updateChunk: jest.fn(),
	deleteChunk: jest.fn(),
	getChunksByDocument: jest.fn(),
	getAllChunks: jest.fn(),
	createAtom: jest.fn(),
	getAtom: jest.fn(),
	updateAtom: jest.fn(),
	deleteAtom: jest.fn(),
	getAtomsByChunk: jest.fn(),
	getAllAtoms: jest.fn(),
	createCoverage: jest.fn(),
	getCoverage: jest.fn(),
	updateCoverage: jest.fn(),
	deleteCoverage: jest.fn(),
	getAllCoverage: jest.fn(),
	createPairwiseSignal: jest.fn(),
	getPairwiseSignal: jest.fn(),
	updatePairwiseSignal: jest.fn(),
	deletePairwiseSignal: jest.fn(),
	getAllPairwiseSignals: jest.fn(),
	createAnswerMetrics: jest.fn(),
	getAnswerMetrics: jest.fn(),
	updateAnswerMetrics: jest.fn(),
	deleteAnswerMetrics: jest.fn(),
	getAllAnswerMetrics: jest.fn(),
	createGraphNode: jest.fn(),
	getGraphNode: jest.fn(),
	updateGraphNode: jest.fn(),
	deleteGraphNode: jest.fn(),
	getAllGraphNodes: jest.fn(),
	createGraphEdge: jest.fn(),
	getGraphEdge: jest.fn(),
	updateGraphEdge: jest.fn(),
	deleteGraphEdge: jest.fn(),
	getAllGraphEdges: jest.fn(),
	createSummary: jest.fn(),
	getSummary: jest.fn(),
	updateSummary: jest.fn(),
	deleteSummary: jest.fn(),
	getAllSummaries: jest.fn(),
	createCluster: jest.fn(),
	getCluster: jest.fn(),
	updateCluster: jest.fn(),
	deleteCluster: jest.fn(),
	getAllClusters: jest.fn(),
	getClustersByLevel: jest.fn(),
	runMigrations: jest.fn(),
	getSchemaVersion: jest.fn()
};

describe('RaptorSystem', () => {
	let raptor: RaptorSystem;
	let defaultOptions: RaptorOptions;

	beforeEach(() => {
		defaultOptions = {
			maxTreeDepth: 5,
			minClusterSize: 3,
			maxClusterSize: 20,
			similarityThreshold: 0.7,
			summaryLength: 100,
			enableIncremental: true,
			clusteringAlgorithm: 'kmeans',
			distanceMetric: 'cosine'
		};
		raptor = new RaptorSystem(mockStorageBackend, defaultOptions);
		jest.clearAllMocks();
	});

	describe('Constructor', () => {
		it('should create RAPTOR system with default options', () => {
			expect(raptor).toBeInstanceOf(RaptorSystem);
		});

		it('should create RAPTOR system with custom options', () => {
			const customOptions: RaptorOptions = {
				...defaultOptions,
				maxTreeDepth: 10,
				clusteringAlgorithm: 'hierarchical'
			};
			const customRaptor = new RaptorSystem(mockStorageBackend, customOptions);
			expect(customRaptor).toBeInstanceOf(RaptorSystem);
		});
	});

	describe('Clustering', () => {
		it('should perform K-means clustering', async () => {
			const chunks: Chunk[] = [
				{ id: '1', docId: 'doc1', text: 'Sample text 1', tokens: 10, metadata: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
				{ id: '2', docId: 'doc1', text: 'Sample text 2', tokens: 10, metadata: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
				{ id: '3', docId: 'doc1', text: 'Sample text 3', tokens: 10, metadata: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
			];

			const clusters = await raptor.performClustering(chunks, 2);
			expect(clusters).toHaveLength(2);
			expect(clusters[0]).toHaveProperty('chunks');
			expect(clusters[0]).toHaveProperty('centroid');
		});

		it('should perform hierarchical clustering', async () => {
			const customRaptor = new RaptorSystem(mockStorageBackend, {
				...defaultOptions,
				clusteringAlgorithm: 'hierarchical'
			});

			const chunks: Chunk[] = [
				{ id: '1', docId: 'doc1', text: 'Sample text 1', tokens: 10, metadata: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
				{ id: '2', docId: 'doc1', text: 'Sample text 2', tokens: 10, metadata: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
			];

			const clusters = await customRaptor.performClustering(chunks, 1);
			expect(clusters).toHaveLength(1);
		});

		it('should perform DBSCAN clustering', async () => {
			const customRaptor = new RaptorSystem(mockStorageBackend, {
				...defaultOptions,
				clusteringAlgorithm: 'dbscan'
			});

			const chunks: Chunk[] = [
				{ id: '1', docId: 'doc1', text: 'Sample text 1', tokens: 10, metadata: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
				{ id: '2', docId: 'doc1', text: 'Sample text 2', tokens: 10, metadata: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
			];

			const clusters = await customRaptor.performClustering(chunks, 1);
			expect(clusters).toBeDefined();
		});
	});

	describe('Summarization', () => {
		it('should generate summaries for clusters', async () => {
			const cluster: Cluster = {
				id: 'cluster1',
				chunks: [
					{ id: '1', docId: 'doc1', text: 'Sample text 1', tokens: 10, metadata: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
					{ id: '2', docId: 'doc1', text: 'Sample text 2', tokens: 10, metadata: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
				],
				centroid: [0.1, 0.2, 0.3],
				level: 1,
				childrenIds: [],
				metadata: { cohesion: 0.8, separation: 0.6, size: 2, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
			};

			const summary = await raptor.generateSummary(cluster);
			expect(summary).toHaveProperty('text');
			expect(summary).toHaveProperty('tokens');
			expect(summary.text.length).toBeLessThanOrEqual(defaultOptions.summaryLength);
		});

		it('should respect summary length constraints', async () => {
			const customRaptor = new RaptorSystem(mockStorageBackend, {
				...defaultOptions,
				summaryLength: 50
			});

			const cluster: Cluster = {
				id: 'cluster1',
				chunks: [
					{ id: '1', docId: 'doc1', text: 'This is a very long text that should be summarized to fit within the specified length constraints', tokens: 20, metadata: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
				],
				centroid: [0.1, 0.2, 0.3],
				level: 1,
				childrenIds: [],
				metadata: { cohesion: 0.8, separation: 0.6, size: 1, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
			};

			const summary = await customRaptor.generateSummary(cluster);
			expect(summary.text.length).toBeLessThanOrEqual(50);
		});
	});

	describe('Tree Building', () => {
		it('should build hierarchical tree structure', async () => {
			const chunks: Chunk[] = [
				{ id: '1', docId: 'doc1', text: 'Sample text 1', tokens: 10, metadata: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
				{ id: '2', docId: 'doc1', text: 'Sample text 2', tokens: 10, metadata: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
				{ id: '3', docId: 'doc1', text: 'Sample text 3', tokens: 10, metadata: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
			];

			const tree = await raptor.buildHierarchicalTree(chunks);
			expect(tree).toHaveProperty('root');
			expect(tree).toHaveProperty('levels');
			expect(tree.levels).toHaveLength(expect.any(Number));
		});

		it('should respect maximum tree depth', async () => {
			const customRaptor = new RaptorSystem(mockStorageBackend, {
				...defaultOptions,
				maxTreeDepth: 2
			});

			const chunks: Chunk[] = Array.from({ length: 10 }, (_, i) => ({
				id: `${i + 1}`,
				docId: 'doc1',
				text: `Sample text ${i + 1}`,
				tokens: 10,
				metadata: {},
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01'
			}));

			const tree = await customRaptor.buildHierarchicalTree(chunks);
			expect(tree.levels.length).toBeLessThanOrEqual(2);
		});
	});

	describe('Similarity Calculation', () => {
		it('should calculate cosine similarity', () => {
			const vector1 = [1, 0, 1];
			const vector2 = [1, 0, 1];
			const similarity = raptor.calculateSimilarity(vector1, vector2);
			expect(similarity).toBe(1.0);
		});

		it('should calculate euclidean distance', () => {
			const customRaptor = new RaptorSystem(mockStorageBackend, {
				...defaultOptions,
				distanceMetric: 'euclidean'
			});

			const vector1 = [0, 0, 0];
			const vector2 = [1, 1, 1];
			const distance = customRaptor.calculateSimilarity(vector1, vector2);
			expect(distance).toBeGreaterThan(0);
		});

		it('should calculate manhattan distance', () => {
			const customRaptor = new RaptorSystem(mockStorageBackend, {
				...defaultOptions,
				distanceMetric: 'manhattan'
			});

			const vector1 = [0, 0, 0];
			const vector2 = [1, 1, 1];
			const distance = customRaptor.calculateSimilarity(vector1, vector2);
			expect(distance).toBeGreaterThan(0);
		});
	});

	describe('Incremental Updates', () => {
		it('should support incremental tree updates', async () => {
			const customRaptor = new RaptorSystem(mockStorageBackend, {
				...defaultOptions,
				enableIncremental: true
			});

			const initialChunks: Chunk[] = [
				{ id: '1', docId: 'doc1', text: 'Sample text 1', tokens: 10, metadata: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
			];

			const initialTree = await customRaptor.buildHierarchicalTree(initialChunks);
			const initialLevels = initialTree.levels.length;

			const newChunks: Chunk[] = [
				{ id: '2', docId: 'doc1', text: 'Sample text 2', tokens: 10, metadata: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
			];

			const updatedTree = await customRaptor.updateTreeIncrementally(initialTree, newChunks);
			expect(updatedTree.levels.length).toBeGreaterThanOrEqual(initialLevels);
		});
	});

	describe('Storage Integration', () => {
		it('should save clusters to storage', async () => {
			const cluster: Cluster = {
				id: 'cluster1',
				chunks: [
					{ id: '1', docId: 'doc1', text: 'Sample text 1', tokens: 10, metadata: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
				],
				centroid: [0.1, 0.2, 0.3],
				level: 1,
				childrenIds: [],
				metadata: { cohesion: 0.8, separation: 0.6, size: 1, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
			};

			await raptor.saveCluster(cluster);
			expect(mockStorageBackend.createCluster).toHaveBeenCalledWith(cluster);
		});

		it('should save summaries to storage', async () => {
			const summary: Summary = {
				id: 'summary1',
				chunkIds: ['1', '2'],
				text: 'Sample summary',
				tokens: 5,
				metadata: {},
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01'
			};

			await raptor.saveSummary(summary);
			expect(mockStorageBackend.createSummary).toHaveBeenCalledWith(summary);
		});
	});

	describe('Error Handling', () => {
		it('should handle empty chunk arrays', async () => {
			const clusters = await raptor.performClustering([], 2);
			expect(clusters).toHaveLength(0);
		});

		it('should handle single chunk clustering', async () => {
			const chunks: Chunk[] = [
				{ id: '1', docId: 'doc1', text: 'Sample text 1', tokens: 10, metadata: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
			];

			const clusters = await raptor.performClustering(chunks, 1);
			expect(clusters).toHaveLength(1);
			expect(clusters[0].chunks).toHaveLength(1);
		});

		it('should handle invalid clustering parameters', async () => {
			const chunks: Chunk[] = [
				{ id: '1', docId: 'doc1', text: 'Sample text 1', tokens: 10, metadata: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
			];

			// Request more clusters than chunks
			const clusters = await raptor.performClustering(chunks, 5);
			expect(clusters).toHaveLength(1); // Should default to 1 cluster
		});
	});

	describe('Performance', () => {
		it('should handle large numbers of chunks efficiently', async () => {
			const chunks: Chunk[] = Array.from({ length: 100 }, (_, i) => ({
				id: `${i + 1}`,
				docId: 'doc1',
				text: `Sample text ${i + 1}`,
				tokens: 10,
				metadata: {},
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01'
			}));

			const startTime = Date.now();
			const clusters = await raptor.performClustering(chunks, 10);
			const endTime = Date.now();

			expect(clusters).toHaveLength(10);
			expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
		});
	});
});
