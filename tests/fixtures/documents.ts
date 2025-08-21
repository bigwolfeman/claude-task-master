/**
 * documents.ts
 * Test fixtures for documents with various content types
 */

import type { Document } from '../../src/context-engine/types.js';

export const markdownDocument: Document = {
	id: 'doc-markdown-1',
	title: 'Comprehensive Markdown Example',
	content: `# Machine Learning Guide

## Introduction

Machine learning is a subset of **artificial intelligence** (AI) that focuses on algorithms that can learn and improve from experience without being explicitly programmed.

### Key Concepts

1. **Supervised Learning**: Learning with labeled data
   - Classification: Predicting categories
   - Regression: Predicting continuous values

2. **Unsupervised Learning**: Learning patterns from unlabeled data
   - Clustering: Grouping similar data points
   - Dimensionality reduction: Simplifying data

3. **Reinforcement Learning**: Learning through interaction and rewards

## Code Example

\`\`\`python
import numpy as np
from sklearn.linear_model import LinearRegression

# Simple linear regression example
X = np.array([[1], [2], [3], [4], [5]])
y = np.array([2, 4, 6, 8, 10])

model = LinearRegression()
model.fit(X, y)

# Predict new values
prediction = model.predict([[6]])
print(f"Prediction for input 6: {prediction[0]}")
\`\`\`

## Important Dates

- **1950**: Alan Turing publishes "Computing Machinery and Intelligence"
- **1956**: Term "Artificial Intelligence" coined at Dartmouth Conference
- **1997**: IBM's Deep Blue defeats world chess champion Garry Kasparov
- **2012**: AlexNet wins ImageNet competition, sparking deep learning revolution

## Mathematical Formula

The linear regression formula is:

y = mx + b

Where:
- y is the predicted value
- x is the input feature
- m is the slope
- b is the y-intercept

## Links and References

- [Scikit-learn Documentation](https://scikit-learn.org/stable/)
- [TensorFlow Tutorials](https://www.tensorflow.org/tutorials)
- [PyTorch Documentation](https://pytorch.org/docs/stable/index.html)

> "The question is not whether machines think but whether men do." - B.F. Skinner`,
	metadata: {
		type: 'markdown',
		source: 'test-fixture',
		author: 'Test Author',
		tags: ['machine-learning', 'AI', 'tutorial'],
		difficulty: 'intermediate',
		estimatedReadTime: 10
	},
	createdAt: '2024-01-01T00:00:00Z',
	updatedAt: '2024-01-01T00:00:00Z'
};

export const codeDocument: Document = {
	id: 'doc-code-1',
	title: 'TypeScript Context Engine Implementation',
	content: `/**
 * Context Engine Implementation
 * Advanced RAG system with tri-index memory
 */

import { EventEmitter } from 'events';
import type { Document, Chunk, Atom, GraphNode } from './types.js';

export interface ContextEngineConfig {
	maxTokens: number;
	temperature: number;
	model: string;
	enableGraph: boolean;
	enableRaptor: boolean;
}

export class ContextEngine extends EventEmitter {
	private config: ContextEngineConfig;
	private storage: StorageBackend;
	private retriever: HybridRetriever;
	
	constructor(config: ContextEngineConfig, storage: StorageBackend) {
		super();
		this.config = config;
		this.storage = storage;
		this.retriever = new HybridRetriever(config);
	}
	
	/**
	 * Process a document and extract meaningful information
	 */
	async processDocument(document: Document): Promise<ProcessingResult> {
		try {
			this.emit('processing:start', { documentId: document.id });
			
			// Step 1: Chunk the document
			const chunker = new DocumentChunker({
				maxTokens: this.config.maxTokens,
				overlap: 0.1
			});
			const chunks = await chunker.chunkDocument(document);
			
			// Step 2: Extract atoms from chunks
			const atomExtractor = new AtomExtractor();
			const atoms: Atom[] = [];
			
			for (const chunk of chunks) {
				const chunkAtoms = await atomExtractor.extractAtoms(chunk);
				atoms.push(...chunkAtoms);
			}
			
			// Step 3: Build knowledge graph
			if (this.config.enableGraph) {
				const graphBuilder = new KnowledgeGraphBuilder(this.storage);
				await graphBuilder.buildFromAtoms(atoms);
			}
			
			// Step 4: Generate summaries with RAPTOR
			if (this.config.enableRaptor) {
				const raptorSystem = new RaptorSystem(this.storage);
				await raptorSystem.generateHierarchy(chunks);
			}
			
			this.emit('processing:complete', { 
				documentId: document.id,
				chunksCreated: chunks.length,
				atomsExtracted: atoms.length
			});
			
			return {
				success: true,
				chunks,
				atoms,
				metrics: {
					processingTime: Date.now() - startTime,
					chunksCreated: chunks.length,
					atomsExtracted: atoms.length
				}
			};
			
		} catch (error) {
			this.emit('processing:error', { documentId: document.id, error });
			throw new Error(\`Processing failed: \${error.message}\`);
		}
	}
	
	/**
	 * Query the context engine for relevant information
	 */
	async query(
		query: string, 
		options: QueryOptions = {}
	): Promise<ContextResponse> {
		const startTime = Date.now();
		
		try {
			// Retrieve relevant chunks
			const candidates = await this.retriever.retrieve(query, {
				maxResults: options.maxResults || 20,
				strategy: options.strategy || 'hybrid'
			});
			
			// Rank candidates by usefulness
			const ranker = new UsefulnessRanker();
			const rankedCandidates = await ranker.rank(candidates, query);
			
			// Pack evidence under budget constraints
			const packer = new MaxCoveragePacker();
			const packed = await packer.pack(rankedCandidates, {
				budget: options.budget || 4000,
				mmrLambda: 0.3
			});
			
			// Route to appropriate LLM tier
			const router = new AnswerabilityRouter();
			const proof = await router.computeProof(packed);
			const tier = router.decideTier(proof, options.budget || 4000);
			
			return {
				answer: packed.evidence,
				confidence: proof.confidence,
				tier,
				metrics: {
					queryTime: Date.now() - startTime,
					candidatesRetrieved: candidates.length,
					evidencePacked: packed.evidence.length,
					tokensUsed: packed.tokens
				}
			};
			
		} catch (error) {
			throw new Error(\`Query failed: \${error.message}\`);
		}
	}
}

// Type definitions
interface ProcessingResult {
	success: boolean;
	chunks: Chunk[];
	atoms: Atom[];
	metrics: ProcessingMetrics;
}

interface QueryOptions {
	maxResults?: number;
	strategy?: 'hybrid' | 'graph' | 'tree';
	budget?: number;
}

interface ContextResponse {
	answer: string;
	confidence: number;
	tier: 'none' | 'small' | 'premium';
	metrics: QueryMetrics;
}

interface ProcessingMetrics {
	processingTime: number;
	chunksCreated: number;
	atomsExtracted: number;
}

interface QueryMetrics {
	queryTime: number;
	candidatesRetrieved: number;
	evidencePacked: number;
	tokensUsed: number;
}`,
	metadata: {
		type: 'typescript',
		source: 'test-fixture',
		author: 'Test Developer',
		tags: ['typescript', 'context-engine', 'RAG'],
		complexity: 'high',
		lineCount: 150
	},
	createdAt: '2024-01-02T00:00:00Z',
	updatedAt: '2024-01-02T00:00:00Z'
};

export const jsonDocument: Document = {
	id: 'doc-json-1',
	title: 'Configuration and Data Structures',
	content: `{
  "contextEngine": {
    "version": "1.0.0",
    "description": "Advanced RAG system with tri-index memory",
    "components": {
      "storage": {
        "type": "sqlite",
        "path": "./data/context.db",
        "options": {
          "journalMode": "WAL",
          "synchronous": "NORMAL",
          "cacheSize": 10000
        }
      },
      "retrieval": {
        "bm25Weight": 0.4,
        "denseWeight": 0.6,
        "rrfConstant": 60,
        "strategies": ["hybrid", "graph", "tree"],
        "embeddingModel": "text-embedding-ada-002",
        "embeddingDimensions": 1536
      },
      "ranking": {
        "utilityWeights": {
          "relevance": 0.3,
          "informationGain": 0.25,
          "trust": 0.2,
          "reusability": 0.15,
          "tokenCost": 0.05,
          "conflictRisk": 0.05
        },
        "bubblePasses": 2,
        "learningRate": 0.01
      },
      "packing": {
        "algorithm": "max-coverage",
        "mmrLambda": 0.3,
        "knapsackFallback": true,
        "budgetAllocation": {
          "evidence": 0.8,
          "context": 0.15,
          "metadata": 0.05
        }
      }
    },
    "models": {
      "small": {
        "provider": "openai",
        "model": "gpt-3.5-turbo",
        "maxTokens": 4096,
        "temperature": 0.1,
        "costPer1kTokens": 0.002
      },
      "premium": {
        "provider": "anthropic",
        "model": "claude-3-sonnet",
        "maxTokens": 200000,
        "temperature": 0.1,
        "costPer1kTokens": 0.015
      }
    },
    "performance": {
      "maxConcurrentQueries": 10,
      "cacheSize": 1000,
      "cacheTTL": 3600,
      "timeouts": {
        "query": 30000,
        "retrieval": 10000,
        "ranking": 5000,
        "packing": 5000
      }
    },
    "monitoring": {
      "metrics": {
        "queryLatency": true,
        "retrievalAccuracy": true,
        "rankingQuality": true,
        "packingEfficiency": true,
        "costTracking": true
      },
      "alerts": {
        "highLatency": 5000,
        "lowAccuracy": 0.7,
        "highCost": 1.0
      }
    }
  },
  "testData": {
    "sampleQueries": [
      {
        "id": 1,
        "query": "How does machine learning work?",
        "expectedTopics": ["supervised-learning", "unsupervised-learning", "algorithms"],
        "difficulty": "beginner",
        "expectedResultCount": 10
      },
      {
        "id": 2,
        "query": "What are the latest advances in neural networks?",
        "expectedTopics": ["deep-learning", "transformers", "attention-mechanisms"],
        "difficulty": "advanced",
        "expectedResultCount": 15
      },
      {
        "id": 3,
        "query": "Implement a gradient descent algorithm in Python",
        "expectedTopics": ["optimization", "implementation", "python", "algorithms"],
        "difficulty": "intermediate",
        "expectedResultCount": 8
      }
    ],
    "benchmarkDocuments": [
      {
        "type": "research-paper",
        "domain": "machine-learning",
        "complexity": "high",
        "tokenCount": 15000,
        "expectedChunks": 30,
        "expectedAtoms": 150
      },
      {
        "type": "tutorial",
        "domain": "programming",
        "complexity": "medium",
        "tokenCount": 5000,
        "expectedChunks": 10,
        "expectedAtoms": 75
      },
      {
        "type": "reference",
        "domain": "api-documentation",
        "complexity": "low",
        "tokenCount": 2000,
        "expectedChunks": 5,
        "expectedAtoms": 25
      }
    ]
  }
}`,
	metadata: {
		type: 'json',
		source: 'test-fixture',
		author: 'Test Architect',
		tags: ['configuration', 'json', 'system-design'],
		schemaVersion: '1.0',
		validationStatus: 'valid'
	},
	createdAt: '2024-01-03T00:00:00Z',
	updatedAt: '2024-01-03T00:00:00Z'
};

export const researchPaperDocument: Document = {
	id: 'doc-research-1',
	title: 'Attention Is All You Need - Abstract and Introduction',
	content: `# Attention Is All You Need

## Abstract

The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show that these models are superior in quality while being more parallelizable and requiring significantly less time to train. Our model achieves 28.4 BLEU on the WMT 2014 English-to-German translation task, improving over the existing best results, including ensembles, by over 2 BLEU. On the WMT 2014 English-to-French translation task, our model establishes a new single-model state-of-the-art BLEU score of 41.8 after training for 3.5 days on eight GPUs, a small fraction of the training costs of the best models from the literature. We show that the Transformer generalizes well to other tasks by applying it successfully to English constituency parsing with large and limited training data.

## 1 Introduction

Recurrent neural networks, long short-term memory [13] and gated recurrent [7] neural networks in particular, have been firmly established as state of the art approaches in sequence modeling and transduction problems such as language modeling and machine translation [35, 2, 5]. Numerous efforts have since continued to push the boundaries of recurrent language models and encoder-decoder architectures [38, 24, 15].

Recurrent models typically factor computation along the symbol positions of the input and output sequences. Aligning the positions to steps in computation time, they generate a sequence of hidden states h_t, as a function of the previous hidden state h_{t-1} and the input for position t. This inherently sequential nature precludes parallelization within training examples, which becomes critical at longer sequence lengths, as memory constraints limit batching across examples. Recent work has achieved significant improvements in computational efficiency through factorization tricks [21] and conditional computation [32], while also improving model performance in the latter case. The fundamental constraint of sequential computation, however, remains.

Attention mechanisms have become an integral part of compelling sequence modeling and transduction models in various tasks, allowing modeling of dependencies without regard to their distance in the input or output sequences [2, 19]. In all but a few cases [27], however, such attention mechanisms are used in conjunction with a recurrent network.

In this work we propose the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies between input and output. The Transformer allows for significantly more parallelization and can reach a new state of the art in translation quality after being trained for as little as twelve hours on eight P100 GPUs.

## 2 Background

The goal of reducing sequential computation also forms the foundation of the Extended Neural GPU [16], ByteNet [18] and ConvS2S [9], all of which use convolutional neural networks as the basic building block, computing hidden representations in parallel for all input and output positions. In these models, the number of operations required to relate signals from two arbitrary input or output positions grows in the distance between positions, linearly for ConvS2S and logarithmically for ByteNet. This makes it more difficult to learn dependencies between distant positions [12]. In the Transformer this is reduced to a constant number of operations, albeit at the cost of reduced effective resolution due to averaging attention-weighted positions, an effect we counteract with Multi-Head Attention as described in section 3.2.

Self-attention, sometimes called intra-attention, is an attention mechanism relating different positions of a single sequence in order to compute a representation of the sequence. Self-attention has been used successfully in a variety of tasks including reading comprehension, abstractive summarization, textual entailment and learning task-independent sentence representations [4, 27, 28, 22].

End-to-end memory networks are based on a recurrent attention mechanism instead of sequence-aligned recurrence and have been shown to perform well on simple-language question answering and language modeling tasks [34].`,
	metadata: {
		type: 'research-paper',
		source: 'test-fixture',
		authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar', 'Jakob Uszkoreit'],
		venue: 'NeurIPS 2017',
		citationCount: 50000,
		tags: ['attention', 'transformer', 'neural-networks', 'machine-translation'],
		domain: 'natural-language-processing',
		difficulty: 'advanced'
	},
	createdAt: '2024-01-04T00:00:00Z',
	updatedAt: '2024-01-04T00:00:00Z'
};

export const allTestDocuments: Document[] = [
	markdownDocument,
	codeDocument,
	jsonDocument,
	researchPaperDocument
];

export const testDocumentsByType = {
	markdown: markdownDocument,
	code: codeDocument,
	json: jsonDocument,
	research: researchPaperDocument
};
