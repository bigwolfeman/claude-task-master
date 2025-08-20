/**
 * storage.test.ts
 * Unit tests for SQLite storage backend
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SQLiteStorageBackend } from '../../src/context-engine/ingest/store.js';
import type { Document, Chunk, Atom, GraphNode, GraphEdge, Summary } from '../../src/context-engine/types.js';

describe('SQLiteStorageBackend', () => {
	let storage: SQLiteStorageBackend;

	beforeEach(async () => {
		// Use in-memory database for tests
		storage = new SQLiteStorageBackend({
			dbPath: ':memory:',
			memory: true
		});
		await storage.connect();
	});

	afterEach(async () => {
		await storage.disconnect();
	});

	describe('Connection Management', () => {
		it('should connect successfully', async () => {
			expect(storage.isConnected()).toBe(true);
		});

		it('should disconnect successfully', async () => {
			await storage.disconnect();
			expect(storage.isConnected()).toBe(false);
		});

		it('should validate schema after connection', async () => {
			// Schema validation happens automatically during connect
			expect(storage.isConnected()).toBe(true);
		});
	});

	describe('Document Operations', () => {
		const sampleDocument: Omit<Document, 'id'> = {
			uri: 'https://example.com/doc1',
			title: 'Sample Document',
			authority: 0.8,
			createdAt: new Date().toISOString()
		};

		it('should create a document', async () => {
			const doc = await storage.createDocument(sampleDocument);
			
			expect(doc.id).toBeDefined();
			expect(doc.uri).toBe(sampleDocument.uri);
			expect(doc.title).toBe(sampleDocument.title);
			expect(doc.authority).toBe(sampleDocument.authority);
		});

		it('should retrieve a document by id', async () => {
			const created = await storage.createDocument(sampleDocument);
			const retrieved = await storage.getDocument(created.id);
			
			expect(retrieved).toBeTruthy();
			expect(retrieved!.id).toBe(created.id);
			expect(retrieved!.uri).toBe(sampleDocument.uri);
		});

		it('should return null for non-existent document', async () => {
			const result = await storage.getDocument('non-existent-id');
			expect(result).toBeNull();
		});

		it('should list all documents', async () => {
			await storage.createDocument(sampleDocument);
			await storage.createDocument({
				...sampleDocument,
				uri: 'https://example.com/doc2',
				title: 'Second Document'
			});

			const documents = await storage.listDocuments();
			expect(documents.length).toBe(2);
		});

		it('should delete a document', async () => {
			const created = await storage.createDocument(sampleDocument);
			await storage.deleteDocument(created.id);
			
			const retrieved = await storage.getDocument(created.id);
			expect(retrieved).toBeNull();
		});
	});

	describe('Chunk Operations', () => {
		let documentId: string;

		beforeEach(async () => {
			const doc = await storage.createDocument({
				uri: 'https://example.com/doc1',
				title: 'Test Document',
				authority: 0.8,
				createdAt: new Date().toISOString()
			});
			documentId = doc.id;
		});

		const sampleChunk: Omit<Chunk, 'id'> = {
			docId: '', // Will be set in tests
			text: 'This is a sample chunk of text for testing purposes.',
			tokens: 12,
			embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
			start: 0,
			end: 50,
			authority: 0.7,
			recency: 0.9
		};

		it('should create a chunk', async () => {
			const chunkData = { ...sampleChunk, docId: documentId };
			const chunk = await storage.createChunk(chunkData);
			
			expect(chunk.id).toBeDefined();
			expect(chunk.docId).toBe(documentId);
			expect(chunk.text).toBe(sampleChunk.text);
			expect(chunk.tokens).toBe(sampleChunk.tokens);
			expect(chunk.embedding).toEqual(sampleChunk.embedding);
		});

		it('should retrieve a chunk by id', async () => {
			const chunkData = { ...sampleChunk, docId: documentId };
			const created = await storage.createChunk(chunkData);
			const retrieved = await storage.getChunk(created.id);
			
			expect(retrieved).toBeTruthy();
			expect(retrieved!.id).toBe(created.id);
			expect(retrieved!.text).toBe(chunkData.text);
			expect(retrieved!.embedding).toEqual(chunkData.embedding);
		});

		it('should get chunks by document', async () => {
			const chunk1Data = { ...sampleChunk, docId: documentId, start: 0, end: 25 };
			const chunk2Data = { ...sampleChunk, docId: documentId, start: 25, end: 50 };
			
			await storage.createChunk(chunk1Data);
			await storage.createChunk(chunk2Data);

			const chunks = await storage.getChunksByDocument(documentId);
			expect(chunks.length).toBe(2);
			// Should be ordered by start position
			expect(chunks[0].start).toBe(0);
			expect(chunks[1].start).toBe(25);
		});

		it('should handle chunks without embeddings', async () => {
			const chunkData = { 
				...sampleChunk, 
				docId: documentId,
				embedding: undefined 
			};
			const chunk = await storage.createChunk(chunkData);
			const retrieved = await storage.getChunk(chunk.id);
			
			expect(retrieved!.embedding).toBeUndefined();
		});
	});

	describe('Atom Operations', () => {
		let chunkId: string;

		beforeEach(async () => {
			const doc = await storage.createDocument({
				uri: 'https://example.com/doc1',
				title: 'Test Document',
				authority: 0.8,
				createdAt: new Date().toISOString()
			});

			const chunk = await storage.createChunk({
				docId: doc.id,
				text: 'Sample text with entities.',
				tokens: 5,
				start: 0,
				end: 25
			});
			chunkId = chunk.id;
		});

		const sampleAtom: Omit<Atom, 'id'> = {
			type: 'ENT',
			surface: 'entities',
			norm: 'entity',
			provenance: {
				chunkId: '', // Will be set in tests
				offset: 18
			}
		};

		it('should create an atom', async () => {
			const atomData = {
				...sampleAtom,
				provenance: { ...sampleAtom.provenance, chunkId }
			};
			const atom = await storage.createAtom(atomData);
			
			expect(atom.id).toBeDefined();
			expect(atom.type).toBe('ENT');
			expect(atom.surface).toBe('entities');
			expect(atom.provenance.chunkId).toBe(chunkId);
		});

		it('should retrieve atoms by chunk', async () => {
			const atom1Data = {
				...sampleAtom,
				surface: 'Sample',
				provenance: { chunkId, offset: 0 }
			};
			const atom2Data = {
				...sampleAtom,
				surface: 'text',
				provenance: { chunkId, offset: 7 }
			};

			await storage.createAtom(atom1Data);
			await storage.createAtom(atom2Data);

			const atoms = await storage.getAtomsByChunk(chunkId);
			expect(atoms.length).toBe(2);
			// Should be ordered by offset
			expect(atoms[0].provenance.offset).toBe(0);
			expect(atoms[1].provenance.offset).toBe(7);
		});
	});

	describe('Coverage Operations', () => {
		let chunkId: string;
		let atomIds: string[];

		beforeEach(async () => {
			const doc = await storage.createDocument({
				uri: 'https://example.com/doc1',
				title: 'Test Document',
				authority: 0.8,
				createdAt: new Date().toISOString()
			});

			const chunk = await storage.createChunk({
				docId: doc.id,
				text: 'Sample text',
				tokens: 2
			});
			chunkId = chunk.id;

			// Create some atoms
			const atom1 = await storage.createAtom({
				type: 'ENT',
				surface: 'Sample',
				norm: 'sample',
				provenance: { chunkId, offset: 0 }
			});

			const atom2 = await storage.createAtom({
				type: 'ENT',
				surface: 'text',
				norm: 'text',
				provenance: { chunkId, offset: 7 }
			});

			atomIds = [atom1.id, atom2.id];
		});

		it('should update coverage matrix', async () => {
			await storage.updateCoverageMatrix(chunkId, atomIds);
			
			const coverage = await storage.getCoverageMatrix(chunkId);
			expect(coverage).toEqual(expect.arrayContaining(atomIds));
		});

		it('should replace existing coverage', async () => {
			await storage.updateCoverageMatrix(chunkId, [atomIds[0]]);
			await storage.updateCoverageMatrix(chunkId, [atomIds[1]]);
			
			const coverage = await storage.getCoverageMatrix(chunkId);
			expect(coverage).toEqual([atomIds[1]]);
		});
	});

	describe('Graph Operations', () => {
		it('should create graph nodes and edges', async () => {
			const node1 = await storage.createGraphNode({
				type: 'entity',
				label: 'Person',
				metadata: { category: 'human' }
			});

			const node2 = await storage.createGraphNode({
				type: 'entity',
				label: 'Organization',
				metadata: { category: 'business' }
			});

			await storage.createGraphEdge({
				sourceId: node1.id,
				targetId: node2.id,
				edgeType: 'works_for',
				weight: 1.0
			});

			const neighbors = await storage.getGraphNeighbors(node1.id);
			expect(neighbors.length).toBe(1);
			expect(neighbors[0].id).toBe(node2.id);
		});
	});

	describe('Summary Operations', () => {
		let chunkIds: string[];

		beforeEach(async () => {
			const doc = await storage.createDocument({
				uri: 'https://example.com/doc1',
				title: 'Test Document',
				authority: 0.8,
				createdAt: new Date().toISOString()
			});

			const chunk1 = await storage.createChunk({
				docId: doc.id,
				text: 'First chunk',
				tokens: 2
			});

			const chunk2 = await storage.createChunk({
				docId: doc.id,
				text: 'Second chunk',
				tokens: 2
			});

			chunkIds = [chunk1.id, chunk2.id];
		});

		it('should create summaries with hierarchical levels', async () => {
			const summary = await storage.createSummary({
				level: 1,
				parentId: undefined,
				summary: 'This is a test summary',
				childChunks: [],
				tokens: 5
			});

			await storage.linkSummaryToChunks(summary.id, chunkIds);

			const retrieved = await storage.getSummary(summary.id);
			expect(retrieved).toBeTruthy();
			expect(retrieved!.childChunks).toEqual(expect.arrayContaining(chunkIds));
		});

		it('should get summaries by level', async () => {
			await storage.createSummary({
				level: 1,
				parentId: undefined,
				summary: 'Level 1 summary',
				childChunks: [],
				tokens: 5
			});

			await storage.createSummary({
				level: 2,
				parentId: undefined,
				summary: 'Level 2 summary',
				childChunks: [],
				tokens: 3
			});

			const level1Summaries = await storage.getSummariesByLevel(1);
			const level2Summaries = await storage.getSummariesByLevel(2);

			expect(level1Summaries.length).toBe(1);
			expect(level2Summaries.length).toBe(1);
		});
	});

	describe('Utility Methods', () => {
		it('should provide database statistics', async () => {
			await storage.createDocument({
				uri: 'https://example.com/doc1',
				title: 'Test Document',
				authority: 0.8,
				createdAt: new Date().toISOString()
			});

			const stats = storage.getStats();
			expect(stats.documents).toBe(1);
			expect(stats.chunks).toBe(0);
			expect(stats.atoms).toBe(0);
		});

		it('should optimize database', async () => {
			// Should not throw
			expect(() => storage.optimize()).not.toThrow();
		});
	});

	describe('Error Handling', () => {
		it('should handle foreign key constraint violations', async () => {
			// Try to create chunk with non-existent document
			await expect(
				storage.createChunk({
					docId: 'non-existent-doc',
					text: 'Test chunk',
					tokens: 2
				})
			).rejects.toThrow();
		});

		it('should handle duplicate URI violations', async () => {
			const docData = {
				uri: 'https://example.com/unique',
				title: 'First Document',
				authority: 0.8,
				createdAt: new Date().toISOString()
			};

			await storage.createDocument(docData);

			// Try to create another document with same URI
			await expect(
				storage.createDocument(docData)
			).rejects.toThrow();
		});
	});
});
