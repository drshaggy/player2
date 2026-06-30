import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/move/route';

vi.mock('@/lib/services/lichess', () => ({
  getMasterOpeningMoves: vi.fn().mockResolvedValue([]),
}));

vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server');
  return {
    ...actual,
    NextResponse: {
      json: (data: unknown, init?: { status?: number }) => ({
        status: init?.status || 200,
        json: async () => data,
      }),
    },
  };
});

const mockLlmResponse = (selectedMoveIndex: number, commentary: string) => ({
  ok: true,
  json: async () => ({
    choices: [{ message: { content: JSON.stringify({ selectedMoveIndex, commentary }) } }],
  }),
  text: async () => JSON.stringify({ selectedMoveIndex, commentary }),
});

describe('Move API Route', () => {
  it('should handle Caro-Kann Goal Alignment scenario', async () => {
    process.env.LLM_API_KEY = 'test-key';

    const payload = {
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      candidates: [
        { move: 'e5', score: '0.3', depth: 10, from: 'e7', to: 'e5' },
        { move: 'c5', score: '0.4', depth: 10, from: 'c7', to: 'c5' },
        { move: 'e6', score: '0.5', depth: 10, from: 'e7', to: 'e6' },
        { move: 'c6', score: '0.1', depth: 10, from: 'c7', to: 'c6' },
      ],
      persona: 'balanced',
      sessionGoal: 'Practice the Caro-Kann Defense',
      openingContext: [
        { move: 'e5', name: 'Open Game', description: 'Symmetrical', style: 'theoretical' as const },
        { move: 'c5', name: 'Sicilian Defense', description: 'Aggressive', style: 'aggressive' as const },
        { move: 'c6', name: 'Caro-Kann Defense', description: 'Solid', style: 'solid' as const },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue(mockLlmResponse(1, 'Solid move.'));

    const req = {
      json: async () => payload,
    } as unknown as Parameters<typeof POST>[0];

    const response = await POST(req);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('move');
  });

  it('should handle No Goal (Standard Play) scenario', async () => {
    process.env.LLM_API_KEY = 'test-key';

    const payload = {
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      candidates: [
        { move: 'e5', score: '0.3', depth: 10, from: 'e7', to: 'e5' },
        { move: 'c5', score: '0.4', depth: 10, from: 'c7', to: 'c5' },
      ],
      persona: 'aggressive',
      sessionGoal: '',
      openingContext: [
        { move: 'e5', name: 'Open Game', description: 'Symmetrical', style: 'theoretical' as const },
        { move: 'c5', name: 'Sicilian Defense', description: 'Aggressive', style: 'aggressive' as const },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue(mockLlmResponse(1, 'Aggressive!'));

    const req = {
      json: async () => payload,
    } as unknown as Parameters<typeof POST>[0];

    const response = await POST(req);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('move');
  });
});
