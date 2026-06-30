/**
 * Recorded (shape-accurate) responses from the Lichess Masters explorer API.
 *
 * Shape matches `LichessOpeningResponse` in src/lib/services/lichess.ts.
 * These are synthetic but structurally faithful — values chosen to exercise
 * the move-route integration (candidate merging, opening naming) deterministically.
 */

export const LICHESS_RESPONSES = {
  // Empty response (no master games for the play string).
  empty: {
    opening: null,
    moves: [],
    topGames: [],
  },

  // After 1.e4 — a single master reply e5 (Open Game).
  afterE4: {
    opening: { eco: 'C20', name: "King's Pawn Game" },
    moves: [
      {
        uci: 'e7e5',
        san: 'e5',
        averageRating: 2500,
        white: 5000,
        black: 4500,
        draws: 2100,
        game: null,
        opening: { eco: 'C20', name: "King's Pawn Game" },
      },
    ],
    topGames: [],
  },

  // After 1.e4 c5 — Sicilian, Nf3 reply.
  afterC5: {
    opening: { eco: 'B20', name: 'Sicilian Defense' },
    moves: [
      {
        uci: 'g1f3',
        san: 'Nf3',
        averageRating: 2480,
        white: 12000,
        black: 9000,
        draws: 6000,
        game: null,
        opening: { eco: 'B20', name: 'Sicilian Defense' },
      },
    ],
    topGames: [],
  },

  // After 1.e4 c6 — Caro-Kann, d4 main-line reply.
  afterC6: {
    opening: { eco: 'B10', name: 'Caro-Kann Defense' },
    moves: [
      {
        uci: 'd2d4',
        san: 'd4',
        averageRating: 2470,
        white: 8000,
        black: 7000,
        draws: 4000,
        game: null,
        opening: { eco: 'B12', name: 'Caro-Kann Defense' },
      },
    ],
    topGames: [],
  },
} as const;

// UCI move sequences (as the move route builds the `play` query param).
// NOTE: these are UCI (e2e4), not SAN (e4) — the Lichess masters explorer
// expects UCI joined by commas.
export const UCI_HISTORIES = {
  afterE4: ['e2e4'],
  afterE4c5: ['e2e4', 'c7c5'],
  afterE4c6: ['e2e4', 'c7c6'],
  afterE4e5: ['e2e4', 'e7e5'],
} as const;

export const playFromUci = (uci: readonly string[]): string => uci.join(',');
