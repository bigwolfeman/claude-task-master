/**
 * chunks.ts
 * Test fixtures for chunks with various characteristics
 */

import type { Chunk } from '../../src/context-engine/types.js';

export const textChunks: Chunk[] = [
	{
		id: 'chunk-text-1',
		documentId: 'doc-markdown-1',
		chunkIndex: 0,
		text: 'Machine learning is a subset of artificial intelligence (AI) that focuses on algorithms that can learn and improve from experience without being explicitly programmed.',
		metadata: {
			type: 'paragraph',
			importance: 0.9,
			wordCount: 25,
			hasCode: false,
			hasLinks: false,
			topics: ['machine-learning', 'artificial-intelligence', 'algorithms']
		},
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z'
	},
	{
		id: 'chunk-text-2',
		documentId: 'doc-markdown-1',
		chunkIndex: 1,
		text: 'Supervised Learning: Learning with labeled data. This includes Classification (predicting categories) and Regression (predicting continuous values).',
		metadata: {
			type: 'list-item',
			importance: 0.8,
			wordCount: 18,
			hasCode: false,
			hasLinks: false,
			topics: ['supervised-learning', 'classification', 'regression']
		},
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z'
	},
	{
		id: 'chunk-text-3',
		documentId: 'doc-markdown-1',
		chunkIndex: 2,
		text: 'Unsupervised Learning: Learning patterns from unlabeled data. This includes Clustering (grouping similar data points) and Dimensionality reduction (simplifying data).',
		metadata: {
			type: 'list-item',
			importance: 0.8,
			wordCount: 20,
			hasCode: false,
			hasLinks: false,
			topics: ['unsupervised-learning', 'clustering', 'dimensionality-reduction']
		},
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z'
	}
];

export const codeChunks: Chunk[] = [
	{
		id: 'chunk-code-1',
		documentId: 'doc-code-1',
		chunkIndex: 0,
		text: `import numpy as np
from sklearn.linear_model import LinearRegression

# Simple linear regression example
X = np.array([[1], [2], [3], [4], [5]])
y = np.array([2, 4, 6, 8, 10])

model = LinearRegression()
model.fit(X, y)

# Predict new values
prediction = model.predict([[6]])
print(f"Prediction for input 6: {prediction[0]}")`,
		metadata: {
			type: 'code-block',
			language: 'python',
			importance: 0.9,
			wordCount: 35,
			hasCode: true,
			hasLinks: false,
			functions: ['fit', 'predict'],
			imports: ['numpy', 'sklearn.linear_model.LinearRegression'],
			topics: ['linear-regression', 'scikit-learn', 'python']
		},
		createdAt: '2024-01-02T00:00:00Z',
		updatedAt: '2024-01-02T00:00:00Z'
	},
	{
		id: 'chunk-code-2',
		documentId: 'doc-code-1',
		chunkIndex: 1,
		text: `export class ContextEngine extends EventEmitter {
	private config: ContextEngineConfig;
	private storage: StorageBackend;
	private retriever: HybridRetriever;
	
	constructor(config: ContextEngineConfig, storage: StorageBackend) {
		super();
		this.config = config;
		this.storage = storage;
		this.retriever = new HybridRetriever(config);
	}`,
		metadata: {
			type: 'class-definition',
			language: 'typescript',
			importance: 0.9,
			wordCount: 22,
			hasCode: true,
			hasLinks: false,
			classes: ['ContextEngine'],
			extends: ['EventEmitter'],
			interfaces: ['ContextEngineConfig', 'StorageBackend', 'HybridRetriever'],
			topics: ['typescript', 'class', 'constructor', 'context-engine']
		},
		createdAt: '2024-01-02T00:00:00Z',
		updatedAt: '2024-01-02T00:00:00Z'
	}
];

export const mathChunks: Chunk[] = [
	{
		id: 'chunk-math-1',
		documentId: 'doc-markdown-1',
		chunkIndex: 5,
		text: 'The linear regression formula is: y = mx + b. Where y is the predicted value, x is the input feature, m is the slope, and b is the y-intercept.',
		metadata: {
			type: 'mathematical-formula',
			importance: 0.8,
			wordCount: 25,
			hasCode: false,
			hasLinks: false,
			hasMath: true,
			formulas: ['y = mx + b'],
			variables: ['y', 'm', 'x', 'b'],
			topics: ['linear-regression', 'mathematics', 'formula']
		},
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z'
	}
];

export const dateChunks: Chunk[] = [
	{
		id: 'chunk-date-1',
		documentId: 'doc-markdown-1',
		chunkIndex: 4,
		text: '1950: Alan Turing publishes "Computing Machinery and Intelligence". 1956: Term "Artificial Intelligence" coined at Dartmouth Conference. 1997: IBM\'s Deep Blue defeats world chess champion Garry Kasparov.',
		metadata: {
			type: 'timeline',
			importance: 0.7,
			wordCount: 26,
			hasCode: false,
			hasLinks: false,
			hasDates: true,
			dates: ['1950', '1956', '1997'],
			events: ['Turing paper', 'AI term coined', 'Deep Blue victory'],
			topics: ['artificial-intelligence', 'history', 'timeline']
		},
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z'
	}
];

export const linkChunks: Chunk[] = [
	{
		id: 'chunk-link-1',
		documentId: 'doc-markdown-1',
		chunkIndex: 6,
		text: 'Useful resources: Scikit-learn Documentation (https://scikit-learn.org/stable/), TensorFlow Tutorials (https://www.tensorflow.org/tutorials), PyTorch Documentation (https://pytorch.org/docs/stable/index.html).',
		metadata: {
			type: 'reference-links',
			importance: 0.6,
			wordCount: 16,
			hasCode: false,
			hasLinks: true,
			links: [
				'https://scikit-learn.org/stable/',
				'https://www.tensorflow.org/tutorials',
				'https://pytorch.org/docs/stable/index.html'
			],
			topics: ['documentation', 'resources', 'machine-learning']
		},
		createdAt: '2024-01-01T00:00:00Z',
		updatedAt: '2024-01-01T00:00:00Z'
	}
];

export const complexChunks: Chunk[] = [
	{
		id: 'chunk-complex-1',
		documentId: 'doc-research-1',
		chunkIndex: 0,
		text: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism.',
		metadata: {
			type: 'abstract',
			importance: 0.95,
			wordCount: 35,
			hasCode: false,
			hasLinks: false,
			complexity: 'high',
			concepts: ['sequence-transduction', 'recurrent-networks', 'attention-mechanism'],
			topics: ['neural-networks', 'attention', 'encoder-decoder']
		},
		createdAt: '2024-01-04T00:00:00Z',
		updatedAt: '2024-01-04T00:00:00Z'
	},
	{
		id: 'chunk-complex-2',
		documentId: 'doc-research-1',
		chunkIndex: 1,
		text: 'We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.',
		metadata: {
			type: 'proposition',
			importance: 0.98,
			wordCount: 22,
			hasCode: false,
			hasLinks: false,
			complexity: 'high',
			concepts: ['transformer', 'attention-mechanisms', 'network-architecture'],
			topics: ['transformer', 'attention', 'neural-architecture']
		},
		createdAt: '2024-01-04T00:00:00Z',
		updatedAt: '2024-01-04T00:00:00Z'
	}
];

export const performanceTestChunks: Chunk[] = Array.from({ length: 100 }, (_, i) => ({
	id: `chunk-perf-${i + 1}`,
	documentId: 'doc-performance-test',
	chunkIndex: i,
	text: `This is performance test chunk ${i + 1}. It contains some sample text about machine learning, artificial intelligence, neural networks, and data science. The content is designed to test chunking performance and memory usage under load conditions. Additional keywords include: algorithms, optimization, training, inference, models, embeddings, vectors, similarity, retrieval, ranking.`,
	metadata: {
		type: 'performance-test',
		importance: 0.5,
		wordCount: 45,
		hasCode: false,
		hasLinks: false,
		batch: Math.floor(i / 10),
		topics: ['performance', 'machine-learning', 'testing']
	},
	createdAt: '2024-01-05T00:00:00Z',
	updatedAt: '2024-01-05T00:00:00Z'
}));

export const allTestChunks: Chunk[] = [
	...textChunks,
	...codeChunks,
	...mathChunks,
	...dateChunks,
	...linkChunks,
	...complexChunks
];

export const testChunksByType = {
	text: textChunks,
	code: codeChunks,
	math: mathChunks,
	date: dateChunks,
	link: linkChunks,
	complex: complexChunks,
	performance: performanceTestChunks
};
