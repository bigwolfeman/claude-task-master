/**
 * mock-helpers.ts
 * Utilities for creating mocks, stubs, and test doubles
 */

import { jest } from '@jest/globals';
import type { Document, Chunk, Atom } from '../../src/context-engine/types.js';

/**
 * Mock LLM responses for testing AI-powered components
 */
export class MockLLMHelper {
	private responseQueue: Array<{ response: any; delay?: number }> = [];
	private callHistory: Array<{ prompt: string; options?: any; timestamp: number }> = [];

	/**
	 * Queue a response for the next LLM call
	 */
	queueResponse(response: any, delay = 0): void {
		this.responseQueue.push({ response, delay });
	}

	/**
	 * Queue multiple responses
	 */
	queueResponses(responses: Array<{ response: any; delay?: number }>): void {
		this.responseQueue.push(...responses);
	}

	/**
	 * Create a mock LLM function
	 */
	createMockLLM(): jest.MockedFunction<(prompt: string, options?: any) => Promise<any>> {
		return jest.fn().mockImplementation(async (prompt: string, options?: any) => {
			// Record the call
			this.callHistory.push({
				prompt,
				options,
				timestamp: Date.now()
			});

			// Get the next response
			const next = this.responseQueue.shift();
			if (!next) {
				throw new Error('No mock LLM response queued');
			}

			// Simulate delay if specified
			if (next.delay > 0) {
				await new Promise(resolve => setTimeout(resolve, next.delay));
			}

			return next.response;
		});
	}

	/**
	 * Get call history for assertions
	 */
	getCallHistory(): Array<{ prompt: string; options?: any; timestamp: number }> {
		return [...this.callHistory];
	}

	/**
	 * Clear call history and response queue
	 */
	reset(): void {
		this.responseQueue = [];
		this.callHistory = [];
	}

	/**
	 * Assert that specific prompts were called
	 */
	assertPromptsContain(expectedSubstrings: string[]): void {
		const allPrompts = this.callHistory.map(call => call.prompt).join(' ');
		
		for (const substring of expectedSubstrings) {
			expect(allPrompts).toContain(substring);
		}
	}

	/**
	 * Assert call count
	 */
	assertCallCount(expectedCount: number): void {
		expect(this.callHistory.length).toBe(expectedCount);
	}
}

/**
 * Performance measurement utilities
 */
export class PerformanceMeasurement {
	private measurements: Map<string, number[]> = new Map();

	/**
	 * Measure function execution time
	 */
	async measure<T>(
		name: string,
		fn: () => Promise<T> | T
	): Promise<{ result: T; duration: number }> {
		const start = performance.now();
		const result = await fn();
		const duration = performance.now() - start;

		// Store measurement
		if (!this.measurements.has(name)) {
			this.measurements.set(name, []);
		}
		this.measurements.get(name)!.push(duration);

		return { result, duration };
	}

	/**
	 * Get statistics for a measurement
	 */
	getStats(name: string): {
		count: number;
		avg: number;
		min: number;
		max: number;
		total: number;
	} | null {
		const times = this.measurements.get(name);
		if (!times || times.length === 0) {
			return null;
		}

		return {
			count: times.length,
			avg: times.reduce((a, b) => a + b) / times.length,
			min: Math.min(...times),
			max: Math.max(...times),
			total: times.reduce((a, b) => a + b)
		};
	}

	/**
	 * Assert performance meets expectations
	 */
	assertPerformance(
		name: string,
		expectations: {
			maxAvg?: number;
			maxMax?: number;
			minCount?: number;
		}
	): void {
		const stats = this.getStats(name);
		expect(stats).not.toBeNull();

		if (expectations.maxAvg !== undefined) {
			expect(stats!.avg).toBeLessThanOrEqual(expectations.maxAvg);
		}

		if (expectations.maxMax !== undefined) {
			expect(stats!.max).toBeLessThanOrEqual(expectations.maxMax);
		}

		if (expectations.minCount !== undefined) {
			expect(stats!.count).toBeGreaterThanOrEqual(expectations.minCount);
		}
	}

	/**
	 * Clear all measurements
	 */
	reset(): void {
		this.measurements.clear();
	}
}

/**
 * Memory usage tracking
 */
export class MemoryTracker {
	private snapshots: Array<{ name: string; usage: NodeJS.MemoryUsage; timestamp: number }> = [];

	/**
	 * Take a memory snapshot
	 */
	snapshot(name: string): void {
		this.snapshots.push({
			name,
			usage: process.memoryUsage(),
			timestamp: Date.now()
		});
	}

	/**
	 * Get memory difference between two snapshots
	 */
	getDifference(startSnapshot: string, endSnapshot: string): {
		heapUsed: number;
		heapTotal: number;
		external: number;
		rss: number;
	} | null {
		const start = this.snapshots.find(s => s.name === startSnapshot);
		const end = this.snapshots.find(s => s.name === endSnapshot);

		if (!start || !end) {
			return null;
		}

		return {
			heapUsed: end.usage.heapUsed - start.usage.heapUsed,
			heapTotal: end.usage.heapTotal - start.usage.heapTotal,
			external: end.usage.external - start.usage.external,
			rss: end.usage.rss - start.usage.rss
		};
	}

	/**
	 * Assert memory usage is within limits
	 */
	assertMemoryUsage(
		startSnapshot: string,
		endSnapshot: string,
		limits: {
			maxHeapIncrease?: number; // bytes
			maxRSSIncrease?: number; // bytes
		}
	): void {
		const diff = this.getDifference(startSnapshot, endSnapshot);
		expect(diff).not.toBeNull();

		if (limits.maxHeapIncrease !== undefined) {
			expect(diff!.heapUsed).toBeLessThanOrEqual(limits.maxHeapIncrease);
		}

		if (limits.maxRSSIncrease !== undefined) {
			expect(diff!.rss).toBeLessThanOrEqual(limits.maxRSSIncrease);
		}
	}

	/**
	 * Clear all snapshots
	 */
	reset(): void {
		this.snapshots = [];
	}
}

/**
 * Test data generators with realistic variations
 */
export class TestDataGenerator {
	private static instance: TestDataGenerator;
	private seededRandom: () => number;

	constructor(seed?: number) {
		// Create seeded random for consistent test data
		this.seededRandom = this.createSeededRandom(seed || 12345);
	}

	static getInstance(): TestDataGenerator {
		if (!TestDataGenerator.instance) {
			TestDataGenerator.instance = new TestDataGenerator();
		}
		return TestDataGenerator.instance;
	}

	private createSeededRandom(seed: number): () => number {
		let state = seed;
		return () => {
			state = (state * 9301 + 49297) % 233280;
			return state / 233280;
		};
	}

	/**
	 * Generate random text content
	 */
	generateText(wordCount: number, topic?: string): string {
		const words = topic ? this.getTopicWords(topic) : this.getGenericWords();
		const result: string[] = [];

		for (let i = 0; i < wordCount; i++) {
			const word = words[Math.floor(this.seededRandom() * words.length)];
			result.push(word);
		}

		return result.join(' ');
	}

	/**
	 * Generate realistic document variations
	 */
	generateDocument(options: {
		type?: 'markdown' | 'code' | 'research' | 'tutorial';
		wordCount?: number;
		complexity?: 'low' | 'medium' | 'high';
	} = {}): Document {
		const id = `gen-doc-${Math.floor(this.seededRandom() * 10000)}`;
		const type = options.type || 'tutorial';
		const wordCount = options.wordCount || 500;

		return {
			id,
			title: this.generateTitle(type),
			content: this.generateText(wordCount, type),
			metadata: {
				type,
				complexity: options.complexity || 'medium',
				generated: true,
				wordCount
			},
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
	}

	/**
	 * Generate realistic chunk variations
	 */
	generateChunk(documentId: string, index: number, options: {
		type?: string;
		wordCount?: number;
		hasCode?: boolean;
	} = {}): Chunk {
		const id = `gen-chunk-${documentId}-${index}`;
		const wordCount = options.wordCount || 100;

		return {
			id,
			documentId,
			chunkIndex: index,
			text: this.generateText(wordCount),
			metadata: {
				type: options.type || 'paragraph',
				hasCode: options.hasCode || false,
				wordCount,
				generated: true
			},
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
	}

	/**
	 * Generate realistic atom variations
	 */
	generateAtom(chunkId: string, type: 'ENT' | 'NUM' | 'DATE' | 'REL', options: {
		confidence?: number;
	} = {}): Atom {
		const id = `gen-atom-${chunkId}-${Math.floor(this.seededRandom() * 1000)}`;
		const text = this.generateAtomText(type);
		const confidence = options.confidence || (0.7 + this.seededRandom() * 0.3);

		return {
			id,
			chunkId,
			type,
			text,
			metadata: {
				confidence,
				generated: true,
				source: 'test-generation'
			},
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
	}

	private generateTitle(type: string): string {
		const prefixes = {
			markdown: ['Guide to', 'Introduction to', 'Understanding'],
			code: ['Implementation of', 'Building', 'Creating'],
			research: ['Analysis of', 'Study on', 'Investigation into'],
			tutorial: ['How to', 'Getting Started with', 'Complete Guide to']
		};

		const topics = ['Machine Learning', 'Data Science', 'Neural Networks', 'AI Systems'];
		const prefix = prefixes[type as keyof typeof prefixes] || prefixes.tutorial;
		const topic = topics[Math.floor(this.seededRandom() * topics.length)];
		const prefixWord = prefix[Math.floor(this.seededRandom() * prefix.length)];

		return `${prefixWord} ${topic}`;
	}

	private generateAtomText(type: 'ENT' | 'NUM' | 'DATE' | 'REL'): string {
		switch (type) {
			case 'ENT':
				const entities = ['algorithm', 'model', 'dataset', 'network', 'system', 'framework'];
				return entities[Math.floor(this.seededRandom() * entities.length)];
			case 'NUM':
				return (Math.floor(this.seededRandom() * 1000) + 1).toString();
			case 'DATE':
				const year = 2000 + Math.floor(this.seededRandom() * 24);
				return year.toString();
			case 'REL':
				const relations = ['is part of', 'depends on', 'implements', 'uses', 'extends'];
				return relations[Math.floor(this.seededRandom() * relations.length)];
		}
	}

	private getTopicWords(topic: string): string[] {
		const wordSets = {
			'machine-learning': ['algorithm', 'model', 'training', 'prediction', 'data', 'neural', 'learning', 'classification', 'regression'],
			'code': ['function', 'class', 'method', 'variable', 'import', 'export', 'async', 'await', 'return'],
			'research': ['study', 'analysis', 'methodology', 'results', 'conclusion', 'hypothesis', 'experiment', 'data'],
			'tutorial': ['step', 'guide', 'example', 'learn', 'practice', 'exercise', 'solution', 'implementation']
		};

		return wordSets[topic as keyof typeof wordSets] || this.getGenericWords();
	}

	private getGenericWords(): string[] {
		return [
			'the', 'and', 'to', 'of', 'a', 'in', 'is', 'it', 'you', 'that', 'he', 'was', 'for', 'on', 'are', 'as', 'with',
			'his', 'they', 'i', 'at', 'be', 'this', 'have', 'from', 'or', 'one', 'had', 'by', 'word', 'but', 'not',
			'what', 'all', 'were', 'we', 'when', 'your', 'can', 'said', 'there', 'each', 'which', 'she', 'do', 'how',
			'their', 'if', 'will', 'up', 'other', 'about', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her',
			'would', 'make', 'like', 'into', 'him', 'time', 'has', 'two', 'more', 'very', 'after', 'words', 'first'
		];
	}
}

/**
 * Global instances for easy access in tests
 */
export const mockLLM = new MockLLMHelper();
export const performance = new PerformanceMeasurement();
export const memory = new MemoryTracker();
export const testData = TestDataGenerator.getInstance();

/**
 * Cleanup helper for use in test teardown
 */
export function resetAllMocks(): void {
	mockLLM.reset();
	performance.reset();
	memory.reset();
}
