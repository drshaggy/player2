/**
 * Categorize errors from the AI move loop so they're diagnosable in logs
 * instead of appearing as opaque raw errors.
 *
 * Categories (per ENGINEERING_PLAN §2.3):
 *   - network: WebSocket/transport failures, fetch rejections, 5xx server errors
 *   - llm:     LLM pipeline returned a bad/empty result (422 bad index, 500 llm-error,
 *              "No move from AI Coach" when the response body had no usable move)
 *   - parse:   response body could not be parsed as JSON
 *   - unknown: anything else
 *
 * Pure function — safe to unit test without React/DOM.
 */

export type AiMoveErrorCategory = 'network' | 'llm' | 'parse' | 'unknown';

export interface CategorizedError {
  category: AiMoveErrorCategory;
  message: string;
  httpStatus?: number;
}

const NETWORK_PATTERN = /websocket|timeout|failed to fetch|network|econnrefused|socket|err_ws/i;
const PARSE_PATTERN = /json|parse|unexpected token|syntaxerror|not valid json/i;

export function categorizeAiMoveError(error: unknown, httpStatus?: number): CategorizedError {
  const message = error instanceof Error ? error.message : String(error);

  if (httpStatus !== undefined) {
    if (httpStatus === 422) {
      return { category: 'llm', message: 'LLM returned a bad or missing move index', httpStatus };
    }
    if (httpStatus === 500) {
      return { category: 'llm', message: 'LLM pipeline error', httpStatus };
    }
    if (httpStatus === 400) {
      return { category: 'network', message: 'No candidate moves from Stockfish', httpStatus };
    }
    if (httpStatus >= 500) {
      return { category: 'network', message: `Server error ${httpStatus}`, httpStatus };
    }
  }

  if (NETWORK_PATTERN.test(message)) {
    return { category: 'network', message };
  }

  if (PARSE_PATTERN.test(message)) {
    return { category: 'parse', message };
  }

  if (/no move from ai coach/i.test(message)) {
    return { category: 'llm', message };
  }

  return { category: 'unknown', message, httpStatus };
}
