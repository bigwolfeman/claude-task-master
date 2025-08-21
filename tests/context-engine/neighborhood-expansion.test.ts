/**
 * neighborhood-expansion.test.ts
 * Unit tests for NeighborhoodExpander
 */

import { NeighborhoodExpander, type NeighborhoodExpansionOptions, type NeighborhoodExpansionResult } from '../../src/context-engine/ingest/neighborhood-expansion.js';
import type { GraphNode, GraphEdge } from '../../src/context-engine/types.js';

// Mock StorageBackend
const mockStorageBackend = {
	getGraphNode: jest.fn(),
	getGraphEdge: jest.fn(),
	getGraphEdgesByNode: jest.fn(),
	getAllGraphNodes: jest.fn(),
	getAllGraphEdges: jest.fn(),
	createGraphNode: jest.fn(),
	updateGraphNode: jest.fn(),
	deleteGraphNode: jest.fn(),
	createGraphEdge: jest.fn(),
	updateGraphEdge: jest.fn(),
	deleteGraphEdge: jest.fn(),
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

describe('NeighborhoodExpander', () => {
	let expander: NeighborhoodExpander;
	let defaultOptions: NeighborhoodExpansionOptions;

	beforeEach(() => {
		defaultOptions = {
			algorithm: 'breadth-first',
			maxDepth: 3,
			maxNodes: 1000,
			maxEdges: 2000,
			includeWeights: true,
			includeTemporal: true,
			randomWalkSteps: 1000,
			weightThreshold: 0.1,
			temporalWindow: 24 * 60 * 60 * 1000 // 24 hours
		};
		
		expander = new NeighborhoodExpander(mockStorageBackend, defaultOptions);
		
		// Reset mocks
		jest.clearAllMocks();
	});

	describe('Constructor', () => {
		it('should create expander with default options', () => {
			expect(expander).toBeInstanceOf(NeighborhoodExpander);
		});

		it('should create expander with custom options', () => {
			const customOptions: NeighborhoodExpansionOptions = {
				algorithm: 'depth-first',
				maxDepth: 5,
				maxNodes: 500,
				maxEdges: 1000,
				includeWeights: false,
				includeTemporal: false,
				randomWalkSteps: 500,
				weightThreshold: 0.5,
				temporalWindow: 12 * 60 * 60 * 1000 // 12 hours
			};
			
			const customExpander = new NeighborhoodExpander(mockStorageBackend, customOptions);
			expect(customExpander).toBeInstanceOf(NeighborhoodExpander);
		});
	});

	describe('expandNeighborhood', () => {
		it('should expand neighborhood using breadth-first algorithm', async () => {
			const mockSourceNode: GraphNode = {
				id: 'source',
				type: 'entity',
				label: 'Source Node',
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};
			
			const mockNeighborEdges: GraphEdge[] = [
				{
					id: 'edge1',
					sourceId: 'source',
					targetId: 'neighbor1',
					type: 'knows',
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				},
				{
					id: 'edge2',
					sourceId: 'neighbor1',
					targetId: 'neighbor2',
					type: 'knows',
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];
			
			mockStorageBackend.getGraphNode.mockResolvedValue(mockSourceNode);
			mockStorageBackend.getGraphEdgesByNode
				.mockResolvedValueOnce([mockNeighborEdges[0]]) // source -> neighbor1
				.mockResolvedValueOnce([mockNeighborEdges[1]]); // neighbor1 -> neighbor2
			
			const result = await expander.expandNeighborhood('source');
			
			expect(result.sourceNode).toBe('source');
			expect(result.nodes).toBeDefined();
			expect(result.edges).toBeDefined();
			expect(result.algorithm).toBe('breadth-first');
			expect(result.expansionTime).toBeGreaterThan(0);
		});

		it('should expand neighborhood using depth-first algorithm', async () => {
			const customExpander = new NeighborhoodExpander(mockStorageBackend, {
				...defaultOptions,
				algorithm: 'depth-first'
			});
			
			const mockSourceNode: GraphNode = {
				id: 'source',
				type: 'entity',
				label: 'Source Node',
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};
			
			const mockNeighborEdges: GraphEdge[] = [
				{
					id: 'edge1',
					sourceId: 'source',
					targetId: 'neighbor1',
					type: 'knows',
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];
			
			mockStorageBackend.getGraphNode.mockResolvedValue(mockSourceNode);
			mockStorageBackend.getGraphEdgesByNode.mockResolvedValue(mockNeighborEdges);
			
			const result = await customExpander.expandNeighborhood('source');
			
			expect(result.algorithm).toBe('depth-first');
		});

		it('should expand neighborhood using random-walk algorithm', async () => {
			const customExpander = new NeighborhoodExpander(mockStorageBackend, {
				...defaultOptions,
				algorithm: 'random-walk'
			});
			
			const mockSourceNode: GraphNode = {
				id: 'source',
				type: 'entity',
				label: 'Source Node',
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};
			
			const mockNeighborEdges: GraphEdge[] = [
				{
					id: 'edge1',
					sourceId: 'source',
					targetId: 'neighbor1',
					type: 'knows',
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];
			
			mockStorageBackend.getGraphNode.mockResolvedValue(mockSourceNode);
			mockStorageBackend.getGraphEdgesByNode.mockResolvedValue(mockNeighborEdges);
			
			const result = await customExpander.expandNeighborhood('source');
			
			expect(result.algorithm).toBe('random-walk');
		});

		it('should expand neighborhood using weighted algorithm', async () => {
			const customExpander = new NeighborhoodExpander(mockStorageBackend, {
				...defaultOptions,
				algorithm: 'weighted'
			});
			
			const mockSourceNode: GraphNode = {
				id: 'source',
				type: 'entity',
				label: 'Source Node',
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};
			
			const mockNeighborEdges: GraphEdge[] = [
				{
					id: 'edge1',
					sourceId: 'source',
					targetId: 'neighbor1',
					type: 'strong',
					metadata: { strength: 0.9 },
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];
			
			mockStorageBackend.getGraphNode.mockResolvedValue(mockSourceNode);
			mockStorageBackend.getGraphEdgesByNode.mockResolvedValue(mockNeighborEdges);
			
			const result = await customExpander.expandNeighborhood('source');
			
			expect(result.algorithm).toBe('weighted');
		});

		it('should expand neighborhood using temporal algorithm', async () => {
			const customExpander = new NeighborhoodExpander(mockStorageBackend, {
				...defaultOptions,
				algorithm: 'temporal'
			});
			
			const mockSourceNode: GraphNode = {
				id: 'source',
				type: 'entity',
				label: 'Source Node',
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};
			
			const mockNeighborEdges: GraphEdge[] = [
				{
					id: 'edge1',
					sourceId: 'source',
					targetId: 'neighbor1',
					type: 'knows',
					metadata: {},
					createdAt: new Date().toISOString(), // Recent edge
					updatedAt: new Date().toISOString()
				}
			];
			
			mockStorageBackend.getGraphNode.mockResolvedValue(mockSourceNode);
			mockStorageBackend.getGraphEdgesByNode.mockResolvedValue(mockNeighborEdges);
			
			const result = await customExpander.expandNeighborhood('source');
			
			expect(result.algorithm).toBe('temporal');
		});

		it('should throw error for unknown algorithm', async () => {
			const customExpander = new NeighborhoodExpander(mockStorageBackend, {
				...defaultOptions,
				algorithm: 'unknown' as any
			});
			
			const mockSourceNode: GraphNode = {
				id: 'source',
				type: 'entity',
				label: 'Source Node',
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};
			
			mockStorageBackend.getGraphNode.mockResolvedValue(mockSourceNode);
			
			await expect(customExpander.expandNeighborhood('source')).rejects.toThrow('Unknown algorithm: unknown');
		});

		it('should throw error for non-existent source node', async () => {
			mockStorageBackend.getGraphNode.mockResolvedValue(null);
			
			await expect(expander.expandNeighborhood('non-existent')).rejects.toThrow('Source node non-existent not found');
		});
	});

	describe('Neighborhood Statistics', () => {
		it('should get neighborhood statistics', async () => {
			const mockSourceNode: GraphNode = {
				id: 'source',
				type: 'entity',
				label: 'Source Node',
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};
			
			const mockNeighborEdges: GraphEdge[] = [
				{
					id: 'edge1',
					sourceId: 'source',
					targetId: 'neighbor1',
					type: 'knows',
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];
			
			mockStorageBackend.getGraphNode.mockResolvedValue(mockSourceNode);
			mockStorageBackend.getGraphEdgesByNode.mockResolvedValue(mockNeighborEdges);
			
			const stats = await expander.getNeighborhoodStats('source');
			
			expect(stats.totalNodes).toBeGreaterThan(0);
			expect(stats.totalEdges).toBeGreaterThan(0);
			expect(stats.averageDepth).toBeGreaterThanOrEqual(0);
			expect(stats.maxDepth).toBeGreaterThanOrEqual(0);
			expect(stats.connectivity).toBeGreaterThanOrEqual(0);
			expect(stats.temporalDistribution).toBeDefined();
		});
	});

	describe('Algorithm-Specific Behavior', () => {
		it('should respect maxDepth limit in breadth-first expansion', async () => {
			const customExpander = new NeighborhoodExpander(mockStorageBackend, {
				...defaultOptions,
				maxDepth: 1
			});
			
			const mockSourceNode: GraphNode = {
				id: 'source',
				type: 'entity',
				label: 'Source Node',
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};
			
			const mockNeighborEdges: GraphEdge[] = [
				{
					id: 'edge1',
					sourceId: 'source',
					targetId: 'neighbor1',
					type: 'knows',
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				},
				{
					id: 'edge2',
					sourceId: 'neighbor1',
					targetId: 'neighbor2',
					type: 'knows',
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];
			
			mockStorageBackend.getGraphNode.mockResolvedValue(mockSourceNode);
			mockStorageBackend.getGraphEdgesByNode
				.mockResolvedValueOnce([mockNeighborEdges[0]]) // source -> neighbor1
				.mockResolvedValueOnce([mockNeighborEdges[1]]); // neighbor1 -> neighbor2
			
			const result = await customExpander.expandNeighborhood('source');
			
			// Should only include nodes within maxDepth
			const maxDepthInResult = Math.max(...result.nodes.map(n => n.depth));
			expect(maxDepthInResult).toBeLessThanOrEqual(1);
		});

		it('should respect maxNodes limit', async () => {
			const customExpander = new NeighborhoodExpander(mockStorageBackend, {
				...defaultOptions,
				maxNodes: 2
			});
			
			const mockSourceNode: GraphNode = {
				id: 'source',
				type: 'entity',
				label: 'Source Node',
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};
			
			const mockNeighborEdges: GraphEdge[] = [
				{
					id: 'edge1',
					sourceId: 'source',
					targetId: 'neighbor1',
					type: 'knows',
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				},
				{
					id: 'edge2',
					sourceId: 'neighbor1',
					targetId: 'neighbor2',
					type: 'knows',
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];
			
			mockStorageBackend.getGraphNode.mockResolvedValue(mockSourceNode);
			mockStorageBackend.getGraphEdgesByNode
				.mockResolvedValueOnce([mockNeighborEdges[0]]) // source -> neighbor1
				.mockResolvedValueOnce([mockNeighborEdges[1]]); // neighbor1 -> neighbor2
			
			const result = await customExpander.expandNeighborhood('source');
			
			expect(result.nodes.length).toBeLessThanOrEqual(2);
		});

		it('should respect maxEdges limit', async () => {
			const customExpander = new NeighborhoodExpander(mockStorageBackend, {
				...defaultOptions,
				maxEdges: 1
			});
			
			const mockSourceNode: GraphNode = {
				id: 'source',
				type: 'entity',
				label: 'Source Node',
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};
			
			const mockNeighborEdges: GraphEdge[] = [
				{
					id: 'edge1',
					sourceId: 'source',
					targetId: 'neighbor1',
					type: 'knows',
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				},
				{
					id: 'edge2',
					sourceId: 'neighbor1',
					targetId: 'neighbor2',
					type: 'knows',
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];
			
			mockStorageBackend.getGraphNode.mockResolvedValue(mockSourceNode);
			mockStorageBackend.getGraphEdgesByNode
				.mockResolvedValueOnce([mockNeighborEdges[0]]) // source -> neighbor1
				.mockResolvedValueOnce([mockNeighborEdges[1]]); // neighbor1 -> neighbor2
			
			const result = await customExpander.expandNeighborhood('source');
			
			expect(result.edges.length).toBeLessThanOrEqual(1);
		});
	});

	describe('Weight and Temporal Calculations', () => {
		it('should calculate node weights correctly', async () => {
			const mockSourceNode: GraphNode = {
				id: 'source',
				type: 'entity',
				label: 'Source Node',
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};
			
			const mockNeighborEdges: GraphEdge[] = [
				{
					id: 'edge1',
					sourceId: 'source',
					targetId: 'neighbor1',
					type: 'strong',
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];
			
			mockStorageBackend.getGraphNode.mockResolvedValue(mockSourceNode);
			mockStorageBackend.getGraphEdgesByNode.mockResolvedValue(mockNeighborEdges);
			
			const result = await expander.expandNeighborhood('source');
			
			// Check that weights are calculated
			const neighborNode = result.nodes.find(n => n.id === 'neighbor1');
			expect(neighborNode?.weight).toBeGreaterThan(0);
		});

		it('should calculate temporal scores correctly', async () => {
			const customExpander = new NeighborhoodExpander(mockStorageBackend, {
				...defaultOptions,
				includeTemporal: true
			});
			
			const mockSourceNode: GraphNode = {
				id: 'source',
				type: 'entity',
				label: 'Source Node',
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};
			
			const mockNeighborEdges: GraphEdge[] = [
				{
					id: 'edge1',
					sourceId: 'source',
					targetId: 'neighbor1',
					type: 'knows',
					metadata: {},
					createdAt: new Date().toISOString(), // Recent edge
					updatedAt: new Date().toISOString()
				}
			];
			
			mockStorageBackend.getGraphNode.mockResolvedValue(mockSourceNode);
			mockStorageBackend.getGraphEdgesByNode.mockResolvedValue(mockNeighborEdges);
			
			const result = await customExpander.expandNeighborhood('source');
			
			// Check that temporal scores are calculated
			const neighborNode = result.nodes.find(n => n.id === 'neighbor1');
			expect(neighborNode?.temporalScore).toBeGreaterThan(0);
		});
	});

	describe('Error Handling', () => {
		it('should handle storage errors gracefully', async () => {
			mockStorageBackend.getGraphNode.mockRejectedValue(new Error('Storage error'));
			
			await expect(expander.expandNeighborhood('source')).rejects.toThrow('Storage error');
		});

		it('should handle empty neighbor sets gracefully', async () => {
			const mockSourceNode: GraphNode = {
				id: 'source',
				type: 'entity',
				label: 'Source Node',
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};
			
			mockStorageBackend.getGraphNode.mockResolvedValue(mockSourceNode);
			mockStorageBackend.getGraphEdgesByNode.mockResolvedValue([]);
			
			const result = await expander.expandNeighborhood('source');
			
			expect(result.nodes.length).toBe(1); // Only source node
			expect(result.edges.length).toBe(0);
		});
	});

	describe('Performance and Scalability', () => {
		it('should handle large neighborhoods efficiently', async () => {
			const mockSourceNode: GraphNode = {
				id: 'source',
				type: 'entity',
				label: 'Source Node',
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};
			
			// Create many neighbor edges
			const mockNeighborEdges: GraphEdge[] = Array.from({ length: 100 }, (_, i) => ({
				id: `edge${i}`,
				sourceId: 'source',
				targetId: `neighbor${i}`,
				type: 'knows',
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}));
			
			mockStorageBackend.getGraphNode.mockResolvedValue(mockSourceNode);
			mockStorageBackend.getGraphEdgesByNode.mockResolvedValue(mockNeighborEdges);
			
			const startTime = Date.now();
			const result = await expander.expandNeighborhood('source');
			const endTime = Date.now();
			
			expect(result.nodes.length).toBeGreaterThan(1);
			expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
		});
	});
});
