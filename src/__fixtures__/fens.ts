/**
 * Canonical FEN strings used across the test suite.
 *
 * Rule (AGENTS.md): never inline magic FENs in tests — import from here.
 * Each FEN is verified against chess.js at fixture-authoring time.
 */

export const FENS = {
  // Starting position.
  starting: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',

  // After 1. e4 — Black to move. (chess.js reports `-` for the ep square.)
  afterE4: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',

  // Caro-Kann: after 1. e4 c6 — White to move.
  caroKann: 'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',

  // Sicilian Defense: after 1. e4 c5 — White to move.
  sicilian: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',

  // Sicilian Najdorf: after 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 — Black to move.
  najdorf: 'rnbqkb1r/pp2pppp/3p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R b KQkq - 2 5',

  // Italian Game, Giuoco Piano: after 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 — White to move.
  italianGiuocoPiano: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',

  // Ruy Lopez, Morphy Defense: after 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 — White to move.
  ruyLopezMorphy: 'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',

  // Endgame: K+R vs K+R, no queens, move 30.
  endgame: '4k3/4r3/8/8/8/8/4R3/4K3 w - - 0 30',

  // Middlegame: symmetrical structure, move 15, many pieces.
  middlegame: 'r2q1rk1/ppp2ppp/2n1bn2/3p4/3P4/2N1BN2/PPP2PPP/R2Q1RK1 w - - 0 15',

  // White up a pawn (8 vs 7). Used for material-imbalance assertions.
  whiteUpOnePawn: 'rnbqkbnr/pppp1ppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1',

  // White missing the b1 knight (Black up a knight).
  blackUpKnight: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/R1BQKBNR w KQkq - 0 1',
} as const;

// UCI move sequences that produce several of the FENs above. Useful for
// scenario tests that need both the history and the resulting position.
export const MOVE_SEQUENCES = {
  caroKann: ['e4', 'c6'],
  sicilian: ['e4', 'c5'],
  najdorf: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3'],
  italianGiuocoPiano: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'],
  ruyLopezMorphy: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'],
} as const;
