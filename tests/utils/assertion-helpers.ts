/**
 * assertion-helpers.ts
 * Custom assertion helpers for Context Engine testing
 */

import { jest } from '@jest/globals';
import type { Document, Chunk, Atom, GraphNode, GraphEdge, Summary } from '../../src/context-engine/types.js';

/**
 * Extended matchers for Jest
 */
declare global {
	namespace jest {
		interface Matchers<R> {
			toBeValidDocument(): R;
			toBeValidChunk(): R;
			toBeValidAtom(): R;
			toBeValidGraphNode(): R;
			toBeValidGraphEdge(): R;
			toBeValidSummary(): R;
			toHaveValidTimestamps(): R;
			toHaveMetadataProperty(key: string, value?: any): R;
			toBeWithinPerformanceThreshold(maxMs: number): R;
			toHaveValidConfidence(): R;
		}
	}
}

/**
 * Custom Jest matchers
 */
export const customMatchers = {
	toBeValidDocument(received: any) {
		const pass = (
			received &&
			typeof received.id === 'string' &&
			typeof received.title === 'string' &&
			typeof received.content === 'string' &&
			typeof received.metadata === 'object' &&
			typeof received.createdAt === 'string' &&
			typeof received.updatedAt === 'string'
		);

		if (pass) {
			return {
				message: () => `expected ${JSON.stringify(received)} not to be a valid document`,
				pass: true,
			};
		} else {
			return {
				message: () => `expected ${JSON.stringify(received)} to be a valid document with id, title, content, metadata, createdAt, and updatedAt`,
				pass: false,
			};
		}
	},

	toBeValidChunk(received: any) {
		const pass = (
			received &&
			typeof received.id === 'string' &&
			typeof received.documentId === 'string' &&
			typeof received.chunkIndex === 'number' &&
			typeof received.text === 'string' &&
			typeof received.metadata === 'object' &&
			typeof received.createdAt === 'string' &&
			typeof received.updatedAt === 'string'
		);

		if (pass) {
			return {
				message: () => `expected ${JSON.stringify(received)} not to be a valid chunk`,
				pass: true,
			};
		} else {
			return {
				message: () => `expected ${JSON.stringify(received)} to be a valid chunk with id, documentId, chunkIndex, text, metadata, createdAt, and updatedAt`,
				pass: false,
			};
		}
	},

	toBeValidAtom(received: any) {
		const validTypes = ['ENT', 'NUM', 'DATE', 'REL'];
		const pass = (
			received &&
			typeof received.id === 'string' &&
			typeof received.chunkId === 'string' &&
			validTypes.includes(received.type) &&
			typeof received.text === 'string' &&
			typeof received.metadata === 'object' &&
			typeof received.createdAt === 'string' &&
			typeof received.updatedAt === 'string'
		);

		if (pass) {
			return {
				message: () => `expected ${JSON.stringify(received)} not to be a valid atom`,
				pass: true,
			};
		} else {
			return {
				message: () => `expected ${JSON.stringify(received)} to be a valid atom with id, chunkId, type (${validTypes.join('|')}), text, metadata, createdAt, and updatedAt`,
				pass: false,
			};
		}
	},

	toBeValidGraphNode(received: any) {
		const pass = (
			received &&
			typeof received.id === 'string' &&
			typeof received.type === 'string' &&
			typeof received.label === 'string' &&
			typeof received.metadata === 'object' &&
			typeof received.createdAt === 'string' &&
			typeof received.updatedAt === 'string'
		);

		if (pass) {
			return {
				message: () => `expected ${JSON.stringify(received)} not to be a valid graph node`,
				pass: true,
			};
		} else {
			return {
				message: () => `expected ${JSON.stringify(received)} to be a valid graph node with id, type, label, metadata, createdAt, and updatedAt`,
				pass: false,
			};
		}
	},

	toBeValidGraphEdge(received: any) {
		const pass = (
			received &&
			typeof received.id === 'string' &&
			typeof received.sourceId === 'string' &&
			typeof received.targetId === 'string' &&
			typeof received.type === 'string' &&
			typeof received.metadata === 'object' &&
			typeof received.createdAt === 'string' &&
			typeof received.updatedAt === 'string'
		);

		if (pass) {
			return {
				message: () => `expected ${JSON.stringify(received)} not to be a valid graph edge`,
				pass: true,
			};
		} else {
			return {
				message: () => `expected ${JSON.stringify(received)} to be a valid graph edge with id, sourceId, targetId, type, metadata, createdAt, and updatedAt`,
				pass: false,
			};
		}
	},

	toBeValidSummary(received: any) {
		const pass = (
			received &&
			typeof received.id === 'string' &&
			Array.isArray(received.chunkIds) &&
			typeof received.text === 'string' &&
			typeof received.metadata === 'object' &&
			typeof received.createdAt === 'string' &&
			typeof received.updatedAt === 'string'
		);

		if (pass) {
			return {
				message: () => `expected ${JSON.stringify(received)} not to be a valid summary`,
				pass: true,
			};
		} else {
			return {
				message: () => `expected ${JSON.stringify(received)} to be a valid summary with id, chunkIds, text, metadata, createdAt, and updatedAt`,
				pass: false,
			};
		}
	},

	toHaveValidTimestamps(received: any) {
		const hasTimestamps = received && received.createdAt && received.updatedAt;
		const validFormat = hasTimestamps && 
			typeof received.createdAt === 'string' &&
			typeof received.updatedAt === 'string' &&
			!isNaN(Date.parse(received.createdAt)) &&
			!isNaN(Date.parse(received.updatedAt));

		const pass = hasTimestamps && validFormat;

		if (pass) {
			return {
				message: () => `expected ${JSON.stringify(received)} not to have valid timestamps`,
				pass: true,
			};
		} else {
			return {
				message: () => `expected ${JSON.stringify(received)} to have valid createdAt and updatedAt timestamps in ISO string format`,
				pass: false,
			};
		}
	},

	toHaveMetadataProperty(received: any, key: string, value?: any) {
		const hasMetadata = received && received.metadata && typeof received.metadata === 'object';
		const hasProperty = hasMetadata && received.metadata.hasOwnProperty(key);
		const valueMatches = value === undefined || (hasProperty && received.metadata[key] === value);

		const pass = hasMetadata && hasProperty && valueMatches;

		if (pass) {
			return {
				message: () => `expected ${JSON.stringify(received)} not to have metadata property '${key}'${value !== undefined ? ` with value ${JSON.stringify(value)}` : ''}`,
				pass: true,
			};
		} else {
			return {
				message: () => `expected ${JSON.stringify(received)} to have metadata property '${key}'${value !== undefined ? ` with value ${JSON.stringify(value)}` : ''}`,
				pass: false,
			};
		}
	},

	toBeWithinPerformanceThreshold(received: any, maxMs: number) {
		const isNumber = typeof received === 'number';
		const withinThreshold = isNumber && received <= maxMs;

		if (withinThreshold) {
			return {
				message: () => `expected ${received}ms not to be within performance threshold of ${maxMs}ms`,
				pass: true,
			};
		} else {
			return {
				message: () => `expected ${received}ms to be within performance threshold of ${maxMs}ms`,
				pass: false,
			};
		}
	},

	toHaveValidConfidence(received: any) {
		const hasConfidence = received && received.metadata && typeof received.metadata.confidence === 'number';
		const validRange = hasConfidence && received.metadata.confidence >= 0 && received.metadata.confidence <= 1;

		const pass = hasConfidence && validRange;

		if (pass) {
			return {
				message: () => `expected ${JSON.stringify(received)} not to have valid confidence score`,
				pass: true,
			};
		} else {
			return {
				message: () => `expected ${JSON.stringify(received)} to have valid confidence score between 0 and 1 in metadata`,
				pass: false,
			};
		}
	}
};

/**
 * Collection assertion helpers
 */
export class CollectionAssertions {
	/**
	 * Assert that a collection contains only valid documents
	 */
	static assertValidDocuments(documents: any[]): void {
		expect(Array.isArray(documents)).toBe(true);
		documents.forEach(doc => {
			expect(doc).toBeValidDocument();
		});
	}

	/**
	 * Assert that a collection contains only valid chunks
	 */
	static assertValidChunks(chunks: any[]): void {
		expect(Array.isArray(chunks)).toBe(true);
		chunks.forEach(chunk => {
			expect(chunk).toBeValidChunk();
		});
	}

	/**
	 * Assert that a collection contains only valid atoms
	 */
	static assertValidAtoms(atoms: any[]): void {
		expect(Array.isArray(atoms)).toBe(true);
		atoms.forEach(atom => {
			expect(atom).toBeValidAtom();
		});
	}

	/**
	 * Assert collection has expected size
	 */
	static assertCollectionSize(collection: any[], expectedSize: number): void {
		expect(collection).toHaveLength(expectedSize);
	}

	/**
	 * Assert collection is sorted by a property
	 */
	static assertSortedBy<T>(collection: T[], propertyGetter: (item: T) => any, order: 'asc' | 'desc' = 'asc'): void {
		for (let i = 1; i < collection.length; i++) {
			const current = propertyGetter(collection[i]);
			const previous = propertyGetter(collection[i - 1]);
			
			if (order === 'asc') {
				expect(current).toBeGreaterThanOrEqual(previous);
			} else {
				expect(current).toBeLessThanOrEqual(previous);
			}
		}
	}

	/**
	 * Assert collection contains no duplicates by ID
	 */
	static assertNoDuplicateIds<T extends { id: string }>(collection: T[]): void {
		const ids = collection.map(item => item.id);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(ids.length);
	}

	/**
	 * Assert collection statistics match expectations
	 */
	static assertCollectionStats<T>(
		collection: T[],
		stats: {
			minSize?: number;
			maxSize?: number;
			exactSize?: number;
			hasItems?: boolean;
			isEmpty?: boolean;
		}
	): void {
		if (stats.exactSize !== undefined) {
			expect(collection).toHaveLength(stats.exactSize);
		}
		if (stats.minSize !== undefined) {
			expect(collection.length).toBeGreaterThanOrEqual(stats.minSize);
		}
		if (stats.maxSize !== undefined) {
			expect(collection.length).toBeLessThanOrEqual(stats.maxSize);
		}
		if (stats.hasItems !== undefined) {
			expect(collection.length > 0).toBe(stats.hasItems);
		}
		if (stats.isEmpty !== undefined) {
			expect(collection.length === 0).toBe(stats.isEmpty);
		}
	}
}

/**
 * Performance assertion helpers
 */
export class PerformanceAssertions {
	/**
	 * Assert function executes within time limit
	 */
	static async assertExecutionTime<T>(
		fn: () => Promise<T>,
		maxMs: number,
		description?: string
	): Promise<T> {
		const start = performance.now();
		const result = await fn();
		const duration = performance.now() - start;
		
		expect(duration).toBeWithinPerformanceThreshold(maxMs);
		if (description) {
			console.log(`${description}: ${duration.toFixed(2)}ms (limit: ${maxMs}ms)`);
		}
		
		return result;
	}

	/**
	 * Assert memory usage stays within limits
	 */
	static async assertMemoryUsage<T>(
		fn: () => Promise<T>,
		maxIncreaseMB: number,
		description?: string
	): Promise<T> {
		const startMemory = process.memoryUsage().heapUsed;
		const result = await fn();
		const endMemory = process.memoryUsage().heapUsed;
		const increaseMB = (endMemory - startMemory) / 1024 / 1024;
		
		expect(increaseMB).toBeLessThanOrEqual(maxIncreaseMB);
		if (description) {
			console.log(`${description}: ${increaseMB.toFixed(2)}MB increase (limit: ${maxIncreaseMB}MB)`);
		}
		
		return result;
	}

	/**
	 * Assert concurrent operations complete successfully
	 */
	static async assertConcurrency<T>(
		operations: Array<() => Promise<T>>,
		maxMs: number,
		description?: string
	): Promise<T[]> {
		const start = performance.now();
		const results = await Promise.all(operations.map(op => op()));
		const duration = performance.now() - start;
		
		expect(duration).toBeWithinPerformanceThreshold(maxMs);
		expect(results).toHaveLength(operations.length);
		
		if (description) {
			console.log(`${description}: ${operations.length} concurrent operations in ${duration.toFixed(2)}ms`);
		}
		
		return results;
	}
}

/**
 * Setup custom matchers for Jest
 */
export function setupCustomMatchers(): void {
	if (typeof expect !== 'undefined' && expect.extend) {
		expect.extend(customMatchers);
	}
}

/**
 * Export all assertion helpers
 */
export const assertions = {
	collections: CollectionAssertions,
	performance: PerformanceAssertions,
	setupMatchers: setupCustomMatchers
};
