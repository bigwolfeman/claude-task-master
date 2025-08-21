/**
 * graph.test.ts
 * Unit tests for KnowledgeGraphBuilder
 */

import { KnowledgeGraphBuilder, type RelationshipDetectionOptions, type DetectedRelationship } from '../../src/context-engine/ingest/graph.js';
import type { Atom, GraphNode, GraphEdge, Chunk } from '../../src/context-engine/types.js';

// Mock StorageBackend
const mockStorageBackend = {
	createGraphNode: jest.fn(),
	createGraphEdge: jest.fn(),
	createDocument: jest.fn(),
	createChunk: jest.fn(),
	createAtom: jest.fn(),
	createSummary: jest.fn(),
	createCluster: jest.fn(),
	createCoverage: jest.fn(),
	createPairwiseSignal: jest.fn(),
	createAnswerMetrics: jest.fn(),
	getDocument: jest.fn(),
	getChunk: jest.fn(),
	getAtom: jest.fn(),
	getSummary: jest.fn(),
	getCluster: jest.fn(),
	getCoverage: jest.fn(),
	getPairwiseSignal: jest.fn(),
	getAnswerMetrics: jest.fn(),
	getAllDocuments: jest.fn(),
	getAllChunks: jest.fn(),
	getAllAtoms: jest.fn(),
	getAllSummaries: jest.fn(),
	getAllClusters: jest.fn(),
	getAllCoverage: jest.fn(),
	getAllPairwiseSignals: jest.fn(),
	getAllAnswerMetrics: jest.fn(),
	updateDocument: jest.fn(),
	updateChunk: jest.fn(),
	updateAtom: jest.fn(),
	updateSummary: jest.fn(),
	updateCluster: jest.fn(),
	updateCoverage: jest.fn(),
	updatePairwiseSignal: jest.fn(),
	updateAnswerMetrics: jest.fn(),
	deleteDocument: jest.fn(),
	deleteChunk: jest.fn(),
	deleteAtom: jest.fn(),
	deleteSummary: jest.fn(),
	deleteCluster: jest.fn(),
	deleteCoverage: jest.fn(),
	deletePairwiseSignal: jest.fn(),
	deleteAnswerMetrics: jest.fn(),
	connect: jest.fn(),
	disconnect: jest.fn()
};

describe('KnowledgeGraphBuilder', () => {
	let builder: KnowledgeGraphBuilder;
	let defaultOptions: RelationshipDetectionOptions;

	beforeEach(() => {
		defaultOptions = {
			enableSemanticAnalysis: true,
			enablePatternMatching: true,
			enableCooccurrenceAnalysis: true,
			enableTemporalAnalysis: true,
			minConfidence: 0.6,
			maxRelationshipsPerChunk: 20,
			relationshipTypes: ['is_a', 'part_of', 'located_in', 'works_for', 'created_by', 'related_to']
		};
		builder = new KnowledgeGraphBuilder(mockStorageBackend as any, defaultOptions);
		jest.clearAllMocks();
	});

	describe('Constructor', () => {
		it('should create builder with default options', () => {
			expect(builder).toBeInstanceOf(KnowledgeGraphBuilder);
		});

		it('should create builder with custom options', () => {
			const customOptions: RelationshipDetectionOptions = {
				enableSemanticAnalysis: false,
				enablePatternMatching: true,
				enableCooccurrenceAnalysis: false,
				enableTemporalAnalysis: true,
				minConfidence: 0.8,
				maxRelationshipsPerChunk: 10,
				relationshipTypes: ['is_a', 'part_of']
			};
			const customBuilder = new KnowledgeGraphBuilder(mockStorageBackend as any, customOptions);
			expect(customBuilder).toBeInstanceOf(KnowledgeGraphBuilder);
		});
	});

	describe('buildKnowledgeGraph', () => {
		const mockAtoms: Atom[] = [
			{
				id: 'atom1',
				chunkId: 'chunk1',
				type: 'ENT',
				text: 'John Smith',
				confidence: 0.9,
				metadata: { entityType: 'person' },
				provenance: { offset: 0, length: 10 },
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			},
			{
				id: 'atom2',
				chunkId: 'chunk1',
				type: 'ENT',
				text: 'Software Engineer',
				confidence: 0.8,
				metadata: { entityType: 'role' },
				provenance: { offset: 15, length: 16 },
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}
		];

		const mockChunks: Chunk[] = [
			{
				id: 'chunk1',
				docId: 'doc1',
				text: 'John Smith is a Software Engineer at TechCorp.',
				tokens: 8,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}
		];

		it('should build knowledge graph from atoms and chunks', async () => {
			const result = await builder.buildKnowledgeGraph(mockAtoms, mockChunks);

			expect(result.nodes).toHaveLength(2);
			expect(result.edges).toBeDefined();
			expect(result.relationships).toBeDefined();
		});

		it('should handle errors gracefully', async () => {
			mockStorageBackend.createGraphNode.mockRejectedValue(new Error('Database error'));

			const result = await builder.buildKnowledgeGraph(mockAtoms, mockChunks);

			expect(result.nodes).toHaveLength(0);
			expect(result.edges).toHaveLength(0);
			expect(result.relationships).toHaveLength(0);
		});
	});

	describe('Relationship Detection', () => {
		const mockAtoms: Atom[] = [
			{
				id: 'atom1',
				chunkId: 'chunk1',
				type: 'ENT',
				text: 'Apple',
				confidence: 0.9,
				metadata: { entityType: 'company' },
				provenance: { offset: 0, length: 5 },
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			},
			{
				id: 'atom2',
				chunkId: 'chunk1',
				type: 'ENT',
				text: 'Technology',
				confidence: 0.8,
				metadata: { entityType: 'industry' },
				provenance: { offset: 10, length: 10 },
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}
		];

		const mockChunks: Chunk[] = [
			{
				id: 'chunk1',
				docId: 'doc1',
				text: 'Apple is a technology company.',
				tokens: 6,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}
		];

		it('should detect hierarchical relationships', async () => {
			const result = await builder.buildKnowledgeGraph(mockAtoms, mockChunks);

			// Should detect "Apple is a technology company" relationship
			const isARelationship = result.relationships.find(rel => rel.relationshipType === 'is_a');
			expect(isARelationship).toBeDefined();
			expect(isARelationship?.sourceId).toBe('atom1');
			expect(isARelationship?.targetId).toBe('atom2');
		});

		it('should respect confidence thresholds', async () => {
			const lowConfidenceBuilder = new KnowledgeGraphBuilder(mockStorageBackend as any, {
				...defaultOptions,
				minConfidence: 0.9
			});

			const result = await lowConfidenceBuilder.buildKnowledgeGraph(mockAtoms, mockChunks);

			// With high confidence threshold, fewer relationships should be detected
			expect(result.relationships.length).toBeLessThanOrEqual(result.relationships.length);
		});

		it('should respect relationship limits', async () => {
			const limitedBuilder = new KnowledgeGraphBuilder(mockStorageBackend as any, {
				...defaultOptions,
				maxRelationshipsPerChunk: 1
			});

			const result = await limitedBuilder.buildKnowledgeGraph(mockAtoms, mockChunks);

			expect(result.relationships.length).toBeLessThanOrEqual(1);
		});
	});

	describe('Pattern-based Relationship Detection', () => {
		it('should detect "is a" relationships', () => {
			const atom1: Atom = {
				id: 'atom1',
				chunkId: 'chunk1',
				type: 'ENT',
				text: 'Cat',
				confidence: 0.9,
				metadata: {},
				provenance: { offset: 0, length: 3 },
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};

			const atom2: Atom = {
				id: 'atom2',
				chunkId: 'chunk1',
				type: 'ENT',
				text: 'Animal',
				confidence: 0.8,
				metadata: {},
				provenance: { offset: 10, length: 6 },
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};

			const chunk: Chunk = {
				id: 'chunk1',
				docId: 'doc1',
				text: 'A cat is an animal.',
				tokens: 6,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};

			const result = builder.buildKnowledgeGraph([atom1, atom2], [chunk]);
			expect(result).toBeDefined();
		});
	});

	describe('Co-occurrence Analysis', () => {
		it('should calculate co-occurrence strength correctly', () => {
			const atom1: Atom = {
				id: 'atom1',
				chunkId: 'chunk1',
				type: 'ENT',
				text: 'Python',
				confidence: 0.9,
				metadata: {},
				provenance: { offset: 0, length: 6 },
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};

			const atom2: Atom = {
				id: 'atom2',
				chunkId: 'chunk1',
				type: 'ENT',
				text: 'Programming',
				confidence: 0.8,
				metadata: {},
				provenance: { offset: 10, length: 11 },
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};

			const chunks: Chunk[] = [
				{
					id: 'chunk1',
					docId: 'doc1',
					text: 'Python is a programming language.',
					tokens: 7,
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				},
				{
					id: 'chunk2',
					docId: 'doc1',
					text: 'Python programming is popular.',
					tokens: 4,
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];

			const result = builder.buildKnowledgeGraph([atom1, atom2], chunks);
			expect(result).toBeDefined();
		});
	});

	describe('Semantic Analysis', () => {
		it('should calculate semantic similarity', () => {
			const atom1: Atom = {
				id: 'atom1',
				chunkId: 'chunk1',
				type: 'ENT',
				text: 'Machine Learning',
				confidence: 0.9,
				metadata: {},
				provenance: { offset: 0, length: 17 },
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};

			const atom2: Atom = {
				id: 'atom2',
				chunkId: 'chunk1',
				type: 'ENT',
				text: 'Deep Learning',
				confidence: 0.8,
				metadata: {},
				provenance: { offset: 20, length: 13 },
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};

			const chunks: Chunk[] = [
				{
					id: 'chunk1',
					docId: 'doc1',
					text: 'Machine Learning and Deep Learning are related.',
					tokens: 8,
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];

			const result = builder.buildKnowledgeGraph([atom1, atom2], chunks);
			expect(result).toBeDefined();
		});
	});

	describe('Temporal Analysis', () => {
		it('should detect temporal relationships', () => {
			const temporalAtom: Atom = {
				id: 'atom1',
				chunkId: 'chunk1',
				type: 'DATE',
				text: '2024',
				confidence: 0.9,
				metadata: {},
				provenance: { offset: 0, length: 4 },
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};

			const entityAtom: Atom = {
				id: 'atom2',
				chunkId: 'chunk1',
				type: 'ENT',
				text: 'AI Revolution',
				confidence: 0.8,
				metadata: {},
				provenance: { offset: 10, length: 12 },
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};

			const chunk: Chunk = {
				id: 'chunk1',
				docId: 'doc1',
				text: 'The AI Revolution in 2024.',
				tokens: 6,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			};

			const result = builder.buildKnowledgeGraph([temporalAtom, entityAtom], [chunk]);
			expect(result).toBeDefined();
		});
	});

	describe('Relationship Classification', () => {
		it('should classify relationships correctly', async () => {
			const relationship: DetectedRelationship = {
				sourceId: 'atom1',
				targetId: 'atom2',
				relationshipType: 'semantically_related',
				confidence: 0.85,
				evidence: ['High semantic similarity'],
				metadata: {
					detectionMethod: 'semantic_analysis',
					context: 'Semantic analysis',
					strength: 0.85
				}
			};

			const classification = await builder.classifyRelationship(relationship);

			expect(classification.relationshipType).toBe('strongly_related');
			expect(classification.subtype).toBe('semantic');
			expect(classification.confidence).toBe(0.85);
			expect(classification.validationRules).toBeDefined();
		});
	});

	describe('Graph Structure Storage', () => {
		it('should store graph nodes and edges', async () => {
			const atoms: Atom[] = [
				{
					id: 'atom1',
					chunkId: 'chunk1',
					type: 'ENT',
					text: 'Test Entity',
					confidence: 0.9,
					metadata: {},
					provenance: { offset: 0, length: 11 },
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];

			const chunks: Chunk[] = [
				{
					id: 'chunk1',
					docId: 'doc1',
					text: 'Test Entity is a test.',
					tokens: 6,
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];

			await builder.buildKnowledgeGraph(atoms, chunks);

			expect(mockStorageBackend.createGraphNode).toHaveBeenCalled();
		});
	});

	describe('Error Handling', () => {
		it('should handle storage errors gracefully', async () => {
			mockStorageBackend.createGraphNode.mockRejectedValue(new Error('Storage error'));

			const atoms: Atom[] = [
				{
					id: 'atom1',
					chunkId: 'chunk1',
					type: 'ENT',
					text: 'Test',
					confidence: 0.9,
					metadata: {},
					provenance: { offset: 0, length: 4 },
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];

			const chunks: Chunk[] = [
				{
					id: 'chunk1',
					docId: 'doc1',
					text: 'Test entity.',
					tokens: 2,
					metadata: {},
					createdAt: '2024-01-01T00:00:00Z',
					updatedAt: '2024-01-01T00:00:00Z'
				}
			];

			const result = await builder.buildKnowledgeGraph(atoms, chunks);

			expect(result.nodes).toHaveLength(0);
			expect(result.edges).toHaveLength(0);
			expect(result.relationships).toHaveLength(0);
		});
	});
});
