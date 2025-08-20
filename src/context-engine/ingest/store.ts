/**
 * store.ts
 * Storage backend interface and SQLite implementation
 * Provides high-performance storage for Context Engine tri-index memory
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { MigrationManager } from './migrations.js';
import type { 
	Document, 
	Chunk, 
	Atom, 
	GraphNode, 
	GraphEdge, 
	Summary,
	PairwiseSignal,
	AnswerMetrics,
	CoverageMatrix
} from '../types.js';

export interface StorageBackend {
	connect(): Promise<void>;
	disconnect(): Promise<void>;
	
	// Document operations
	createDocument(doc: Document): Promise<void>;
	getDocument(docId: string): Promise<Document | null>;
	updateDocument(docId: string, updates: Partial<Document>): Promise<void>;
	deleteDocument(docId: string): Promise<void>;
	getAllDocuments(): Promise<Document[]>;
	
	// Chunk operations
	createChunk(chunk: Chunk): Promise<void>;
	getChunk(chunkId: string): Promise<Chunk | null>;
	updateChunk(chunkId: string, updates: Partial<Chunk>): Promise<void>;
	deleteChunk(chunkId: string): Promise<void>;
	getChunksByDocument(docId: string): Promise<Chunk[]>;
	getAllChunks(): Promise<Chunk[]>;
	
	// Atom operations
	createAtom(atom: Atom): Promise<void>;
	getAtom(atomId: string): Promise<Atom | null>;
	updateAtom(atomId: string, updates: Partial<Atom>): Promise<void>;
	deleteAtom(atomId: string): Promise<void>;
	getAtomsByChunk(chunkId: string): Promise<Atom[]>;
	getAllAtoms(): Promise<Atom[]>;
	
	// Coverage operations
	createCoverage(coverage: CoverageMatrix): Promise<void>;
	getCoverage(id: string): Promise<CoverageMatrix | null>;
	updateCoverage(id: string, updates: Partial<CoverageMatrix>): Promise<void>;
	deleteCoverage(id: string): Promise<void>;
	getAllCoverage(): Promise<CoverageMatrix[]>;
	
	// Pairwise operations
	createPairwiseSignal(signal: PairwiseSignal): Promise<void>;
	getPairwiseSignal(id: string): Promise<PairwiseSignal | null>;
	updatePairwiseSignal(id: string, updates: Partial<PairwiseSignal>): Promise<void>;
	deletePairwiseSignal(id: string): Promise<void>;
	getAllPairwiseSignals(): Promise<PairwiseSignal[]>;
	
	// Answer metrics operations
	createAnswerMetrics(metrics: AnswerMetrics): Promise<void>;
	getAnswerMetrics(id: string): Promise<AnswerMetrics | null>;
	updateAnswerMetrics(id: string, updates: Partial<AnswerMetrics>): Promise<void>;
	deleteAnswerMetrics(id: string): Promise<void>;
	getAllAnswerMetrics(): Promise<AnswerMetrics[]>;
	
	// Graph operations
	createGraphNode(node: GraphNode): Promise<void>;
	getGraphNode(nodeId: string): Promise<GraphNode | null>;
	updateGraphNode(nodeId: string, updates: Partial<GraphNode>): Promise<void>;
	deleteGraphNode(nodeId: string): Promise<void>;
	getAllGraphNodes(): Promise<GraphNode[]>;
	
	createGraphEdge(edge: GraphEdge): Promise<void>;
	getGraphEdge(edgeId: string): Promise<GraphEdge | null>;
	updateGraphEdge(edgeId: string, updates: Partial<GraphEdge>): Promise<void>;
	deleteGraphEdge(edgeId: string): Promise<void>;
	getAllGraphEdges(): Promise<GraphEdge[]>;
	
	// Summary operations
	createSummary(summary: Summary): Promise<void>;
	getSummary(summaryId: string): Promise<Summary | null>;
	updateSummary(summaryId: string, updates: Partial<Summary>): Promise<void>;
	deleteSummary(summaryId: string): Promise<void>;
	getAllSummaries(): Promise<Summary[]>;
	
	// RAPTOR operations
	createCluster(cluster: any): Promise<void>;
	getCluster(clusterId: string): Promise<any | null>;
	updateCluster(clusterId: string, updates: Partial<any>): Promise<void>;
	deleteCluster(clusterId: string): Promise<void>;
	getAllClusters(): Promise<any[]>;
	getClustersByLevel(level: number): Promise<any[]>;
	
	// Migration operations
	runMigrations(): Promise<void>;
	getSchemaVersion(): Promise<number>;
}

export interface SQLiteConfig {
	dbPath: string;
	readonly?: boolean;
	memory?: boolean;
	verbose?: boolean;
}

/**
 * High-performance SQLite storage backend for Context Engine
 * Implements tri-index memory with full CRUD operations
 */
export class SQLiteStorageBackend implements StorageBackend {
	private db: Database.Database | null = null;
	private migrationManager: MigrationManager | null = null;
	private config: SQLiteConfig;
	
	// Prepared statements for performance
	private statements: Record<string, Database.Statement> = {};

	constructor(config: SQLiteConfig) {
		this.config = {
			readonly: false,
			memory: false,
			verbose: false,
			...config
		};
	}

	async connect(): Promise<void> {
		try {
			const dbPath = this.config.memory ? ':memory:' : this.config.dbPath;
			
			this.db = new Database(dbPath, {
				readonly: this.config.readonly,
				verbose: this.config.verbose ? console.log : undefined
			});

			// Enable WAL mode for better concurrency
			if (!this.config.readonly) {
				this.db.exec('PRAGMA journal_mode = WAL');
			}
			
			// Enable foreign key constraints
			this.db.exec('PRAGMA foreign_keys = ON');
			
			// Optimize SQLite settings
			this.db.exec('PRAGMA cache_size = -2000'); // 2MB cache
			this.db.exec('PRAGMA temp_store = memory');
			this.db.exec('PRAGMA mmap_size = 268435456'); // 256MB memory map
			
			// Run migrations
			this.migrationManager = new MigrationManager(this.db);
			if (this.migrationManager.needsMigration()) {
				this.migrationManager.migrate();
			}
			
			// Validate schema
			if (!this.migrationManager.validateSchema()) {
				throw new Error('Database schema validation failed');
			}
			
			// Prepare frequently used statements
			this.prepareStatements();
			
			console.log('✅ SQLite storage backend connected successfully');
		} catch (error) {
			throw new Error(`Failed to connect to SQLite database: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	async disconnect(): Promise<void> {
		if (this.db) {
			// Close database connection
			this.db.close();
			this.db = null;
		}
	}

	/**
	 * Prepare frequently used statements for performance
	 */
	private prepareStatements(): void {
		if (!this.db) throw new Error('Database not connected');

		this.statements = {
			// Document statements
			createDocument: this.db!.prepare(`
				INSERT INTO documents (id, uri, title, content, authority, metadata, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			`),
			getDocument: this.db!.prepare('SELECT * FROM documents WHERE id = ?'),
			updateDocument: this.db!.prepare(`
				UPDATE documents 
				SET uri = ?, title = ?, content = ?, authority = ?, metadata = ?, updated_at = ?
				WHERE id = ?
			`),
			deleteDocument: this.db!.prepare('DELETE FROM documents WHERE id = ?'),
			listDocuments: this.db!.prepare('SELECT * FROM documents ORDER BY created_at DESC'),
			
			// Chunk statements
			createChunk: this.db!.prepare(`
				INSERT INTO chunks (id, doc_id, text, tokens, embedding, metadata, recency, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			`),
			getChunk: this.db!.prepare('SELECT * FROM chunks WHERE id = ?'),
			updateChunk: this.db!.prepare(`
				UPDATE chunks 
				SET text = ?, tokens = ?, embedding = ?, metadata = ?, recency = ?, updated_at = ?
				WHERE id = ?
			`),
			deleteChunk: this.db!.prepare('DELETE FROM chunks WHERE id = ?'),
			getChunksByDocument: this.db!.prepare('SELECT * FROM chunks WHERE doc_id = ? ORDER BY created_at'),
			getAllChunks: this.db!.prepare('SELECT * FROM chunks ORDER BY created_at'),
			
			// Atom statements
			createAtom: this.db!.prepare(`
				INSERT INTO atoms (id, chunk_id, type, text, confidence, metadata, provenance, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			`),
			getAtom: this.db!.prepare('SELECT * FROM atoms WHERE id = ?'),
			updateAtom: this.db!.prepare(`
				UPDATE atoms 
				SET type = ?, text = ?, confidence = ?, metadata = ?, provenance = ?, updated_at = ?
				WHERE id = ?
			`),
			deleteAtom: this.db!.prepare('DELETE FROM atoms WHERE id = ?'),
			getAtomsByChunk: this.db!.prepare('SELECT * FROM atoms WHERE chunk_id = ? ORDER BY created_at'),
			getAllAtoms: this.db!.prepare('SELECT * FROM atoms ORDER BY created_at'),
			
			// Coverage statements
			createCoverage: this.db!.prepare(`
				INSERT INTO coverage (id, chunk_id, atom_ids, coverage_score, metadata, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?)
			`),
			getCoverage: this.db!.prepare('SELECT * FROM coverage WHERE id = ?'),
			updateCoverage: this.db!.prepare(`
				UPDATE coverage 
				SET atom_ids = ?, coverage_score = ?, metadata = ?, updated_at = ?
				WHERE id = ?
			`),
			deleteCoverage: this.db!.prepare('DELETE FROM coverage WHERE id = ?'),
			getAllCoverage: this.db!.prepare('SELECT * FROM coverage ORDER BY created_at'),
			
			// Pairwise statements
			createPairwiseSignal: this.db!.prepare(`
				INSERT INTO pairwise (id, query_id, chunk_id_1, chunk_id_2, signal, weight, metadata, timestamp)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			`),
			getPairwiseSignal: this.db!.prepare('SELECT * FROM pairwise WHERE id = ?'),
			updatePairwiseSignal: this.db!.prepare(`
				UPDATE pairwise 
				SET signal = ?, weight = ?, metadata = ?, timestamp = ?
				WHERE id = ?
			`),
			deletePairwiseSignal: this.db!.prepare('DELETE FROM pairwise WHERE id = ?'),
			getAllPairwiseSignals: this.db!.prepare('SELECT * FROM pairwise ORDER BY timestamp'),
			
			// Answer metrics statements
			createAnswerMetrics: this.db!.prepare(`
				INSERT INTO answers (id, query, answer, relevance_score, accuracy_score, completeness_score, tier_used, metadata, timestamp)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			`),
			getAnswerMetrics: this.db!.prepare('SELECT * FROM answers WHERE id = ?'),
			updateAnswerMetrics: this.db!.prepare(`
				UPDATE answers 
				SET answer = ?, relevance_score = ?, accuracy_score = ?, completeness_score = ?, tier_used = ?, metadata = ?, timestamp = ?
				WHERE id = ?
			`),
			deleteAnswerMetrics: this.db!.prepare('DELETE FROM answers WHERE id = ?'),
			getAllAnswerMetrics: this.db!.prepare('SELECT * FROM answers ORDER BY timestamp'),
			
			// Graph statements
			createGraphNode: this.db!.prepare(`
				INSERT INTO graph_nodes (id, type, label, metadata)
				VALUES (?, ?, ?, ?)
			`),
			getGraphNode: this.db!.prepare('SELECT * FROM graph_nodes WHERE id = ?'),
			updateGraphNode: this.db!.prepare(`
				UPDATE graph_nodes 
				SET type = ?, label = ?, metadata = ?
				WHERE id = ?
			`),
			deleteGraphNode: this.db!.prepare('DELETE FROM graph_nodes WHERE id = ?'),
			getAllGraphNodes: this.db!.prepare('SELECT * FROM graph_nodes ORDER BY id'),
			
			createGraphEdge: this.db!.prepare(`
				INSERT INTO graph_edges (id, source_id, target_id, type, weight, metadata)
				VALUES (?, ?, ?, ?, ?, ?)
			`),
			getGraphEdge: this.db!.prepare('SELECT * FROM graph_edges WHERE id = ?'),
			updateGraphEdge: this.db!.prepare(`
				UPDATE graph_edges 
				SET type = ?, weight = ?, metadata = ?
				WHERE id = ?
			`),
			deleteGraphEdge: this.db!.prepare('DELETE FROM graph_edges WHERE id = ?'),
			getAllGraphEdges: this.db!.prepare('SELECT * FROM graph_edges ORDER BY id'),
			
			// Summary statements
			createSummary: this.db!.prepare(`
				INSERT INTO summaries (id, chunk_ids, text, tokens, metadata, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?)
			`),
			getSummary: this.db!.prepare('SELECT * FROM summaries WHERE id = ?'),
			updateSummary: this.db!.prepare(`
				UPDATE summaries 
				SET chunk_ids = ?, text = ?, tokens = ?, metadata = ?, updated_at = ?
				WHERE id = ?
			`),
			deleteSummary: this.db!.prepare('DELETE FROM summaries WHERE id = ?'),
			getAllSummaries: this.db!.prepare('SELECT * FROM summaries ORDER BY created_at'),
			
			// RAPTOR cluster statements
			createCluster: this.db!.prepare(`
				INSERT INTO clusters (id, level, parent_id, children_ids, centroid, cohesion, separation, size, metadata, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`),
			getCluster: this.db!.prepare('SELECT * FROM clusters WHERE id = ?'),
			updateCluster: this.db!.prepare(`
				UPDATE clusters 
				SET level = ?, parent_id = ?, children_ids = ?, centroid = ?, cohesion = ?, separation = ?, size = ?, metadata = ?, updated_at = ?
				WHERE id = ?
			`),
			deleteCluster: this.db!.prepare('DELETE FROM clusters WHERE id = ?'),
			getAllClusters: this.db!.prepare('SELECT * FROM clusters ORDER BY level, created_at'),
			getClustersByLevel: this.db!.prepare('SELECT * FROM clusters WHERE level = ? ORDER BY created_at'),
		};
	}

	// ============================================================================
	// Document operations
	// ============================================================================

	async createDocument(doc: Document): Promise<void> {
		const id = randomUUID();
		const metadata = JSON.stringify({});
		
		this.statements.createDocument.run(
			id,
			doc.uri,
			doc.title,
			doc.content,
			doc.authority,
			doc.metadata ? JSON.stringify(doc.metadata) : null,
			doc.createdAt || new Date().toISOString(),
			doc.updatedAt || new Date().toISOString()
		);
	}

	async getDocument(docId: string): Promise<Document | null> {
		const row = this.statements.getDocument.get(docId) as any;
		if (!row) return null;
		
		return {
			id: row.id,
			uri: row.uri || `doc://${row.id}`,
			title: row.title,
			content: row.content,
			authority: row.authority || 1,
			metadata: row.metadata ? JSON.parse(row.metadata) : {},
			createdAt: row.created_at,
			updatedAt: row.updated_at
		};
	}

	async updateDocument(docId: string, updates: Partial<Document>): Promise<void> {
		const current = await this.getDocument(docId);
		if (!current) throw new Error(`Document ${docId} not found`);
		
		const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
		
		this.statements.updateDocument.run(
			updated.uri,
			updated.title,
			updated.content,
			updated.authority,
			JSON.stringify(updated.metadata),
			updated.updatedAt,
			docId
		);
	}

	async deleteDocument(docId: string): Promise<void> {
		this.statements.deleteDocument.run(docId);
	}

	async getAllDocuments(): Promise<Document[]> {
		const rows = this.statements.listDocuments.all() as any[];
		return rows.map(row => ({
			id: row.id,
			uri: row.uri || `doc://${row.id}`,
			title: row.title,
			content: row.content,
			authority: row.authority || 1,
			metadata: row.metadata ? JSON.parse(row.metadata) : {},
			createdAt: row.created_at,
			updatedAt: row.updated_at
		}));
	}

	// ============================================================================
	// Chunk operations
	// ============================================================================

	async createChunk(chunk: Chunk): Promise<void> {
		const id = randomUUID();
		const embedding = chunk.embedding ? Buffer.from(new Float32Array(chunk.embedding).buffer) : null;
		const metadata = JSON.stringify(chunk.metadata || {});
		
		this.statements.createChunk.run(
			id,
			chunk.docId,
			chunk.text,
			chunk.tokens,
			embedding,
			metadata,
			chunk.recency || 0,
			chunk.createdAt || new Date().toISOString(),
			chunk.updatedAt || new Date().toISOString()
		);
	}

	async getChunk(chunkId: string): Promise<Chunk | null> {
		const row = this.statements.getChunk.get(chunkId) as any;
		if (!row) return null;
		
		return {
			id: row.id,
			docId: row.doc_id,
			text: row.text,
			tokens: row.tokens,
			embedding: row.embedding ? Array.from(new Float32Array(row.embedding.buffer)) : undefined,
			metadata: row.metadata ? JSON.parse(row.metadata) : {},
			recency: row.recency,
			createdAt: row.created_at,
			updatedAt: row.updated_at
		};
	}

	async updateChunk(chunkId: string, updates: Partial<Chunk>): Promise<void> {
		const current = await this.getChunk(chunkId);
		if (!current) throw new Error(`Chunk ${chunkId} not found`);
		
		const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
		const embedding = updated.embedding ? Buffer.from(new Float32Array(updated.embedding).buffer) : null;
		const metadata = JSON.stringify(updated.metadata);
		
		this.statements.updateChunk.run(
			updated.text,
			updated.tokens,
			embedding,
			metadata,
			updated.recency,
			updated.updatedAt,
			chunkId
		);
	}

	async deleteChunk(chunkId: string): Promise<void> {
		this.statements.deleteChunk.run(chunkId);
	}

	async getChunksByDocument(docId: string): Promise<Chunk[]> {
		const rows = this.statements.getChunksByDocument.all(docId) as any[];
		return rows.map(row => ({
			id: row.id,
			docId: row.doc_id,
			text: row.text,
			tokens: row.tokens,
			embedding: row.embedding ? Array.from(new Float32Array(row.embedding.buffer)) : undefined,
			metadata: row.metadata ? JSON.parse(row.metadata) : {},
			recency: row.recency,
			createdAt: row.created_at,
			updatedAt: row.updated_at
		}));
	}

	async getAllChunks(): Promise<Chunk[]> {
		const rows = this.statements.getAllChunks.all() as any[];
		return rows.map(row => ({
			id: row.id,
			docId: row.doc_id,
			text: row.text,
			tokens: row.tokens,
			embedding: row.embedding ? Array.from(new Float32Array(row.embedding.buffer)) : undefined,
			metadata: row.metadata ? JSON.parse(row.metadata) : {},
			recency: row.recency,
			createdAt: row.created_at,
			updatedAt: row.updated_at
		}));
	}

	// ============================================================================
	// Atom operations
	// ============================================================================

	async createAtom(atom: Atom): Promise<void> {
		const id = randomUUID();
		const metadata = JSON.stringify(atom.metadata || {});
		const provenance = JSON.stringify(atom.provenance);
		
		this.statements.createAtom.run(
			id,
			atom.chunkId,
			atom.type,
			atom.text,
			atom.confidence,
			metadata,
			provenance,
			atom.createdAt || new Date().toISOString(),
			atom.updatedAt || new Date().toISOString()
		);
	}

	async getAtom(atomId: string): Promise<Atom | null> {
		const row = this.statements.getAtom.get(atomId) as any;
		if (!row) return null;
		
		return {
			id: row.id,
			chunkId: row.chunk_id,
			type: row.type,
			text: row.text,
			confidence: row.confidence,
			metadata: row.metadata ? JSON.parse(row.metadata) : {},
			provenance: row.provenance ? JSON.parse(row.provenance) : { offset: 0, length: 0 },
			createdAt: row.created_at,
			updatedAt: row.updated_at
		};
	}

	async updateAtom(atomId: string, updates: Partial<Atom>): Promise<void> {
		const current = await this.getAtom(atomId);
		if (!current) throw new Error(`Atom ${atomId} not found`);
		
		const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
		const metadata = JSON.stringify(updated.metadata);
		const provenance = JSON.stringify(updated.provenance);
		
		this.statements.updateAtom.run(
			updated.type,
			updated.text,
			updated.confidence,
			metadata,
			provenance,
			updated.updatedAt,
			atomId
		);
	}

	async deleteAtom(atomId: string): Promise<void> {
		this.statements.deleteAtom.run(atomId);
	}

	async getAtomsByChunk(chunkId: string): Promise<Atom[]> {
		const rows = this.statements.getAtomsByChunk.all(chunkId) as any[];
		return rows.map(row => ({
			id: row.id,
			chunkId: row.chunk_id,
			type: row.type,
			text: row.text,
			confidence: row.confidence,
			metadata: row.metadata ? JSON.parse(row.metadata) : {},
			provenance: row.provenance ? JSON.parse(row.provenance) : { offset: 0, length: 0 },
			createdAt: row.created_at,
			updatedAt: row.updated_at
		}));
	}

	async getAllAtoms(): Promise<Atom[]> {
		const rows = this.statements.getAllAtoms.all() as any[];
		return rows.map(row => ({
			id: row.id,
			chunkId: row.chunk_id,
			type: row.type,
			text: row.text,
			confidence: row.confidence,
			metadata: row.metadata ? JSON.parse(row.metadata) : {},
			provenance: row.provenance ? JSON.parse(row.provenance) : { offset: 0, length: 0 },
			createdAt: row.created_at,
			updatedAt: row.updated_at
		}));
	}

	// ============================================================================
	// Coverage operations
	// ============================================================================

	async updateCoverageMatrix(chunkId: string, atomIds: string[]): Promise<void> {
		const updateCoverage = this.db!.transaction((chunkId: string, atomIds: string[]) => {
			// Remove existing coverage for this chunk
			this.db!.prepare('DELETE FROM coverage WHERE chunk_id = ?').run(chunkId);
			
			// Add new coverage entries
			for (const atomId of atomIds) {
				this.statements.updateCoverage.run(chunkId, atomId, 1.0);
			}
		});
		
		updateCoverage(chunkId, atomIds);
	}

	async getCoverageMatrix(chunkId: string): Promise<string[]> {
		const results = this.statements.getCoverage.all(chunkId) as Array<{ atom_id: string }>;
		return results.map(row => row.atom_id);
	}

	async createCoverage(coverage: CoverageMatrix): Promise<void> {
		const id = randomUUID();
		const metadata = JSON.stringify(coverage.metadata || {});
		
		this.statements.createCoverage.run(
			id,
			coverage.chunkId,
			coverage.atomIds.join(','),
			coverage.coverageScore,
			metadata,
			coverage.createdAt || new Date().toISOString(),
			coverage.updatedAt || new Date().toISOString()
		);
	}

	async getCoverage(id: string): Promise<CoverageMatrix | null> {
		const row = this.statements.getCoverage.get(id) as any;
		if (!row) return null;
		
		return {
			id: row.id,
			chunkId: row.chunk_id,
			atomIds: row.atom_ids.split(',').filter((id: string) => id.length > 0),
			coverageScore: row.coverage_score,
			metadata: row.metadata ? JSON.parse(row.metadata) : {},
			createdAt: row.created_at,
			updatedAt: row.updated_at
		};
	}

	async updateCoverage(id: string, updates: Partial<CoverageMatrix>): Promise<void> {
		const current = await this.getCoverage(id);
		if (!current) throw new Error(`Coverage ${id} not found`);
		
		const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
		const metadata = JSON.stringify(updated.metadata);
		
		this.statements.updateCoverage.run(
			updated.atomIds.join(','),
			updated.coverageScore,
			metadata,
			updated.updatedAt,
			id
		);
	}

	async deleteCoverage(id: string): Promise<void> {
		this.statements.deleteCoverage.run(id);
	}

	async getAllCoverage(): Promise<CoverageMatrix[]> {
		const rows = this.statements.getAllCoverage.all() as any[];
		return rows.map(row => ({
			id: row.id,
			chunkId: row.chunk_id,
			atomIds: row.atom_ids.split(',').filter((id: string) => id.length > 0),
			coverageScore: row.coverage_score,
			metadata: row.metadata ? JSON.parse(row.metadata) : {},
			createdAt: row.created_at,
			updatedAt: row.updated_at
		}));
	}

	// ============================================================================
	// Pairwise operations
	// ============================================================================

	async createPairwiseSignal(signal: PairwiseSignal): Promise<void> {
		const id = randomUUID();
		const metadata = JSON.stringify(signal.metadata || {});
		
		this.statements.createPairwiseSignal.run(
			id,
			signal.queryId,
			signal.chunkId1,
			signal.chunkId2,
			signal.signal,
			signal.weight,
			metadata,
			signal.timestamp || new Date().toISOString()
		);
	}

	async getPairwiseSignal(id: string): Promise<PairwiseSignal | null> {
		const row = this.statements.getPairwiseSignal.get(id) as any;
		if (!row) return null;
		
		return {
			id: row.id,
			queryId: row.query_id,
			chunkId1: row.chunk_id_1,
			chunkId2: row.chunk_id_2,
			signal: row.signal,
			weight: row.weight,
			metadata: row.metadata ? JSON.parse(row.metadata) : {},
			timestamp: row.timestamp
		};
	}

	async updatePairwiseSignal(id: string, updates: Partial<PairwiseSignal>): Promise<void> {
		const current = await this.getPairwiseSignal(id);
		if (!current) throw new Error(`PairwiseSignal ${id} not found`);
		
		const updated = { ...current, ...updates };
		const metadata = JSON.stringify(updated.metadata);
		
		this.statements.updatePairwiseSignal.run(
			updated.signal,
			updated.weight,
			metadata,
			updated.timestamp,
			id
		);
	}

	async deletePairwiseSignal(id: string): Promise<void> {
		this.statements.deletePairwiseSignal.run(id);
	}

	async getAllPairwiseSignals(): Promise<PairwiseSignal[]> {
		const rows = this.statements.getAllPairwiseSignals.all() as any[];
		return rows.map(row => ({
			id: row.id,
			queryId: row.query_id,
			chunkId1: row.chunk_id_1,
			chunkId2: row.chunk_id_2,
			signal: row.signal,
			weight: row.weight,
			metadata: row.metadata ? JSON.parse(row.metadata) : {},
			timestamp: row.timestamp
		}));
	}

	// ============================================================================
	// Answer metrics operations
	// ============================================================================

	async createAnswerMetrics(metrics: AnswerMetrics): Promise<void> {
		const queryId = randomUUID();
		const metadata = JSON.stringify(metrics.metadata || {});
		
		this.statements.createAnswerMetrics.run(
			queryId,
			metrics.query,
			metrics.answer,
			metrics.relevanceScore,
			metrics.accuracyScore,
			metrics.completenessScore,
			metrics.tierUsed,
			metadata,
			metrics.timestamp || new Date().toISOString()
		);
	}

	async getAnswerMetrics(id: string): Promise<AnswerMetrics | null> {
		const row = this.statements.getAnswerMetrics.get(id) as any;
		if (!row) return null;
		
		return {
			queryId: row.query_id,
			query: row.query,
			answer: row.answer,
			relevanceScore: row.relevance_score,
			accuracyScore: row.accuracy_score,
			completenessScore: row.completeness_score,
			tierUsed: row.tier_used,
			metadata: row.metadata ? JSON.parse(row.metadata) : {},
			timestamp: row.timestamp
		};
	}

	async updateAnswerMetrics(id: string, updates: Partial<AnswerMetrics>): Promise<void> {
		const current = await this.getAnswerMetrics(id);
		if (!current) throw new Error(`AnswerMetrics ${id} not found`);
		
		const updated = { ...current, ...updates };
		const metadata = JSON.stringify(updated.metadata);
		
		this.statements.updateAnswerMetrics.run(
			updated.answer,
			updated.relevanceScore,
			updated.accuracyScore,
			updated.completenessScore,
			updated.tierUsed,
			metadata,
			updated.timestamp,
			id
		);
	}

	async deleteAnswerMetrics(id: string): Promise<void> {
		this.statements.deleteAnswerMetrics.run(id);
	}

	async getAllAnswerMetrics(): Promise<AnswerMetrics[]> {
		const rows = this.statements.getAllAnswerMetrics.all() as any[];
		return rows.map(row => ({
			queryId: row.query_id,
			query: row.query,
			answer: row.answer,
			relevanceScore: row.relevance_score,
			accuracyScore: row.accuracy_score,
			completenessScore: row.completeness_score,
			tierUsed: row.tier_used,
			metadata: row.metadata ? JSON.parse(row.metadata) : {},
			timestamp: row.timestamp
		}));
	}

	// ============================================================================
	// Graph operations
	// ============================================================================

	async createGraphNode(node: GraphNode): Promise<void> {
		const id = randomUUID();
		const metadata = JSON.stringify(node.metadata || {});
		
		this.statements.createGraphNode.run(id, node.type, node.label, metadata);
	}

	async getGraphNode(nodeId: string): Promise<GraphNode | null> {
		const row = this.statements.getGraphNode.get(nodeId) as any;
		if (!row) return null;
		
		return {
			id: row.id,
			type: row.type,
			label: row.label,
			metadata: row.metadata ? JSON.parse(row.metadata) : {}
		};
	}

	async updateGraphNode(nodeId: string, updates: Partial<GraphNode>): Promise<void> {
		const current = await this.getGraphNode(nodeId);
		if (!current) throw new Error(`GraphNode ${nodeId} not found`);
		
		const updated = { ...current, ...updates };
		const metadata = JSON.stringify(updated.metadata);
		
		this.statements.updateGraphNode.run(
			updated.type,
			updated.label,
			metadata,
			nodeId
		);
	}

	async deleteGraphNode(id: string): Promise<void> {
		this.statements.deleteGraphNode.run(id);
	}

	async getAllGraphNodes(): Promise<GraphNode[]> {
		const rows = this.statements.getAllGraphNodes.all() as any[];
		return rows.map(row => ({
			id: row.id,
			type: row.type,
			label: row.label,
			metadata: row.metadata ? JSON.parse(row.metadata) : {}
		}));
	}

	async createGraphEdge(edge: GraphEdge): Promise<void> {
		const id = randomUUID();
		const metadata = JSON.stringify(edge.metadata || {});
		
		this.statements.createGraphEdge.run(
			id,
			edge.sourceId,
			edge.targetId,
			edge.type,
			edge.weight,
			metadata
		);
	}

	async getGraphEdge(edgeId: string): Promise<GraphEdge | null> {
		const row = this.statements.getGraphEdge.get(edgeId) as any;
		if (!row) return null;
		
		return {
			id: row.id,
			sourceId: row.source_id,
			targetId: row.target_id,
			type: row.type,
			weight: row.weight,
			metadata: row.metadata ? JSON.parse(row.metadata) : {}
		};
	}

	async updateGraphEdge(edgeId: string, updates: Partial<GraphEdge>): Promise<void> {
		const current = await this.getGraphEdge(edgeId);
		if (!current) throw new Error(`GraphEdge ${edgeId} not found`);
		
		const updated = { ...current, ...updates };
		const metadata = JSON.stringify(updated.metadata);
		
		this.statements.updateGraphEdge.run(
			updated.type,
			updated.weight,
			metadata,
			edgeId
		);
	}

	async deleteGraphEdge(edgeId: string): Promise<void> {
		this.statements.deleteGraphEdge.run(edgeId);
	}

	async getAllGraphEdges(): Promise<GraphEdge[]> {
		const rows = this.statements.getAllGraphEdges.all() as any[];
		return rows.map(row => ({
			id: row.id,
			sourceId: row.source_id,
			targetId: row.target_id,
			type: row.type,
			weight: row.weight,
			metadata: row.metadata ? JSON.parse(row.metadata) : {}
		}));
	}

	// ============================================================================
	// Summary operations
	// ============================================================================

	async createSummary(summary: Summary): Promise<void> {
		const id = randomUUID();
		const metadata = JSON.stringify(summary.metadata || {});
		
		this.statements.createSummary.run(
			id,
			summary.chunkIds.join(','),
			summary.text,
			summary.tokens,
			metadata,
			summary.createdAt || new Date().toISOString(),
			summary.updatedAt || new Date().toISOString()
		);
	}

	async getSummary(summaryId: string): Promise<Summary | null> {
		const row = this.statements.getSummary.get(summaryId) as any;
		if (!row) return null;
		
		return {
			id: row.id,
			chunkIds: row.chunk_ids.split(',').filter((id: string) => id.length > 0),
			text: row.text,
			tokens: row.tokens,
			metadata: row.metadata ? JSON.parse(row.metadata) : {},
			createdAt: row.created_at,
			updatedAt: row.updated_at
		};
	}

	async updateSummary(summaryId: string, updates: Partial<Summary>): Promise<void> {
		const current = await this.getSummary(summaryId);
		if (!current) throw new Error(`Summary ${summaryId} not found`);
		
		const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
		const metadata = JSON.stringify(updated.metadata);
		
		this.statements.updateSummary.run(
			updated.chunkIds.join(','),
			updated.text,
			updated.tokens,
			metadata,
			updated.updatedAt,
			summaryId
		);
	}

	async deleteSummary(id: string): Promise<void> {
		this.statements.deleteSummary.run(id);
	}

	async getAllSummaries(): Promise<Summary[]> {
		const rows = this.statements.getAllSummaries.all() as any[];
		return rows.map(row => ({
			id: row.id,
			chunkIds: row.chunk_ids.split(',').filter((id: string) => id.length > 0),
			text: row.text,
			tokens: row.tokens,
			metadata: row.metadata ? JSON.parse(row.metadata) : {},
			createdAt: row.created_at,
			updatedAt: row.updated_at
		}));
	}

	// ============================================================================
	// RAPTOR operations
	// ============================================================================

	async createCluster(cluster: any): Promise<void> {
		const id = randomUUID();
		const metadata = JSON.stringify(cluster.metadata || {});
		const centroid = cluster.centroid ? Buffer.from(new Float32Array(cluster.centroid).buffer) : null;
		
		this.statements.createCluster.run(
			id,
			cluster.level,
			cluster.parentId || null,
			cluster.childrenIds.join(','),
			centroid,
			cluster.metadata.cohesion,
			cluster.metadata.separation,
			cluster.metadata.size,
			metadata,
			cluster.metadata.createdAt,
			cluster.metadata.updatedAt
		);
	}

	async getCluster(clusterId: string): Promise<any | null> {
		const row = this.statements.getCluster.get(clusterId) as any;
		if (!row) return null;
		
		return {
			id: row.id,
			level: row.level,
			parentId: row.parent_id,
			childrenIds: row.children_ids.split(',').filter((id: string) => id.length > 0),
			centroid: row.centroid ? new Float32Array(row.centroid.buffer) : [],
			metadata: {
				cohesion: row.cohesion,
				separation: row.separation,
				size: row.size,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
				...JSON.parse(row.metadata || '{}')
			}
		};
	}

	async updateCluster(clusterId: string, updates: Partial<any>): Promise<void> {
		const current = await this.getCluster(clusterId);
		if (!current) throw new Error(`Cluster ${clusterId} not found`);
		
		const updated = { ...current, ...updates, metadata: { ...current.metadata, updatedAt: new Date().toISOString() } };
		const metadata = JSON.stringify(updated.metadata);
		const centroid = updated.centroid ? Buffer.from(new Float32Array(updated.centroid).buffer) : null;
		
		this.statements.updateCluster.run(
			updated.level,
			updated.parentId,
			updated.childrenIds.join(','),
			centroid,
			updated.metadata.cohesion,
			updated.metadata.separation,
			updated.metadata.size,
			metadata,
			updated.metadata.updatedAt,
			clusterId
		);
	}

	async deleteCluster(clusterId: string): Promise<void> {
		this.statements.deleteCluster.run(clusterId);
	}

	async getAllClusters(): Promise<any[]> {
		const rows = this.statements.getAllClusters.all() as any[];
		return rows.map(row => ({
			id: row.id,
			level: row.level,
			parentId: row.parent_id,
			childrenIds: row.children_ids.split(',').filter((id: string) => id.length > 0),
			centroid: row.centroid ? new Float32Array(row.centroid.buffer) : [],
			metadata: {
				cohesion: row.cohesion,
				separation: row.separation,
				size: row.size,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
				...JSON.parse(row.metadata || '{}')
			}
		}));
	}

	async getClustersByLevel(level: number): Promise<any[]> {
		const rows = this.statements.getClustersByLevel.all(level) as any[];
		return rows.map(row => ({
			id: row.id,
			level: row.level,
			parentId: row.parent_id,
			childrenIds: row.children_ids.split(',').filter((id: string) => id.length > 0),
			centroid: row.centroid ? new Float32Array(row.centroid.buffer) : [],
			metadata: {
				cohesion: row.cohesion,
				separation: row.separation,
				size: row.size,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
				...JSON.parse(row.metadata || '{}')
			}
		}));
	}

	// ============================================================================
	// Migration operations
	// ============================================================================

	async runMigrations(): Promise<void> {
		if (this.migrationManager) {
			this.migrationManager.migrate();
		}
	}

	async getSchemaVersion(): Promise<number> {
		if (this.migrationManager) {
			return await this.migrationManager.getCurrentVersion();
		}
		return 0;
	}

	// ============================================================================
	// UTILITY METHODS
	// ============================================================================

	/**
	 * Get database statistics
	 */
	getStats(): Record<string, number> {
		if (!this.db) throw new Error('Database not connected');
		
		const stats: Record<string, number> = {};
		const tables = ['documents', 'chunks', 'atoms', 'coverage', 'pairwise', 'answers', 'graph_nodes', 'graph_edges', 'summaries'];
		
		for (const table of tables) {
			const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
			stats[table] = result.count;
		}
		
		return stats;
	}

	/**
	 * Optimize database performance
	 */
	optimize(): void {
		if (this.migrationManager) {
			this.migrationManager.optimize();
		}
	}

	/**
	 * Check if database is connected
	 */
	isConnected(): boolean {
		return this.db !== null;
	}
}
