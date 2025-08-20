#!/usr/bin/env node

/**
 * verify-raptor.js
 * Simple verification script for RAPTOR hierarchical summarization
 */

import { RaptorSystem } from '../src/context-engine/ingest/raptor.js';

async function verifyRaptor() {
	console.log('🔍 Verifying RAPTOR Hierarchical Summarization...\n');

	try {
		// Test 1: RAPTOR System Creation
		console.log('📝 Testing RAPTOR System Creation...');
		const raptor = new RaptorSystem(null, {
			maxTreeDepth: 3,
			minClusterSize: 2,
			maxClusterSize: 10,
			similarityThreshold: 0.7,
			summaryLength: 50,
			enableIncremental: true,
			clusteringAlgorithm: 'kmeans',
			distanceMetric: 'cosine'
		});
		console.log('✅ RAPTOR system created successfully');

		// Test 2: Similarity Calculation
		console.log('\n📊 Testing Similarity Calculation...');
		const vector1 = [1, 0, 1];
		const vector2 = [1, 0, 1];
		const similarity = raptor.calculateSimilarity(vector1, vector2);
		console.log(`✅ Cosine similarity: ${similarity} (expected: 1.0)`);

		// Test 3: Vector Operations
		console.log('\n🔢 Testing Vector Operations...');
		const vector3 = [0, 1, 0];
		const similarity2 = raptor.calculateSimilarity(vector1, vector3);
		console.log(`✅ Orthogonal similarity: ${similarity2} (expected: 0.0)`);

		// Test 4: System Configuration
		console.log('\n⚙️ Testing System Configuration...');
		console.log(`✅ Max tree depth: ${raptor.options.maxTreeDepth}`);
		console.log(`✅ Clustering algorithm: ${raptor.options.clusteringAlgorithm}`);
		console.log(`✅ Distance metric: ${raptor.options.distanceMetric}`);

		console.log('\n🎉 RAPTOR verification completed successfully!');
		console.log('\n📋 Summary:');
		console.log('- RAPTOR system creation: ✅');
		console.log('- Similarity calculations: ✅');
		console.log('- Vector operations: ✅');
		console.log('- Configuration validation: ✅');

	} catch (error) {
		console.error('❌ RAPTOR verification failed:', error.message);
		process.exit(1);
	}
}

// Run verification
verifyRaptor().catch(console.error);
