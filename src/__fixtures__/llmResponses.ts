/**
 * Recorded (shape-accurate) LLM responses for move selection.
 *
 * The move route expects `choices[0].message.content` to be JSON (optionally
 * wrapped in ```json fences) with `selectedMoveIndex` (1-based) and `commentary`.
 * These fixtures cover the happy path and the two failure modes the route
 * guards against (missing index, out-of-range index).
 */

export interface LlmMoveResponse {
  ok: boolean;
  status: number;
  json: () => Promise<{ choices: Array<{ message: { content: string } }> }>;
  text: () => Promise<string>;
}

const wrap = (content: string): LlmMoveResponse => ({
  ok: true,
  status: 200,
  json: async () => ({ choices: [{ message: { content } }] }),
  text: async () => content,
});

export const LLM_RESPONSES = {
  // Picks candidate #1 (1-based).
  pickIndex1: wrap(JSON.stringify({ selectedMoveIndex: 1, commentary: 'Top engine choice.' })),

  // Picks candidate #2 — used to assert the route maps the index correctly.
  pickIndex2: wrap(JSON.stringify({ selectedMoveIndex: 2, commentary: 'Second best.' })),

  // Content wrapped in ```json fences — the route must strip them.
  pickIndex1Fenced: wrap('```json\n' + JSON.stringify({ selectedMoveIndex: 1, commentary: 'Fenced.' }) + '\n```'),

  // Missing selectedMoveIndex — route must return 422 (not silently fall back).
  missingIndex: wrap(JSON.stringify({ commentary: 'no index here' })),

  // Out-of-range index (99) — route must return 422 with debug payload.
  outOfRange: wrap(JSON.stringify({ selectedMoveIndex: 99, commentary: 'Bad pick' })),

  // Invalid JSON body — route must throw "LLM returned invalid JSON".
  invalidJson: wrap('this is not json at all'),

  // Empty choices array — route must throw "Invalid LLM response".
  emptyChoices: {
    ok: true,
    status: 200,
    json: async () => ({ choices: [] }),
    text: async () => '{}',
  },

  // HTTP error from the LLM provider.
  error500: {
    ok: false,
    status: 500,
    json: async () => ({}),
    text: async () => 'upstream error',
  },
} as const;
