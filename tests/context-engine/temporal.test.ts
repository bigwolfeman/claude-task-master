/**
 * temporal.test.ts
 * Unit tests for TemporalProcessor
 */

import { TemporalProcessor, type TemporalExtractionOptions, type TemporalMarker } from '../../src/context-engine/ingest/temporal.js';
import type { Chunk } from '../../src/context-engine/types.js';

describe('TemporalProcessor', () => {
	let processor: TemporalProcessor;
	let defaultOptions: TemporalExtractionOptions;

	beforeEach(() => {
		defaultOptions = {
			enableAbsoluteDates: true,
			enableRelativeDates: true,
			enableTimes: true,
			enableDurations: true,
			enableFrequencies: true,
			enableSeasonal: true,
			enableEras: true,
			minConfidence: 0.6,
			maxMarkersPerChunk: 10,
			timezone: 'UTC',
			referenceDate: new Date('2024-01-15')
		};
		processor = new TemporalProcessor(defaultOptions);
	});

	describe('Constructor', () => {
		it('should create processor with default options', () => {
			expect(processor).toBeInstanceOf(TemporalProcessor);
		});

		it('should create processor with custom options', () => {
			const customOptions: TemporalExtractionOptions = {
				enableAbsoluteDates: false,
				enableRelativeDates: true,
				enableTimes: false,
				enableDurations: true,
				enableFrequencies: false,
				enableSeasonal: true,
				enableEras: false,
				minConfidence: 0.8,
				maxMarkersPerChunk: 5,
				timezone: 'America/New_York',
				referenceDate: new Date('2024-06-01')
			};
			const customProcessor = new TemporalProcessor(customOptions);
			expect(customProcessor).toBeInstanceOf(TemporalProcessor);
		});
	});

	describe('Absolute Date Extraction', () => {
		it('should extract ISO format dates', async () => {
			const chunks: Chunk[] = [{
				id: 'chunk1',
				docId: 'doc1',
				text: 'The meeting is scheduled for 2024-01-15.',
				tokens: 8,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}];

			const result = await processor.extractTemporalMarkers(chunks);

			expect(result.markers).toHaveLength(1);
			expect(result.markers[0].type).toBe('absolute_date');
			expect(result.markers[0].text).toBe('2024-01-15');
			expect(result.markers[0].confidence).toBe(0.95);
		});

		it('should extract written format dates', async () => {
			const chunks: Chunk[] = [{
				id: 'chunk1',
				docId: 'doc1',
				text: 'The event will be held on January 15, 2024.',
				tokens: 10,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}];

			const result = await processor.extractTemporalMarkers(chunks);

			expect(result.markers).toHaveLength(1);
			expect(result.markers[0].type).toBe('absolute_date');
			expect(result.markers[0].text).toBe('January 15, 2024');
			expect(result.markers[0].confidence).toBe(0.9);
		});

		it('should extract short format dates', async () => {
			const chunks: Chunk[] = [{
				id: 'chunk1',
				docId: 'doc1',
				text: 'The deadline is 01/15/2024.',
				tokens: 7,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}];

			const result = await processor.extractTemporalMarkers(chunks);

			expect(result.markers).toHaveLength(1);
			expect(result.markers[0].type).toBe('absolute_date');
			expect(result.markers[0].text).toBe('01/15/2024');
			expect(result.markers[0].confidence).toBe(0.85);
		});
	});

	describe('Relative Date Extraction', () => {
		it('should extract yesterday/today/tomorrow', async () => {
			const chunks: Chunk[] = [{
				id: 'chunk1',
				docId: 'doc1',
				text: 'Yesterday was busy, today is better, and tomorrow looks promising.',
				tokens: 12,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}];

			const result = await processor.extractTemporalMarkers(chunks);

			expect(result.markers).toHaveLength(3);
			expect(result.markers.every(m => m.type === 'relative_date')).toBe(true);
			expect(result.markers.every(m => m.confidence === 0.95)).toBe(true);
		});

		it('should extract next/last period references', async () => {
			const chunks: Chunk[] = [{
				id: 'chunk1',
				docId: 'doc1',
				text: 'Next week we will review last month\'s results.',
				tokens: 10,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}];

			const result = await processor.extractTemporalMarkers(chunks);

			expect(result.markers).toHaveLength(2);
			expect(result.markers.every(m => m.type === 'relative_date')).toBe(true);
			expect(result.markers.every(m => m.confidence === 0.9)).toBe(true);
		});
	});

	describe('Time Extraction', () => {
		it('should extract 24-hour format times', async () => {
			const chunks: Chunk[] = [{
				id: 'chunk1',
				docId: 'doc1',
				text: 'The meeting starts at 14:30 and ends at 16:45.',
				tokens: 10,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}];

			const result = await processor.extractTemporalMarkers(chunks);

			expect(result.markers).toHaveLength(2);
			expect(result.markers.every(m => m.type === 'absolute_time')).toBe(true);
			expect(result.markers.every(m => m.confidence === 0.9)).toBe(true);
		});

		it('should extract 12-hour format times', async () => {
			const chunks: Chunk[] = [{
				id: 'chunk1',
				docId: 'doc1',
				text: 'The event is at 2:30 PM and dinner is at 7:00 PM.',
				tokens: 12,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}];

			const result = await processor.extractTemporalMarkers(chunks);

			expect(result.markers).toHaveLength(2);
			expect(result.markers.every(m => m.type === 'absolute_time')).toBe(true);
			expect(result.markers.every(m => m.confidence === 0.9)).toBe(true);
		});
	});

	describe('Duration Extraction', () => {
		it('should extract duration references', async () => {
			const chunks: Chunk[] = [{
				id: 'chunk1',
				docId: 'doc1',
				text: 'The project will take 3 weeks and 2 days to complete.',
				tokens: 12,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}];

			const result = await processor.extractTemporalMarkers(chunks);

			expect(result.markers).toHaveLength(2);
			expect(result.markers.every(m => m.type === 'duration')).toBe(true);
			expect(result.markers.every(m => m.confidence === 0.9)).toBe(true);
		});
	});

	describe('Frequency Extraction', () => {
		it('should extract frequency references', async () => {
			const chunks: Chunk[] = [{
				id: 'chunk1',
				docId: 'doc1',
				text: 'We meet daily and have weekly reviews.',
				tokens: 8,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}];

			const result = await processor.extractTemporalMarkers(chunks);

			expect(result.markers).toHaveLength(2);
			expect(result.markers.every(m => m.type === 'frequency')).toBe(true);
			expect(result.markers.every(m => m.confidence === 0.85)).toBe(true);
		});
	});

	describe('Seasonal Extraction', () => {
		it('should extract season references', async () => {
			const chunks: Chunk[] = [{
				id: 'chunk1',
				docId: 'doc1',
				text: 'Summer is hot and winter is cold.',
				tokens: 8,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}];

			const result = await processor.extractTemporalMarkers(chunks);

			expect(result.markers).toHaveLength(2);
			expect(result.markers.every(m => m.type === 'seasonal')).toBe(true);
			expect(result.markers.every(m => m.confidence === 0.9)).toBe(true);
		});

		it('should extract quarter references', async () => {
			const chunks: Chunk[] = [{
				id: 'chunk1',
				docId: 'doc1',
				text: 'Q1 results were good, Q2 was better.',
				tokens: 8,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}];

			const result = await processor.extractTemporalMarkers(chunks);

			expect(result.markers).toHaveLength(2);
			expect(result.markers.every(m => m.type === 'seasonal')).toBe(true);
			expect(result.markers.every(m => m.confidence === 0.95)).toBe(true);
		});
	});

	describe('Era Extraction', () => {
		it('should extract era references', async () => {
			const chunks: Chunk[] = [{
				id: 'chunk1',
				docId: 'doc1',
				text: 'The Victorian era and the Industrial Revolution.',
				tokens: 7,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}];

			const result = await processor.extractTemporalMarkers(chunks);

			expect(result.markers).toHaveLength(2);
			expect(result.markers.every(m => m.type === 'era')).toBe(true);
			expect(result.markers.every(m => m.confidence === 0.9)).toBe(true);
		});
	});

	describe('Confidence Filtering', () => {
		it('should respect minimum confidence threshold', async () => {
			const highConfidenceProcessor = new TemporalProcessor({
				...defaultOptions,
				minConfidence: 0.9
			});

			const chunks: Chunk[] = [{
				id: 'chunk1',
				docId: 'doc1',
				text: 'The meeting is on 2024-01-15 at 2:30 PM.',
				tokens: 10,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}];

			const result = await highConfidenceProcessor.extractTemporalMarkers(chunks);

			// Only high confidence markers should be included
			expect(result.markers.every(m => m.confidence >= 0.9)).toBe(true);
		});
	});

	describe('Marker Limits', () => {
		it('should respect maximum markers per chunk', async () => {
			const limitedProcessor = new TemporalProcessor({
				...defaultOptions,
				maxMarkersPerChunk: 2
			});

			const chunks: Chunk[] = [{
				id: 'chunk1',
				docId: 'doc1',
				text: 'Yesterday at 2:30 PM, we had a 3-hour meeting about Q1 results.',
				tokens: 12,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}];

			const result = await limitedProcessor.extractTemporalMarkers(chunks);

			expect(result.markers.length).toBeLessThanOrEqual(2);
		});
	});

	describe('Text Normalization', () => {
		it('should normalize text with temporal markers', async () => {
			const chunks: Chunk[] = [{
				id: 'chunk1',
				docId: 'doc1',
				text: 'The meeting is on 2024-01-15 at 2:30 PM.',
				tokens: 10,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}];

			const result = await processor.extractTemporalMarkers(chunks);

			expect(result.normalizedText).toContain('[2024-01-15]');
			expect(result.normalizedText).toContain('[14:30:00]');
		});
	});

	describe('Metadata Calculation', () => {
		it('should calculate correct metadata', async () => {
			const chunks: Chunk[] = [{
				id: 'chunk1',
				docId: 'doc1',
				text: 'Yesterday at 2:30 PM, we had a 3-hour meeting about Q1 results.',
				tokens: 12,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}];

			const result = await processor.extractTemporalMarkers(chunks);

			expect(result.metadata.totalMarkers).toBeGreaterThan(0);
			expect(result.metadata.byType).toBeDefined();
			expect(result.metadata.confidenceDistribution).toBeDefined();
		});
	});

	describe('Atom Conversion', () => {
		it('should convert temporal markers to atoms', () => {
			const markers: TemporalMarker[] = [{
				id: 'temp1',
				text: '2024-01-15',
				type: 'absolute_date',
				value: new Date('2024-01-15'),
				confidence: 0.95,
				metadata: {
					normalized: '2024-01-15',
					context: 'The meeting is on 2024-01-15',
					provenance: { offset: 20, length: 10 }
				}
			}];

			const atoms = processor.convertToAtoms(markers, 'chunk1');

			expect(atoms).toHaveLength(1);
			expect(atoms[0].type).toBe('DATE');
			expect(atoms[0].chunkId).toBe('chunk1');
			expect(atoms[0].text).toBe('2024-01-15');
		});
	});

	describe('Context Extraction', () => {
		it('should extract context around temporal markers', () => {
			const text = 'The important meeting is scheduled for 2024-01-15 at 2:30 PM.';
			const offset = text.indexOf('2024-01-15');
			const length = '2024-01-15'.length;

			// Access private method through any for testing
			const context = (processor as any).extractContext(text, offset, length);

			expect(context).toContain('2024-01-15');
			expect(context.length).toBeLessThanOrEqual(100);
		});
	});

	describe('Month Index Conversion', () => {
		it('should convert month names to indices correctly', () => {
			// Access private method through any for testing
			const januaryIndex = (processor as any).getMonthIndex('January');
			const decemberIndex = (processor as any).getMonthIndex('December');

			expect(januaryIndex).toBe(0);
			expect(decemberIndex).toBe(11);
		});
	});

	describe('Error Handling', () => {
		it('should handle invalid dates gracefully', async () => {
			const chunks: Chunk[] = [{
				id: 'chunk1',
				docId: 'doc1',
				text: 'The invalid date is 2024-13-45.',
				tokens: 8,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}];

			const result = await processor.extractTemporalMarkers(chunks);

			// Invalid dates should not be extracted
			expect(result.markers).toHaveLength(0);
		});

		it('should handle empty text gracefully', async () => {
			const chunks: Chunk[] = [{
				id: 'chunk1',
				docId: 'doc1',
				text: '',
				tokens: 0,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}];

			const result = await processor.extractTemporalMarkers(chunks);

			expect(result.markers).toHaveLength(0);
			expect(result.normalizedText).toBe('');
		});
	});

	describe('Integration Tests', () => {
		it('should process complex text with multiple temporal markers', async () => {
			const chunks: Chunk[] = [{
				id: 'chunk1',
				docId: 'doc1',
				text: 'Yesterday at 2:30 PM, we had a 3-hour meeting about Q1 results. The next review is scheduled for 2024-02-15 at 10:00 AM. We meet weekly.',
				tokens: 20,
				metadata: {},
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z'
			}];

			const result = await processor.extractTemporalMarkers(chunks);

			expect(result.markers.length).toBeGreaterThan(5);
			expect(result.markers.some(m => m.type === 'relative_date')).toBe(true);
			expect(result.markers.some(m => m.type === 'absolute_time')).toBe(true);
			expect(result.markers.some(m => m.type === 'duration')).toBe(true);
			expect(result.markers.some(m => m.type === 'absolute_date')).toBe(true);
			expect(result.markers.some(m => m.type === 'frequency')).toBe(true);
		});
	});
});
