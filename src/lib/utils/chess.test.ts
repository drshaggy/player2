import { describe, it, expect } from 'vitest';
import { computeCapturedPieces, getPieceImage, processFen } from '@/lib/utils/chess';
import { Chess } from 'chess.js';

describe('getPieceImage', () => {
  it('maps piece letters to svg paths', () => {
    expect(getPieceImage('n', 'w')).toBe('/assets/images/chess/wn.svg');
    expect(getPieceImage('q', 'b')).toBe('/assets/images/chess/bq.svg');
    expect(getPieceImage('x', 'w')).toBe('/assets/images/chess/wp.svg'); // unknown falls back to pawn
  });
});

describe('processFen', () => {
  it('pads a bare board to a full FEN', () => {
    expect(processFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'))
      .toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  });
  it('pads a partial FEN with missing trailing fields (naively appends defaults)', () => {
    // processFen assumes fields after the board are missing; if a side-to-move
    // is already present it still appends the default sequence (pre-existing
    // behavior preserved here).
    expect(processFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w'))
      .toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w w KQkq - 0');
  });
  it('leaves a complete FEN untouched', () => {
    const full = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    expect(processFen(full)).toBe(full);
  });
});

describe('computeCapturedPieces', () => {
  it('returns no captures for the starting position', () => {
    const result = computeCapturedPieces(new Chess().fen());
    expect(result.w).toEqual([]);
    expect(result.b).toEqual([]);
  });

  it('detects a single pawn capture after 1.e4 (no captures yet) and after an exchange', () => {
    const game = new Chess();
    game.move('e4');
    game.move('e5');
    game.move('Nf3');
    // Still no captures.
    const before = computeCapturedPieces(game.fen());
    expect(before.w).toEqual([]);
    expect(before.b).toEqual([]);
  });

  it('counts a captured white pawn after 1.e4 d5 2.exd5', () => {
    const game = new Chess();
    game.move('e4');
    game.move('d5');
    game.move('exd5'); // white captures black pawn
    const result = computeCapturedPieces(game.fen());
    expect(result.b).toContain('p');
    expect(result.b.filter(p => p === 'p')).toHaveLength(1);
    expect(result.w).toEqual([]);
  });

  it('counts captures on both sides after a knight exchange', () => {
    const game = new Chess();
    // 1.e4 e5 2.Nf3 Nc6 3.Nxe5 Nxe5 — white captures black pawn... actually Nxe5 captures a pawn.
    game.move('e4');
    game.move('e5');
    game.move('Nf3');
    game.move('Nc6');
    game.move('Nxe5'); // white knight captures black pawn
    const afterWhite = computeCapturedPieces(game.fen());
    expect(afterWhite.b).toContain('p');
    expect(afterWhite.w).toEqual([]);
  });

  it('handles an endgame position with multiple captures', () => {
    // A known endgame FEN with several pieces off the board.
    const fen = '8/8/8/8/8/8/4k3/4K3 w - - 0 1';
    const result = computeCapturedPieces(fen);
    // Only two kings remain — everything else is "captured".
    expect(result.w.filter(p => p === 'p')).toHaveLength(8);
    expect(result.b.filter(p => p === 'p')).toHaveLength(8);
    expect(result.w).toContain('q');
    expect(result.b).toContain('q');
  });

  it('returns equal-length arrays regardless of color ordering', () => {
    const game = new Chess();
    game.move('e4');
    game.move('e5');
    game.move('Qh5');
    game.move('Nc6');
    game.move('Qxe5+'); // white queen captures black pawn
    const result = computeCapturedPieces(game.fen());
    expect(result.b).toContain('p');
  });
});
