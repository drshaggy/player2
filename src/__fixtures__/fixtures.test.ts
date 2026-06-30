import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { FENS, MOVE_SEQUENCES, UCI_HISTORIES, playFromUci, LICHESS_RESPONSES, LLM_RESPONSES } from '@/__fixtures__';

describe('fixtures: FENs', () => {
  it('every FEN is a legal chess.js position', () => {
    for (const [name, fen] of Object.entries(FENS)) {
      expect(() => new Chess(fen), `${name} should be valid`).not.toThrow();
    }
  });

  it('MOVE_SEQUENCES produce the documented FENs', () => {
    const play = (sans: readonly string[]) => {
      const c = new Chess();
      sans.forEach((s) => c.move(s));
      return c.fen();
    };
    expect(play(MOVE_SEQUENCES.caroKann)).toBe(FENS.caroKann);
    expect(play(MOVE_SEQUENCES.sicilian)).toBe(FENS.sicilian);
    expect(play(MOVE_SEQUENCES.najdorf)).toBe(FENS.najdorf);
    expect(play(MOVE_SEQUENCES.italianGiuocoPiano)).toBe(FENS.italianGiuocoPiano);
    expect(play(MOVE_SEQUENCES.ruyLopezMorphy)).toBe(FENS.ruyLopezMorphy);
  });
});

describe('fixtures: lichess helpers', () => {
  it('playFromUci joins with commas', () => {
    expect(playFromUci(UCI_HISTORIES.afterE4c5)).toBe('e2e4,c7c5');
  });

  it('LICHESS_RESPONSES moves carry computable totals', () => {
    const m = LICHESS_RESPONSES.afterE4.moves[0];
    expect(m.white + m.black + m.draws).toBeGreaterThan(0);
  });
});

describe('fixtures: LLM responses', () => {
  it('happy-path responses parse to { selectedMoveIndex, commentary }', async () => {
    const data = await LLM_RESPONSES.pickIndex2.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    expect(parsed.selectedMoveIndex).toBe(2);
    expect(parsed.commentary).toBe('Second best.');
  });

  it('fenced response still contains valid JSON after stripping', async () => {
    const data = await LLM_RESPONSES.pickIndex1Fenced.json();
    const raw = data.choices[0].message.content;
    const stripped = raw.replace(/```json\n?/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(stripped);
    expect(parsed.selectedMoveIndex).toBe(1);
  });
});
