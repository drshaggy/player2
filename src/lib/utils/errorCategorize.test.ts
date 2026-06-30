import { describe, it, expect } from 'vitest';
import { categorizeAiMoveError } from './errorCategorize';

describe('categorizeAiMoveError', () => {
  describe('network', () => {
    it('classifies WebSocket timeout errors', () => {
      const result = categorizeAiMoveError(new Error('Stockfish WebSocket timeout'));
      expect(result.category).toBe('network');
      expect(result.message).toBe('Stockfish WebSocket timeout');
    });

    it('classifies WebSocket transport errors', () => {
      const result = categorizeAiMoveError(new Error('WebSocket error'));
      expect(result.category).toBe('network');
    });

    it('classifies fetch rejections', () => {
      const result = categorizeAiMoveError(new TypeError('Failed to fetch'));
      expect(result.category).toBe('network');
    });

    it('classifies 5xx server errors via httpStatus', () => {
      const result = categorizeAiMoveError(new Error('upstream failure'), 502);
      expect(result.category).toBe('network');
      expect(result.httpStatus).toBe(502);
    });

    it('classifies connection refused errors', () => {
      const result = categorizeAiMoveError(new Error('ECONNREFUSED 127.0.0.1:3000'));
      expect(result.category).toBe('network');
    });
  });

  describe('llm', () => {
    it('classifies 422 (bad index) via httpStatus', () => {
      const result = categorizeAiMoveError(new Error('No move from AI Coach'), 422);
      expect(result.category).toBe('llm');
      expect(result.httpStatus).toBe(422);
      expect(result.message).toMatch(/bad or missing move index/i);
    });

    it('classifies 500 (llm-error) via httpStatus', () => {
      const result = categorizeAiMoveError(new Error('No move from AI Coach'), 500);
      expect(result.category).toBe('llm');
      expect(result.httpStatus).toBe(500);
      expect(result.message).toMatch(/llm pipeline error/i);
    });

    it('classifies "No move from AI Coach" without httpStatus', () => {
      const result = categorizeAiMoveError(new Error('No move from AI Coach'));
      expect(result.category).toBe('llm');
    });

    it('prefers the 422 httpStatus over the "no move" message pattern', () => {
      const result = categorizeAiMoveError(new Error('No move from AI Coach'), 422);
      expect(result.category).toBe('llm');
      expect(result.message).toMatch(/bad or missing move index/);
    });
  });

  describe('parse', () => {
    it('classifies JSON parse errors', () => {
      const result = categorizeAiMoveError(new SyntaxError('Unexpected token < in JSON at position 0'));
      expect(result.category).toBe('parse');
    });

    it('classifies "not valid JSON" errors', () => {
      const result = categorizeAiMoveError(new Error('Response is not valid JSON'));
      expect(result.category).toBe('parse');
    });
  });

  describe('unknown', () => {
    it('falls back to unknown for unrecognized errors', () => {
      const result = categorizeAiMoveError(new Error('something else went wrong'));
      expect(result.category).toBe('unknown');
      expect(result.message).toBe('something else went wrong');
    });

    it('handles non-Error throws (e.g. string)', () => {
      const result = categorizeAiMoveError('a string error');
      expect(result.category).toBe('unknown');
      expect(result.message).toBe('a string error');
    });

    it('classifies 400 no-candidates as network (Stockfish returned nothing)', () => {
      const result = categorizeAiMoveError(new Error('No move from AI Coach'), 400);
      expect(result.category).toBe('network');
      expect(result.httpStatus).toBe(400);
      expect(result.message).toMatch(/no candidate moves from stockfish/i);
    });

    it('handles null/undefined', () => {
      expect(categorizeAiMoveError(null).category).toBe('unknown');
      expect(categorizeAiMoveError(undefined).category).toBe('unknown');
    });
  });
});
