import { describe, it, expect } from 'vitest';
import { getOpeningMoves } from '@/lib/openingBook';

describe('Caro-Kann Progression Test', () => {
  it('should provide correct opening moves for a 2-turn Caro-Kann sequence', () => {
    // Turn 1: White plays e4, Black plays c6
    const history1 = ['e4', 'c6'];
    const moves1 = getOpeningMoves(history1, 'balanced');
    
    expect(moves1).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ move: 'd4', name: 'Main Line' })
      ])
    );

    // Turn 2: White plays d4, Black now should see d5 as a book move
    const history2 = ['e4', 'c6', 'd4'];
    const moves2 = getOpeningMoves(history2, 'balanced');
    
    expect(moves2).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ move: 'd5', name: 'Caro-Kann Response' })
      ])
    );
  });

  it('should return empty when moving off the Caro-Kann path', () => {
    // White plays e4, Black plays c6, but White plays Nf3 instead of d4
    const history = ['e4', 'c6', 'Nf3'];
    const moves = getOpeningMoves(history, 'balanced');
    
    expect(moves).toEqual([]);
  });
});
