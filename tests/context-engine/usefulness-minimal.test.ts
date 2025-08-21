import { UsefulnessRanker } from '../../src/context-engine/rank/usefulness.js';

describe('UsefulnessRanker Minimal', () => {
  it('should create instance', () => {
    const ranker = new UsefulnessRanker();
    expect(ranker).toBeInstanceOf(UsefulnessRanker);
  });

  it('should detect conflicts', () => {
    const ranker = new UsefulnessRanker();

    const positiveChunk = {
      id: 'chunk14',
      docId: 'doc14',
      text: 'Machine learning is effective for this task.',
      tokens: 15,
      metadata: {},
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    const negativeChunk = {
      id: 'chunk15',
      docId: 'doc15',
      text: 'Machine learning is not effective for this task.',
      tokens: 15,
      metadata: {},
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    const query = 'test query';
    const context = {
      existingEvidence: [positiveChunk],
      queryComplexity: 0.5
    };

    // These assertions should always pass if the test is running
    expect(positiveChunk.text).toBe('Machine learning is effective for this task.');
    expect(negativeChunk.text).toBe('Machine learning is not effective for this task.');
    expect(positiveChunk.text.includes('is effective')).toBe(true);
    expect(negativeChunk.text.includes('is not effective')).toBe(true);

    const { factors } = ranker.calculateUtility(negativeChunk, query, context);

    // This should show us what the factors look like
    expect(factors).toBeDefined();
    expect(factors.conflictRisk).toBeDefined();
    expect(typeof factors.conflictRisk).toBe('number');

    // The conflict detection should now work and return a value > 0
    expect(factors.conflictRisk).toBeGreaterThan(0);
    
    // Verify the conflict risk is reasonable (should be around 0.6 based on our algorithm)
    expect(factors.conflictRisk).toBeCloseTo(0.6, 1);
  });
});
