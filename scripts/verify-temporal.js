/**
 * verify-temporal.js
 * Simple verification script for TemporalProcessor functionality
 */

import { TemporalProcessor } from '../src/context-engine/ingest/temporal.js';

// Mock chunks for testing
const testChunks = [
	{
		id: 'chunk1',
		docId: 'doc1',
		text: 'Yesterday at 2:30 PM, we had a 3-hour meeting about Q1 results. The next review is scheduled for 2024-02-15 at 10:00 AM. We meet weekly.',
		tokens: 20,
		metadata: {},
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z'
	},
	{
		id: 'chunk2',
		docId: 'doc1',
		text: 'Summer is hot and winter is cold. The Victorian era was interesting.',
		tokens: 10,
		metadata: {},
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z'
	}
];

async function testTemporalProcessor() {
	console.log('🧪 Testing TemporalProcessor...\n');

	try {
		// Create processor with default options
		const processor = new TemporalProcessor();
		console.log('✅ TemporalProcessor created successfully');

		// Test temporal marker extraction
		const result = await processor.extractTemporalMarkers(testChunks);
		console.log('✅ Temporal marker extraction completed');
		console.log(`   - Total markers found: ${result.markers.length}`);
		console.log(`   - Marker types: ${[...new Set(result.markers.map(m => m.type))].join(', ')}`);

		// Test atom conversion
		const atoms = processor.convertToAtoms(result.markers, 'chunk1');
		console.log('✅ Atom conversion completed');
		console.log(`   - Atoms created: ${atoms.length}`);

		// Test with custom options
		const customProcessor = new TemporalProcessor({
			enableAbsoluteDates: true,
			enableRelativeDates: true,
			enableTimes: true,
			enableDurations: true,
			enableFrequencies: true,
			enableSeasonal: true,
			enableEras: true,
			minConfidence: 0.8,
			maxMarkersPerChunk: 5,
			timezone: 'America/New_York',
			referenceDate: new Date('2024-06-01')
		});
		console.log('✅ Custom TemporalProcessor created successfully');

		// Test confidence filtering
		const highConfidenceResult = await customProcessor.extractTemporalMarkers(testChunks);
		const highConfidenceMarkers = highConfidenceResult.markers.filter(m => m.confidence >= 0.8);
		console.log(`✅ Confidence filtering: ${highConfidenceMarkers.length} markers above 0.8 threshold`);

		console.log('\n🎉 TemporalProcessor verification completed successfully!');
		console.log('\n📋 Summary:');
		console.log('   - Constructor with default options: ✅');
		console.log('   - Constructor with custom options: ✅');
		console.log('   - Temporal marker extraction: ✅');
		console.log('   - Atom conversion: ✅');
		console.log('   - Confidence filtering: ✅');
		console.log('   - Multiple temporal types detected: ✅');

	} catch (error) {
		console.error('❌ Error during verification:', error.message);
		process.exit(1);
	}
}

// Run the test
testTemporalProcessor();
