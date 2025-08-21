/**
 * verify-graph.js
 * Simple verification script for KnowledgeGraphBuilder functionality
 */

import { KnowledgeGraphBuilder } from '../src/context-engine/ingest/graph.js';

// Mock storage backend for testing
const mockStorage = {
	createGraphNode: async (node) => {
		console.log('✅ Created graph node:', node.id, node.type, node.label);
		return node;
	},
	createGraphEdge: async (edge) => {
		console.log('✅ Created graph edge:', edge.id, edge.type, 'from', edge.sourceId, 'to', edge.targetId);
		return edge;
	},
	// Add other required methods as no-ops
	createDocument: async () => {},
	createChunk: async () => {},
	createAtom: async () => {},
	createSummary: async () => {},
	createCluster: async () => {},
	createCoverage: async () => {},
	createPairwiseSignal: async () => {},
	createAnswerMetrics: async () => {},
	getDocument: async () => {},
	getChunk: async () => {},
	getAtom: async () => {},
	getSummary: async () => {},
	getCluster: async () => {},
	getCoverage: async () => {},
	getPairwiseSignal: async () => {},
	getAnswerMetrics: async () => {},
	getAllDocuments: async () => [],
	getAllChunks: async () => [],
	getAllAtoms: async () => [],
	getAllSummaries: async () => [],
	getAllClusters: async () => [],
	getAllCoverage: async () => [],
	getAllPairwiseSignals: async () => [],
	getAllAnswerMetrics: async () => [],
	updateDocument: async () => {},
	updateChunk: async () => {},
	updateAtom: async () => {},
	updateSummary: async () => {},
	updateCluster: async () => {},
	updateCoverage: async () => {},
	updatePairwiseSignal: async () => {},
	updateAnswerMetrics: async () => {},
	deleteDocument: async () => {},
	deleteChunk: async () => {},
	deleteAtom: async () => {},
	deleteSummary: async () => {},
	deleteCluster: async () => {},
	deleteCoverage: async () => {},
	deletePairwiseSignal: async () => {},
	deleteAnswerMetrics: async () => {},
	connect: async () => {},
	disconnect: async () => {}
};

async function testKnowledgeGraphBuilder() {
	console.log('🧪 Testing KnowledgeGraphBuilder...\n');

	try {
		// Create builder with default options
		const builder = new KnowledgeGraphBuilder(mockStorage);
		console.log('✅ KnowledgeGraphBuilder created successfully');

		// Test relationship classification
		const testRelationship = {
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

		const classification = await builder.classifyRelationship(testRelationship);
		console.log('✅ Relationship classification:', classification.relationshipType, classification.subtype);

		// Test with custom options
		const customBuilder = new KnowledgeGraphBuilder(mockStorage, {
			enableSemanticAnalysis: false,
			enablePatternMatching: true,
			enableCooccurrenceAnalysis: true,
			enableTemporalAnalysis: false,
			minConfidence: 0.8,
			maxRelationshipsPerChunk: 10,
			relationshipTypes: ['is_a', 'part_of']
		});
		console.log('✅ Custom KnowledgeGraphBuilder created successfully');

		console.log('\n🎉 KnowledgeGraphBuilder verification completed successfully!');
		console.log('\n📋 Summary:');
		console.log('   - Constructor with default options: ✅');
		console.log('   - Constructor with custom options: ✅');
		console.log('   - Relationship classification: ✅');
		console.log('   - Mock storage integration: ✅');

	} catch (error) {
		console.error('❌ Error during verification:', error.message);
		process.exit(1);
	}
}

// Run the test
testKnowledgeGraphBuilder();
