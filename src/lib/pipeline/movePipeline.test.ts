import { describe, it, expect, vi } from 'vitest';
import { runMovePipeline, type FetchLLM, type PipelineInput } from './movePipeline';
import { LICHESS_RESPONSES } from '@/__fixtures__';
import type { LichessMove } from '@/lib/services/lichess';
import caroKann from './scenarios/caro-kann.json';
import sicilian from './scenarios/sicilian-najdorf.json';
import noGoal from './scenarios/no-goal-best-move.json';
import outOfBook from './scenarios/out-of-book-midgame.json';

interface Scenario {
  name: string;
  description: string;
  input: PipelineInput;
  llmPicksIndex: number;
  expectedMoveSan: string;
  lichessResponseKey?: keyof typeof LICHESS_RESPONSES;
}

const SCENARIOS: Scenario[] = [caroKann, sicilian, noGoal, outOfBook] as Scenario[];

/** Build a mocked fetchLLM that returns the canned selectedMoveIndex. */
const mockFetchLLM = (picksIndex: number): FetchLLM =>
  vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify({ selectedMoveIndex: picksIndex, commentary: 'canned' }) } }],
    }),
    text: async () => '{}',
  });

/** Build a mocked getMasterMoves from the scenario's lichessResponseKey. */
const mockGetMasterMoves = (key?: string) => {
  if (!key) return vi.fn().mockResolvedValue([]);
  const resp = LICHESS_RESPONSES[key as keyof typeof LICHESS_RESPONSES];
  return vi.fn().mockResolvedValue(resp.moves as unknown as LichessMove[]);
};

describe('movePipeline scenario harness', () => {
  it.each(SCENARIOS)('$name returns the expected move', async (scenario) => {
    const result = await runMovePipeline(scenario.input, {
      apiKey: 'test-key',
      fetchLLM: mockFetchLLM(scenario.llmPicksIndex),
      getMasterMoves: mockGetMasterMoves(scenario.lichessResponseKey),
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return; // narrow for TS
    expect(result.move.san).toBe(scenario.expectedMoveSan);
    expect(result.move.promotion).toBe('q');
  });

  it('sicilian scenario: Lichess master move is merged into candidates', async () => {
    const result = await runMovePipeline(sicilian.input, {
      apiKey: 'test-key',
      fetchLLM: mockFetchLLM(sicilian.llmPicksIndex),
      getMasterMoves: mockGetMasterMoves(sicilian.lichessResponseKey),
    });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    // Original 2 candidates + 1 merged Lichess move (g1f3) = 3.
    expect(result.candidateCount).toBe(3);
  });

  it('caro-kann scenario: no Lichess merge when history is empty and all book moves already present', async () => {
    const result = await runMovePipeline(caroKann.input, {
      apiKey: 'test-key',
      fetchLLM: mockFetchLLM(caroKann.llmPicksIndex),
      getMasterMoves: mockGetMasterMoves(),
    });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.candidateCount).toBe(4);
  });
});

describe('movePipeline failure modes', () => {
  const baseInput: PipelineInput = {
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    candidates: [{ move: 'e5', from: 'e7', to: 'e5', score: '0.3', depth: 10 }],
    persona: 'aggressive',
    sessionGoal: '',
    openingContext: [],
    history: [],
  };

  it('returns bad-index (422) when LLM picks an out-of-range index — no silent fallback', async () => {
    const fetchLLM = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: JSON.stringify({ selectedMoveIndex: 99 }) } }] }),
      text: async () => '{}',
    });
    const result = await runMovePipeline(baseInput, { apiKey: 'k', fetchLLM, getMasterMoves: mockGetMasterMoves(), getMasterMovesByFen: vi.fn().mockResolvedValue([]), getBookMovesByFen: vi.fn().mockReturnValue([]) });
    expect(result.status).toBe('bad-index');
    if (result.status !== 'bad-index') return;
    expect(result.statusCode).toBe(422);
    expect(result.candidateCount).toBe(1);
    expect(result.error).toMatch(/out-of-range/);
    expect(result.llmResponse).toContain('99');
  });

  it('returns bad-index (422) when selectedMoveIndex is missing', async () => {
    const fetchLLM = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: JSON.stringify({ commentary: 'nope' }) } }] }),
      text: async () => '{}',
    });
    const result = await runMovePipeline(baseInput, { apiKey: 'k', fetchLLM, getMasterMoves: mockGetMasterMoves(), getMasterMovesByFen: vi.fn().mockResolvedValue([]), getBookMovesByFen: vi.fn().mockReturnValue([]) });
    expect(result.status).toBe('bad-index');
    if (result.status !== 'bad-index') return;
    expect(result.error).toMatch(/missing selectedMoveIndex/);
  });

  it('returns no-candidates (400) when candidates is empty', async () => {
    const result = await runMovePipeline(
      { ...baseInput, candidates: [] },
      { apiKey: 'k', fetchLLM: mockFetchLLM(1), getMasterMoves: mockGetMasterMoves(), getMasterMovesByFen: vi.fn().mockResolvedValue([]), getBookMovesByFen: vi.fn().mockReturnValue([]) },
    );
    expect(result.status).toBe('no-candidates');
    if (result.status !== 'no-candidates') return;
    expect(result.statusCode).toBe(400);
  });

  it('returns llm-error (500) when the LLM HTTP call fails', async () => {
    const fetchLLM = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
      text: async () => 'upstream down',
    });
    const result = await runMovePipeline(baseInput, { apiKey: 'k', fetchLLM, getMasterMoves: mockGetMasterMoves(), getMasterMovesByFen: vi.fn().mockResolvedValue([]), getBookMovesByFen: vi.fn().mockReturnValue([]) });
    expect(result.status).toBe('llm-error');
    if (result.status !== 'llm-error') return;
    expect(result.statusCode).toBe(500);
    expect(result.error).toContain('503');
  });

  it('returns llm-error (500) on invalid JSON from the LLM', async () => {
    const fetchLLM = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'not json' } }] }),
      text: async () => 'not json',
    });
    const result = await runMovePipeline(baseInput, { apiKey: 'k', fetchLLM, getMasterMoves: mockGetMasterMoves(), getMasterMovesByFen: vi.fn().mockResolvedValue([]), getBookMovesByFen: vi.fn().mockReturnValue([]) });
    expect(result.status).toBe('llm-error');
    if (result.status !== 'llm-error') return;
    expect(result.error).toMatch(/invalid JSON/);
  });

  it('strips ```json fences before parsing', async () => {
    const fetchLLM = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: '```json\n' + JSON.stringify({ selectedMoveIndex: 1 }) + '\n```' } }],
      }),
      text: async () => '{}',
    });
    const result = await runMovePipeline(baseInput, { apiKey: 'k', fetchLLM, getMasterMoves: mockGetMasterMoves(), getMasterMovesByFen: vi.fn().mockResolvedValue([]), getBookMovesByFen: vi.fn().mockReturnValue([]) });
    expect(result.status).toBe('ok');
  });
});
