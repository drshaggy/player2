import { describe, it, expect } from 'vitest';
import { SYSTEM_PROMPTS } from '@/lib/prompts';

describe('Prompt Generation', () => {
  it('should generate a non-empty prompt for move selection', () => {
    const mockData = {
      persona: 'aggressive',
      boardMap: 'r n b q k b n r\\np p p p p p p p\\n\\n\\n\\nP P P P    .\\n\\nP P P P P P P .\\nR N B Q K B N R',
      semanticState: 'Starting position',
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      processedCandidates: [
        { move: 'e5', score: '0.29', depth: 12 },
        { move: 'Nf6', score: '0.3', depth: 1 },
        { move: 'd5', score: '0.44', depth: 1 },
        { move: 'c5', score: '0.0 (Book)', depth: 0 },
        { move: 'c6', score: '0.0 (Book)', depth: 0 },
      ],
      openingContext: [
        { move: 'e5', name: 'Open Game', description: 'Symmetrical' },
        { move: 'c5', name: 'Sicilian Defense', description: 'Aggressive' },
        { move: 'c6', name: 'Caro-Kann Defense', description: 'Solid' },
      ],
      sessionGoal: 'Practice the Caro-Kann Defense',
    };

    const prompt = SYSTEM_PROMPTS.moveSelection(
      mockData.persona,
      mockData.boardMap,
      mockData.semanticState,
      mockData.fen,
      mockData.processedCandidates,
      mockData.openingContext,
      mockData.sessionGoal
    );

    expect(prompt).toBeDefined();
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain('Practice the Caro-Kann Defense');
    expect(prompt).toContain('aggressive');
  });
});
