/**
 * graph-optimization.test.ts
 * Unit tests for GraphOptimizer
 */

import { GraphOptimizer, type GraphOptimizationOptions, type OptimizationResult } from '../../src/context-engine/ingest/graph-optimization.js';
import type { GraphNode, GraphEdge } from '../../src/context-engine/types.js';

// Mock StorageBackend
const mockStorageBackend = {
	getAllGraphNodes: jest.fn(),
	getAllGraphEdges: jest.fn(),
	getGraphNode: jest.fn(),
	getGraphEdge: jest.fn(),
	updateGraphNode: jest.fn(),
	updateGraphEdge: jest.fn(),
	createGraphNode: jest.fn(),
	createGraphEdge: jest.fn(),
	deleteGraphNode: jest.fn(),
	deleteGraphEdge: jest.fn(),
	getGraphEdgesByNode: jest.fn(),
	getGraphNodesByType: jest.fn(),
	// Add other required methods
	getAllDocuments: jest.fn(),
	getDocument: jest.fn(),
	createDocument: jest.fn(),
	updateDocument: jest.fn(),
	deleteDocument: jest.fn(),
	getAllChunks: jest.fn(),
	getChunk: jest.fn(),
	createChunk: jest.fn(),
	updateChunk: jest.fn(),
	deleteChunk: jest.fn(),
	getChunksByDocument: jest.fn(),
	getAllAtoms: jest.fn(),
	getAtom: jest.fn(),
	createAtom: jest.fn(),
	updateAtom: jest.fn(),
	deleteAtom: jest.fn(),
	getAtomsByChunk: jest.fn(),
	getAllSummaries: jest.fn(),
	getSummary: jest.fn(),
	createSummary: jest.fn(),
	updateSummary: jest.fn(),
	deleteSummary: jest.fn(),
	getAllClusters: jest.fn(),
	getCluster: jest.fn(),
	createCluster: jest.fn(),
	updateCluster: jest.fn(),
	deleteCluster: jest.fn(),
	connect: jest.fn(),
	disconnect: jest.fn(),
	runMigrations: jest.fn(),
	migrate: jest.fn()
};

describe('GraphOptimizer', () => {
	let optimizer: GraphOptimizer;
	let defaultOptions: GraphOptimizationOptions;

	beforeEach(() => {
		defaultOptions = {
			enableIndexing: true,
			enableCaching: true,
			enableCompression: true,
			enablePartitioning: true,
			enableParallelization: true,
			cacheSize: 10000,
			compressionLevel: 6,
			partitionCount: 4,
			maxParallelThreads: 4,
			indexTypes: ['btree', 'hash']
		};
		
		optimizer = new GraphOptimizer(mockStorageBackend, defaultOptions);
		
		// Reset mocks
		jest.clearAllMocks();
	});

	describe('Constructor', () => {
		it('should create optimizer with default options', () => {
			expect(optimizer).toBeInstanceOf(GraphOptimizer);
		});

		it('should create optimizer with custom options', () => {
			const customOptions: GraphOptimizationOptions = {
				enableIndexing: false,
				enableCaching: true,
				enableCompression: false,
				enablePartitioning: true,
				enableParallelization: false,
				cacheSize: 5000,
				compressionLevel: 3,
				partitionCount: 2,
				maxParallelThreads: 2,
				indexTypes: ['btree']
			};
			
			const customOptimizer = new GraphOptimizer(mockStorageBackend, customOptions);
			expect(customOptimizer).toBeInstanceOf(GraphOptimizer);
		});
	});

	describe('optimizeGraph', () => {
		it('should run comprehensive graph optimization', async () => {
			const mockNodes: GraphNode[] = [
				{
					id: 'node1',
					type: 'entity',
					label: 'Entity 1',
					metadata: { redundant: '', empty: null, useful: 'data' },
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				},
				{
					id: 'node2',
					type: 'entity',
					label: 'Entity 2',
					metadata: { useful: 'data' },
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];
			
			const mockEdges: GraphEdge[] = [
				{
					id: 'edge1',
					sourceId: 'node1',
					targetId: 'node2',
					type: 'knows',
					metadata: { redundant: '', useful: 'data' },
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];
			
			mockStorageBackend.getAllGraphNodes.mockResolvedValue(mockNodes);
			mockStorageBackend.getAllGraphEdges.mockResolvedValue(mockEdges);
			mockStorageBackend.updateGraphNode.mockResolvedValue(undefined);
			mockStorageBackend.updateGraphEdge.mockResolvedValue(undefined);
			
			const result = await optimizer.optimizeGraph();
			
			expect(result.originalMetrics).toBeDefined();
			expect(result.optimizedMetrics).toBeDefined();
			expect(result.improvements).toBeDefined();
			expect(result.recommendations).toBeDefined();
			expect(result.originalMetrics.storageSize).toBeGreaterThan(0);
			expect(result.optimizedMetrics.storageSize).toBeGreaterThan(0);
		});

		it('should handle optimization with indexing disabled', async () => {
			const customOptimizer = new GraphOptimizer(mockStorageBackend, {
				...defaultOptions,
				enableIndexing: false
			});
			
			const mockNodes: GraphNode[] = [
				{
					id: 'node1',
					type: 'entity',
					label: 'Entity 1',
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];
			
			const mockEdges: GraphEdge[] = [];
			
			mockStorageBackend.getAllGraphNodes.mockResolvedValue(mockNodes);
			mockStorageBackend.getAllGraphEdges.mockResolvedValue(mockEdges);
			
			const result = await customOptimizer.optimizeGraph();
			
			expect(result.originalMetrics).toBeDefined();
			expect(result.optimizedMetrics).toBeDefined();
		});

		it('should handle optimization with caching disabled', async () => {
			const customOptimizer = new GraphOptimizer(mockStorageBackend, {
				...defaultOptions,
				enableCaching: false
			});
			
			const mockNodes: GraphNode[] = [
				{
					id: 'node1',
					type: 'entity',
					label: 'Entity 1',
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];
			
			const mockEdges: GraphEdge[] = [];
			
			mockStorageBackend.getAllGraphNodes.mockResolvedValue(mockNodes);
			mockStorageBackend.getAllGraphEdges.mockResolvedValue(mockEdges);
			
			const result = await customOptimizer.optimizeGraph();
			
			expect(result.originalMetrics).toBeDefined();
			expect(result.optimizedMetrics).toBeDefined();
		});

		it('should handle optimization with compression disabled', async () => {
			const customOptimizer = new GraphOptimizer(mockStorageBackend, {
				...defaultOptions,
				enableCompression: false
			});
			
			const mockNodes: GraphNode[] = [
				{
					id: 'node1',
					type: 'entity',
					label: 'Entity 1',
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];
			
			const mockEdges: GraphEdge[] = [];
			
			mockStorageBackend.getAllGraphNodes.mockResolvedValue(mockNodes);
			mockStorageBackend.getAllGraphEdges.mockResolvedValue(mockEdges);
			
			const result = await customOptimizer.optimizeGraph();
			
			expect(result.originalMetrics).toBeDefined();
			expect(result.optimizedMetrics).toBeDefined();
		});

		it('should handle optimization with partitioning disabled', async () => {
			const customOptimizer = new GraphOptimizer(mockStorageBackend, {
				...defaultOptions,
				enablePartitioning: false
			});
			
			const mockNodes: GraphNode[] = [
				{
					id: 'node1',
					type: 'entity',
					label: 'Entity 1',
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];
			
			const mockEdges: GraphEdge[] = [];
			
			mockStorageBackend.getAllGraphNodes.mockResolvedValue(mockNodes);
			mockStorageBackend.getAllGraphEdges.mockResolvedValue(mockEdges);
			
			const result = await customOptimizer.optimizeGraph();
			
			expect(result.originalMetrics).toBeDefined();
			expect(result.optimizedMetrics).toBeDefined();
		});

		it('should handle optimization with parallelization disabled', async () => {
			const customOptimizer = new GraphOptimizer(mockStorageBackend, {
				...defaultOptions,
				enableParallelization: false
			});
			
			const mockNodes: GraphNode[] = [
				{
					id: 'node1',
					type: 'entity',
					label: 'Entity 1',
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];
			
			const mockEdges: GraphEdge[] = [];
			
			mockStorageBackend.getAllGraphNodes.mockResolvedValue(mockNodes);
			mockStorageBackend.getAllGraphEdges.mockResolvedValue(mockEdges);
			
			const result = await customOptimizer.optimizeGraph();
			
			expect(result.originalMetrics).toBeDefined();
			expect(result.optimizedMetrics).toBeDefined();
		});
	});

	describe('Cache Management', () => {
		it('should get cache statistics', () => {
			const stats = optimizer.getCacheStats();
			
			expect(stats.size).toBe(0);
			expect(stats.hits).toBe(0);
			expect(stats.misses).toBe(0);
			expect(stats.hitRate).toBe(0);
		});

		it('should clear cache', () => {
			optimizer.clearCache();
			
			const stats = optimizer.getCacheStats();
			expect(stats.size).toBe(0);
			expect(stats.hits).toBe(0);
			expect(stats.misses).toBe(0);
		});

		it('should retrieve nodes with cache', async () => {
			const mockNode: GraphNode = {
				id: 'node1',
				type: 'entity',
				label: 'Entity 1',
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};
			
			mockStorageBackend.getGraphNode.mockResolvedValue(mockNode);
			
			// First call should miss cache
			const result1 = await optimizer.getNodeWithCache('node1');
			expect(result1).toEqual(mockNode);
			
			// Second call should hit cache
			const result2 = await optimizer.getNodeWithCache('node1');
			expect(result2).toEqual(mockNode);
			
			const stats = optimizer.getCacheStats();
			expect(stats.hits).toBe(1);
			expect(stats.misses).toBe(1);
		});

		it('should retrieve edges with cache', async () => {
			const mockEdge: GraphEdge = {
				id: 'edge1',
				sourceId: 'node1',
				targetId: 'node2',
				type: 'knows',
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};
			
			mockStorageBackend.getGraphEdge.mockResolvedValue(mockEdge);
			
			// First call should miss cache
			const result1 = await optimizer.getEdgeWithCache('edge1');
			expect(result1).toEqual(mockEdge);
			
			// Second call should hit cache
			const result2 = await optimizer.getEdgeWithCache('edge1');
			expect(result2).toEqual(mockEdge);
			
			const stats = optimizer.getCacheStats();
			expect(stats.hits).toBe(1);
			expect(stats.misses).toBe(1);
		});
	});

	describe('Partition Information', () => {
		it('should get partition information after optimization', async () => {
			const mockNodes: GraphNode[] = Array.from({ length: 10 }, (_, i) => ({
				id: `node${i}`,
				type: 'entity',
				label: `Entity ${i}`,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}));
			
			const mockEdges: GraphEdge[] = Array.from({ length: 20 }, (_, i) => ({
				id: `edge${i}`,
				sourceId: `node${Math.floor(i / 2)}`,
				targetId: `node${Math.floor(i / 2) + 1}`,
				type: 'knows',
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}));
			
			mockStorageBackend.getAllGraphNodes.mockResolvedValue(mockNodes);
			mockStorageBackend.getAllGraphEdges.mockResolvedValue(mockEdges);
			
			await optimizer.optimizeGraph();
			
			const partitions = optimizer.getPartitionInfo();
			expect(partitions.length).toBe(4); // default partitionCount
			
			for (const partition of partitions) {
				expect(partition.id).toBeDefined();
				expect(partition.name).toBeDefined();
				expect(partition.nodeIds).toBeDefined();
				expect(partition.edgeIds).toBeDefined();
				expect(partition.metadata).toBeDefined();
				expect(partition.metadata.size).toBeGreaterThanOrEqual(0);
				expect(partition.metadata.density).toBeGreaterThanOrEqual(0);
				expect(partition.metadata.connectivity).toBeGreaterThanOrEqual(0);
			}
		});
	});

	describe('Index Information', () => {
		it('should get index information after optimization', async () => {
			const mockNodes: GraphNode[] = [
				{
					id: 'node1',
					type: 'entity',
					label: 'Entity 1',
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];
			
			const mockEdges: GraphEdge[] = [
				{
					id: 'edge1',
					sourceId: 'node1',
					targetId: 'node2',
					type: 'knows',
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];
			
			mockStorageBackend.getAllGraphNodes.mockResolvedValue(mockNodes);
			mockStorageBackend.getAllGraphEdges.mockResolvedValue(mockEdges);
			
			await optimizer.optimizeGraph();
			
			const indexes = optimizer.getIndexInfo();
			expect(indexes.length).toBeGreaterThan(0);
			
			for (const index of indexes) {
				expect(index.id).toBeDefined();
				expect(index.type).toBeDefined();
				expect(index.field).toBeDefined();
				expect(index.metadata).toBeDefined();
				expect(index.createdAt).toBeDefined();
			}
		});
	});

	describe('Performance Measurement', () => {
		it('should measure storage size correctly', async () => {
			const mockNodes: GraphNode[] = [
				{
					id: 'node1',
					type: 'entity',
					label: 'Entity 1',
					metadata: { test: 'data' },
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];
			
			const mockEdges: GraphEdge[] = [
				{
					id: 'edge1',
					sourceId: 'node1',
					targetId: 'node2',
					type: 'knows',
					metadata: { test: 'data' },
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];
			
			mockStorageBackend.getAllGraphNodes.mockResolvedValue(mockNodes);
			mockStorageBackend.getAllGraphEdges.mockResolvedValue(mockEdges);
			
			const result = await optimizer.optimizeGraph();
			
			expect(result.originalMetrics.storageSize).toBeGreaterThan(0);
			expect(result.optimizedMetrics.storageSize).toBeGreaterThan(0);
		});

		it('should measure traversal time correctly', async () => {
			const mockNodes: GraphNode[] = [
				{
					id: 'node1',
					type: 'entity',
					label: 'Entity 1',
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];
			
			const mockEdges: GraphEdge[] = [
				{
					id: 'edge1',
					sourceId: 'node1',
					targetId: 'node2',
					type: 'knows',
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];
			
			mockStorageBackend.getAllGraphNodes.mockResolvedValue(mockNodes);
			mockStorageBackend.getAllGraphEdges.mockResolvedValue(mockEdges);
			mockStorageBackend.getGraphEdgesByNode.mockResolvedValue(mockEdges);
			
			const result = await optimizer.optimizeGraph();
			
			expect(result.originalMetrics.traversalTime).toBeGreaterThanOrEqual(0);
			expect(result.optimizedMetrics.traversalTime).toBeGreaterThanOrEqual(0);
		});

		it('should measure query latency correctly', async () => {
			const mockNodes: GraphNode[] = [
				{
					id: 'node1',
					type: 'entity',
					label: 'Entity 1',
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];
			
			const mockEdges: GraphEdge[] = [];
			
			mockStorageBackend.getAllGraphNodes.mockResolvedValue(mockNodes);
			mockStorageBackend.getAllGraphEdges.mockResolvedValue(mockEdges);
			
			const result = await optimizer.optimizeGraph();
			
			expect(result.originalMetrics.queryLatency).toBeGreaterThanOrEqual(0);
			expect(result.optimizedMetrics.queryLatency).toBeGreaterThanOrEqual(0);
		});
	});

	describe('Error Handling', () => {
		it('should handle storage errors gracefully', async () => {
			mockStorageBackend.getAllGraphNodes.mockRejectedValue(new Error('Storage error'));
			
			await expect(optimizer.optimizeGraph()).rejects.toThrow('Storage error');
		});

		it('should handle empty graph gracefully', async () => {
			mockStorageBackend.getAllGraphNodes.mockResolvedValue([]);
			mockStorageBackend.getAllGraphEdges.mockResolvedValue([]);
			
			const result = await optimizer.optimizeGraph();
			
			expect(result.originalMetrics.storageSize).toBe(0);
			expect(result.optimizedMetrics.storageSize).toBe(0);
		});
	});

	describe('Performance and Scalability', () => {
		it('should handle large graphs efficiently', async () => {
			const largeNodes: GraphNode[] = Array.from({ length: 1000 }, (_, i) => ({
				id: `node${i}`,
				type: 'entity',
				label: `Entity ${i}`,
				metadata: { test: `data${i}` },
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}));
			
			const largeEdges: GraphEdge[] = Array.from({ length: 2000 }, (_, i) => ({
				id: `edge${i}`,
				sourceId: `node${Math.floor(i / 2)}`,
				targetId: `node${Math.floor(i / 2) + 1}`,
				type: 'knows',
				metadata: { test: `data${i}` },
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}));
			
			mockStorageBackend.getAllGraphNodes.mockResolvedValue(largeNodes);
			mockStorageBackend.getAllGraphEdges.mockResolvedValue(largeEdges);
			mockStorageBackend.updateGraphNode.mockResolvedValue(undefined);
			mockStorageBackend.updateGraphEdge.mockResolvedValue(undefined);
			
			const startTime = Date.now();
			const result = await optimizer.optimizeGraph();
			const endTime = Date.now();
			
			expect(result.originalMetrics.storageSize).toBeGreaterThan(0);
			expect(result.optimizedMetrics.storageSize).toBeGreaterThan(0);
			expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
		});
	});
});
