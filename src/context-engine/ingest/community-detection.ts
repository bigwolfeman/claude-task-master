/**
 * community-detection.ts
 * Graph Community Detection Algorithms
 * Implements various algorithms for finding communities in knowledge graphs
 */

import type { GraphNode, GraphEdge } from '../types.js';
import type { StorageBackend } from './store.js';

export interface CommunityDetectionOptions {
	algorithm: 'louvain' | 'label-propagation' | 'girvan-newman' | 'spectral';
	minCommunitySize: number;
	maxCommunities: number;
	resolution: number; // For Louvain algorithm
	maxIterations: number;
	convergenceThreshold: number;
}

export interface Community {
	id: string;
	nodes: string[]; // Node IDs
	edges: string[]; // Edge IDs
	modularity: number;
	density: number;
	cohesion: number;
	metadata: {
		algorithm: string;
		detectionTime: number;
		iterations: number;
		[key: string]: unknown;
	};
}

export interface CommunityDetectionResult {
	communities: Community[];
	modularity: number;
	detectionTime: number;
	metadata: {
		totalNodes: number;
		totalEdges: number;
		algorithm: string;
		options: CommunityDetectionOptions;
	};
}

export class CommunityDetector {
	constructor(
		private storage: StorageBackend,
		private options: CommunityDetectionOptions = {
			algorithm: 'louvain',
			minCommunitySize: 3,
			maxCommunities: 50,
			resolution: 1.0,
			maxIterations: 100,
			convergenceThreshold: 0.001
		}
	) {}

	/**
	 * Detect communities in the knowledge graph
	 */
	async detectCommunities(): Promise<CommunityDetectionResult> {
		const startTime = Date.now();
		
		try {
			// Get graph structure from storage
			const nodes = await this.storage.getGraphNodes();
			const edges = await this.storage.getGraphEdges();
			
			if (nodes.length === 0) {
				return {
					communities: [],
					modularity: 0,
					detectionTime: Date.now() - startTime,
					metadata: {
						totalNodes: 0,
						totalEdges: 0,
						algorithm: this.options.algorithm,
						options: this.options
					}
				};
			}

			let communities: Community[];
			
			switch (this.options.algorithm) {
				case 'louvain':
					communities = await this.louvainMethod(nodes, edges);
					break;
				case 'label-propagation':
					communities = await this.labelPropagationMethod(nodes, edges);
					break;
				case 'girvan-newman':
					communities = await this.girvanNewmanMethod(nodes, edges);
					break;
				case 'spectral':
					communities = await this.spectralMethod(nodes, edges);
					break;
				default:
					throw new Error(`Unknown algorithm: ${this.options.algorithm}`);
			}

			// Filter communities by size
			communities = communities.filter(c => c.nodes.length >= this.options.minCommunitySize);
			
			// Limit number of communities
			if (communities.length > this.options.maxCommunities) {
				communities = communities
					.sort((a, b) => b.modularity - a.modularity)
					.slice(0, this.options.maxCommunities);
			}

			// Calculate overall modularity
			const modularity = this.calculateOverallModularity(communities, nodes, edges);

			return {
				communities,
				modularity,
				detectionTime: Date.now() - startTime,
				metadata: {
					totalNodes: nodes.length,
					totalEdges: edges.length,
					algorithm: this.options.algorithm,
					options: this.options
				}
			};

		} catch (error) {
			console.error('Error detecting communities:', error);
			throw error;
		}
	}

	/**
	 * Louvain Method for community detection
	 */
	private async louvainMethod(nodes: GraphNode[], edges: GraphEdge[]): Promise<Community[]> {
		const communities: Community[] = [];
		const nodeCommunities = new Map<string, number>();
		const adjacencyList = this.buildAdjacencyList(nodes, edges);
		
		// Initialize: each node is its own community
		nodes.forEach((node, index) => {
			nodeCommunities.set(node.id, index);
		});

		let iteration = 0;
		let improved = true;
		let currentModularity = this.calculateModularity(nodeCommunities, adjacencyList, edges);

		while (improved && iteration < this.options.maxIterations) {
			improved = false;
			iteration++;

			// Phase 1: Local optimization
			for (const node of nodes) {
				const bestCommunity = this.findBestCommunity(
					node.id,
					nodeCommunities,
					adjacencyList,
					edges
				);

				if (bestCommunity !== nodeCommunities.get(node.id)) {
					nodeCommunities.set(node.id, bestCommunity);
					improved = true;
				}
			}

			// Phase 2: Community aggregation
			const newModularity = this.calculateModularity(nodeCommunities, adjacencyList, edges);
			if (Math.abs(newModularity - currentModularity) < this.options.convergenceThreshold) {
				break;
			}
			currentModularity = newModularity;
		}

		// Convert to Community objects
		const communityGroups = new Map<number, string[]>();
		for (const [nodeId, communityId] of nodeCommunities) {
			if (!communityGroups.has(communityId)) {
				communityGroups.set(communityId, []);
			}
			communityGroups.get(communityId)!.push(nodeId);
		}

		for (const [communityId, nodeIds] of communityGroups) {
			if (nodeIds.length >= this.options.minCommunitySize) {
				const community = await this.createCommunity(
					`community_${communityId}`,
					nodeIds,
					edges,
					'louvain',
					iteration
				);
				communities.push(community);
			}
		}

		return communities;
	}

	/**
	 * Label Propagation Method for community detection
	 */
	private async labelPropagationMethod(nodes: GraphNode[], edges: GraphEdge[]): Promise<Community[]> {
		const communities: Community[] = [];
		const nodeLabels = new Map<string, string>();
		const adjacencyList = this.buildAdjacencyList(nodes, edges);
		
		// Initialize: each node gets a unique label
		nodes.forEach(node => {
			nodeLabels.set(node.id, node.id);
		});

		let iteration = 0;
		let changed = true;

		while (changed && iteration < this.options.maxIterations) {
			changed = false;
			iteration++;

			// Randomize node order for better convergence
			const shuffledNodes = [...nodes].sort(() => Math.random() - 0.5);

			for (const node of shuffledNodes) {
				const neighbors = adjacencyList.get(node.id) || [];
				if (neighbors.length === 0) continue;

				// Count labels of neighbors
				const labelCounts = new Map<string, number>();
				for (const neighborId of neighbors) {
					const label = nodeLabels.get(neighborId)!;
					labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
				}

				// Find most frequent label
				let maxCount = 0;
				let mostFrequentLabel = nodeLabels.get(node.id)!;
				
				for (const [label, count] of labelCounts) {
					if (count > maxCount) {
						maxCount = count;
						mostFrequentLabel = label;
					}
				}

				// Update label if different
				if (mostFrequentLabel !== nodeLabels.get(node.id)) {
					nodeLabels.set(node.id, mostFrequentLabel);
					changed = true;
				}
			}
		}

		// Convert to Community objects
		const labelGroups = new Map<string, string[]>();
		for (const [nodeId, label] of nodeLabels) {
			if (!labelGroups.has(label)) {
				labelGroups.set(label, []);
			}
			labelGroups.get(label)!.push(nodeId);
		}

		for (const [label, nodeIds] of labelGroups) {
			if (nodeIds.length >= this.options.minCommunitySize) {
				const community = await this.createCommunity(
					`community_${label}`,
					nodeIds,
					edges,
					'label-propagation',
					iteration
				);
				communities.push(community);
			}
		}

		return communities;
	}

	/**
	 * Girvan-Newman Method for community detection
	 */
	private async girvanNewmanMethod(nodes: GraphNode[], edges: GraphEdge[]): Promise<Community[]> {
		const communities: Community[] = [];
		const adjacencyList = this.buildAdjacencyList(nodes, edges);
		const edgeBetweenness = this.calculateEdgeBetweenness(nodes, adjacencyList);
		
		// Sort edges by betweenness centrality
		const sortedEdges = [...edges].sort((a, b) => {
			const betweennessA = edgeBetweenness.get(`${a.sourceId}-${a.targetId}`) || 0;
			const betweennessB = edgeBetweenness.get(`${b.sourceId}-${b.targetId}`) || 0;
			return betweennessB - betweennessA;
		});

		// Remove edges one by one and check for communities
		const remainingEdges = [...edges];
		let iteration = 0;

		while (remainingEdges.length > 0 && iteration < this.options.maxIterations) {
			// Remove edge with highest betweenness
			const edgeToRemove = sortedEdges[iteration];
			const edgeIndex = remainingEdges.findIndex(e => 
				e.sourceId === edgeToRemove.sourceId && e.targetId === edgeToRemove.targetId
			);
			
			if (edgeIndex !== -1) {
				remainingEdges.splice(edgeIndex, 1);
			}

			// Check for disconnected components
			const components = this.findConnectedComponents(nodes, remainingEdges);
			
			for (const component of components) {
				if (component.length >= this.options.minCommunitySize) {
					const community = await this.createCommunity(
						`community_gn_${iteration}`,
						component,
						remainingEdges,
						'girvan-newman',
						iteration
					);
					communities.push(community);
				}
			}

			iteration++;
		}

		return communities;
	}

	/**
	 * Spectral Method for community detection
	 */
	private async spectralMethod(nodes: GraphNode[], edges: GraphEdge[]): Promise<Community[]> {
		const communities: Community[] = [];
		const adjacencyMatrix = this.buildAdjacencyMatrix(nodes, edges);
		const laplacianMatrix = this.buildLaplacianMatrix(adjacencyMatrix);
		
		// Find eigenvalues and eigenvectors
		const { eigenvalues, eigenvectors } = this.computeEigenDecomposition(laplacianMatrix);
		
		// Use second smallest eigenvalue (Fiedler vector) for bipartition
		const fiedlerVector = eigenvectors[1]; // Index 1 for second smallest
		
		// Bipartition based on sign of Fiedler vector components
		const positiveNodes: string[] = [];
		const negativeNodes: string[] = [];
		
		for (let i = 0; i < nodes.length; i++) {
			if (fiedlerVector[i] > 0) {
				positiveNodes.push(nodes[i].id);
			} else {
				negativeNodes.push(nodes[i].id);
			}
		}

		// Create communities if they meet size requirements
		if (positiveNodes.length >= this.options.minCommunitySize) {
			const positiveCommunity = await this.createCommunity(
				'community_spectral_pos',
				positiveNodes,
				edges,
				'spectral',
				1
			);
			communities.push(positiveCommunity);
		}

		if (negativeNodes.length >= this.options.minCommunitySize) {
			const negativeCommunity = await this.createCommunity(
				'community_spectral_neg',
				negativeNodes,
				edges,
				'spectral',
				1
			);
			communities.push(negativeCommunity);
		}

		return communities;
	}

	/**
	 * Helper methods
	 */
	private buildAdjacencyList(nodes: GraphNode[], edges: GraphEdge[]): Map<string, string[]> {
		const adjacencyList = new Map<string, string[]>();
		
		// Initialize empty lists
		nodes.forEach(node => {
			adjacencyList.set(node.id, []);
		});

		// Add edges
		edges.forEach(edge => {
			adjacencyList.get(edge.sourceId)!.push(edge.targetId);
			adjacencyList.get(edge.targetId)!.push(edge.sourceId);
		});

		return adjacencyList;
	}

	private buildAdjacencyMatrix(nodes: GraphNode[], edges: GraphEdge[]): number[][] {
		const matrix: number[][] = [];
		const nodeIndexMap = new Map<string, number>();
		
		// Create node index mapping
		nodes.forEach((node, index) => {
			nodeIndexMap.set(node.id, index);
		});

		// Initialize matrix with zeros
		for (let i = 0; i < nodes.length; i++) {
			matrix[i] = new Array(nodes.length).fill(0);
		}

		// Fill matrix with edge weights
		edges.forEach(edge => {
			const i = nodeIndexMap.get(edge.sourceId)!;
			const j = nodeIndexMap.get(edge.targetId)!;
			matrix[i][j] = 1;
			matrix[j][i] = 1; // Undirected graph
		});

		return matrix;
	}

	private buildLaplacianMatrix(adjacencyMatrix: number[][]): number[][] {
		const n = adjacencyMatrix.length;
		const laplacian: number[][] = [];
		
		// Initialize laplacian matrix
		for (let i = 0; i < n; i++) {
			laplacian[i] = new Array(n).fill(0);
		}

		// Calculate degree matrix and subtract adjacency matrix
		for (let i = 0; i < n; i++) {
			const degree = adjacencyMatrix[i].reduce((sum, val) => sum + val, 0);
			laplacian[i][i] = degree;
			
			for (let j = 0; j < n; j++) {
				laplacian[i][j] -= adjacencyMatrix[i][j];
			}
		}

		return laplacian;
	}

	private computeEigenDecomposition(matrix: number[][]): { eigenvalues: number[], eigenvectors: number[][] } {
		// Simplified eigenvalue decomposition for small matrices
		// In production, use a proper numerical library
		const n = matrix.length;
		
		// For small matrices, use power iteration method
		const eigenvalues: number[] = [];
		const eigenvectors: number[][] = [];
		
		// Initialize random vectors
		for (let i = 0; i < n; i++) {
			eigenvectors[i] = new Array(n).fill(0).map(() => Math.random() - 0.5);
		}

		// Power iteration for dominant eigenvalues
		for (let iter = 0; iter < 100; iter++) {
			for (let i = 0; i < n; i++) {
				const newVector = new Array(n).fill(0);
				for (let j = 0; j < n; j++) {
					for (let k = 0; k < n; k++) {
						newVector[j] += matrix[j][k] * eigenvectors[i][k];
					}
				}
				
				// Normalize
				const norm = Math.sqrt(newVector.reduce((sum, val) => sum + val * val, 0));
				for (let j = 0; j < n; j++) {
					eigenvectors[i][j] = newVector[j] / norm;
				}
			}
		}

		// Calculate eigenvalues
		for (let i = 0; i < n; i++) {
			let eigenvalue = 0;
			for (let j = 0; j < n; j++) {
				for (let k = 0; k < n; k++) {
					eigenvalue += eigenvectors[i][j] * matrix[j][k] * eigenvectors[i][k];
				}
			}
			eigenvalues.push(eigenvalue);
		}

		return { eigenvalues, eigenvectors };
	}

	private calculateEdgeBetweenness(nodes: GraphNode[], adjacencyList: Map<string, string[]>): Map<string, number> {
		const edgeBetweenness = new Map<string, number>();
		
		// Initialize edge betweenness
		for (const node of nodes) {
			const neighbors = adjacencyList.get(node.id) || [];
			for (const neighbor of neighbors) {
				const edgeKey = `${node.id}-${neighbor}`;
				edgeBetweenness.set(edgeKey, 0);
			}
		}

		// Calculate betweenness for each node pair
		for (const source of nodes) {
			for (const target of nodes) {
				if (source.id === target.id) continue;
				
				const { paths, pathCounts } = this.findAllShortestPaths(source.id, target.id, adjacencyList);
				
				for (const path of paths) {
					for (let i = 0; i < path.length - 1; i++) {
						const edgeKey = `${path[i]}-${path[i + 1]}`;
						const reverseKey = `${path[i + 1]}-${path[i]}`;
						
						const current = edgeBetweenness.get(edgeKey) || 0;
						edgeBetweenness.set(edgeKey, current + 1 / pathCounts);
						
						const currentReverse = edgeBetweenness.get(reverseKey) || 0;
						edgeBetweenness.set(reverseKey, currentReverse + 1 / pathCounts);
					}
				}
			}
		}

		return edgeBetweenness;
	}

	private findAllShortestPaths(source: string, target: string, adjacencyList: Map<string, string[]>): { paths: string[][], pathCounts: number } {
		const queue: Array<{ node: string; path: string[] }> = [{ node: source, path: [source] }];
		const visited = new Set<string>();
		const paths: string[][] = [];
		let shortestLength = Infinity;

		while (queue.length > 0) {
			const { node, path } = queue.shift()!;
			
			if (node === target) {
				if (path.length <= shortestLength) {
					if (path.length < shortestLength) {
						paths.length = 0; // Clear longer paths
						shortestLength = path.length;
					}
					paths.push([...path]);
				}
				continue;
			}

			if (visited.has(node)) continue;
			visited.add(node);

			const neighbors = adjacencyList.get(node) || [];
			for (const neighbor of neighbors) {
				if (!path.includes(neighbor)) {
					queue.push({ node: neighbor, path: [...path, neighbor] });
				}
			}
		}

		return { paths, pathCounts: paths.length };
	}

	private findConnectedComponents(nodes: GraphNode[], edges: GraphEdge[]): string[][] {
		const components: string[][] = [];
		const visited = new Set<string>();
		const adjacencyList = this.buildAdjacencyList(nodes, edges);

		for (const node of nodes) {
			if (!visited.has(node.id)) {
				const component: string[] = [];
				this.dfs(node.id, adjacencyList, visited, component);
				components.push(component);
			}
		}

		return components;
	}

	private dfs(nodeId: string, adjacencyList: Map<string, string[]>, visited: Set<string>, component: string[]): void {
		visited.add(nodeId);
		component.push(nodeId);

		const neighbors = adjacencyList.get(nodeId) || [];
		for (const neighbor of neighbors) {
			if (!visited.has(neighbor)) {
				this.dfs(neighbor, adjacencyList, visited, component);
			}
		}
	}

	private findBestCommunity(
		nodeId: string,
		nodeCommunities: Map<string, number>,
		adjacencyList: Map<string, string[]>,
		edges: GraphEdge[]
	): number {
		const neighbors = adjacencyList.get(nodeId) || [];
		const communityGains = new Map<number, number>();

		// Calculate modularity gain for each possible community
		for (const neighbor of neighbors) {
			const neighborCommunity = nodeCommunities.get(neighbor)!;
			const currentGain = communityGains.get(neighborCommunity) || 0;
			communityGains.set(neighborCommunity, currentGain + 1);
		}

		// Find community with highest gain
		let bestCommunity = nodeCommunities.get(nodeId)!;
		let bestGain = communityGains.get(bestCommunity) || 0;

		for (const [community, gain] of communityGains) {
			if (gain > bestGain) {
				bestGain = gain;
				bestCommunity = community;
			}
		}

		return bestCommunity;
	}

	private calculateModularity(
		nodeCommunities: Map<string, number>,
		adjacencyList: Map<string, string[]>,
		edges: GraphEdge[]
	): number {
		let modularity = 0;
		const m = edges.length;

		for (const edge of edges) {
			const sourceCommunity = nodeCommunities.get(edge.sourceId)!;
			const targetCommunity = nodeCommunities.get(edge.targetId)!;
			
			const ki = (adjacencyList.get(edge.sourceId) || []).length;
			const kj = (adjacencyList.get(edge.targetId) || []).length;
			
			const delta = sourceCommunity === targetCommunity ? 1 : 0;
			const expected = (ki * kj) / (2 * m);
			
			modularity += delta - expected;
		}

		return modularity / (2 * m);
	}

	private calculateOverallModularity(
		communities: Community[],
		nodes: GraphNode[],
		edges: GraphEdge[]
	): number {
		if (communities.length === 0) return 0;

		let totalModularity = 0;
		for (const community of communities) {
			totalModularity += community.modularity;
		}

		return totalModularity / communities.length;
	}

	private async createCommunity(
		id: string,
		nodeIds: string[],
		edges: GraphEdge[],
		algorithm: string,
		iterations: number
	): Promise<Community> {
		// Find edges within the community
		const communityEdges = edges.filter(edge => 
			nodeIds.includes(edge.sourceId) && nodeIds.includes(edge.targetId)
		);

		// Calculate community metrics
		const density = this.calculateDensity(nodeIds.length, communityEdges.length);
		const cohesion = this.calculateCohesion(nodeIds, communityEdges);
		const modularity = this.calculateCommunityModularity(nodeIds, communityEdges, edges);

		return {
			id,
			nodes: nodeIds,
			edges: communityEdges.map(e => e.id),
			modularity,
			density,
			cohesion,
			metadata: {
				algorithm,
				detectionTime: Date.now(),
				iterations,
				nodeCount: nodeIds.length,
				edgeCount: communityEdges.length
			}
		};
	}

	private calculateDensity(nodeCount: number, edgeCount: number): number {
		if (nodeCount <= 1) return 0;
		const maxEdges = (nodeCount * (nodeCount - 1)) / 2;
		return edgeCount / maxEdges;
	}

	private calculateCohesion(nodeIds: string[], edges: GraphEdge[]): number {
		if (nodeIds.length <= 1) return 0;
		
		let totalWeight = 0;
		let maxPossibleWeight = 0;
		
		for (const edge of edges) {
			if (nodeIds.includes(edge.sourceId) && nodeIds.includes(edge.targetId)) {
				totalWeight += 1; // Assuming unweighted edges
			}
		}
		
		maxPossibleWeight = (nodeIds.length * (nodeIds.length - 1)) / 2;
		return totalWeight / maxPossibleWeight;
	}

	private calculateCommunityModularity(
		nodeIds: string[],
		communityEdges: GraphEdge[],
		allEdges: GraphEdge[]
	): number {
		const m = allEdges.length;
		if (m === 0) return 0;

		let modularity = 0;
		for (const edge of communityEdges) {
			const ki = allEdges.filter(e => e.sourceId === edge.sourceId || e.targetId === edge.sourceId).length;
			const kj = allEdges.filter(e => e.sourceId === edge.targetId || e.targetId === edge.targetId).length;
			
			const expected = (ki * kj) / (2 * m);
			modularity += 1 - expected;
		}

		return modularity / (2 * m);
	}
}
