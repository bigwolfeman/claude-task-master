/**
 * neighborhood-expansion.ts
 * Neighborhood Expansion Algorithms
 * Implements various algorithms for exploring and expanding neighborhoods in knowledge graphs
 */

import type { GraphNode, GraphEdge } from '../types.js';
import type { StorageBackend } from './store.js';

export interface NeighborhoodExpansionOptions {
	algorithm: 'breadth-first' | 'depth-first' | 'random-walk' | 'weighted' | 'temporal';
	maxDepth: number;
	maxNodes: number;
	maxEdges: number;
	includeWeights: boolean;
	includeTemporal: boolean;
	randomWalkSteps: number;
	weightThreshold: number;
	temporalWindow: number; // in milliseconds
}

export interface NeighborhoodNode {
	nodeId: string;
	depth: number;
	path: string[]; // Path from source to this node
	weight: number;
	temporalScore: number;
	metadata: Record<string, unknown>;
}

export interface NeighborhoodEdge {
	edgeId: string;
	sourceId: string;
	targetId: string;
	weight: number;
	temporalScore: number;
	metadata: Record<string, unknown>;
}

export interface NeighborhoodExpansionResult {
	sourceNode: string;
	nodes: NeighborhoodNode[];
	edges: NeighborhoodEdge[];
	expansionTime: number;
	metadata: {
		algorithm: string;
		maxDepth: number;
		totalPaths: number;
		options: NeighborhoodExpansionOptions;
	};
}

export class NeighborhoodExpander {
	constructor(
		private storage: StorageBackend,
		private options: NeighborhoodExpansionOptions = {
			algorithm: 'breadth-first',
			maxDepth: 3,
			maxNodes: 1000,
			maxEdges: 2000,
			includeWeights: true,
			includeTemporal: true,
			randomWalkSteps: 1000,
			weightThreshold: 0.1,
			temporalWindow: 24 * 60 * 60 * 1000 // 24 hours
		}
	) {}

	/**
	 * Expand neighborhood from a source node
	 */
	async expandNeighborhood(sourceNodeId: string): Promise<NeighborhoodExpansionResult> {
		const startTime = Date.now();
		
		try {
			// Verify source node exists
			const sourceNode = await this.storage.getGraphNode(sourceNodeId);
			if (!sourceNode) {
				throw new Error(`Source node ${sourceNodeId} not found`);
			}

			let nodes: NeighborhoodNode[];
			let edges: NeighborhoodEdge[];

			switch (this.options.algorithm) {
				case 'breadth-first':
					({ nodes, edges } = await this.breadthFirstExpansion(sourceNodeId));
					break;
				case 'depth-first':
					({ nodes, edges } = await this.depthFirstExpansion(sourceNodeId));
					break;
				case 'random-walk':
					({ nodes, edges } = await this.randomWalkExpansion(sourceNodeId));
					break;
				case 'weighted':
					({ nodes, edges } = await this.weightedExpansion(sourceNodeId));
					break;
				case 'temporal':
					({ nodes, edges } = await this.temporalExpansion(sourceNodeId));
					break;
				default:
					throw new Error(`Unknown algorithm: ${this.options.algorithm}`);
			}

			// Limit results
			if (nodes.length > this.options.maxNodes) {
				nodes = nodes.slice(0, this.options.maxNodes);
			}
			if (edges.length > this.options.maxEdges) {
				edges = edges.slice(0, this.options.maxEdges);
			}

			return {
				sourceNode: sourceNodeId,
				nodes,
				edges,
				expansionTime: Date.now() - startTime,
				metadata: {
					algorithm: this.options.algorithm,
					maxDepth: this.options.maxDepth,
					totalPaths: this.countTotalPaths(nodes),
					options: this.options
				}
			};

		} catch (error) {
			console.error('Error expanding neighborhood:', error);
			throw error;
		}
	}

	/**
	 * Breadth-First Search expansion
	 */
	private async breadthFirstExpansion(sourceNodeId: string): Promise<{ nodes: NeighborhoodNode[], edges: NeighborhoodEdge[] }> {
		const nodes = new Map<string, NeighborhoodNode>();
		const edges = new Map<string, NeighborhoodEdge>();
		const queue: Array<{ nodeId: string; depth: number; path: string[] }> = [
			{ nodeId: sourceNodeId, depth: 0, path: [sourceNodeId] }
		];
		const visited = new Set<string>();

		// Add source node
		nodes.set(sourceNodeId, {
			nodeId: sourceNodeId,
			depth: 0,
			path: [sourceNodeId],
			weight: 1.0,
			temporalScore: 1.0,
			metadata: {}
		});

		while (queue.length > 0 && nodes.size < this.options.maxNodes) {
			const { nodeId, depth, path } = queue.shift()!;
			
			if (visited.has(nodeId) || depth >= this.options.maxDepth) continue;
			visited.add(nodeId);

			// Get neighbors
			const neighborEdges = await this.storage.getGraphEdgesByNode(nodeId);
			
			for (const edge of neighborEdges) {
				if (edges.size >= this.options.maxEdges) break;
				
				const neighborId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;
				
				if (!visited.has(neighborId) && depth < this.options.maxDepth) {
					const newPath = [...path, neighborId];
					
					// Add neighbor node
					if (!nodes.has(neighborId)) {
						nodes.set(neighborId, {
							nodeId: neighborId,
							depth: depth + 1,
							path: newPath,
							weight: this.calculateNodeWeight(edge, depth + 1),
							temporalScore: this.calculateTemporalScore(edge),
							metadata: {
								parentNode: nodeId,
								edgeType: edge.type
							}
						});
					}

					// Add edge
					const edgeKey = `${edge.sourceId}-${edge.targetId}`;
					if (!edges.has(edgeKey)) {
						edges.set(edgeKey, {
							edgeId: edge.id,
							sourceId: edge.sourceId,
							targetId: edge.targetId,
							weight: this.calculateEdgeWeight(edge, depth),
							temporalScore: this.calculateTemporalScore(edge),
							metadata: {
								edgeType: edge.type,
								depth: depth
							}
						});
					}

					// Add to queue for next level
					queue.push({
						nodeId: neighborId,
						depth: depth + 1,
						path: newPath
					});
				}
			}
		}

		return {
			nodes: Array.from(nodes.values()),
			edges: Array.from(edges.values())
		};
	}

	/**
	 * Depth-First Search expansion
	 */
	private async depthFirstExpansion(sourceNodeId: string): Promise<{ nodes: NeighborhoodNode[], edges: NeighborhoodEdge[] }> {
		const nodes = new Map<string, NeighborhoodNode>();
		const edges = new Map<string, NeighborhoodEdge>();
		const stack: Array<{ nodeId: string; depth: number; path: string[] }> = [
			{ nodeId: sourceNodeId, depth: 0, path: [sourceNodeId] }
		];
		const visited = new Set<string>();

		// Add source node
		nodes.set(sourceNodeId, {
			nodeId: sourceNodeId,
			depth: 0,
			path: [sourceNodeId],
			weight: 1.0,
			temporalScore: 1.0,
			metadata: {}
		});

		while (stack.length > 0 && nodes.size < this.options.maxNodes) {
			const { nodeId, depth, path } = stack.pop()!;
			
			if (visited.has(nodeId) || depth >= this.options.maxDepth) continue;
			visited.add(nodeId);

			// Get neighbors
			const neighborEdges = await this.storage.getGraphEdgesByNode(nodeId);
			
			// Sort neighbors by weight for better exploration
			const sortedEdges = neighborEdges.sort((a, b) => {
				const weightA = this.calculateEdgeWeight(a, depth);
				const weightB = this.calculateEdgeWeight(b, depth);
				return weightB - weightA;
			});

			for (const edge of sortedEdges) {
				if (edges.size >= this.options.maxEdges) break;
				
				const neighborId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;
				
				if (!visited.has(neighborId) && depth < this.options.maxDepth) {
					const newPath = [...path, neighborId];
					
					// Add neighbor node
					if (!nodes.has(neighborId)) {
						nodes.set(neighborId, {
							nodeId: neighborId,
							depth: depth + 1,
							path: newPath,
							weight: this.calculateNodeWeight(edge, depth + 1),
							temporalScore: this.calculateTemporalScore(edge),
							metadata: {
								parentNode: nodeId,
								edgeType: edge.type
							}
						});
					}

					// Add edge
					const edgeKey = `${edge.sourceId}-${edge.targetId}`;
					if (!edges.has(edgeKey)) {
						edges.set(edgeKey, {
							edgeId: edge.id,
							sourceId: edge.sourceId,
							targetId: edge.targetId,
							weight: this.calculateEdgeWeight(edge, depth),
							temporalScore: this.calculateTemporalScore(edge),
							metadata: {
								edgeType: edge.type,
								depth: depth
							}
						});
					}

					// Add to stack for next level (LIFO for DFS)
					stack.push({
						nodeId: neighborId,
						depth: depth + 1,
						path: newPath
					});
				}
			}
		}

		return {
			nodes: Array.from(nodes.values()),
			edges: Array.from(edges.values())
		};
	}

	/**
	 * Random Walk expansion
	 */
	private async randomWalkExpansion(sourceNodeId: string): Promise<{ nodes: NeighborhoodNode[], edges: NeighborhoodEdge[] }> {
		const nodes = new Map<string, NeighborhoodNode>();
		const edges = new Map<string, NeighborhoodEdge>();
		const visited = new Set<string>();
		let currentNodeId = sourceNodeId;
		let step = 0;

		// Add source node
		nodes.set(sourceNodeId, {
			nodeId: sourceNodeId,
			depth: 0,
			path: [sourceNodeId],
			weight: 1.0,
			temporalScore: 1.0,
			metadata: {}
		});

		while (step < this.options.randomWalkSteps && nodes.size < this.options.maxNodes) {
			// Get neighbors of current node
			const neighborEdges = await this.storage.getGraphEdgesByNode(currentNodeId);
			
			if (neighborEdges.length === 0) break;

			// Select next node based on weights
			const nextEdge = this.selectNextEdge(neighborEdges, step);
			const nextNodeId = nextEdge.sourceId === currentNodeId ? nextEdge.targetId : nextEdge.sourceId;
			
			// Add next node if not visited
			if (!visited.has(nextNodeId)) {
				visited.add(nextNodeId);
				
				nodes.set(nextNodeId, {
					nodeId: nextNodeId,
					depth: step + 1,
					path: [sourceNodeId, nextNodeId], // Simplified path for random walk
					weight: this.calculateNodeWeight(nextEdge, step + 1),
					temporalScore: this.calculateTemporalScore(nextEdge),
					metadata: {
						step: step + 1,
						edgeType: nextEdge.type
					}
				});
			}

			// Add edge
			const edgeKey = `${nextEdge.sourceId}-${nextEdge.targetId}`;
			if (!edges.has(edgeKey)) {
				edges.set(edgeKey, {
					edgeId: nextEdge.id,
					sourceId: nextEdge.sourceId,
					targetId: nextEdge.targetId,
					weight: this.calculateEdgeWeight(nextEdge, step),
					temporalScore: this.calculateTemporalScore(nextEdge),
					metadata: {
						edgeType: nextEdge.type,
						step: step
					}
				});
			}

			// Move to next node
			currentNodeId = nextNodeId;
			step++;
		}

		return {
			nodes: Array.from(nodes.values()),
			edges: Array.from(edges.values())
		};
	}

	/**
	 * Weighted expansion (prioritizes high-weight edges)
	 */
	private async weightedExpansion(sourceNodeId: string): Promise<{ nodes: NeighborhoodNode[], edges: NeighborhoodEdge[] }> {
		const nodes = new Map<string, NeighborhoodNode>();
		const edges = new Map<string, NeighborhoodEdge>();
		const priorityQueue: Array<{ nodeId: string; depth: number; path: string[]; weight: number }> = [
			{ nodeId: sourceNodeId, depth: 0, path: [sourceNodeId], weight: 1.0 }
		];
		const visited = new Set<string>();

		// Add source node
		nodes.set(sourceNodeId, {
			nodeId: sourceNodeId,
			depth: 0,
			path: [sourceNodeId],
			weight: 1.0,
			temporalScore: 1.0,
			metadata: {}
		});

		while (priorityQueue.length > 0 && nodes.size < this.options.maxNodes) {
			// Sort by weight (highest first)
			priorityQueue.sort((a, b) => b.weight - a.weight);
			const { nodeId, depth, path, weight } = priorityQueue.shift()!;
			
			if (visited.has(nodeId) || depth >= this.options.maxDepth) continue;
			visited.add(nodeId);

			// Get neighbors
			const neighborEdges = await this.storage.getGraphEdgesByNode(nodeId);
			
			// Filter edges by weight threshold
			const validEdges = neighborEdges.filter(edge => {
				const edgeWeight = this.calculateEdgeWeight(edge, depth);
				return edgeWeight >= this.options.weightThreshold;
			});

			for (const edge of validEdges) {
				if (edges.size >= this.options.maxEdges) break;
				
				const neighborId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;
				
				if (!visited.has(neighborId) && depth < this.options.maxDepth) {
					const newPath = [...path, neighborId];
					const edgeWeight = this.calculateEdgeWeight(edge, depth);
					const nodeWeight = weight * edgeWeight;
					
					// Add neighbor node
					if (!nodes.has(neighborId)) {
						nodes.set(neighborId, {
							nodeId: neighborId,
							depth: depth + 1,
							path: newPath,
							weight: nodeWeight,
							temporalScore: this.calculateTemporalScore(edge),
							metadata: {
								parentNode: nodeId,
								edgeType: edge.type,
								accumulatedWeight: nodeWeight
							}
						});
					}

					// Add edge
					const edgeKey = `${edge.sourceId}-${edge.targetId}`;
					if (!edges.has(edgeKey)) {
						edges.set(edgeKey, {
							edgeId: edge.id,
							sourceId: edge.sourceId,
							targetId: edge.targetId,
							weight: edgeWeight,
							temporalScore: this.calculateTemporalScore(edge),
							metadata: {
								edgeType: edge.type,
								depth: depth,
								weight: edgeWeight
							}
						});
					}

					// Add to priority queue
					priorityQueue.push({
						nodeId: neighborId,
						depth: depth + 1,
						path: newPath,
						weight: nodeWeight
					});
				}
			}
		}

		return {
			nodes: Array.from(nodes.values()),
			edges: Array.from(edges.values())
		};
	}

	/**
	 * Temporal expansion (prioritizes recent connections)
	 */
	private async temporalExpansion(sourceNodeId: string): Promise<{ nodes: NeighborhoodNode[], edges: NeighborhoodEdge[] }> {
		const nodes = new Map<string, NeighborhoodNode>();
		const edges = new Map<string, NeighborhoodEdge>();
		const priorityQueue: Array<{ nodeId: string; depth: number; path: string[]; temporalScore: number }> = [
			{ nodeId: sourceNodeId, depth: 0, path: [sourceNodeId], temporalScore: 1.0 }
		];
		const visited = new Set<string>();
		const currentTime = Date.now();

		// Add source node
		nodes.set(sourceNodeId, {
			nodeId: sourceNodeId,
			depth: 0,
			path: [sourceNodeId],
			weight: 1.0,
			temporalScore: 1.0,
			metadata: {}
		});

		while (priorityQueue.length > 0 && nodes.size < this.options.maxNodes) {
			// Sort by temporal score (highest first)
			priorityQueue.sort((a, b) => b.temporalScore - a.temporalScore);
			const { nodeId, depth, path, temporalScore } = priorityQueue.shift()!;
			
			if (visited.has(nodeId) || depth >= this.options.maxDepth) continue;
			visited.add(nodeId);

			// Get neighbors
			const neighborEdges = await this.storage.getGraphEdgesByNode(nodeId);
			
			// Filter edges by temporal window
			const validEdges = neighborEdges.filter(edge => {
				const edgeTemporalScore = this.calculateTemporalScore(edge);
				const edgeTime = new Date(edge.createdAt).getTime();
				return (currentTime - edgeTime) <= this.options.temporalWindow;
			});

			for (const edge of validEdges) {
				if (edges.size >= this.options.maxEdges) break;
				
				const neighborId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;
				
				if (!visited.has(neighborId) && depth < this.options.maxDepth) {
					const newPath = [...path, neighborId];
					const edgeTemporalScore = this.calculateTemporalScore(edge);
					const nodeTemporalScore = temporalScore * edgeTemporalScore;
					
					// Add neighbor node
					if (!nodes.has(neighborId)) {
						nodes.set(neighborId, {
							nodeId: neighborId,
							depth: depth + 1,
							path: newPath,
							weight: this.calculateNodeWeight(edge, depth + 1),
							temporalScore: nodeTemporalScore,
							metadata: {
								parentNode: nodeId,
								edgeType: edge.type,
								createdAt: edge.createdAt,
								temporalScore: nodeTemporalScore
							}
						});
					}

					// Add edge
					const edgeKey = `${edge.sourceId}-${edge.targetId}`;
					if (!edges.has(edgeKey)) {
						edges.set(edgeKey, {
							edgeId: edge.id,
							sourceId: edge.sourceId,
							targetId: edge.targetId,
							weight: this.calculateEdgeWeight(edge, depth),
							temporalScore: edgeTemporalScore,
							metadata: {
								edgeType: edge.type,
								depth: depth,
								createdAt: edge.createdAt,
								temporalScore: edgeTemporalScore
							}
						});
					}

					// Add to priority queue
					priorityQueue.push({
						nodeId: neighborId,
						depth: depth + 1,
						path: newPath,
						temporalScore: nodeTemporalScore
					});
				}
			}
		}

		return {
			nodes: Array.from(nodes.values()),
			edges: Array.from(edges.values())
		};
	}

	/**
	 * Helper methods
	 */
	private selectNextEdge(edges: GraphEdge[], step: number): GraphEdge {
		if (edges.length === 1) return edges[0];
		
		// Weighted random selection based on edge weights
		const weights = edges.map(edge => this.calculateEdgeWeight(edge, step));
		const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
		
		let random = Math.random() * totalWeight;
		for (let i = 0; i < edges.length; i++) {
			random -= weights[i];
			if (random <= 0) {
				return edges[i];
			}
		}
		
		return edges[edges.length - 1]; // Fallback
	}

	private calculateNodeWeight(edge: GraphEdge, depth: number): number {
		// Base weight decreases with depth
		const baseWeight = 1.0 / (depth + 1);
		
		// Edge type weight
		let typeWeight = 1.0;
		if (edge.type === 'strong') typeWeight = 1.5;
		else if (edge.type === 'weak') typeWeight = 0.5;
		
		return baseWeight * typeWeight;
	}

	private calculateEdgeWeight(edge: GraphEdge, depth: number): number {
		// Base weight decreases with depth
		const baseWeight = 1.0 / (depth + 1);
		
		// Edge type weight
		let typeWeight = 1.0;
		if (edge.type === 'strong') typeWeight = 1.5;
		else if (edge.type === 'weak') typeWeight = 0.5;
		
		// Relationship strength (if available)
		const strength = edge.metadata?.strength || 1.0;
		
		return baseWeight * typeWeight * strength;
	}

	private calculateTemporalScore(edge: GraphEdge): number {
		if (!this.options.includeTemporal) return 1.0;
		
		const edgeTime = new Date(edge.createdAt).getTime();
		const currentTime = Date.now();
		const age = currentTime - edgeTime;
		
		// Exponential decay: newer edges get higher scores
		const decayRate = 0.0001; // Adjust for desired decay speed
		return Math.exp(-decayRate * age);
	}

	private countTotalPaths(nodes: NeighborhoodNode[]): number {
		const uniquePaths = new Set<string>();
		for (const node of nodes) {
			uniquePaths.add(node.path.join('->'));
		}
		return uniquePaths.size;
	}

	/**
	 * Get neighborhood statistics
	 */
	async getNeighborhoodStats(sourceNodeId: string): Promise<{
		totalNodes: number;
		totalEdges: number;
		averageDepth: number;
		maxDepth: number;
		connectivity: number;
		temporalDistribution: Record<string, number>;
	}> {
		const result = await this.expandNeighborhood(sourceNodeId);
		
		const depths = result.nodes.map(n => n.depth);
		const averageDepth = depths.reduce((sum, depth) => sum + depth, 0) / depths.length;
		const maxDepth = Math.max(...depths);
		
		// Calculate connectivity (edges per node)
		const connectivity = result.edges.length / Math.max(result.nodes.length, 1);
		
		// Temporal distribution
		const temporalDistribution: Record<string, number> = {};
		for (const edge of result.edges) {
			const date = new Date(edge.metadata.createdAt as string).toDateString();
			temporalDistribution[date] = (temporalDistribution[date] || 0) + 1;
		}
		
		return {
			totalNodes: result.nodes.length,
			totalEdges: result.edges.length,
			averageDepth,
			maxDepth,
			connectivity,
			temporalDistribution
		};
	}
}
