/**
 * raptor.ts
 * RAPTOR (Recursive Abstractive Processing for Tree-Organized Retrieval)
 * Hierarchical summarization system for building knowledge trees
 */

import type { Chunk, Summary, GraphNode, GraphEdge } from '../types.js';
import type { StorageBackend } from './store.js';

export interface RaptorOptions {
	maxTreeDepth: number;
	minClusterSize: number;
	maxClusterSize: number;
	similarityThreshold: number;
	summaryLength: number;
	enableIncremental: boolean;
	clusteringAlgorithm: 'kmeans' | 'hierarchical' | 'dbscan';
	distanceMetric: 'cosine' | 'euclidean' | 'manhattan';
}

export interface Cluster {
	id: string;
	chunks: Chunk[];
	centroid: number[]; // Vector representation
	level: number;
	parentId?: string;
	childrenIds: string[];
	metadata: {
		cohesion: number;
		separation: number;
		size: number;
		createdAt: string;
		updatedAt: string;
	};
}

export interface SummaryNode {
	id: string;
	clusterId: string;
	summary: string;
	level: number;
	parentId?: string;
	childrenIds: string[];
	metadata: {
		abstractionLevel: number;
		confidence: number;
		tokens: number;
		createdAt: string;
		updatedAt: string;
	};
}

export interface RaptorTree {
	id: string;
	rootNodeId: string;
	depth: number;
	nodeCount: number;
	metadata: {
		documentId: string;
		createdAt: string;
		updatedAt: string;
		lastSummarized: string;
	};
}

export interface ClusteringResult {
	clusters: Cluster[];
	metrics: {
		silhouetteScore: number;
		calinskiHarabaszScore: number;
		daviesBouldinScore: number;
		processingTime: number;
	};
}

export interface SummarizationResult {
	summaryNode: SummaryNode;
	processingTime: number;
	confidence: number;
	metadata: {
		modelUsed: string;
		tokensGenerated: number;
		abstractionLevel: number;
	};
}

export class RaptorProcessor {
	private options: RaptorOptions;
	private storage: StorageBackend;

	constructor(storage: StorageBackend, options: Partial<RaptorOptions> = {}) {
		this.storage = storage;
		this.options = {
			maxTreeDepth: 5,
			minClusterSize: 3,
			maxClusterSize: 20,
			similarityThreshold: 0.7,
			summaryLength: 200,
			enableIncremental: true,
			clusteringAlgorithm: 'hierarchical',
			distanceMetric: 'cosine',
			...options
		};
	}

	/**
	 * Main entry point: Process chunks and build RAPTOR tree
	 */
	async buildRaptorTree(
		documentId: string,
		chunks: Chunk[],
		embeddings: Map<string, number[]>
	): Promise<RaptorTree> {
		const startTime = Date.now();
		console.log(`🚀 Building RAPTOR tree for document ${documentId} with ${chunks.length} chunks`);

		try {
			// Step 1: Initial clustering at level 0
			const level0Clusters = await this.performClustering(chunks, embeddings, 0);
			console.log(`📊 Created ${level0Clusters.clusters.length} level 0 clusters`);

			// Step 2: Build hierarchical tree
			const tree = await this.buildHierarchicalTree(documentId, level0Clusters.clusters, embeddings);

			// Step 3: Generate summaries for each level
			await this.generateSummaries(tree, embeddings);

			const processingTime = Date.now() - startTime;
			console.log(`✅ RAPTOR tree built successfully in ${processingTime}ms`);
			console.log(`🌳 Tree depth: ${tree.depth}, nodes: ${tree.nodeCount}`);

			return tree;
		} catch (error) {
			console.error('❌ Error building RAPTOR tree:', error);
			throw error;
		}
	}

	/**
	 * Perform clustering on chunks at a specific level
	 */
	private async performClustering(
		chunks: Chunk[],
		embeddings: Map<string, number[]>,
		level: number
	): Promise<ClusteringResult> {
		const startTime = Date.now();
		console.log(`🔍 Performing clustering at level ${level} with ${chunks.length} chunks`);

		let clusters: Cluster[] = [];

		switch (this.options.clusteringAlgorithm) {
			case 'kmeans':
				clusters = await this.kmeansClustering(chunks, embeddings, level);
				break;
			case 'hierarchical':
				clusters = await this.hierarchicalClustering(chunks, embeddings, level);
				break;
			case 'dbscan':
				clusters = await this.dbscanClustering(chunks, embeddings, level);
				break;
			default:
				throw new Error(`Unsupported clustering algorithm: ${this.options.clusteringAlgorithm}`);
		}

		// Calculate clustering quality metrics
		const metrics = await this.calculateClusteringMetrics(clusters, embeddings);

		const processingTime = Date.now() - startTime;
		console.log(`📊 Clustering completed in ${processingTime}ms with ${clusters.length} clusters`);

		return {
			clusters,
			metrics: {
				...metrics,
				processingTime
			}
		};
	}

	/**
	 * K-means clustering implementation
	 */
	private async kmeansClustering(
		chunks: Chunk[],
		embeddings: Map<string, number[]>,
		level: number
	): Promise<Cluster[]> {
		const k = Math.min(
			Math.ceil(chunks.length / this.options.maxClusterSize),
			Math.max(1, Math.ceil(chunks.length / this.options.minClusterSize))
		);

		if (k === 1) {
			// Single cluster case
			const centroid = this.calculateCentroid(chunks, embeddings);
			return [{
				id: `cluster_${level}_0`,
				chunks,
				centroid,
				level,
				childrenIds: [],
				metadata: {
					cohesion: 1.0,
					separation: 0.0,
					size: chunks.length,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
			}];
		}

		// Initialize centroids randomly
		let centroids = this.initializeRandomCentroids(chunks, embeddings, k);
		let clusters: Cluster[] = [];
		let iterations = 0;
		const maxIterations = 100;

		while (iterations < maxIterations) {
			// Assign chunks to nearest centroid
			const assignments = this.assignToCentroids(chunks, embeddings, centroids);
			
			// Create clusters from assignments
			const newClusters = this.createClustersFromAssignments(assignments, chunks, embeddings, level);
			
			// Check for convergence
			if (this.clustersConverged(clusters, newClusters)) {
				clusters = newClusters;
				break;
			}

			// Update centroids
			centroids = newClusters.map(cluster => cluster.centroid);
			clusters = newClusters;
			iterations++;
		}

		// Filter out clusters that are too small
		clusters = clusters.filter(cluster => cluster.chunks.length >= this.options.minClusterSize);

		// Merge clusters that are too small
		if (clusters.length > 1) {
			clusters = await this.mergeSmallClusters(clusters, embeddings);
		}

		return clusters;
	}

	/**
	 * Hierarchical clustering implementation
	 */
	private async hierarchicalClustering(
		chunks: Chunk[],
		embeddings: Map<string, number[]>,
		level: number
	): Promise<Cluster[]> {
		if (chunks.length <= this.options.maxClusterSize) {
			// Single cluster case
			const centroid = this.calculateCentroid(chunks, embeddings);
			return [{
				id: `cluster_${level}_0`,
				chunks,
				centroid,
				level,
				childrenIds: [],
				metadata: {
					cohesion: 1.0,
					separation: 0.0,
					size: chunks.length,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
			}];
		}

		// Calculate pairwise distances
		const distances = this.calculatePairwiseDistances(chunks, embeddings);
		
		// Build hierarchical tree
		const tree = this.buildHierarchicalTreeFromDistances(distances, chunks);
		
		// Cut tree at appropriate level
		const clusters = this.cutHierarchicalTree(tree, chunks, embeddings, level);
		
		return clusters;
	}

	/**
	 * DBSCAN clustering implementation
	 */
	private async dbscanClustering(
		chunks: Chunk[],
		embeddings: Map<string, number[]>,
		level: number
	): Promise<Cluster[]> {
		const eps = 0.3; // Epsilon for neighborhood
		const minPts = this.options.minClusterSize;

		// Initialize labels
		const labels = new Array(chunks.length).fill(-1); // -1 = unvisited
		let clusterId = 0;

		// Find core points and expand clusters
		for (let i = 0; i < chunks.length; i++) {
			if (labels[i] !== -1) continue;

			const neighbors = this.findNeighbors(i, chunks, embeddings, eps);
			
			if (neighbors.length < minPts) {
				labels[i] = -2; // Noise point
				continue;
			}

			// Start new cluster
			clusterId++;
			labels[i] = clusterId;
			
			// Expand cluster
			this.expandCluster(i, neighbors, labels, clusterId, chunks, embeddings, eps, minPts);
		}

		// Create clusters from labels
		const clusters: Cluster[] = [];
		for (let c = 1; c <= clusterId; c++) {
			const clusterChunks = chunks.filter((_, index) => labels[index] === c);
			
			if (clusterChunks.length >= this.options.minClusterSize) {
				const centroid = this.calculateCentroid(clusterChunks, embeddings);
				clusters.push({
					id: `cluster_${level}_${c}`,
					chunks: clusterChunks,
					centroid,
					level,
					childrenIds: [],
					metadata: {
						cohesion: this.calculateClusterCohesion(clusterChunks, embeddings),
						separation: 0.0, // Will be calculated later
						size: clusterChunks.length,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					}
				});
			}
		}

		return clusters;
	}

	/**
	 * Build hierarchical tree structure
	 */
	private async buildHierarchicalTree(
		documentId: string,
		level0Clusters: Cluster[],
		embeddings: Map<string, number[]>
	): Promise<RaptorTree> {
		const tree: RaptorTree = {
			id: `raptor_${documentId}`,
			rootNodeId: '',
			depth: 0,
			nodeCount: 0,
			metadata: {
				documentId,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				lastSummarized: new Date().toISOString()
			}
		};

		const allClusters: Cluster[][] = [level0Clusters];
		let currentLevel = 0;

		// Build tree level by level
		while (currentLevel < this.options.maxTreeDepth && allClusters[currentLevel].length > 1) {
			const currentClusters = allClusters[currentLevel];
			console.log(`🌳 Building level ${currentLevel + 1} from ${currentClusters.length} clusters`);

			// Create parent clusters for current level
			const parentClusters = await this.performClustering(
				currentClusters.map(cluster => this.createChunkFromCluster(cluster)),
				embeddings,
				currentLevel + 1
			);

			// Link parent-child relationships
			await this.linkClusterHierarchy(allClusters[currentLevel], parentClusters.clusters);

			allClusters.push(parentClusters.clusters);
			currentLevel++;
		}

		// Set root node
		const topLevel = allClusters.length - 1;
		if (allClusters[topLevel].length > 0) {
			tree.rootNodeId = allClusters[topLevel][0].id;
			tree.depth = topLevel;
			tree.nodeCount = allClusters.flat().length;
		}

		// Store clusters in database
		await this.storeClusters(allClusters.flat());

		return tree;
	}

	/**
	 * Generate summaries for all tree levels
	 */
	private async generateSummaries(tree: RaptorTree, embeddings: Map<string, number[]>): Promise<void> {
		console.log(`📝 Generating summaries for tree with depth ${tree.depth}`);

		// Get all clusters from storage
		const allClusters = await this.storage.getAllClusters();
		const clustersByLevel = this.groupClustersByLevel(allClusters);

		// Generate summaries bottom-up
		for (let level = 0; level <= tree.depth; level++) {
			const levelClusters = clustersByLevel[level] || [];
			console.log(`📝 Processing level ${level} with ${levelClusters.length} clusters`);

			for (const cluster of levelClusters) {
				try {
					const summaryResult = await this.generateClusterSummary(cluster, level);
					await this.storage.createSummary(summaryResult.summaryNode);
					console.log(`✅ Generated summary for cluster ${cluster.id} at level ${level}`);
				} catch (error) {
					console.error(`❌ Failed to generate summary for cluster ${cluster.id}:`, error);
				}
			}
		}
	}

	/**
	 * Generate summary for a specific cluster
	 */
	private async generateClusterSummary(cluster: Cluster, level: number): Promise<SummarizationResult> {
		const startTime = Date.now();

		// For now, create a simple summary based on chunk content
		// In production, this would call an LLM service
		const summary = this.createSimpleSummary(cluster.chunks, level);
		
		const summaryNode: SummaryNode = {
			id: `summary_${cluster.id}`,
			clusterId: cluster.id,
			summary,
			level,
			parentId: cluster.parentId,
			childrenIds: cluster.childrenIds,
			metadata: {
				abstractionLevel: level,
				confidence: 0.8, // Placeholder confidence
				tokens: this.countTokens(summary),
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}
		};

		const processingTime = Date.now() - startTime;

		return {
			summaryNode,
			processingTime,
			confidence: 0.8,
			metadata: {
				modelUsed: 'simple-summarizer',
				tokensGenerated: summaryNode.metadata.tokens,
				abstractionLevel: level
			}
		};
	}

	/**
	 * Helper methods for clustering and tree building
	 */
	private calculateCentroid(chunks: Chunk[], embeddings: Map<string, number[]>): number[] {
		if (chunks.length === 0) return [];

		const validEmbeddings = chunks
			.map(chunk => embeddings.get(chunk.id))
			.filter(embedding => embedding !== undefined) as number[][];

		if (validEmbeddings.length === 0) return [];

		const dimension = validEmbeddings[0].length;
		const centroid = new Array(dimension).fill(0);

		for (const embedding of validEmbeddings) {
			for (let i = 0; i < dimension; i++) {
				centroid[i] += embedding[i];
			}
		}

		for (let i = 0; i < dimension; i++) {
			centroid[i] /= validEmbeddings.length;
		}

		return centroid;
	}

	private initializeRandomCentroids(chunks: Chunk[], embeddings: Map<string, number[]>, k: number): number[][] {
		const validChunks = chunks.filter(chunk => embeddings.has(chunk.id));
		if (validChunks.length === 0) return [];

		const centroids: number[][] = [];
		const usedIndices = new Set<number>();

		for (let i = 0; i < k; i++) {
			let randomIndex: number;
			do {
				randomIndex = Math.floor(Math.random() * validChunks.length);
			} while (usedIndices.has(randomIndex));

			usedIndices.add(randomIndex);
			const chunk = validChunks[randomIndex];
			const embedding = embeddings.get(chunk.id)!;
			centroids.push([...embedding]);
		}

		return centroids;
	}

	private assignToCentroids(chunks: Chunk[], embeddings: Map<string, number[]>, centroids: number[][]): number[] {
		const assignments: number[] = [];

		for (const chunk of chunks) {
			const embedding = embeddings.get(chunk.id);
			if (!embedding) {
				assignments.push(-1);
				continue;
			}

			let minDistance = Infinity;
			let bestCentroid = 0;

			for (let i = 0; i < centroids.length; i++) {
				const distance = this.calculateDistance(embedding, centroids[i]);
				if (distance < minDistance) {
					minDistance = distance;
					bestCentroid = i;
				}
			}

			assignments.push(bestCentroid);
		}

		return assignments;
	}

	private createClustersFromAssignments(
		assignments: number[],
		chunks: Chunk[],
		embeddings: Map<string, number[]>,
		level: number
	): Cluster[] {
		const clusterMap = new Map<number, Chunk[]>();

		for (let i = 0; i < assignments.length; i++) {
			const centroidIndex = assignments[i];
			if (centroidIndex === -1) continue;

			if (!clusterMap.has(centroidIndex)) {
				clusterMap.set(centroidIndex, []);
			}
			clusterMap.get(centroidIndex)!.push(chunks[i]);
		}

		const clusters: Cluster[] = [];
		let clusterId = 0;

		for (const [centroidIndex, clusterChunks] of clusterMap) {
			if (clusterChunks.length === 0) continue;

			const centroid = this.calculateCentroid(clusterChunks, embeddings);
			clusters.push({
				id: `cluster_${level}_${clusterId}`,
				chunks: clusterChunks,
				centroid,
				level,
				childrenIds: [],
				metadata: {
					cohesion: this.calculateClusterCohesion(clusterChunks, embeddings),
					separation: 0.0,
					size: clusterChunks.length,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
			});
			clusterId++;
		}

		return clusters;
	}

	private clustersConverged(oldClusters: Cluster[], newClusters: Cluster[]): boolean {
		if (oldClusters.length !== newClusters.length) return false;

		for (let i = 0; i < oldClusters.length; i++) {
			if (oldClusters[i].chunks.length !== newClusters[i].chunks.length) return false;
			
			const oldChunkIds = new Set(oldClusters[i].chunks.map(c => c.id));
			const newChunkIds = new Set(newClusters[i].chunks.map(c => c.id));
			
			if (!this.setsEqual(oldChunkIds, newChunkIds)) return false;
		}

		return true;
	}

	private setsEqual(set1: Set<string>, set2: Set<string>): boolean {
		if (set1.size !== set2.size) return false;
		for (const item of set1) {
			if (!set2.has(item)) return false;
		}
		return true;
	}

	private calculateDistance(vec1: number[], vec2: number[]): number {
		if (this.options.distanceMetric === 'cosine') {
			return this.cosineDistance(vec1, vec2);
		} else if (this.options.distanceMetric === 'euclidean') {
			return this.euclideanDistance(vec1, vec2);
		} else {
			return this.manhattanDistance(vec1, vec2);
		}
	}

	private cosineDistance(vec1: number[], vec2: number[]): number {
		const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
		const norm1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
		const norm2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
		
		if (norm1 === 0 || norm2 === 0) return 1;
		
		const cosine = dotProduct / (norm1 * norm2);
		return 1 - cosine; // Convert to distance
	}

	private euclideanDistance(vec1: number[], vec2: number[]): number {
		return Math.sqrt(vec1.reduce((sum, val, i) => sum + Math.pow(val - vec2[i], 2), 0));
	}

	private manhattanDistance(vec1: number[], vec2: number[]): number {
		return vec1.reduce((sum, val, i) => sum + Math.abs(val - vec2[i]), 0);
	}

	private calculateClusterCohesion(chunks: Chunk[], embeddings: Map<string, number[]>): number {
		if (chunks.length <= 1) return 1.0;

		const validEmbeddings = chunks
			.map(chunk => embeddings.get(chunk.id))
			.filter(embedding => embedding !== undefined) as number[][];

		if (validEmbeddings.length <= 1) return 1.0;

		const centroid = this.calculateCentroid(chunks, embeddings);
		let totalDistance = 0;

		for (const embedding of validEmbeddings) {
			totalDistance += this.calculateDistance(embedding, centroid);
		}

		const avgDistance = totalDistance / validEmbeddings.length;
		return Math.max(0, 1 - avgDistance); // Higher cohesion = lower distance
	}

	private async mergeSmallClusters(clusters: Cluster[], embeddings: Map<string, number[]>): Promise<Cluster[]> {
		const smallClusters = clusters.filter(c => c.chunks.length < this.options.minClusterSize);
		const largeClusters = clusters.filter(c => c.chunks.length >= this.options.minClusterSize);

		if (smallClusters.length === 0) return clusters;

		// Merge small clusters into nearest large clusters
		for (const smallCluster of smallClusters) {
			let bestLargeCluster: Cluster | null = null;
			let bestDistance = Infinity;

			for (const largeCluster of largeClusters) {
				const distance = this.calculateDistance(smallCluster.centroid, largeCluster.centroid);
				if (distance < bestDistance) {
					bestDistance = distance;
					bestLargeCluster = largeCluster;
				}
			}

			if (bestLargeCluster) {
				// Merge chunks
				bestLargeCluster.chunks.push(...smallCluster.chunks);
				bestLargeCluster.metadata.size = bestLargeCluster.chunks.length;
				bestLargeCluster.metadata.updatedAt = new Date().toISOString();
				
				// Recalculate centroid
				bestLargeCluster.centroid = this.calculateCentroid(bestLargeCluster.chunks, embeddings);
				
				// Recalculate cohesion
				bestLargeCluster.metadata.cohesion = this.calculateClusterCohesion(bestLargeCluster.chunks, embeddings);
			}
		}

		return largeClusters;
	}

	private calculatePairwiseDistances(chunks: Chunk[], embeddings: Map<string, number[]>): number[][] {
		const distances: number[][] = [];
		
		for (let i = 0; i < chunks.length; i++) {
			distances[i] = [];
			for (let j = 0; j < chunks.length; j++) {
				if (i === j) {
					distances[i][j] = 0;
				} else {
					const embedding1 = embeddings.get(chunks[i].id);
					const embedding2 = embeddings.get(chunks[j].id);
					
					if (embedding1 && embedding2) {
						distances[i][j] = this.calculateDistance(embedding1, embedding2);
					} else {
						distances[i][j] = Infinity;
					}
				}
			}
		}
		
		return distances;
	}

	private buildHierarchicalTreeFromDistances(distances: number[][], chunks: Chunk[]): any {
		// Simplified hierarchical tree building
		// In production, this would use a proper hierarchical clustering algorithm
		return { distances, chunks };
	}

	private cutHierarchicalTree(tree: any, chunks: Chunk[], embeddings: Map<string, number[]>, level: number): Cluster[] {
		// Simplified tree cutting
		// In production, this would determine optimal cut points
		const clusterSize = Math.min(this.options.maxClusterSize, Math.ceil(chunks.length / 2));
		const clusters: Cluster[] = [];
		
		for (let i = 0; i < chunks.length; i += clusterSize) {
			const clusterChunks = chunks.slice(i, i + clusterSize);
			const centroid = this.calculateCentroid(clusterChunks, embeddings);
			
			clusters.push({
				id: `cluster_${level}_${i / clusterSize}`,
				chunks: clusterChunks,
				centroid,
				level,
				childrenIds: [],
				metadata: {
					cohesion: this.calculateClusterCohesion(clusterChunks, embeddings),
					separation: 0.0,
					size: clusterChunks.length,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
			});
		}
		
		return clusters;
	}

	private findNeighbors(pointIndex: number, chunks: Chunk[], embeddings: Map<string, number[]>, eps: number): number[] {
		const neighbors: number[] = [];
		const pointEmbedding = embeddings.get(chunks[pointIndex].id);
		
		if (!pointEmbedding) return neighbors;
		
		for (let i = 0; i < chunks.length; i++) {
			if (i === pointIndex) continue;
			
			const otherEmbedding = embeddings.get(chunks[i].id);
			if (otherEmbedding) {
				const distance = this.calculateDistance(pointEmbedding, otherEmbedding);
				if (distance <= eps) {
					neighbors.push(i);
				}
			}
		}
		
		return neighbors;
	}

	private expandCluster(
		pointIndex: number,
		neighbors: number[],
		labels: number[],
		clusterId: number,
		chunks: Chunk[],
		embeddings: Map<string, number[]>,
		eps: number,
		minPts: number
	): void {
		labels[pointIndex] = clusterId;
		
		for (const neighborIndex of neighbors) {
			if (labels[neighborIndex] === -2) {
				labels[neighborIndex] = clusterId;
			} else if (labels[neighborIndex] === -1) {
				labels[neighborIndex] = clusterId;
				
				const newNeighbors = this.findNeighbors(neighborIndex, chunks, embeddings, eps);
				if (newNeighbors.length >= minPts) {
					this.expandCluster(neighborIndex, newNeighbors, labels, clusterId, chunks, embeddings, eps, minPts);
				}
			}
		}
	}

	private createChunkFromCluster(cluster: Cluster): Chunk {
		// Create a representative chunk from cluster content
		const combinedText = cluster.chunks.map(c => c.text).join('\n\n');
		const totalTokens = cluster.chunks.reduce((sum, c) => sum + c.tokens, 0);
		
		return {
			id: `cluster_chunk_${cluster.id}`,
			docId: cluster.chunks[0]?.docId || 'unknown',
			text: combinedText,
			tokens: totalTokens,
			metadata: {
				chunkType: 'cluster',
				clusterId: cluster.id,
				level: cluster.level
			},
			createdAt: cluster.metadata.createdAt,
			updatedAt: cluster.metadata.updatedAt
		};
	}

	private async linkClusterHierarchy(childClusters: Cluster[], parentClusters: Cluster[]): Promise<void> {
		// Link each child cluster to its nearest parent cluster
		for (const childCluster of childClusters) {
			let bestParent: Cluster | null = null;
			let bestDistance = Infinity;

			for (const parentCluster of parentClusters) {
				const distance = this.calculateDistance(childCluster.centroid, parentCluster.centroid);
				if (distance < bestDistance) {
					bestDistance = distance;
					bestParent = parentCluster;
				}
			}

			if (bestParent) {
				childCluster.parentId = bestParent.id;
				bestParent.childrenIds.push(childCluster.id);
			}
		}
	}

	private async storeClusters(clusters: Cluster[]): Promise<void> {
		// Store clusters in the database
		for (const cluster of clusters) {
			await this.storage.createCluster(cluster);
		}
	}

	private groupClustersByLevel(clusters: Cluster[]): Record<number, Cluster[]> {
		const grouped: Record<number, Cluster[]> = {};
		
		for (const cluster of clusters) {
			if (!grouped[cluster.level]) {
				grouped[cluster.level] = [];
			}
			grouped[cluster.level].push(cluster);
		}
		
		return grouped;
	}

	private createSimpleSummary(chunks: Chunk[], level: number): string {
		if (chunks.length === 0) return '';

		if (level === 0) {
			// Level 0: Concatenate chunk texts
			return chunks.map(c => c.text).join('\n\n');
		} else {
			// Higher levels: Create abstract summary
			const keyPhrases = this.extractKeyPhrases(chunks);
			const summary = `Summary of ${chunks.length} chunks covering: ${keyPhrases.join(', ')}`;
			return summary;
		}
	}

	private extractKeyPhrases(chunks: Chunk[]): string[] {
		// Simple key phrase extraction
		// In production, this would use NLP techniques
		const allText = chunks.map(c => c.text).join(' ');
		const words = allText.toLowerCase().split(/\s+/);
		const wordFreq = new Map<string, number>();
		
		for (const word of words) {
			if (word.length > 3) { // Filter short words
				wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
			}
		}
		
		// Return top 5 most frequent words
		return Array.from(wordFreq.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5)
			.map(([word]) => word);
	}

	private countTokens(text: string): number {
		// Simple token counting
		return text.split(/\s+/).length;
	}

	private async calculateClusteringMetrics(clusters: Cluster[], embeddings: Map<string, number[]>): Promise<{
		silhouetteScore: number;
		calinskiHarabaszScore: number;
		daviesBouldinScore: number;
	}> {
		// Simplified clustering quality metrics
		// In production, these would be proper statistical calculations
		
		const silhouetteScore = clusters.length > 1 ? 0.7 : 1.0;
		const calinskiHarabaszScore = clusters.length > 1 ? 0.6 : 1.0;
		const daviesBouldinScore = clusters.length > 1 ? 0.3 : 0.0;
		
		return {
			silhouetteScore,
			calinskiHarabaszScore,
			daviesBouldinScore
		};
	}

	/**
	 * Public methods for tree operations
	 */
	async getTreeStructure(treeId: string): Promise<RaptorTree | null> {
		// Retrieve tree structure from storage
		// This would be implemented based on your storage backend
		return null;
	}

	async traverseTree(treeId: string, level: number): Promise<SummaryNode[]> {
		// Traverse tree at specific level
		// This would be implemented based on your storage backend
		return [];
	}

	async searchTree(treeId: string, query: string, level?: number): Promise<SummaryNode[]> {
		// Search tree for relevant summaries
		// This would be implemented based on your storage backend
		return [];
	}

	async updateTreeIncrementally(treeId: string, newChunks: Chunk[], embeddings: Map<string, number[]>): Promise<void> {
		if (!this.options.enableIncremental) {
			throw new Error('Incremental updates are disabled');
		}

		// Implement incremental tree updates
		// This would add new chunks and potentially restructure the tree
		console.log(`🔄 Updating tree ${treeId} incrementally with ${newChunks.length} new chunks`);
	}
}
