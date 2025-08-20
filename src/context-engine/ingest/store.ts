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
	createDocument(doc: Omit<Document, 'id'>): Promise<Document>;
	getDocument(id: string): Promise<Document | null>;
	listDocuments(): Promise<Document[]>;
	deleteDocument(id: string): Promise<void>;
	
	// Chunk operations
	createChunk(chunk: Omit<Chunk, 'id'>): Promise<Chunk>;
	getChunk(id: string): Promise<Chunk | null>;
	getChunksByDocument(docId: string): Promise<Chunk[]>;
	deleteChunk(id: string): Promise<void>;
	
	// Atom operations
	createAtom(atom: Omit<Atom, 'id'>): Promise<Atom>;
	getAtom(id: string): Promise<Atom | null>;
	getAtomsByChunk(chunkId: string): Promise<Atom[]>;
	deleteAtom(id: string): Promise<void>;
	
	// Graph operations
	createGraphNode(node: Omit<GraphNode, 'id'>): Promise<GraphNode>;
	createGraphEdge(edge: GraphEdge): Promise<void>;
	getGraphNeighbors(nodeId: string): Promise<GraphNode[]>;
	deleteGraphNode(id: string): Promise<void>;
	deleteGraphEdge(sourceId: string, targetId: string): Promise<void>;
	
	// Summary operations
	createSummary(summary: Omit<Summary, 'id'>): Promise<Summary>;
	getSummary(id: string): Promise<Summary | null>;
	getSummariesByLevel(level: number): Promise<Summary[]>;
	linkSummaryToChunks(summaryId: string, chunkIds: string[]): Promise<void>;
	deleteSummary(id: string): Promise<void>;
	
	// Coverage operations
	updateCoverageMatrix(chunkId: string, atomIds: string[]): Promise<void>;
	getCoverageMatrix(chunkId: string): Promise<string[]>;
	
	// Pairwise learning operations
	createPairwiseSignal(signal: Omit<PairwiseSignal, 'id'>): Promise<PairwiseSignal>;
	getPairwiseSignalsByQuery(queryId: string): Promise<PairwiseSignal[]>;
	
	// Answer metrics operations
	createAnswerMetrics(metrics: Omit<AnswerMetrics, 'queryId'>): Promise<AnswerMetrics>;
	getAnswerMetrics(queryId: string): Promise<AnswerMetrics | null>;
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
			// Finalize all prepared statements
			for (const statement of Object.values(this.statements)) {
				statement.finalize();
			}
			this.statements = {};
			
			// Close database connection
			this.db.close();
			this.db = null;
			this.migrationManager = null;
			
			console.log('✅ SQLite storage backend disconnected');
		}
	}

	/**
	 * Prepare frequently used statements for performance
	 */
	private prepareStatements(): void {
		if (!this.db) throw new Error('Database not connected');

		// Document statements
		this.statements.createDocument = this.db.prepare(`
			INSERT INTO documents (id, uri, title, authority, metadata)
			VALUES (?, ?, ?, ?, ?)
		`);
		
		this.statements.getDocument = this.db.prepare(`
			SELECT * FROM documents WHERE id = ?
		`);
		
		this.statements.listDocuments = this.db.prepare(`
			SELECT * FROM documents ORDER BY created_at DESC
		`);
		
		this.statements.deleteDocument = this.db.prepare(`
			DELETE FROM documents WHERE id = ?
		`);

		// Chunk statements
		this.statements.createChunk = this.db.prepare(`
			INSERT INTO chunks (id, doc_id, text, tokens, embedding, start_pos, end_pos, authority, recency)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);
		
		this.statements.getChunk = this.db.prepare(`
			SELECT * FROM chunks WHERE id = ?
		`);
		
		this.statements.getChunksByDocument = this.db.prepare(`
			SELECT * FROM chunks WHERE doc_id = ? ORDER BY start_pos ASC
		`);
		
		this.statements.deleteChunk = this.db.prepare(`
			DELETE FROM chunks WHERE id = ?
		`);

		// Atom statements
		this.statements.createAtom = this.db.prepare(`
			INSERT INTO atoms (id, type, surface, norm, chunk_id, offset)
			VALUES (?, ?, ?, ?, ?, ?)
		`);
		
		this.statements.getAtom = this.db.prepare(`
			SELECT * FROM atoms WHERE id = ?
		`);
		
		this.statements.getAtomsByChunk = this.db.prepare(`
			SELECT * FROM atoms WHERE chunk_id = ? ORDER BY offset ASC
		`);
		
		this.statements.deleteAtom = this.db.prepare(`
			DELETE FROM atoms WHERE id = ?
		`);

		// Coverage statements
		this.statements.updateCoverage = this.db.prepare(`
			INSERT OR REPLACE INTO coverage (chunk_id, atom_id, coverage_score)
			VALUES (?, ?, ?)
		`);
		
		this.statements.getCoverage = this.db.prepare(`
			SELECT atom_id FROM coverage WHERE chunk_id = ?
		`);

		// Graph statements
		this.statements.createGraphNode = this.db.prepare(`
			INSERT INTO graph_nodes (id, type, label, metadata)
			VALUES (?, ?, ?, ?)
		`);
		
		this.statements.createGraphEdge = this.db.prepare(`
			INSERT INTO graph_edges (id, source_id, target_id, edge_type, weight, metadata)
			VALUES (?, ?, ?, ?, ?, ?)
		`);
		
		this.statements.getGraphNeighbors = this.db.prepare(`
			SELECT gn.* FROM graph_nodes gn
			JOIN graph_edges ge ON (ge.target_id = gn.id AND ge.source_id = ?)
			   OR (ge.source_id = gn.id AND ge.target_id = ?)
		`);

		// Summary statements
		this.statements.createSummary = this.db.prepare(`
			INSERT INTO summaries (id, level, parent_id, summary, tokens)
			VALUES (?, ?, ?, ?, ?)
		`);
		
		this.statements.getSummary = this.db.prepare(`
			SELECT * FROM summaries WHERE id = ?
		`);
		
		this.statements.getSummariesByLevel = this.db.prepare(`
			SELECT * FROM summaries WHERE level = ? ORDER BY created_at DESC
		`);
		
		this.statements.linkSummaryToChunk = this.db.prepare(`
			INSERT OR IGNORE INTO summary_chunks (summary_id, chunk_id)
			VALUES (?, ?)
		`);

		// Pairwise statements
		this.statements.createPairwise = this.db.prepare(`
			INSERT INTO pairwise (id, query_id, winner_id, loser_id, signal, weight)
			VALUES (?, ?, ?, ?, ?, ?)
		`);
		
		this.statements.getPairwiseByQuery = this.db.prepare(`
			SELECT * FROM pairwise WHERE query_id = ? ORDER BY timestamp DESC
		`);

		// Answer metrics statements
		this.statements.createAnswerMetrics = this.db.prepare(`
			INSERT INTO answers (id, query_id, coverage, conflicts, support_style, decided_by, tokens_saved, tier_used)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`);
		
		this.statements.getAnswerMetrics = this.db.prepare(`
			SELECT * FROM answers WHERE query_id = ?
		`);
	}

	// ============================================================================
	// DOCUMENT OPERATIONS
	// ============================================================================

	async createDocument(doc: Omit<Document, 'id'>): Promise<Document> {
		const id = randomUUID();
		const metadata = JSON.stringify({});
		
		this.statements.createDocument.run(
			id,
			doc.uri,
			doc.title,
			doc.authority,
			metadata
		);
		
		return {
			id,
			...doc,
			createdAt: new Date().toISOString()
		};
	}

	async getDocument(id: string): Promise<Document | null> {
		const result = this.statements.getDocument.get(id) as any;
		if (!result) return null;
		
		return {
			id: result.id,
			uri: result.uri,
			title: result.title,
			authority: result.authority,
			createdAt: result.created_at
		};
	}

	async listDocuments(): Promise<Document[]> {
		const results = this.statements.listDocuments.all() as any[];
		return results.map(row => ({
			id: row.id,
			uri: row.uri,
			title: row.title,
			authority: row.authority,
			createdAt: row.created_at
		}));
	}

	async deleteDocument(id: string): Promise<void> {
		this.statements.deleteDocument.run(id);
	}

	// ============================================================================
	// CHUNK OPERATIONS
	// ============================================================================

	async createChunk(chunk: Omit<Chunk, 'id'>): Promise<Chunk> {
		const id = randomUUID();
		const embedding = chunk.embedding ? Buffer.from(new Float32Array(chunk.embedding).buffer) : null;
		
		this.statements.createChunk.run(
			id,
			chunk.docId,
			chunk.text,
			chunk.tokens,
			embedding,
			chunk.start,
			chunk.end,
			chunk.authority,
			chunk.recency
		);
		
		return { id, ...chunk };
	}

	async getChunk(id: string): Promise<Chunk | null> {
		const result = this.statements.getChunk.get(id) as any;
		if (!result) return null;
		
		// Convert embedding buffer back to number array
		let embedding: number[] | undefined;
		if (result.embedding) {
			const buffer = result.embedding as Buffer;
			embedding = Array.from(new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4));
		}
		
		return {
			id: result.id,
			docId: result.doc_id,
			text: result.text,
			tokens: result.tokens,
			embedding,
			start: result.start_pos,
			end: result.end_pos,
			authority: result.authority,
			recency: result.recency
		};
	}

	async getChunksByDocument(docId: string): Promise<Chunk[]> {
		const results = this.statements.getChunksByDocument.all(docId) as any[];
		return results.map(row => {
			let embedding: number[] | undefined;
			if (row.embedding) {
				const buffer = row.embedding as Buffer;
				embedding = Array.from(new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4));
			}
			
			return {
				id: row.id,
				docId: row.doc_id,
				text: row.text,
				tokens: row.tokens,
				embedding,
				start: row.start_pos,
				end: row.end_pos,
				authority: row.authority,
				recency: row.recency
			};
		});
	}

	async deleteChunk(id: string): Promise<void> {
		this.statements.deleteChunk.run(id);
	}

	// ============================================================================
	// ATOM OPERATIONS
	// ============================================================================

	async createAtom(atom: Omit<Atom, 'id'>): Promise<Atom> {
		const id = randomUUID();
		
		this.statements.createAtom.run(
			id,
			atom.type,
			atom.surface,
			atom.norm,
			atom.provenance.chunkId,
			atom.provenance.offset
		);
		
		return { id, ...atom };
	}

	async getAtom(id: string): Promise<Atom | null> {
		const result = this.statements.getAtom.get(id) as any;
		if (!result) return null;
		
		return {
			id: result.id,
			type: result.type,
			surface: result.surface,
			norm: result.norm,
			provenance: {
				chunkId: result.chunk_id,
				offset: result.offset
			}
		};
	}

	async getAtomsByChunk(chunkId: string): Promise<Atom[]> {
		const results = this.statements.getAtomsByChunk.all(chunkId) as any[];
		return results.map(row => ({
			id: row.id,
			type: row.type,
			surface: row.surface,
			norm: row.norm,
			provenance: {
				chunkId: row.chunk_id,
				offset: row.offset
			}
		}));
	}

	async deleteAtom(id: string): Promise<void> {
		this.statements.deleteAtom.run(id);
	}

	// ============================================================================
	// COVERAGE OPERATIONS
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

	// ============================================================================
	// GRAPH OPERATIONS
	// ============================================================================

	async createGraphNode(node: Omit<GraphNode, 'id'>): Promise<GraphNode> {
		const id = randomUUID();
		const metadata = JSON.stringify(node.metadata || {});
		
		this.statements.createGraphNode.run(id, node.type, node.label, metadata);
		
		return { id, ...node };
	}

	async createGraphEdge(edge: GraphEdge): Promise<void> {
		const id = randomUUID();
		const metadata = JSON.stringify({});
		
		this.statements.createGraphEdge.run(
			id,
			edge.sourceId,
			edge.targetId,
			edge.edgeType,
			edge.weight,
			metadata
		);
	}

	async getGraphNeighbors(nodeId: string): Promise<GraphNode[]> {
		const results = this.statements.getGraphNeighbors.all(nodeId, nodeId) as any[];
		return results.map(row => ({
			id: row.id,
			type: row.type,
			label: row.label,
			metadata: JSON.parse(row.metadata || '{}')
		}));
	}

	async deleteGraphNode(id: string): Promise<void> {
		this.db!.prepare('DELETE FROM graph_nodes WHERE id = ?').run(id);
	}

	async deleteGraphEdge(sourceId: string, targetId: string): Promise<void> {
		this.db!.prepare('DELETE FROM graph_edges WHERE source_id = ? AND target_id = ?').run(sourceId, targetId);
	}

	// ============================================================================
	// SUMMARY OPERATIONS
	// ============================================================================

	async createSummary(summary: Omit<Summary, 'id'>): Promise<Summary> {
		const id = randomUUID();
		
		this.statements.createSummary.run(
			id,
			summary.level,
			summary.parentId,
			summary.summary,
			summary.tokens
		);
		
		return { id, ...summary };
	}

	async getSummary(id: string): Promise<Summary | null> {
		const result = this.statements.getSummary.get(id) as any;
		if (!result) return null;
		
		// Get child chunks
		const childChunks = this.db!
			.prepare('SELECT chunk_id FROM summary_chunks WHERE summary_id = ?')
			.all(id) as Array<{ chunk_id: string }>;
		
		return {
			id: result.id,
			level: result.level,
			parentId: result.parent_id,
			summary: result.summary,
			childChunks: childChunks.map(row => row.chunk_id),
			tokens: result.tokens
		};
	}

	async getSummariesByLevel(level: number): Promise<Summary[]> {
		const results = this.statements.getSummariesByLevel.all(level) as any[];
		return Promise.all(results.map(async row => {
			const childChunks = this.db!
				.prepare('SELECT chunk_id FROM summary_chunks WHERE summary_id = ?')
				.all(row.id) as Array<{ chunk_id: string }>;
			
			return {
				id: row.id,
				level: row.level,
				parentId: row.parent_id,
				summary: row.summary,
				childChunks: childChunks.map(chunk => chunk.chunk_id),
				tokens: row.tokens
			};
		}));
	}

	async linkSummaryToChunks(summaryId: string, chunkIds: string[]): Promise<void> {
		const linkChunks = this.db!.transaction((summaryId: string, chunkIds: string[]) => {
			for (const chunkId of chunkIds) {
				this.statements.linkSummaryToChunk.run(summaryId, chunkId);
			}
		});
		
		linkChunks(summaryId, chunkIds);
	}

	async deleteSummary(id: string): Promise<void> {
		this.db!.prepare('DELETE FROM summaries WHERE id = ?').run(id);
	}

	// ============================================================================
	// PAIRWISE LEARNING OPERATIONS
	// ============================================================================

	async createPairwiseSignal(signal: Omit<PairwiseSignal, 'id'>): Promise<PairwiseSignal> {
		const id = randomUUID();
		
		this.statements.createPairwise.run(
			id,
			signal.queryId,
			signal.winnerId,
			signal.loserId,
			signal.signal,
			signal.weight
		);
		
		return { 
			id, 
			...signal, 
			timestamp: new Date().toISOString() 
		};
	}

	async getPairwiseSignalsByQuery(queryId: string): Promise<PairwiseSignal[]> {
		const results = this.statements.getPairwiseByQuery.all(queryId) as any[];
		return results.map(row => ({
			queryId: row.query_id,
			winnerId: row.winner_id,
			loserId: row.loser_id,
			signal: row.signal,
			weight: row.weight,
			timestamp: row.timestamp
		}));
	}

	// ============================================================================
	// ANSWER METRICS OPERATIONS
	// ============================================================================

	async createAnswerMetrics(metrics: Omit<AnswerMetrics, 'queryId'>): Promise<AnswerMetrics> {
		const queryId = randomUUID();
		
		this.statements.createAnswerMetrics.run(
			randomUUID(), // id
			queryId,
			metrics.coverage,
			metrics.conflicts,
			metrics.supportStyle,
			metrics.decidedBy,
			metrics.tokensSaved,
			metrics.tierUsed
		);
		
		return { queryId, ...metrics };
	}

	async getAnswerMetrics(queryId: string): Promise<AnswerMetrics | null> {
		const result = this.statements.getAnswerMetrics.get(queryId) as any;
		if (!result) return null;
		
		return {
			queryId: result.query_id,
			coverage: result.coverage,
			conflicts: result.conflicts,
			supportStyle: result.support_style,
			decidedBy: result.decided_by,
			tokensSaved: result.tokens_saved,
			tierUsed: result.tier_used
		};
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
