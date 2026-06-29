import { describe, it, expect, vi } from 'vitest';
import { getMasterOpeningMoves } from './lichess';

describe('getMasterOpeningMoves', () => {
  it('should fetch and parse master moves correctly', async () => {
    const mockResponse = {
      opening: {
        eco: 'D10',
        name: 'Slav Defense: Exchange Variation'
      },
      moves: [
        {
          uci: 'c6d5',
          san: 'cxd5',
          averageRating: 2412,
          white: 1927,
          draws: 5215,
          black: 1468,
          game: null,
          opening: null
        }
      ],
      topGames: []
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const moves = await getMasterOpeningMoves('e2e4,e7e5');

    expect(moves).toHaveLength(1);
    expect(moves[0].uci).toBe('c6d5');
    expect(moves[0].total).toBe(1927 + 1468 + 5215);
  });

  it('should return an empty array on API error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
    });

    const moves = await getMasterOpeningMoves('invalid_play');
    expect(moves).toEqual([]);
  });

  it('should handle network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

    const moves = await getMasterOpeningMoves('e2e4');
    expect(moves).toEqual([]);
  });
});
