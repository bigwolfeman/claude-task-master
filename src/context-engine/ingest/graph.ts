/**
 * graph.ts
 * Knowledge Graph Construction and Relationship Detection
 * Implements intelligent relationship detection and classification for building knowledge graphs
 */

import type { Atom, GraphNode, GraphEdge, Chunk } from '../types.js';
import type { StorageBackend } from './store.js';

export interface RelationshipDetectionOptions {
	enableSemanticAnalysis: boolean;
	enablePatternMatching: boolean;
	enableCooccurrenceAnalysis: boolean;
	enableTemporalAnalysis: boolean;
	minConfidence: number;
	maxRelationshipsPerChunk: number;
	relationshipTypes: string[];
}

export interface DetectedRelationship {
	sourceId: string;
	targetId: string;
	relationshipType: string;
	confidence: number;
	evidence: string[];
	metadata: {
		detectionMethod: string;
		context: string;
		temporalContext?: string;
		strength: number;
		[key: string]: unknown;
	};
}

export interface RelationshipClassification {
	relationshipType: string;
	subtype?: string;
	confidence: number;
	properties: Record<string, unknown>;
	validationRules: string[];
}

export class KnowledgeGraphBuilder {
	constructor(
		private storage: StorageBackend,
		private options: RelationshipDetectionOptions = {
			enableSemanticAnalysis: true,
			enablePatternMatching: true,
			enableCooccurrenceAnalysis: true,
			enableTemporalAnalysis: true,
			minConfidence: 0.6,
			maxRelationshipsPerChunk: 20,
			relationshipTypes: ['is_a', 'part_of', 'located_in', 'works_for', 'created_by', 'related_to']
		}
	) {}

	/**
	 * Build knowledge graph from extracted atoms
	 */
	async buildKnowledgeGraph(atoms: Atom[], chunks: Chunk[]): Promise<{
		nodes: GraphNode[];
		edges: GraphEdge[];
		relationships: DetectedRelationship[];
	}> {
		const nodes: GraphNode[] = [];
		const edges: GraphEdge[] = [];
		const relationships: DetectedRelationship[] = [];

		try {
			// Create graph nodes from atoms
			const graphNodes = await this.createGraphNodes(atoms);
			nodes.push(...graphNodes);

			// Detect relationships between atoms
			const detectedRelationships = await this.detectRelationships(atoms, chunks);
			relationships.push(...detectedRelationships);

			// Create graph edges from relationships
			const graphEdges = await this.createGraphEdges(detectedRelationships);
			edges.push(...graphEdges);

			// Store graph structure
			await this.storeGraphStructure(nodes, edges);

			return { nodes, edges, relationships };
		} catch (error) {
			console.error('Error building knowledge graph:', error);
			return { nodes, edges, relationships };
		}
	}

	/**
	 * Create graph nodes from extracted atoms
	 */
	private async createGraphNodes(atoms: Atom[]): Promise<GraphNode[]> {
		const nodes: GraphNode[] = [];

		for (const atom of atoms) {
			const node: GraphNode = {
				id: atom.id,
				type: this.mapAtomTypeToNodeType(atom.type),
				label: atom.text,
				metadata: {
					...atom.metadata,
					confidence: atom.confidence,
					chunkId: atom.chunkId,
					provenance: atom.provenance,
					createdAt: atom.createdAt,
					updatedAt: atom.updatedAt
				}
			};

			nodes.push(node);
		}

		return nodes;
	}

	/**
	 * Map atom types to graph node types
	 */
	private mapAtomTypeToNodeType(atomType: string): string {
		switch (atomType) {
			case 'ENT':
				return 'entity';
			case 'NUM':
				return 'number';
			case 'DATE':
				return 'date';
			case 'REL':
				return 'relationship';
			default:
				return 'unknown';
		}
	}

	/**
	 * Detect relationships between atoms using multiple strategies
	 */
	private async detectRelationships(atoms: Atom[], chunks: Chunk[]): Promise<DetectedRelationship[]> {
		const relationships: DetectedRelationship[] = [];

		// Pattern-based relationship detection
		if (this.options.enablePatternMatching) {
			const patternRelationships = this.detectPatternBasedRelationships(atoms, chunks);
			relationships.push(...patternRelationships);
		}

		// Co-occurrence analysis
		if (this.options.enableCooccurrenceAnalysis) {
			const cooccurrenceRelationships = this.detectCooccurrenceRelationships(atoms, chunks);
			relationships.push(...cooccurrenceRelationships);
		}

		// Semantic analysis
		if (this.options.enableSemanticAnalysis) {
			const semanticRelationships = this.detectSemanticRelationships(atoms, chunks);
			relationships.push(...semanticRelationships);
		}

		// Temporal analysis
		if (this.options.enableTemporalAnalysis) {
			const temporalRelationships = this.detectTemporalRelationships(atoms, chunks);
			relationships.push(...temporalRelationships);
		}

		// Filter by confidence and limit relationships
		const filteredRelationships = relationships
			.filter(rel => rel.confidence >= this.options.minConfidence)
			.slice(0, this.options.maxRelationshipsPerChunk);

		return filteredRelationships;
	}

	/**
	 * Detect relationships using pattern matching
	 */
	private detectPatternBasedRelationships(atoms: Atom[], chunks: Chunk[]): DetectedRelationship[] {
		const relationships: DetectedRelationship[] = [];

		// Find atoms in the same chunk
		const chunkAtoms = new Map<string, Atom[]>();
		atoms.forEach(atom => {
			if (!chunkAtoms.has(atom.chunkId)) {
				chunkAtoms.set(atom.chunkId, []);
			}
			chunkAtoms.get(atom.chunkId)!.push(atom);
		});

		// Analyze relationships within each chunk
		for (const [chunkId, chunkAtomList] of chunkAtoms) {
			if (chunkAtomList.length < 2) continue;

			// Find the chunk text for context analysis
			const chunk = chunks.find(c => c.id === chunkId);
			if (!chunk) continue;

			// Analyze relationships between atoms in the same chunk
			for (let i = 0; i < chunkAtomList.length; i++) {
				for (let j = i + 1; j < chunkAtomList.length; j++) {
					const atom1 = chunkAtomList[i];
					const atom2 = chunkAtomList[j];

					// Check for hierarchical relationships
					const hierarchicalRel = this.detectHierarchicalRelationship(atom1, atom2, chunk);
					if (hierarchicalRel) {
						relationships.push(hierarchicalRel);
					}

					// Check for spatial relationships
					const spatialRel = this.detectSpatialRelationship(atom1, atom2, chunk);
					if (spatialRel) {
						relationships.push(spatialRel);
					}

					// Check for functional relationships
					const functionalRel = this.detectFunctionalRelationship(atom1, atom2, chunk);
					if (functionalRel) {
						relationships.push(functionalRel);
					}
				}
			}
		}

		return relationships;
	}

	/**
	 * Detect hierarchical relationships (is_a, part_of, etc.)
	 */
	private detectHierarchicalRelationship(atom1: Atom, atom2: Atom, chunk: Chunk): DetectedRelationship | null {
		const text = chunk.text.toLowerCase();
		const atom1Text = atom1.text.toLowerCase();
		const atom2Text = atom2.text.toLowerCase();

		// Check for "is a" relationships
		const isAPatterns = [
			`${atom1Text}\\s+is\\s+a\\s+${atom2Text}`,
			`${atom1Text}\\s+are\\s+${atom2Text}`,
			`${atom1Text}\\s+is\\s+an\\s+${atom2Text}`
		];

		for (const pattern of isAPatterns) {
			if (new RegExp(pattern).test(text)) {
				return {
					sourceId: atom1.id,
					targetId: atom2.id,
					relationshipType: 'is_a',
					confidence: 0.8,
					evidence: [`Pattern match: "${pattern}"`],
					metadata: {
						detectionMethod: 'pattern_matching',
						context: this.extractContext(text, atom1Text, atom2Text),
						strength: 0.8
					}
				};
			}
		}

		// Check for "part of" relationships
		const partOfPatterns = [
			`${atom1Text}\\s+is\\s+part\\s+of\\s+${atom2Text}`,
			`${atom1Text}\\s+belongs\\s+to\\s+${atom2Text}`,
			`${atom2Text}\\s+contains\\s+${atom1Text}`
		];

		for (const pattern of partOfPatterns) {
			if (new RegExp(pattern).test(text)) {
				return {
					sourceId: atom1.id,
					targetId: atom2.id,
					relationshipType: 'part_of',
					confidence: 0.75,
					evidence: [`Pattern match: "${pattern}"`],
					metadata: {
						detectionMethod: 'pattern_matching',
						context: this.extractContext(text, atom1Text, atom2Text),
						strength: 0.75
					}
				};
			}
		}

		return null;
	}

	/**
	 * Detect spatial relationships (located_in, near, etc.)
	 */
	private detectSpatialRelationship(atom1: Atom, atom2: Atom, chunk: Chunk): DetectedRelationship | null {
		const text = chunk.text.toLowerCase();
		const atom1Text = atom1.text.toLowerCase();
		const atom2Text = atom2.text.toLowerCase();

		// Check for location relationships
		const locationPatterns = [
			`${atom1Text}\\s+is\\s+in\\s+${atom2Text}`,
			`${atom1Text}\\s+is\\s+located\\s+in\\s+${atom2Text}`,
			`${atom1Text}\\s+is\\s+at\\s+${atom2Text}`,
			`${atom1Text}\\s+is\\s+near\\s+${atom2Text}`
		];

		for (const pattern of locationPatterns) {
			if (new RegExp(pattern).test(text)) {
				return {
					sourceId: atom1.id,
					targetId: atom2.id,
					relationshipType: 'located_in',
					confidence: 0.7,
					evidence: [`Pattern match: "${pattern}"`],
					metadata: {
						detectionMethod: 'pattern_matching',
						context: this.extractContext(text, atom1Text, atom2Text),
						strength: 0.7
					}
				};
			}
		}

		return null;
	}

	/**
	 * Detect functional relationships (works_for, created_by, etc.)
	 */
	private detectFunctionalRelationship(atom1: Atom, atom2: Atom, chunk: Chunk): DetectedRelationship | null {
		const text = chunk.text.toLowerCase();
		const atom1Text = atom1.text.toLowerCase();
		const atom2Text = atom2.text.toLowerCase();

		// Check for employment relationships
		const employmentPatterns = [
			`${atom1Text}\\s+works\\s+for\\s+${atom2Text}`,
			`${atom1Text}\\s+is\\s+employed\\s+by\\s+${atom2Text}`,
			`${atom2Text}\\s+employs\\s+${atom1Text}`
		];

		for (const pattern of employmentPatterns) {
			if (new RegExp(pattern).test(text)) {
				return {
					sourceId: atom1.id,
					targetId: atom2.id,
					relationshipType: 'works_for',
					confidence: 0.8,
					evidence: [`Pattern match: "${pattern}"`],
					metadata: {
						detectionMethod: 'pattern_matching',
						context: this.extractContext(text, atom1Text, atom2Text),
						strength: 0.8
					}
				};
			}
		}

		// Check for creation relationships
		const creationPatterns = [
			`${atom1Text}\\s+was\\s+created\\s+by\\s+${atom2Text}`,
			`${atom1Text}\\s+is\\s+by\\s+${atom2Text}`,
			`${atom2Text}\\s+created\\s+${atom1Text}`
		];

		for (const pattern of creationPatterns) {
			if (new RegExp(pattern).test(text)) {
				return {
					sourceId: atom1.id,
					targetId: atom2.id,
					relationshipType: 'created_by',
					confidence: 0.75,
					evidence: [`Pattern match: "${pattern}"`],
					metadata: {
						detectionMethod: 'pattern_matching',
						context: this.extractContext(text, atom1Text, atom2Text),
						strength: 0.75
					}
				};
			}
		}

		return null;
	}

	/**
	 * Detect relationships using co-occurrence analysis
	 */
	private detectCooccurrenceRelationships(atoms: Atom[], chunks: Chunk[]): DetectedRelationship[] {
		const relationships: DetectedRelationship[] = [];

		// Group atoms by chunk
		const chunkAtoms = new Map<string, Atom[]>();
		atoms.forEach(atom => {
			if (!chunkAtoms.has(atom.chunkId)) {
				chunkAtoms.set(atom.chunkId, []);
			}
			chunkAtoms.get(atom.chunkId)!.push(atom);
		});

		// Analyze co-occurrence patterns
		for (const [chunkId, chunkAtomList] of chunkAtoms) {
			if (chunkAtomList.length < 2) continue;

			// Calculate co-occurrence scores
			for (let i = 0; i < chunkAtomList.length; i++) {
				for (let j = i + 1; j < chunkAtomList.length; j++) {
					const atom1 = chunkAtomList[i];
					const atom2 = chunkAtomList[j];

					// Calculate co-occurrence strength
					const cooccurrenceStrength = this.calculateCooccurrenceStrength(atom1, atom2, chunks);

					if (cooccurrenceStrength > 0.3) { // Threshold for meaningful co-occurrence
						relationships.push({
							sourceId: atom1.id,
							targetId: atom2.id,
							relationshipType: 'co_occurs_with',
							confidence: cooccurrenceStrength,
							evidence: [`Co-occurrence strength: ${cooccurrenceStrength.toFixed(3)}`],
							metadata: {
								detectionMethod: 'cooccurrence_analysis',
								context: `Atoms appear together in chunk ${chunkId}`,
								strength: cooccurrenceStrength
							}
						});
					}
				}
			}
		}

		return relationships;
	}

	/**
	 * Calculate co-occurrence strength between two atoms
	 */
	private calculateCooccurrenceStrength(atom1: Atom, atom2: Atom, chunks: Chunk[]): number {
		let totalChunks = 0;
		let cooccurringChunks = 0;

		for (const chunk of chunks) {
			// Check if both atoms appear in this chunk
			const atom1InChunk = chunk.text.toLowerCase().includes(atom1.text.toLowerCase());
			const atom2InChunk = chunk.text.toLowerCase().includes(atom2.text.toLowerCase());

			if (atom1InChunk || atom2InChunk) {
				totalChunks++;
				if (atom1InChunk && atom2InChunk) {
					cooccurringChunks++;
				}
			}
		}

		if (totalChunks === 0) return 0;

		// Calculate Jaccard similarity
		return cooccurringChunks / totalChunks;
	}

	/**
	 * Detect relationships using semantic analysis
	 */
	private detectSemanticRelationships(atoms: Atom[], chunks: Chunk[]): DetectedRelationship[] {
		const relationships: DetectedRelationship[] = [];

		// This would typically use embeddings and semantic similarity
		// For now, implement a simple keyword-based approach
		for (let i = 0; i < atoms.length; i++) {
			for (let j = i + 1; j < atoms.length; j++) {
				const atom1 = atoms[i];
				const atom2 = atoms[j];

				// Check for semantic similarity based on metadata
				const semanticSimilarity = this.calculateSemanticSimilarity(atom1, atom2);
				if (semanticSimilarity > 0.5) {
					relationships.push({
						sourceId: atom1.id,
						targetId: atom2.id,
						relationshipType: 'semantically_related',
						confidence: semanticSimilarity,
						evidence: [`Semantic similarity: ${semanticSimilarity.toFixed(3)}`],
						metadata: {
							detectionMethod: 'semantic_analysis',
							context: 'Semantic similarity analysis',
							strength: semanticSimilarity
						}
					});
				}
			}
		}

		return relationships;
	}

	/**
	 * Calculate semantic similarity between two atoms
	 */
	private calculateSemanticSimilarity(atom1: Atom, atom2: Atom): number {
		// Simple keyword-based similarity
		const text1 = atom1.text.toLowerCase();
		const text2 = atom2.text.toLowerCase();

		// Check for common words
		const words1 = text1.split(/\s+/);
		const words2 = text2.split(/\s+/);

		const commonWords = words1.filter(word => words2.includes(word));
		const totalWords = new Set([...words1, ...words2]).size;

		if (totalWords === 0) return 0;

		return commonWords.length / totalWords;
	}

	/**
	 * Detect temporal relationships
	 */
	private detectTemporalRelationships(atoms: Atom[], chunks: Chunk[]): DetectedRelationship[] {
		const relationships: DetectedRelationship[] = [];

		// Find date/time atoms
		const temporalAtoms = atoms.filter(atom => atom.type === 'DATE');
		const entityAtoms = atoms.filter(atom => atom.type === 'ENT');

		// Analyze temporal relationships
		for (const temporalAtom of temporalAtoms) {
			for (const entityAtom of entityAtoms) {
				// Check if they appear in the same chunk
				const chunk = chunks.find(c => c.id === temporalAtom.chunkId);
				if (chunk && chunk.id === entityAtom.chunkId) {
					// Check for temporal context
					const temporalContext = this.extractTemporalContext(temporalAtom, entityAtom, chunk);
					if (temporalContext) {
						relationships.push({
							sourceId: entityAtom.id,
							targetId: temporalAtom.id,
							relationshipType: 'temporally_related',
							confidence: 0.7,
							evidence: [temporalContext],
							metadata: {
								detectionMethod: 'temporal_analysis',
								context: temporalContext,
								temporalContext: temporalAtom.text,
								strength: 0.7
							}
						});
					}
				}
			}
		}

		return relationships;
	}

	/**
	 * Extract temporal context between atoms
	 */
	private extractTemporalContext(temporalAtom: Atom, entityAtom: Atom, chunk: Chunk): string | null {
		const text = chunk.text.toLowerCase();
		const temporalText = temporalAtom.text.toLowerCase();
		const entityText = entityAtom.text.toLowerCase();

		// Look for temporal patterns
		const patterns = [
			`${entityText}\\s+in\\s+${temporalText}`,
			`${entityText}\\s+on\\s+${temporalText}`,
			`${entityText}\\s+at\\s+${temporalText}`,
			`${temporalText}\\s+${entityText}`
		];

		for (const pattern of patterns) {
			if (new RegExp(pattern).test(text)) {
				return `Temporal pattern: "${pattern}"`;
			}
		}

		return null;
	}

	/**
	 * Create graph edges from detected relationships
	 */
	private async createGraphEdges(relationships: DetectedRelationship[]): Promise<GraphEdge[]> {
		const edges: GraphEdge[] = [];

		for (const relationship of relationships) {
			const edge: GraphEdge = {
				id: `edge_${relationship.sourceId}_${relationship.targetId}_${Date.now()}`,
				sourceId: relationship.sourceId,
				targetId: relationship.targetId,
				type: relationship.relationshipType,
				weight: relationship.confidence,
				metadata: {
					...relationship.metadata,
					evidence: relationship.evidence,
					detectedAt: new Date().toISOString()
				}
			};

			edges.push(edge);
		}

		return edges;
	}

	/**
	 * Store graph structure in the database
	 */
	private async storeGraphStructure(nodes: GraphNode[], edges: GraphEdge[]): Promise<void> {
		try {
			// Store nodes
			for (const node of nodes) {
				await this.storage.createGraphNode(node);
			}

			// Store edges
			for (const edge of edges) {
				await this.storage.createGraphEdge(edge);
			}
		} catch (error) {
			console.error('Error storing graph structure:', error);
		}
	}

	/**
	 * Extract context around two atoms
	 */
	private extractContext(text: string, atom1Text: string, atom2Text: string): string {
		const index1 = text.toLowerCase().indexOf(atom1Text.toLowerCase());
		const index2 = text.toLowerCase().indexOf(atom2Text.toLowerCase());

		if (index1 === -1 || index2 === -1) return '';

		const start = Math.max(0, Math.min(index1, index2) - 100);
		const end = Math.min(text.length, Math.max(index1, index2) + 100);

		return text.substring(start, end);
	}

	/**
	 * Classify relationships based on their properties
	 */
	async classifyRelationship(relationship: DetectedRelationship): Promise<RelationshipClassification> {
		// Simple rule-based classification
		let relationshipType = relationship.relationshipType;
		let subtype: string | undefined;
		let confidence = relationship.confidence;

		// Refine relationship type based on evidence and metadata
		if (relationship.relationshipType === 'semantically_related') {
			const semanticStrength = relationship.metadata.strength as number;
			if (semanticStrength > 0.8) {
				relationshipType = 'strongly_related';
				subtype = 'semantic';
			} else if (semanticStrength > 0.6) {
				relationshipType = 'moderately_related';
				subtype = 'semantic';
			}
		}

		// Validate relationship based on rules
		const validationRules = this.getValidationRules(relationshipType);
		const properties = this.extractRelationshipProperties(relationship);

		return {
			relationshipType,
			subtype,
			confidence,
			properties,
			validationRules
		};
	}

	/**
	 * Get validation rules for a relationship type
	 */
	private getValidationRules(relationshipType: string): string[] {
		const rules: Record<string, string[]> = {
			'is_a': ['Source and target must be different', 'Target should be more general than source'],
			'part_of': ['Source should be smaller than target', 'Target should contain source'],
			'located_in': ['Source should be an entity', 'Target should be a location'],
			'works_for': ['Source should be a person', 'Target should be an organization'],
			'created_by': ['Source should be a creation', 'Target should be a creator'],
			'co_occurs_with': ['Atoms must appear in same context', 'Co-occurrence strength > threshold'],
			'semantically_related': ['Semantic similarity > threshold', 'Context supports relationship'],
			'temporally_related': ['Temporal atom must be valid date', 'Context supports temporal relationship']
		};

		return rules[relationshipType] || ['Basic relationship validation'];
	}

	/**
	 * Extract properties from a relationship
	 */
	private extractRelationshipProperties(relationship: DetectedRelationship): Record<string, unknown> {
		return {
			detectionMethod: relationship.metadata.detectionMethod,
			strength: relationship.metadata.strength,
			context: relationship.metadata.context,
			temporalContext: relationship.metadata.temporalContext,
			evidenceCount: relationship.evidence.length,
			confidence: relationship.confidence
		};
	}
}
