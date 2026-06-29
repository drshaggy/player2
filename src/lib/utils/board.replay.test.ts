import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';

describe('Chess Move Replay Logic', () => {
  it('should correctly rebuild game state and history from a move sequence', () => {
    const chess = new Chess();
    const moveSequence = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'];
    
    // Simulate the replay logic used in ChessGame.tsx
    chess.reset();
    for (const san of moveSequence) {
      chess.move(san);
    }
    
    expect(chess.history()).toEqual(moveSequence);
    // Actual FEN for the Ruy Lopez sequence provided: e4 e5 Nf3 Nc6 Bb5 a6
    expect(chess.fen()).toBe('r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4');
  });

  it('should not crash and should continue replaying when encountering an invalid move', () => {
    const chess = new Chess();
    const moveSequence = ['e4', 'invalid_move', 'e5'];
    
    chess.reset();
    const results: string[] = [];
    
    for (const san of moveSequence) {
      try {
        chess.move(san);
        results.push('success');
      } catch (e) {
        results.push('failure');
      }
    }
    
    // e4 (W) success -> turn is Black
    // invalid_move (B) failure -> turn remains Black
    // e5 (B) success (because it's black's turn and e5 is legal)
    expect(results).toEqual(['success', 'failure', 'success']);
    expect(chess.history()).toEqual(['e4', 'e5']);
  });

  it('should recover and maintain correct turn after a failed move replay', () => {
    const chess = new Chess();
    const moveSequence = ['e4', 'invalid_move', 'e5']; 
    
    chess.reset();
    for (const san of moveSequence) {
      try {
        chess.move(san);
      } catch (e) {}
    }
    
    // e4 success, invalid failure, e5 success
    expect(chess.history()).toEqual(['e4', 'e5']);
    expect(chess.turn()).toBe('w');
  });
});
