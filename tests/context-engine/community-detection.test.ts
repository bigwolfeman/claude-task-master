/**
 * community-detection.test.ts
 * Unit tests for CommunityDetector
 */

import { CommunityDetector, type CommunityDetectionOptions, type Community } from '../../src/context-engine/ingest/community-detection.js';
import type { GraphNode, GraphEdge } from '../../src/context-engine/types.js';

// Mock StorageBackend
const mockStorageBackend = {
	getAllGraphNodes: jest.fn(),
	getAllGraphEdges: jest.fn(),
	getGraphNode: jest.fn(),
	getGraphEdge: jest.fn(),
	createGraphNode: jest.fn(),
	updateGraphNode: jest.fn(),
	deleteGraphNode: jest.fn(),
	createGraphEdge: jest.fn(),
	updateGraphEdge: jest.fn(),
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

describe('CommunityDetector', () => {
	let detector: CommunityDetector;
	let defaultOptions: CommunityDetectionOptions;

	beforeEach(() => {
		defaultOptions = {
			algorithm: 'louvain',
			minCommunitySize: 2,
			maxCommunities: 10,
			resolution: 1.0,
			maxIterations: 100,
			convergenceThreshold: 0.001
		};
		
		detector = new CommunityDetector(mockStorageBackend, defaultOptions);
		
		// Reset mocks
		jest.clearAllMocks();
	});

	describe('Constructor', () => {
		it('should create detector with default options', () => {
			expect(detector).toBeInstanceOf(CommunityDetector);
		});

		it('should create detector with custom options', () => {
			const customOptions: CommunityDetectionOptions = {
				algorithm: 'label-propagation',
				minCommunitySize: 5,
				maxCommunities: 20,
				resolution: 0.5,
				maxIterations: 200,
				convergenceThreshold: 0.0001
			};
			
			const customDetector = new CommunityDetector(mockStorageBackend, customOptions);
			expect(customDetector).toBeInstanceOf(CommunityDetector);
		});
	});

	describe('detectCommunities', () => {
		it('should detect communities using Louvain algorithm', async () => {
			const mockNodes: GraphNode[] = [
				{ id: 'node1', type: 'entity', label: 'Person A', metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
				{ id: 'node2', type: 'entity', label: 'Person B', metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
				{ id: 'node3', type: 'entity', label: 'Company X', metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }
			];
			
			const mockEdges: GraphEdge[] = [
				{ id: 'edge1', sourceId: 'node1', targetId: 'node2', type: 'works_for', metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
				{ id: 'edge2', sourceId: 'node2', targetId: 'node3', type: 'works_for', metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }
			];
			
			mockStorageBackend.getAllGraphNodes.mockResolvedValue(mockNodes);
			mockStorageBackend.getAllGraphEdges.mockResolvedValue(mockEdges);
			
			const result = await detector.detectCommunities();
			
			expect(result.communities).toBeDefined();
			expect(result.algorithm).toBe('louvain');
			expect(result.metadata).toBeDefined();
		});

		it('should detect communities using Label Propagation algorithm', async () => {
			const customDetector = new CommunityDetector(mockStorageBackend, {
				...defaultOptions,
				algorithm: 'label-propagation'
			});
			
			const mockNodes: GraphNode[] = [
				{ id: 'node1', type: 'entity', label: 'Person A', metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
				{ id: 'node2', type: 'entity', label: 'Person B', metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }
			];
			
			const mockEdges: GraphEdge[] = [
				{ id: 'edge1', sourceId: 'node1', targetId: 'node2', type: 'knows', metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }
			];
			
			mockStorageBackend.getAllGraphNodes.mockResolvedValue(mockNodes);
			mockStorageBackend.getAllGraphEdges.mockResolvedValue(mockEdges);
			
			const result = await customDetector.detectCommunities();
			
			expect(result.communities).toBeDefined();
			expect(result.algorithm).toBe('label-propagation');
		});

		it('should detect communities using Girvan-Newman algorithm', async () => {
			const customDetector = new CommunityDetector(mockStorageBackend, {
				...defaultOptions,
				algorithm: 'girvan-newman'
			});
			
			const mockNodes: GraphNode[] = [
				{ id: 'node1', type: 'entity', label: 'Person A', metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
				{ id: 'node2', type: 'entity', label: 'Person B', metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }
			];
			
			const mockEdges: GraphEdge[] = [
				{ id: 'edge1', sourceId: 'node1', targetId: 'node2', type: 'knows', metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }
			];
			
			mockStorageBackend.getAllGraphNodes.mockResolvedValue(mockNodes);
			mockStorageBackend.getAllGraphEdges.mockResolvedValue(mockEdges);
			
			const result = await customDetector.detectCommunities();
			
			expect(result.communities).toBeDefined();
			expect(result.algorithm).toBe('girvan-newman');
		});

		it('should detect communities using Spectral algorithm', async () => {
			const customDetector = new CommunityDetector(mockStorageBackend, {
				...defaultOptions,
				algorithm: 'spectral'
			});
			
			const mockNodes: GraphNode[] = [
				{ id: 'node1', type: 'entity', label: 'Person A', metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
				{ id: 'node2', type: 'entity', label: 'Person B', metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }
			];
			
			const mockEdges: GraphEdge[] = [
				{ id: 'edge1', sourceId: 'node1', targetId: 'node2', type: 'knows', metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }
			];
			
			mockStorageBackend.getAllGraphNodes.mockResolvedValue(mockNodes);
			mockStorageBackend.getAllGraphEdges.mockResolvedValue(mockEdges);
			
			const result = await customDetector.detectCommunities();
			
			expect(result.communities).toBeDefined();
			expect(result.algorithm).toBe('spectral');
		});

		it('should throw error for unknown algorithm', async () => {
			const customDetector = new CommunityDetector(mockStorageBackend, {
				...defaultOptions,
				algorithm: 'unknown' as any
			});
			
			await expect(customDetector.detectCommunities()).rejects.toThrow('Unknown algorithm: unknown');
		});
	});

	describe('Community Analysis', () => {
		it('should analyze community structure', async () => {
			const mockCommunities: Community[] = [
				{
					id: 'community1',
					nodes: ['node1', 'node2'],
					edges: ['edge1'],
					modularity: 0.8,
					density: 0.9,
					cohesion: 0.85,
					metadata: {
						algorithm: 'louvain',
						iteration: 5,
						converged: true
					}
				}
			];
			
			const analysis = detector.analyzeCommunityStructure(mockCommunities);
			
			expect(analysis.totalCommunities).toBe(1);
			expect(analysis.averageModularity).toBe(0.8);
			expect(analysis.averageDensity).toBe(0.9);
			expect(analysis.averageCohesion).toBe(0.85);
		});

		it('should find overlapping communities', async () => {
			const mockCommunities: Community[] = [
				{
					id: 'community1',
					nodes: ['node1', 'node2', 'node3'],
					edges: ['edge1', 'edge2'],
					modularity: 0.8,
					density: 0.9,
					cohesion: 0.85,
					metadata: { algorithm: 'louvain', iteration: 5, converged: true }
				},
				{
					id: 'community2',
					nodes: ['node2', 'node3', 'node4'],
					edges: ['edge2', 'edge3'],
					modularity: 0.7,
					density: 0.8,
					cohesion: 0.75,
					metadata: { algorithm: 'louvain', iteration: 5, converged: true }
				}
			];
			
			const overlapping = detector.findOverlappingCommunities(mockCommunities);
			
			expect(overlapping.length).toBeGreaterThan(0);
			expect(overlapping[0].overlappingNodes).toContain('node2');
			expect(overlapping[0].overlappingNodes).toContain('node3');
		});

		it('should calculate community quality metrics', async () => {
			const mockCommunities: Community[] = [
				{
					id: 'community1',
					nodes: ['node1', 'node2'],
					edges: ['edge1'],
					modularity: 0.8,
					density: 0.9,
					cohesion: 0.85,
					metadata: { algorithm: 'louvain', iteration: 5, converged: true }
				}
			];
			
			const quality = detector.calculateCommunityQuality(mockCommunities);
			
			expect(quality.overallQuality).toBeDefined();
			expect(quality.qualityDistribution).toBeDefined();
			expect(quality.recommendations).toBeDefined();
		});
	});

	describe('Community Visualization', () => {
		it('should generate community visualization data', async () => {
			const mockCommunities: Community[] = [
				{
					id: 'community1',
					nodes: ['node1', 'node2'],
					edges: ['edge1'],
					modularity: 0.8,
					density: 0.9,
					cohesion: 0.85,
					metadata: { algorithm: 'louvain', iteration: 5, converged: true }
				}
			];
			
			const visualization = detector.generateVisualizationData(mockCommunities);
			
			expect(visualization.nodes).toBeDefined();
			expect(visualization.edges).toBeDefined();
			expect(visualization.communities).toBeDefined();
			expect(visualization.layout).toBeDefined();
		});

		it('should export community data in various formats', async () => {
			const mockCommunities: Community[] = [
				{
					id: 'community1',
					nodes: ['node1', 'node2'],
					edges: ['edge1'],
					modularity: 0.8,
					density: 0.9,
					cohesion: 0.85,
					metadata: { algorithm: 'louvain', iteration: 5, converged: true }
				}
			];
			
			const jsonExport = detector.exportCommunities(mockCommunities, 'json');
			const csvExport = detector.exportCommunities(mockCommunities, 'csv');
			const graphmlExport = detector.exportCommunities(mockCommunities, 'graphml');
			
			expect(jsonExport).toBeDefined();
			expect(csvExport).toBeDefined();
			expect(graphmlExport).toBeDefined();
		});
	});

	describe('Error Handling', () => {
		it('should handle empty graph gracefully', async () => {
			mockStorageBackend.getAllGraphNodes.mockResolvedValue([]);
			mockStorageBackend.getAllGraphEdges.mockResolvedValue([]);
			
			const result = await detector.detectCommunities();
			
			expect(result.communities).toEqual([]);
			expect(result.metadata.nodeCount).toBe(0);
			expect(result.metadata.edgeCount).toBe(0);
		});

		it('should handle storage errors gracefully', async () => {
			mockStorageBackend.getAllGraphNodes.mockRejectedValue(new Error('Storage error'));
			
			await expect(detector.detectCommunities()).rejects.toThrow('Storage error');
		});

		it('should handle invalid community detection gracefully', async () => {
			const mockNodes: GraphNode[] = [
				{ id: 'node1', type: 'entity', label: 'Person A', metadata: {}, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }
			];
			
			const mockEdges: GraphEdge[] = [];
			
			mockStorageBackend.getAllGraphNodes.mockResolvedValue(mockNodes);
			mockStorageBackend.getAllGraphEdges.mockResolvedValue(mockEdges);
			
			const result = await detector.detectCommunities();
			
			expect(result.communities).toBeDefined();
			expect(result.communities.length).toBeGreaterThanOrEqual(0);
		});
	});

	describe('Performance and Scalability', () => {
		it('should handle large graphs efficiently', async () => {
			const largeNodes: GraphNode[] = Array.from({ length: 1000 }, (_, i) => ({
				id: `node${i}`,
				type: 'entity',
				label: `Entity ${i}`,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}));
			
			const largeEdges: GraphEdge[] = Array.from({ length: 2000 }, (_, i) => ({
				id: `edge${i}`,
				sourceId: `node${Math.floor(i / 2)}`,
				targetId: `node${Math.floor(i / 2) + 1}`,
				type: 'related',
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}));
			
			mockStorageBackend.getAllGraphNodes.mockResolvedValue(largeNodes);
			mockStorageBackend.getAllGraphEdges.mockResolvedValue(largeEdges);
			
			const startTime = Date.now();
			const result = await detector.detectCommunities();
			const endTime = Date.now();
			
			expect(result.communities).toBeDefined();
			expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
		});

		it('should respect max communities limit', async () => {
			const customDetector = new CommunityDetector(mockStorageBackend, {
				...defaultOptions,
				maxCommunities: 3
			});
			
			const mockNodes: GraphNode[] = Array.from({ length: 100 }, (_, i) => ({
				id: `node${i}`,
				type: 'entity',
				label: `Entity ${i}`,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}));
			
			const mockEdges: GraphEdge[] = Array.from({ length: 200 }, (_, i) => ({
				id: `edge${i}`,
				sourceId: `node${Math.floor(i / 2)}`,
				targetId: `node${Math.floor(i / 2) + 1}`,
				type: 'related',
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}));
			
			mockStorageBackend.getAllGraphNodes.mockResolvedValue(mockNodes);
			mockStorageBackend.getAllGraphEdges.mockResolvedValue(mockEdges);
			
			const result = await customDetector.detectCommunities();
			
			expect(result.communities.length).toBeLessThanOrEqual(3);
		});
	});
});
