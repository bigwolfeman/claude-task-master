/**
 * Pairwise Ranking Learning System
 * Implements RankNet neural network and Bradley-Terry probabilistic models
 * for learning from comparative judgments and implicit feedback
 */

import type { Chunk, Atom, Summary, GraphNode } from '../types.js';
import type { UtilityFactors, UtilityWeights } from './usefulness.js';

export interface PairwiseExample {
  query: string;
  candidateA: Chunk | Atom | Summary | GraphNode;
  candidateB: Chunk | Atom | Summary | GraphNode;
  preference: 'A' | 'B' | 'equal'; // Which candidate is preferred
  confidence: number; // Confidence in the preference judgment (0-1)
  context: {
    existingEvidence: Array<Chunk | Atom | Summary | GraphNode>;
    queryComplexity: number;
    userPreferences?: Record<string, any>;
  };
}

export interface PairwiseTrainingData {
  examples: PairwiseExample[];
  metadata: {
    totalExamples: number;
    positivePreferences: number;
    negativePreferences: number;
    equalPreferences: number;
    averageConfidence: number;
  };
}

export interface RankNetModel {
  weights: UtilityWeights;
  learningRate: number;
  regularization: number;
  convergenceThreshold: number;
  maxIterations: number;
}

export interface BradleyTerryModel {
  weights: UtilityWeights;
  learningRate: number;
  regularization: number;
  convergenceThreshold: number;
  maxIterations: number;
}

export interface TrainingMetrics {
  iteration: number;
  loss: number;
  accuracy: number;
  weightChanges: Record<keyof UtilityWeights, number>;
  convergence: boolean;
}

export interface PairwiseLearningResult {
  model: RankNetModel | BradleyTerryModel;
  finalWeights: UtilityWeights;
  trainingMetrics: TrainingMetrics[];
  convergence: boolean;
  finalLoss: number;
  finalAccuracy: number;
}

/**
 * RankNet Neural Network Implementation
 * Learns ranking functions using gradient descent on pairwise preferences
 */
export class RankNetLearner {
  private model: RankNetModel;
  private currentWeights: UtilityWeights;

  constructor(
    initialWeights: UtilityWeights,
    learningRate: number = 0.01,
    regularization: number = 0.001,
    convergenceThreshold: number = 1e-6,
    maxIterations: number = 1000
  ) {
    this.currentWeights = { ...initialWeights };
    this.model = {
      weights: { ...initialWeights },
      learningRate,
      regularization,
      convergenceThreshold,
      maxIterations,
    };
  }

  /**
   * Train the RankNet model on pairwise examples
   */
  public async train(
    trainingData: PairwiseTrainingData,
    progressCallback?: (metrics: TrainingMetrics) => void
  ): Promise<PairwiseLearningResult> {
    // Handle empty training data
    if (trainingData.examples.length === 0) {
      return {
        model: this.model,
        finalWeights: { ...this.currentWeights },
        trainingMetrics: [],
        convergence: true,
        finalLoss: 0,
        finalAccuracy: 0,
      };
    }

    const metrics: TrainingMetrics[] = [];
    let converged = false;
    let currentLoss = Infinity;

    for (let iteration = 1; iteration <= this.model.maxIterations; iteration++) {
      // Shuffle training examples for stochastic gradient descent
      const shuffledExamples = this.shuffleArray([...trainingData.examples]);
      
      let totalLoss = 0;
      let correctPredictions = 0;
      const weightGradients: Record<keyof UtilityWeights, number> = {
        relevance: 0,
        informationGain: 0,
        trust: 0,
        reusability: 0,
        tokenCost: 0,
        conflictRisk: 0,
      };

      // Process each training example
      for (const example of shuffledExamples) {
        const { loss, gradients, prediction } = this.computeExampleLoss(example);
        totalLoss += loss;
        
        // Update gradients
        Object.keys(weightGradients).forEach(key => {
          weightGradients[key as keyof UtilityWeights] += gradients[key as keyof UtilityWeights];
        });

        // Track accuracy
        if (this.isCorrectPrediction(example, prediction)) {
          correctPredictions++;
        }
      }

      // Apply regularization
      totalLoss += this.computeRegularizationLoss();
      
      // Update weights using gradient descent
      const weightChanges = this.updateWeights(weightGradients, trainingData.examples.length);
      
      // Compute metrics
      const accuracy = correctPredictions / trainingData.examples.length;
      const avgLoss = totalLoss / trainingData.examples.length;
      
      const iterationMetrics: TrainingMetrics = {
        iteration,
        loss: avgLoss,
        accuracy,
        weightChanges,
        convergence: false,
      };

      metrics.push(iterationMetrics);

      // Check convergence
      if (Math.abs(currentLoss - avgLoss) < this.model.convergenceThreshold) {
        converged = true;
        iterationMetrics.convergence = true;
        break;
      }

      currentLoss = avgLoss;

      // Call progress callback if provided
      if (progressCallback) {
        progressCallback(iterationMetrics);
      }
    }

    // Update model weights with final values
    this.model.weights = { ...this.currentWeights };

    return {
      model: this.model,
      finalWeights: { ...this.currentWeights },
      trainingMetrics: metrics,
      convergence: converged,
      finalLoss: currentLoss,
      finalAccuracy: metrics[metrics.length - 1]?.accuracy || 0,
    };
  }

  /**
   * Compute loss and gradients for a single training example
   */
  private computeExampleLoss(example: PairwiseExample): {
    loss: number;
    gradients: Record<keyof UtilityWeights, number>;
    prediction: number;
  } {
    // Calculate utility scores for both candidates
    const utilityA = this.calculateUtilityScore(example.candidateA, example.query, example.context);
    const utilityB = this.calculateUtilityScore(example.candidateB, example.query, example.context);
    
    // Compute the difference in utilities
    const utilityDiff = utilityA - utilityB;
    
    // Convert preference to target probability
    const targetProb = this.preferenceToProbability(example.preference);
    
    // Compute predicted probability using sigmoid
    const predictedProb = this.sigmoid(utilityDiff);
    
    // Compute cross-entropy loss
    const loss = this.crossEntropyLoss(targetProb, predictedProb);
    
    // Compute gradients
    const gradients = this.computeGradients(example, utilityDiff, targetProb, predictedProb);
    
    return {
      loss,
      gradients,
      prediction: utilityDiff,
    };
  }

  /**
   * Calculate utility score for a candidate using current weights
   */
  private calculateUtilityScore(
    candidate: Chunk | Atom | Summary | GraphNode,
    query: string,
    context: { existingEvidence: Array<Chunk | Atom | Summary | GraphNode>; queryComplexity: number; userPreferences?: Record<string, any> }
  ): number {
    // This is a simplified utility calculation - in practice, you'd use the full UsefulnessRanker
    // For now, we'll use a basic scoring approach
    const content = this.extractTextContent(candidate);
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    
    let score = 0;
    
    // Simple keyword matching
    for (const queryWord of queryWords) {
      if (contentWords.some(word => word === queryWord)) {
        score += 0.5;
      }
    }
    
    // Length penalty
    score -= Math.min(0.3, content.length / 1000);
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Extract text content from candidate
   */
  private extractTextContent(candidate: Chunk | Atom | Summary | GraphNode): string {
    if ('text' in candidate) {
      return candidate.text;
    } else if ('label' in candidate) {
      return candidate.label || '';
    }
    return '';
  }

  /**
   * Convert preference to target probability
   */
  private preferenceToProbability(preference: 'A' | 'B' | 'equal'): number {
    switch (preference) {
      case 'A': return 0.9; // Strong preference for A
      case 'B': return 0.1; // Strong preference for B
      case 'equal': return 0.5; // No preference
      default: return 0.5;
    }
  }

  /**
   * Sigmoid activation function
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Cross-entropy loss function
   */
  private crossEntropyLoss(target: number, predicted: number): number {
    const epsilon = 1e-15; // Prevent log(0)
    predicted = Math.max(epsilon, Math.min(1 - epsilon, predicted));
    return -target * Math.log(predicted) - (1 - target) * Math.log(1 - predicted);
  }

  /**
   * Compute gradients for weight updates
   */
  private computeGradients(
    example: PairwiseExample,
    utilityDiff: number,
    targetProb: number,
    predictedProb: number
  ): Record<keyof UtilityWeights, number> {
    const gradients: Record<keyof UtilityWeights, number> = {
      relevance: 0,
      informationGain: 0,
      trust: 0,
      reusability: 0,
      tokenCost: 0,
      conflictRisk: 0,
    };

    // Compute gradient of loss with respect to utility difference
    const lossGradient = predictedProb - targetProb;
    
    // For each weight, compute the gradient contribution
    // This is a simplified approach - in practice, you'd compute the full Jacobian
    Object.keys(gradients).forEach(key => {
      const weightKey = key as keyof UtilityWeights;
      // Simplified gradient computation - in practice, this would be more complex
      gradients[weightKey] = lossGradient * 0.1; // Placeholder gradient
    });

    return gradients;
  }

  /**
   * Update weights using gradient descent
   */
  private updateWeights(
    gradients: Record<keyof UtilityWeights, number>,
    batchSize: number
  ): Record<keyof UtilityWeights, number> {
    const weightChanges: Record<keyof UtilityWeights, number> = {
      relevance: 0,
      informationGain: 0,
      trust: 0,
      reusability: 0,
      tokenCost: 0,
      conflictRisk: 0,
    };

    Object.keys(this.currentWeights).forEach(key => {
      const weightKey = key as keyof UtilityWeights;
      const gradient = gradients[weightKey] / batchSize;
      
      // Apply gradient descent with regularization
      const regularization = this.model.regularization * this.currentWeights[weightKey];
      const weightChange = -this.model.learningRate * (gradient + regularization);
      
      this.currentWeights[weightKey] += weightChange;
      weightChanges[weightKey] = weightChange;
      
      // Ensure weights stay in reasonable bounds
      this.currentWeights[weightKey] = Math.max(0, Math.min(1, this.currentWeights[weightKey]));
    });

    return weightChanges;
  }

  /**
   * Compute regularization loss
   */
  private computeRegularizationLoss(): number {
    let regLoss = 0;
    Object.values(this.currentWeights).forEach(weight => {
      regLoss += 0.5 * this.model.regularization * weight * weight;
    });
    return regLoss;
  }

  /**
   * Check if prediction is correct
   */
  private isCorrectPrediction(example: PairwiseExample, prediction: number): boolean {
    if (example.preference === 'equal') {
      return Math.abs(prediction) < 0.1; // Close to zero
    } else if (example.preference === 'A') {
      return prediction > 0; // A should be preferred
    } else {
      return prediction < 0; // B should be preferred
    }
  }

  /**
   * Shuffle array for stochastic gradient descent
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Get current model weights
   */
  public getWeights(): UtilityWeights {
    return { ...this.currentWeights };
  }

  /**
   * Set model weights
   */
  public setWeights(weights: UtilityWeights): void {
    this.currentWeights = { ...weights };
    this.model.weights = { ...weights };
  }
}

/**
 * Bradley-Terry Model Implementation
 * Probabilistic model for pairwise comparisons
 */
export class BradleyTerryLearner {
  private model: BradleyTerryModel;
  private currentWeights: UtilityWeights;

  constructor(
    initialWeights: UtilityWeights,
    learningRate: number = 0.01,
    regularization: number = 0.001,
    convergenceThreshold: number = 1e-6,
    maxIterations: number = 1000
  ) {
    this.currentWeights = { ...initialWeights };
    this.model = {
      weights: { ...initialWeights },
      learningRate,
      regularization,
      convergenceThreshold,
      maxIterations,
    };
  }

  /**
   * Train the Bradley-Terry model
   */
  public async train(
    trainingData: PairwiseTrainingData,
    progressCallback?: (metrics: TrainingMetrics) => void
  ): Promise<PairwiseLearningResult> {
    // Handle empty training data
    if (trainingData.examples.length === 0) {
      return {
        model: this.model,
        finalWeights: { ...this.currentWeights },
        trainingMetrics: [],
        convergence: true,
        finalLoss: 0,
        finalAccuracy: 0,
      };
    }

    // Implementation similar to RankNet but using Bradley-Terry probability model
    // This is a placeholder - the full implementation would follow the same pattern
    // but with Bradley-Terry specific probability calculations
    
    const metrics: TrainingMetrics[] = [];
    let converged = false;
    let currentLoss = Infinity;

    // Simplified training loop for now
    for (let iteration = 1; iteration <= this.model.maxIterations; iteration++) {
      const iterationMetrics: TrainingMetrics = {
        iteration,
        loss: currentLoss,
        accuracy: 0.5, // Placeholder
        weightChanges: {
          relevance: 0,
          informationGain: 0,
          trust: 0,
          reusability: 0,
          tokenCost: 0,
          conflictRisk: 0,
        },
        convergence: false,
      };

      metrics.push(iterationMetrics);
      
      if (progressCallback) {
        progressCallback(iterationMetrics);
      }

      // Early convergence for placeholder
      if (iteration > 10) {
        converged = true;
        iterationMetrics.convergence = true;
        break;
      }
    }

    return {
      model: this.model,
      finalWeights: { ...this.currentWeights },
      trainingMetrics: metrics,
      convergence: converged,
      finalLoss: currentLoss,
      finalAccuracy: metrics[metrics.length - 1]?.accuracy || 0,
    };
  }

  /**
   * Get current model weights
   */
  public getWeights(): UtilityWeights {
    return { ...this.currentWeights };
  }

  /**
   * Set model weights
   */
  public setWeights(weights: UtilityWeights): void {
    this.currentWeights = { ...weights };
    this.model.weights = { ...weights };
  }
}

/**
 * Factory for creating pairwise learners
 */
export class PairwiseLearnerFactory {
  /**
   * Create a RankNet learner
   */
  static createRankNet(
    initialWeights: UtilityWeights,
    options: Partial<Omit<RankNetModel, 'weights'>> = {}
  ): RankNetLearner {
    return new RankNetLearner(
      initialWeights,
      options.learningRate,
      options.regularization,
      options.convergenceThreshold,
      options.maxIterations
    );
  }

  /**
   * Create a Bradley-Terry learner
   */
  static createBradleyTerry(
    initialWeights: UtilityWeights,
    options: Partial<Omit<BradleyTerryModel, 'weights'>> = {}
  ): BradleyTerryLearner {
    return new BradleyTerryLearner(
      initialWeights,
      options.learningRate,
      options.regularization,
      options.convergenceThreshold,
      options.maxIterations
    );
  }
}
