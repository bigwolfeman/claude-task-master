/**
 * atoms.ts
 * Test fixtures for atoms with various types and characteristics
 */

import type { Atom } from '../../src/context-engine/types.js';

export const entityAtoms: Atom[] = [
	{
		id: 'atom-ent-1',
		chunkId: 'chunk-text-1',
		type: 'ENT',
		text: 'machine learning',
		metadata: {
			confidence: 0.95,
			source: 'extraction',
			category: 'technology',
			entityType: 'concept',
			frequency: 5,
			importance: 0.9
		},
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z'
	},
	{
		id: 'atom-ent-2',
		chunkId: 'chunk-text-1',
		type: 'ENT',
		text: 'artificial intelligence',
		metadata: {
			confidence: 0.92,
			source: 'extraction',
			category: 'technology',
			entityType: 'concept',
			frequency: 3,
			importance: 0.85,
			aliases: ['AI']
		},
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z'
	},
	{
		id: 'atom-ent-3',
		chunkId: 'chunk-text-1',
		type: 'ENT',
		text: 'algorithms',
		metadata: {
			confidence: 0.88,
			source: 'extraction',
			category: 'technology',
			entityType: 'concept',
			frequency: 4,
			importance: 0.8
		},
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z'
	},
	{
		id: 'atom-ent-4',
		chunkId: 'chunk-code-1',
		type: 'ENT',
		text: 'LinearRegression',
		metadata: {
			confidence: 0.98,
			source: 'code-extraction',
			category: 'class',
			entityType: 'api',
			library: 'sklearn',
			module: 'sklearn.linear_model',
			importance: 0.9
		},
		createdAt: '2024-01-02T00:00:00Z',
		updatedAt: '2024-01-02T00:00:00Z'
	},
	{
		id: 'atom-ent-5',
		chunkId: 'chunk-code-1',
		type: 'ENT',
		text: 'numpy',
		metadata: {
			confidence: 0.99,
			source: 'code-extraction',
			category: 'library',
			entityType: 'import',
			alias: 'np',
			importance: 0.7
		},
		createdAt: '2024-01-02T00:00:00Z',
		updatedAt: '2024-01-02T00:00:00Z'
	}
];

export const numberAtoms: Atom[] = [
	{
		id: 'atom-num-1',
		chunkId: 'chunk-date-1',
		type: 'NUM',
		text: '1950',
		metadata: {
			confidence: 0.99,
			source: 'extraction',
			numberType: 'year',
			value: 1950,
			context: 'Alan Turing publishes paper',
			importance: 0.8
		},
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z'
	},
	{
		id: 'atom-num-2',
		chunkId: 'chunk-date-1',
		type: 'NUM',
		text: '1956',
		metadata: {
			confidence: 0.99,
			source: 'extraction',
			numberType: 'year',
			value: 1956,
			context: 'AI term coined at Dartmouth Conference',
			importance: 0.85
		},
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z'
	},
	{
		id: 'atom-num-3',
		chunkId: 'chunk-date-1',
		type: 'NUM',
		text: '1997',
		metadata: {
			confidence: 0.99,
			source: 'extraction',
			numberType: 'year',
			value: 1997,
			context: 'Deep Blue defeats Garry Kasparov',
			importance: 0.8
		},
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z'
	},
	{
		id: 'atom-num-4',
		chunkId: 'chunk-code-1',
		type: 'NUM',
		text: '6',
		metadata: {
			confidence: 0.95,
			source: 'code-extraction',
			numberType: 'literal',
			value: 6,
			context: 'prediction input value',
			importance: 0.6
		},
		createdAt: '2024-01-02T00:00:00Z',
		updatedAt: '2024-01-02T00:00:00Z'
	}
];

export const dateAtoms: Atom[] = [
	{
		id: 'atom-date-1',
		chunkId: 'chunk-date-1',
		type: 'DATE',
		text: '1950',
		metadata: {
			confidence: 0.98,
			source: 'extraction',
			dateType: 'year',
			parsedDate: '1950-01-01T00:00:00Z',
			precision: 'year',
			context: 'Turing paper publication',
			importance: 0.8,
			era: '20th century'
		},
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z'
	},
	{
		id: 'atom-date-2',
		chunkId: 'chunk-date-1',
		type: 'DATE',
		text: '1956',
		metadata: {
			confidence: 0.98,
			source: 'extraction',
			dateType: 'year',
			parsedDate: '1956-01-01T00:00:00Z',
			precision: 'year',
			context: 'Dartmouth Conference',
			importance: 0.9,
			era: '20th century',
			significance: 'AI birth year'
		},
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z'
	},
	{
		id: 'atom-date-3',
		chunkId: 'chunk-date-1',
		type: 'DATE',
		text: '1997',
		metadata: {
			confidence: 0.98,
			source: 'extraction',
			dateType: 'year',
			parsedDate: '1997-01-01T00:00:00Z',
			precision: 'year',
			context: 'Deep Blue chess victory',
			importance: 0.8,
			era: '20th century',
			significance: 'AI milestone'
		},
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z'
	}
];

export const relationshipAtoms: Atom[] = [
	{
		id: 'atom-rel-1',
		chunkId: 'chunk-text-1',
		type: 'REL',
		text: 'is a subset of',
		metadata: {
			confidence: 0.92,
			source: 'extraction',
			relationType: 'subset',
			subject: 'machine learning',
			object: 'artificial intelligence',
			direction: 'forward',
			importance: 0.9
		},
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z'
	},
	{
		id: 'atom-rel-2',
		chunkId: 'chunk-text-1',
		type: 'REL',
		text: 'focuses on',
		metadata: {
			confidence: 0.88,
			source: 'extraction',
			relationType: 'focus',
			subject: 'machine learning',
			object: 'algorithms',
			direction: 'forward',
			importance: 0.8
		},
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z'
	},
	{
		id: 'atom-rel-3',
		chunkId: 'chunk-text-2',
		type: 'REL',
		text: 'includes',
		metadata: {
			confidence: 0.90,
			source: 'extraction',
			relationType: 'inclusion',
			subject: 'supervised learning',
			object: 'classification',
			direction: 'forward',
			importance: 0.8
		},
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z'
	},
	{
		id: 'atom-rel-4',
		chunkId: 'chunk-code-2',
		type: 'REL',
		text: 'extends',
		metadata: {
			confidence: 0.99,
			source: 'code-extraction',
			relationType: 'inheritance',
			subject: 'ContextEngine',
			object: 'EventEmitter',
			direction: 'forward',
			importance: 0.9,
			language: 'typescript'
		},
		createdAt: '2024-01-02T00:00:00Z',
		updatedAt: '2024-01-02T00:00:00Z'
	}
];

export const codeAtoms: Atom[] = [
	{
		id: 'atom-code-1',
		chunkId: 'chunk-code-1',
		type: 'ENT',
		text: 'fit',
		metadata: {
			confidence: 0.99,
			source: 'code-extraction',
			category: 'method',
			entityType: 'function',
			className: 'LinearRegression',
			parameters: ['X', 'y'],
			importance: 0.8
		},
		createdAt: '2024-01-02T00:00:00Z',
		updatedAt: '2024-01-02T00:00:00Z'
	},
	{
		id: 'atom-code-2',
		chunkId: 'chunk-code-1',
		type: 'ENT',
		text: 'predict',
		metadata: {
			confidence: 0.99,
			source: 'code-extraction',
			category: 'method',
			entityType: 'function',
			className: 'LinearRegression',
			parameters: ['X'],
			returnType: 'array',
			importance: 0.8
		},
		createdAt: '2024-01-02T00:00:00Z',
		updatedAt: '2024-01-02T00:00:00Z'
	},
	{
		id: 'atom-code-3',
		chunkId: 'chunk-code-2',
		type: 'ENT',
		text: 'ContextEngine',
		metadata: {
			confidence: 0.99,
			source: 'code-extraction',
			category: 'class',
			entityType: 'class-definition',
			extends: 'EventEmitter',
			properties: ['config', 'storage', 'retriever'],
			importance: 0.95
		},
		createdAt: '2024-01-02T00:00:00Z',
		updatedAt: '2024-01-02T00:00:00Z'
	}
];

export const performanceTestAtoms: Atom[] = Array.from({ length: 500 }, (_, i) => ({
	id: `atom-perf-${i + 1}`,
	chunkId: `chunk-perf-${Math.floor(i / 5) + 1}`,
	type: ['ENT', 'NUM', 'DATE', 'REL'][i % 4] as 'ENT' | 'NUM' | 'DATE' | 'REL',
	text: `atom-${i + 1}`,
	metadata: {
		confidence: 0.7 + (i % 30) / 100, // Vary confidence 0.7-0.99
		source: 'performance-test',
		batch: Math.floor(i / 50),
		importance: 0.5 + (i % 50) / 100
	},
	createdAt: '2024-01-05T00:00:00Z',
	updatedAt: '2024-01-05T00:00:00Z'
}));

export const complexAtoms: Atom[] = [
	{
		id: 'atom-complex-1',
		chunkId: 'chunk-complex-1',
		type: 'ENT',
		text: 'attention mechanism',
		metadata: {
			confidence: 0.96,
			source: 'extraction',
			category: 'technology',
			entityType: 'neural-architecture',
			domain: 'deep-learning',
			complexity: 'high',
			relatedConcepts: ['transformer', 'neural-networks', 'sequence-modeling'],
			importance: 0.95
		},
		createdAt: '2024-01-04T00:00:00Z',
		updatedAt: '2024-01-04T00:00:00Z'
	},
	{
		id: 'atom-complex-2',
		chunkId: 'chunk-complex-2',
		type: 'ENT',
		text: 'Transformer',
		metadata: {
			confidence: 0.99,
			source: 'extraction',
			category: 'technology',
			entityType: 'neural-architecture',
			domain: 'deep-learning',
			complexity: 'high',
			paperTitle: 'Attention Is All You Need',
			authors: ['Vaswani et al.'],
			year: 2017,
			importance: 0.98
		},
		createdAt: '2024-01-04T00:00:00Z',
		updatedAt: '2024-01-04T00:00:00Z'
	}
];

export const allTestAtoms: Atom[] = [
	...entityAtoms,
	...numberAtoms,
	...dateAtoms,
	...relationshipAtoms,
	...codeAtoms,
	...complexAtoms
];

export const testAtomsByType = {
	entity: entityAtoms,
	number: numberAtoms,
	date: dateAtoms,
	relationship: relationshipAtoms,
	code: codeAtoms,
	complex: complexAtoms,
	performance: performanceTestAtoms
};
