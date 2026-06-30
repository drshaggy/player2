import { SYSTEM_PROMPTS } from '@/lib/prompts/index';
import { generateAsciiBoard, generateSemanticState } from '@/lib/utils/board';
import { getMasterOpeningMoves, getMasterOpeningMovesByFen, type LichessMove } from '@/lib/services/lichess';
import { getOpeningMovesByFen } from '@/lib/openingBook';

export interface CandidateMove {
  move: string;
  from?: string;
  to?: string;
  score: string;
  depth: number;
}

export interface OpeningContextMove {
  move: string;
  name: string;
  description: string;
  style?: string;
}

export interface MasterOpeningContext {
  move: string;
  san: string;
  theoryCount: number;
  averageRating: number;
  opening: { eco: string; name: string } | null | undefined;
}

export interface ChatMessage {
  role: string;
  content: string;
}

export interface PipelineInput {
  fen: string;
  candidates: CandidateMove[];
  persona?: string;
  messages?: ChatMessage[];
  sessionGoal?: string | null;
  openingContext?: OpeningContextMove[];
  history?: string[] | string;
}

/**
 * Minimal LLM fetch contract. Implementations call the provider and return
 * the raw JSON body (`{ choices: [{ message: { content } }] }`) plus status.
 * Throwing signals a transport/HTTP failure.
 */
export type FetchLLM = (systemPrompt: string, messages: ChatMessage[]) => Promise<{
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  json: () => Promise<{ choices: Array<{ message: { content: string } }> }>;
}>;

export interface PipelineDeps {
  apiKey: string;
  fetchLLM: FetchLLM;
  // Overridable for tests; defaults to the real Lichess service.
  getMasterMoves?: (play: string) => Promise<LichessMove[]>;
  getMasterMovesByFen?: (fen: string) => Promise<LichessMove[]>;
  getBookMovesByFen?: (fen: string) => import('@/lib/openingBook').OpeningMove[];
}

export type PipelineResult =
  | { status: 'ok'; statusCode: 200; move: { from?: string; to?: string; promotion: string; san: string }; commentary?: string; candidateCount: number }
  | { status: 'no-candidates'; statusCode: 400; error: string; candidateCount: number }
  | { status: 'bad-index'; statusCode: 422; error: string; llmResponse: string; candidateCount: number }
  | { status: 'llm-error'; statusCode: 500; error: string; candidateCount: number };

/**
 * The core move-selection pipeline, extracted from /api/move so it can be
 * exercised end-to-end with mocked boundaries (LLM + Lichess).
 *
 * Steps:
 *   1. Merge Stockfish candidates with Lichess masters moves + opening book.
 *   2. Build the system prompt (ASCII board, semantic state, candidates, goal).
 *   3. Call the LLM via deps.fetchLLM.
 *   4. Parse + validate the 1-based selectedMoveIndex (no silent fallback).
 *
 * Behavior matches /api/move/route.ts exactly — the route is now a thin
 * NextResponse adapter over this function.
 */
export async function runMovePipeline(
  input: PipelineInput,
  deps: PipelineDeps,
): Promise<PipelineResult> {
  const { fen, candidates, persona = 'aggressive', messages = [], sessionGoal, openingContext, history = '' } = input;

  const processedCandidates: CandidateMove[] = [...candidates];
  const masterOpeningContext: MasterOpeningContext[] = [];
  let effectiveOpeningContext = openingContext;

  const uciHistory = Array.isArray(history) ? history.join(',') : history;
  const hasHistory = uciHistory && uciHistory.length > 0;

  // When history is empty (game started from a consultation FEN), the
  // opening book and Lichess play-parameter lookups return starting-position
  // context, not the opening's actual continuations. Fall back to FEN-based
  // lookups so the LLM still gets correct opening context (e.g. Caro-Kann).
  if (!hasHistory) {
    const bookMovesByFen = (deps.getBookMovesByFen ?? getOpeningMovesByFen)(fen);
    if (bookMovesByFen.length > 0) {
      effectiveOpeningContext = bookMovesByFen;
    }
  }

  // 1. Lichess masters integration.
  try {
    if (hasHistory || candidates.length > 0) {
      let masterMoves: LichessMove[] | null = null;
      if (hasHistory) {
        const getMoves = deps.getMasterMoves ?? getMasterOpeningMoves;
        masterMoves = await getMoves(uciHistory);
      } else {
        const getMovesByFen = deps.getMasterMovesByFen ?? getMasterOpeningMovesByFen;
        masterMoves = await getMovesByFen(fen);
      }
      if (masterMoves && masterMoves.length > 0) {
        for (const m of masterMoves) {
          masterOpeningContext.push({
            move: m.uci,
            san: m.san,
            theoryCount: m.total,
            averageRating: m.averageRating,
            opening: m.opening,
          });
          const exists = processedCandidates.find((c) => c.move === m.uci);
          if (!exists) {
            processedCandidates.push({
              move: m.uci,
              from: '',
              to: '',
              score: `${m.total} games (Masters)`,
              depth: 0,
            });
          }
        }
      }
    }
  } catch (e) {
    console.error('Lichess integration failed:', e);
  }

  // 2. Merge opening-book moves that might match the goal.
  if (Array.isArray(effectiveOpeningContext)) {
    for (const bookMove of effectiveOpeningContext) {
      const alreadyExists = processedCandidates.find((c) => c.move === bookMove.move);
      if (!alreadyExists) {
        processedCandidates.push({
          move: bookMove.move,
          from: '',
          to: '',
          score: '0.0 (Book)',
          depth: 0,
        });
      }
    }
  }

  if (!processedCandidates || processedCandidates.length === 0) {
    return { status: 'no-candidates', statusCode: 400, error: 'No candidate moves provided', candidateCount: 0 };
  }

  // 3. Build context + prompt.
  const boardMap = generateAsciiBoard(fen);
  const semanticState = generateSemanticState(fen);
  // Master-opening entries lack name/description (only book entries have them);
  // the prompt renders `undefined` for those, matching the original route's
  // behavior. Cast to satisfy the prompt's param type without altering output.
  const mergedOpeningContext = [...(effectiveOpeningContext || []), ...masterOpeningContext] as unknown as Parameters<
    typeof SYSTEM_PROMPTS.moveSelection
  >[5];
  const systemPrompt = SYSTEM_PROMPTS.moveSelection(
    persona,
    boardMap,
    semanticState,
    fen,
    processedCandidates,
    mergedOpeningContext,
    sessionGoal ?? null,
  );

  const llmMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages,
    { role: 'user', content: 'What move should we make now?' },
  ];

  // 4. Call the LLM.
  let llmResponse;
  try {
    llmResponse = await deps.fetchLLM(systemPrompt, llmMessages);
  } catch (e) {
    return {
      status: 'llm-error',
      statusCode: 500,
      error: e instanceof Error ? e.message : 'LLM fetch failed',
      candidateCount: processedCandidates.length,
    };
  }

  if (!llmResponse.ok) {
    const errorText = await llmResponse.text();
    return {
      status: 'llm-error',
      statusCode: 500,
      error: `LLM API failed with status ${llmResponse.status}: ${errorText}`,
      candidateCount: processedCandidates.length,
    };
  }

  const llmData = await llmResponse.json();
  if (!llmData.choices || llmData.choices.length === 0) {
    return { status: 'llm-error', statusCode: 500, error: 'Invalid LLM response', candidateCount: processedCandidates.length };
  }

  let content = llmData.choices[0].message.content;
  content = content.replace(/```json\n?/, '').replace(/```$/, '').trim();

  let result: { selectedMoveIndex?: number; commentary?: string };
  try {
    result = JSON.parse(content);
  } catch {
    return { status: 'llm-error', statusCode: 500, error: 'LLM returned invalid JSON', candidateCount: processedCandidates.length };
  }

  if (!result || typeof result.selectedMoveIndex !== 'number') {
    return {
      status: 'bad-index',
      statusCode: 422,
      error: 'LLM response missing selectedMoveIndex',
      llmResponse: content,
      candidateCount: processedCandidates.length,
    };
  }

  const selectedIndex = result.selectedMoveIndex - 1;
  if (selectedIndex < 0 || selectedIndex >= processedCandidates.length) {
    return {
      status: 'bad-index',
      statusCode: 422,
      error: `LLM returned out-of-range selectedMoveIndex ${result.selectedMoveIndex} (valid: 1..${processedCandidates.length})`,
      llmResponse: content,
      candidateCount: processedCandidates.length,
    };
  }

  const chosen = processedCandidates[selectedIndex];
  return {
    status: 'ok',
    statusCode: 200,
    move: { from: chosen.from, to: chosen.to, promotion: 'q', san: chosen.move },
    commentary: result.commentary,
    candidateCount: processedCandidates.length,
  };
}
