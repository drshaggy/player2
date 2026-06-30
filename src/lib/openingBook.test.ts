import { describe, it, expect } from 'vitest';
import { getOpeningMoves, getOpeningMove, OPENING_BOOK } from '@/lib/openingBook';

describe('getOpeningMoves', () => {
  it('returns all first-move options for an empty history (start of game)', () => {
    const moves = getOpeningMoves([], 'balanced');
    expect(moves).toHaveLength(2);
    expect(moves.map(m => m.move)).toEqual(['e4', 'd4']);
  });

  it('returns Caro-Kann main line options after e4 c6', () => {
    const moves = getOpeningMoves(['e4', 'c6'], 'balanced');
    expect(moves).toHaveLength(1);
    expect(moves[0].move).toBe('d4');
    expect(moves[0].name).toBe('Main Line');
  });

  it('returns Open Game responses after e4 e5', () => {
    const moves = getOpeningMoves(['e4', 'e5'], 'balanced');
    expect(moves.map(m => m.move)).toEqual(['Nf3']);
  });

  it('returns Ruy Lopez and Italian Game responses after e4 e5 Nf3 Nc6', () => {
    const moves = getOpeningMoves(['e4', 'e5', 'Nf3', 'Nc6'], 'balanced');
    expect(moves.map(m => m.move)).toEqual(['Bb5', 'Bc4']);
  });

  it('returns empty array when moving off book', () => {
    // White plays e4, Black plays c6, but White plays Nf3 instead of d4
    const moves = getOpeningMoves(['e4', 'c6', 'Nf3'], 'balanced');
    expect(moves).toEqual([]);
  });

  it('returns empty array for a deep non-book sequence', () => {
    const moves = getOpeningMoves(['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nf6', 'Ng5', 'h6', 'Nxf7', 'Kxf7'], 'balanced');
    expect(moves).toEqual([]);
  });
});

describe('getOpeningMove', () => {
  it('returns a move when the history is on book', () => {
    const move = getOpeningMove(['e4', 'c6'], 'balanced');
    expect(move).not.toBeNull();
    expect(move?.move).toBe('d4');
  });

  it('returns null when off book', () => {
    const move = getOpeningMove(['e4', 'c6', 'Nf3'], 'balanced');
    expect(move).toBeNull();
  });

  it('falls back to the first available move when no style match', () => {
    // 'balanced' is not in the styleMap, so it falls through to moves[0]
    const move = getOpeningMove([], 'balanced');
    expect(move).not.toBeNull();
    expect(move?.move).toBe('e4');
  });

  it('matches aggressive persona to aggressive style when available', () => {
    // After e4 e5 Nf3 Nc6 Bb5, both a6 (aggressive) and Nf6 (solid) are available.
    // An aggressive persona should prefer a6.
    const move = getOpeningMove(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], 'aggressive');
    expect(move).not.toBeNull();
    expect(move?.move).toBe('a6');
  });
});

describe('OPENING_BOOK structure', () => {
  it('every moveInfo has all required fields', () => {
    function validateNode(node: typeof OPENING_BOOK, path: string[] = []) {
      if (node.moveInfo) {
        expect(node.moveInfo.move, `at ${path.join(' ')}`).toBeDefined();
        expect(node.moveInfo.name, `at ${path.join(' ')}`).toBeDefined();
        expect(node.moveInfo.description, `at ${path.join(' ')}`).toBeDefined();
        expect(node.moveInfo.style, `at ${path.join(' ')}`).toBeDefined();
      }
      for (const [san, child] of Object.entries(node.children)) {
        validateNode(child, [...path, san]);
      }
    }
    validateNode(OPENING_BOOK);
  });
});
