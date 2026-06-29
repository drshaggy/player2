import { describe, it, expect, vi } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { getMasterOpeningMoves } from '@/lib/services/lichess';

vi.mock('@/lib/services/lichess', () => ({
  getMasterOpeningMoves: vi.fn(),
}));

vi.mock('@/lib/prompts/index', () => ({
  SYSTEM_PROMPTS: {
    moveSelection: vi.fn().mockReturnValue('mocked system prompt'),
  },
}));

vi.mock('@/lib/utils/board', () => ({
  generateAsciiBoard: vi.fn().mockReturnValue('mock board'),
  generateSemanticState: vi.fn().mockReturnValue('mock state'),
}));

describe('POST /api/move body readability', () => {
  it('should not throw "Body is unusable" when calling Lichess service', async () => {
    process.env.LLM_API_KEY = 'test-key';
    
    const mockBody = {
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e3 0 1',
      candidates: [{ move: 'e2e4', from: 'e2', to: 'e4', score: '0.4', depth: 10 }],
      history: ['e2e4'],
      sessionGoal: 'Practice Sicilian',
    };

    (getMasterOpeningMoves as any).mockResolvedValue([
      { uci: 'e7e5', san: 'e5', total: 100, averageRating: 2500, opening: null }
    ]);

    global.fetch = vi.fn().mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('api.cerebras.ai')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: JSON.stringify({ selectedMoveIndex: 1, commentary: 'Good move' }) } }],
          }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const req = new NextRequest('http://localhost/api/move', {
      method: 'POST',
      body: JSON.stringify(mockBody),
    });

    const response = await POST(req);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('move');
    expect(getMasterOpeningMoves).toHaveBeenCalled();
  });
});
