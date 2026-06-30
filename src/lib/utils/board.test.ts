import { describe, it, expect } from 'vitest';
import { generateAsciiBoard, generateSemanticState } from '@/lib/utils/board';

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

describe('generateSemanticState', () => {
  it('reports the opening phase for the starting position', () => {
    const state = generateSemanticState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(state).toContain('Phase: opening.');
    expect(state).toContain('Turn: White to move.');
    expect(state).toContain('Material is equal.');
    expect(state).toContain('Piece count: White 16, Black 16.');
  });

  it('reports Black to move when it is black turn', () => {
    const state = generateSemanticState('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
    expect(state).toContain('Turn: Black to move.');
  });

  it('reports White ahead after capturing a black pawn', () => {
    // White has an extra pawn (8 vs 7).
    const state = generateSemanticState('rnbqkbnr/pppp1ppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1');
    expect(state).toContain('White is ahead by 1 in material');
    expect(state).toContain('White is up 1 pawns');
  });

  it('reports Black ahead after losing a white knight', () => {
    // White is missing the b1 knight (1N vs 2n).
    const state = generateSemanticState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/R1BQKBNR w KQkq - 0 1');
    expect(state).toContain('Black is ahead by 3 in material');
    expect(state).toContain('Black is up 1 knights');
  });

  it('detects endgame when queens and most major pieces are gone', () => {
    // K+R vs K+R, no queens, 8 pawns total.
    const state = generateSemanticState('4k3/4r3/8/8/8/8/4R3/4K3 w - - 0 30');
    expect(state).toContain('Phase: endgame.');
  });

  it('detects middlegame with reduced material but still many pieces', () => {
    // Move 15, both sides have queen + 2 rooks + minor pieces.
    const state = generateSemanticState('r2q1rk1/ppp2ppp/2n1bn2/3p4/3P4/2N1BN2/PPP2PPP/R2Q1RK1 w - - 0 15');
    expect(state).toContain('Phase: middlegame.');
  });

  it('reports equal material in a symmetrical middlegame', () => {
    const state = generateSemanticState('r2q1rk1/ppp2ppp/2n1bn2/3p4/3P4/2N1BN2/PPP2PPP/R2Q1RK1 w - - 0 15');
    expect(state).toContain('Material is equal.');
  });
});
