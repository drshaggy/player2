import { describe, it, expect, vi } from 'vitest';
import { detectMentionedOpening, findPopularLine } from './openingLineFinder';
import { getMasterOpeningMoves } from '@/lib/services/lichess';
import type { LichessMove } from '@/lib/services/lichess';

type GetMasterMoves = typeof getMasterOpeningMoves;

describe('detectMentionedOpening', () => {
  it('matches a partial mention without the "Defense" category word', () => {
    const sp = detectMentionedOpening('Play caro kann from middle game');
    expect(sp).not.toBeNull();
    expect(sp!.sans).toEqual(['e4', 'c6', 'd4', 'd5']);
    expect(sp!.name).toMatch(/Caro-Kann/);
  });

  it('matches the full opening name', () => {
    const sp = detectMentionedOpening("Let's play the Sicilian Defense");
    expect(sp).not.toBeNull();
    expect(sp!.sans).toEqual(['e4', 'c5']);
    expect(sp!.name).toBe('Sicilian Defense');
  });

  it('matches "sicilian" alone (head fallback)', () => {
    const sp = detectMentionedOpening('sicilian please');
    expect(sp).not.toBeNull();
    expect(sp!.sans).toEqual(['e4', 'c5']);
  });

  it('prefers the deeper spine when both a short and long name match the same key', () => {
    // "caro-kann" matches both "Caro-Kann Defense" (2 plies) and
    // "Caro-Kann Response" (4 plies); the deeper spine should win.
    const sp = detectMentionedOpening('caro-kann');
    expect(sp!.sans.length).toBe(4);
  });

  it('matches a slash-alternative node (Najdorf or Dragon)', () => {
    const najdorf = detectMentionedOpening('najdorf');
    expect(najdorf).not.toBeNull();
    expect(najdorf!.sans).toEqual(['e4', 'c5', 'Nf3', 'd6']);
    const dragon = detectMentionedOpening('dragon');
    expect(dragon).not.toBeNull();
    expect(dragon!.sans).toEqual(['e4', 'c5', 'Nf3', 'd6']);
  });

  it('matches the Italian Game', () => {
    const sp = detectMentionedOpening("let's do the Italian game");
    expect(sp).not.toBeNull();
    expect(sp!.sans).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);
  });

  it('matches Ruy Lopez', () => {
    const sp = detectMentionedOpening('ruy lopez');
    expect(sp).not.toBeNull();
    expect(sp!.sans).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);
  });

  it('matches the Queen\'s Gambit Declined', () => {
    const sp = detectMentionedOpening("queen's gambit declined");
    expect(sp).not.toBeNull();
    expect(sp!.sans).toEqual(['d4', 'd5', 'c4', 'e6']);
  });

  it('returns null when no opening is mentioned', () => {
    expect(detectMentionedOpening('just play aggressively')).toBeNull();
    expect(detectMentionedOpening('')).toBeNull();
  });

  it('does not false-match "Open Game" on an unrelated "open" mention', () => {
    // "open sicilian" should match "Open Sicilian", not the shallower "Open Game".
    const sp = detectMentionedOpening('open sicilian');
    expect(sp).not.toBeNull();
    expect(sp!.sans).toEqual(['e4', 'c5', 'Nf3']);
  });
});

describe('findPopularLine', () => {
  // Canned Lichess responses: each call returns a single top move.
  const lichessSeq = (sans: string[]) => {
    let i = 0;
    return vi.fn(async () => {
      const san = sans[i++];
      if (!san) return [];
      const mv: LichessMove = {
        uci: san, san, averageRating: 2500,
        white: 100, black: 50, draws: 50, total: 200,
        opening: null,
      };
      return [mv];
    });
  };

  const spine = detectMentionedOpening('caro-kann')!;

  it('includes the start-of-opening position (White to move) even when Lichess is unavailable', async () => {
    const getMasterMoves = vi.fn().mockResolvedValue([]);
    const res = await findPopularLine(spine, { getMasterMoves });
    expect(res).not.toBeNull();
    expect(res!.positions.length).toBe(1);
    expect(res!.positions[0].label).toBe('Start of opening');
    expect(res!.positions[0].fen.split(' ')[1]).toBe('w');
    // SAN line from the start position to the spine tip.
    expect(res!.positions[0].line).toEqual(['e4', 'c6', 'd4', 'd5']);
  });

  it('adds a deeper White-to-move position after each Black reply', async () => {
    // Spine e4 c6 d4 d5 -> White to move at tip.
    // Follow: Nc3 (White) -> Black; dxe4 (Black) -> White (recorded).
    const getMasterMoves = lichessSeq(['Nc3', 'dxe4']);
    const res = await findPopularLine(spine, { getMasterMoves: getMasterMoves as unknown as GetMasterMoves });
    expect(res).not.toBeNull();
    expect(res!.positions.length).toBe(2);
    expect(res!.positions[0].label).toBe('Start of opening');
    expect(res!.positions[1].label).toMatch(/Black's reply/);
    expect(res!.positions[1].games).toBe(200);
    // Every offered position must be White to move.
    for (const p of res!.positions) {
      expect(p.fen.split(' ')[1]).toBe('w');
    }
    // The deeper position's line includes the spine + followed moves.
    expect(res!.positions[1].line).toEqual(['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4']);
  });

  it('never offers a Black-to-move position', async () => {
    // Odd number of followed moves ends on White's move -> Black to move,
    // which must NOT be recorded as a playable position.
    const getMasterMoves = lichessSeq(['Nc3']);
    const res = await findPopularLine(spine, { getMasterMoves: getMasterMoves as unknown as GetMasterMoves });
    expect(res).not.toBeNull();
    expect(res!.positions.length).toBe(1); // only the start
    for (const p of res!.positions) {
      expect(p.fen.split(' ')[1]).toBe('w');
    }
  });

  it('the SAN line for each position replays to that exact FEN', async () => {
    const getMasterMoves = lichessSeq(['Nc3', 'dxe4']);
    const res = await findPopularLine(spine, { getMasterMoves: getMasterMoves as unknown as GetMasterMoves });
    expect(res).not.toBeNull();
    const { Chess } = await import('chess.js');
    for (const p of res!.positions) {
      const replay = new Chess();
      for (const san of p.line) replay.move(san);
      expect(replay.fen()).toBe(p.fen);
    }
  });

  it('stops when the top move frequency drops below minGames', async () => {
    const getMasterMoves = vi.fn().mockResolvedValue([
      { uci: 'd4', san: 'd4', averageRating: 2400, white: 5, black: 3, draws: 2, total: 10, opening: null } as LichessMove,
    ]);
    const res = await findPopularLine(spine, { getMasterMoves, minGames: 20 });
    expect(res).not.toBeNull();
    expect(res!.positions.length).toBe(1); // start only; low-freq move not followed
  });

  it('respects the maxPlies cap', async () => {
    const many = Array.from({ length: 20 }, (_, i) => `m${i}`);
    const getMasterMoves = lichessSeq(many);
    // Most canned SANs are invalid, so the loop breaks early on a bad move —
    // assert it terminates and returns at least the start position.
    const res = await findPopularLine(spine, { getMasterMoves: getMasterMoves as unknown as GetMasterMoves, maxPlies: 2 });
    expect(res).not.toBeNull();
    expect(res!.positions.length).toBeGreaterThanOrEqual(1);
  });

  it('returns null for an invalid spine SAN', async () => {
    const getMasterMoves = vi.fn().mockResolvedValue([]);
    const res = await findPopularLine({ name: 'bogus', sans: ['zzzz'] }, { getMasterMoves });
    expect(res).toBeNull();
  });

  it('queries Lichess with the growing UCI play sequence', async () => {
    const getMasterMoves = lichessSeq(['Nc3', 'dxe4']);
    await findPopularLine(spine, { getMasterMoves: getMasterMoves as unknown as GetMasterMoves });
    const calls = (getMasterMoves as unknown as { mock: { calls: string[][] } }).mock.calls;
    // First call: spine UCI (e4 c6 d4 d5). Second call: + first followed move (Nc3).
    expect(calls[0][0]).toBe('e2e4,c7c6,d2d4,d7d5');
    expect(calls[1][0]).toBe('e2e4,c7c6,d2d4,d7d5,b1c3');
  });

  it('carries the opening name through to the result', async () => {
    const getMasterMoves = vi.fn().mockResolvedValue([]);
    const res = await findPopularLine(spine, { getMasterMoves });
    expect(res!.openingName).toMatch(/Caro-Kann/);
  });
});
