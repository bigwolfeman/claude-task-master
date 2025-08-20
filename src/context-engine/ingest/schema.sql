-- Context Engine SQLite Database Schema
-- This file defines the complete database schema for the Context Engine
-- Based on the PRD specifications for tri-index memory system

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- ============================================================================
-- CORE DOCUMENT MANAGEMENT
-- ============================================================================

-- Documents table - stores document metadata
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    uri TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    authority REAL NOT NULL DEFAULT 0.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    metadata TEXT -- JSON blob for additional metadata
);

-- Chunks table - stores text chunks from documents
CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    doc_id TEXT NOT NULL,
    text TEXT NOT NULL,
    tokens INTEGER NOT NULL,
    embedding BLOB, -- Binary vector embedding
    start_pos INTEGER,
    end_pos INTEGER,
    authority REAL,
    recency REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- ============================================================================
-- ATOM EXTRACTION & KNOWLEDGE REPRESENTATION
-- ============================================================================

-- Atoms table - stores extracted semantic atoms
CREATE TABLE IF NOT EXISTS atoms (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('ENT', 'NUM', 'DATE', 'REL')),
    surface TEXT NOT NULL,
    norm TEXT NOT NULL,
    chunk_id TEXT NOT NULL,
    offset INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (chunk_id) REFERENCES chunks(id) ON DELETE CASCADE
);

-- ============================================================================
-- COVERAGE & USEFULNESS TRACKING
-- ============================================================================

-- Coverage matrix - tracks which atoms are covered by which chunks
CREATE TABLE IF NOT EXISTS coverage (
    chunk_id TEXT NOT NULL,
    atom_id TEXT NOT NULL,
    coverage_score REAL NOT NULL DEFAULT 1.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (chunk_id, atom_id),
    FOREIGN KEY (chunk_id) REFERENCES chunks(id) ON DELETE CASCADE,
    FOREIGN KEY (atom_id) REFERENCES atoms(id) ON DELETE CASCADE
);

-- Pairwise comparison signals for usefulness learning
CREATE TABLE IF NOT EXISTS pairwise (
    id TEXT PRIMARY KEY,
    query_id TEXT NOT NULL,
    winner_id TEXT NOT NULL, -- chunk_id of the preferred chunk
    loser_id TEXT NOT NULL,  -- chunk_id of the less preferred chunk
    signal TEXT NOT NULL,    -- Description of the comparison signal
    weight REAL NOT NULL DEFAULT 1.0,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (winner_id) REFERENCES chunks(id) ON DELETE CASCADE,
    FOREIGN KEY (loser_id) REFERENCES chunks(id) ON DELETE CASCADE
);

-- Answer quality metrics for evaluation
CREATE TABLE IF NOT EXISTS answers (
    id TEXT PRIMARY KEY,
    query_id TEXT NOT NULL,
    coverage REAL NOT NULL,
    conflicts INTEGER NOT NULL DEFAULT 0,
    support_style TEXT NOT NULL CHECK (support_style IN ('span', 'paraphrase', 'none')),
    decided_by TEXT NOT NULL,
    tokens_saved INTEGER NOT NULL DEFAULT 0,
    tier_used TEXT NOT NULL CHECK (tier_used IN ('none', 'small', 'premium')),
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- GRAPH KNOWLEDGE REPRESENTATION
-- ============================================================================

-- Graph nodes for knowledge graph representation
CREATE TABLE IF NOT EXISTS graph_nodes (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    label TEXT NOT NULL,
    metadata TEXT, -- JSON blob for node metadata
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Graph edges for relationships between nodes
CREATE TABLE IF NOT EXISTS graph_edges (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    edge_type TEXT NOT NULL,
    weight REAL NOT NULL DEFAULT 1.0,
    metadata TEXT, -- JSON blob for edge metadata
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (source_id) REFERENCES graph_nodes(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES graph_nodes(id) ON DELETE CASCADE
);

-- ============================================================================
-- RAPTOR HIERARCHICAL SUMMARIES
-- ============================================================================

-- Summaries table for RAPTOR hierarchical clustering
CREATE TABLE IF NOT EXISTS summaries (
    id TEXT PRIMARY KEY,
    level INTEGER NOT NULL,
    parent_id TEXT,
    summary TEXT NOT NULL,
    tokens INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES summaries(id) ON DELETE CASCADE
);

-- Summary to chunk relationships (many-to-many)
CREATE TABLE IF NOT EXISTS summary_chunks (
    summary_id TEXT NOT NULL,
    chunk_id TEXT NOT NULL,
    PRIMARY KEY (summary_id, chunk_id),
    FOREIGN KEY (summary_id) REFERENCES summaries(id) ON DELETE CASCADE,
    FOREIGN KEY (chunk_id) REFERENCES chunks(id) ON DELETE CASCADE
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Document indexes
CREATE INDEX IF NOT EXISTS idx_documents_uri ON documents(uri);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

-- Chunk indexes
CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON chunks(doc_id);
CREATE INDEX IF NOT EXISTS idx_chunks_tokens ON chunks(tokens);
CREATE INDEX IF NOT EXISTS idx_chunks_authority ON chunks(authority);
CREATE INDEX IF NOT EXISTS idx_chunks_created_at ON chunks(created_at);

-- Atom indexes
CREATE INDEX IF NOT EXISTS idx_atoms_type ON atoms(type);
CREATE INDEX IF NOT EXISTS idx_atoms_chunk_id ON atoms(chunk_id);
CREATE INDEX IF NOT EXISTS idx_atoms_norm ON atoms(norm);

-- Coverage indexes
CREATE INDEX IF NOT EXISTS idx_coverage_chunk_id ON coverage(chunk_id);
CREATE INDEX IF NOT EXISTS idx_coverage_atom_id ON coverage(atom_id);
CREATE INDEX IF NOT EXISTS idx_coverage_score ON coverage(coverage_score);

-- Pairwise indexes
CREATE INDEX IF NOT EXISTS idx_pairwise_query_id ON pairwise(query_id);
CREATE INDEX IF NOT EXISTS idx_pairwise_winner_id ON pairwise(winner_id);
CREATE INDEX IF NOT EXISTS idx_pairwise_timestamp ON pairwise(timestamp);

-- Answer indexes
CREATE INDEX IF NOT EXISTS idx_answers_query_id ON answers(query_id);
CREATE INDEX IF NOT EXISTS idx_answers_tier_used ON answers(tier_used);
CREATE INDEX IF NOT EXISTS idx_answers_timestamp ON answers(timestamp);

-- Graph indexes
CREATE INDEX IF NOT EXISTS idx_graph_nodes_type ON graph_nodes(type);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_label ON graph_nodes(label);
CREATE INDEX IF NOT EXISTS idx_graph_edges_source_id ON graph_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target_id ON graph_edges(target_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_type ON graph_edges(edge_type);
CREATE INDEX IF NOT EXISTS idx_graph_edges_weight ON graph_edges(weight);

-- Summary indexes
CREATE INDEX IF NOT EXISTS idx_summaries_level ON summaries(level);
CREATE INDEX IF NOT EXISTS idx_summaries_parent_id ON summaries(parent_id);
CREATE INDEX IF NOT EXISTS idx_summary_chunks_summary_id ON summary_chunks(summary_id);
CREATE INDEX IF NOT EXISTS idx_summary_chunks_chunk_id ON summary_chunks(chunk_id);

-- ============================================================================
-- DATABASE METADATA & MIGRATIONS
-- ============================================================================

-- Schema version tracking for migrations
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now')),
    description TEXT
);

-- Insert initial schema version
INSERT OR IGNORE INTO schema_version (version, description) 
VALUES (1, 'Initial Context Engine schema with tri-index memory support');
