import { describe, it, expect } from 'vitest';
import { generateAsciiBoard } from '@/lib/utils/board';

describe('generateAsciiBoard', () => {
  it('should correctly generate a board for the starting position', () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
    const result = generateAsciiBoard(startFen);
    
    const lines = result.split('\n');
    expect(lines).toHaveLength(8);
    expect(lines[0]).toBe('r n b q k b n r');
    expect(lines[7]).toBe('R N B Q K B N R');
  });

  it('should correctly handle numbered squares (e.g., 8 a a a a a a a)', () => {
    // Custom FEN part to test digit expansion
    const fen = '8/8/8/8/8/8/8/8';
    const result = generateAsciiBoard(fen);
    const lines = result.split('\n');
    
    lines.forEach(line => {
      expect(line).toBe('. . . . . . . .');
    });
  });

  it('should correctly handle pieces after numbers', () => {
    // FEN: rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR';
    const result = generateAsciiBoard(fen);
    const lines = result.split('\n');
    
    // Rank 4 is index 4: "4P3" -> . . . . P . . .
    expect(lines[4]).toBe('. . . . P . . .');
    // Rank 2 is index 6: "PPPP1PPP" -> P P P P . P P P
    expect(lines[6]).toBe('P P P P . P P P');
  });


  it('should pad short rows with dots', () => {
    const fen = 'p/p/p/p/p/p/p/p';
    const result = generateAsciiBoard(fen);
    const lines = result.split('\n');
    
    lines.forEach(line => {
      expect(line).toBe('p . . . . . . .');
    });
  });
});
