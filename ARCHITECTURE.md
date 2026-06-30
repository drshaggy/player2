# Architecture Document: Player 2

## System Overview
Player 2 is an AI-powered chess coaching application designed to guide users through specific chess openings and strategic goals using a hybrid approach of engine candidates and LLM decision-making.

## Core Components

### 1. AI Move Selection Pipeline
The move selection process follows a strict hierarchy to ensure educational goals take priority over optimal engine play:
`Session Goal` $\rightarrow$ `Opening Book Mapping` $\rightarrow$ `Lichess Masters Theory` $\rightarrow$ `Stockfish Multi-PV Candidates` $\rightarrow$ `LLM Selection` $\rightarrow$ `Final Move`.

- **Opening Book**: A hierarchical tree lookup (`src/lib/openingBook.ts`) that provides a map of opening names to specific SAN moves. It is queried on every turn to ensure goal alignment throughout the opening phase. `getOpeningMoves(history)` traverses the tree; `getOpeningMove(history, persona)` selects one (persona matching is a placeholder — see ENGINEERING_PLAN §7).
- **Lichess Masters Database**: `src/lib/services/lichess.ts` — fetches statistically most-played moves by masters for the current position. Injected as high-priority candidates to guide the AI toward theory.
- **Stockfish**: Generates a list of legal candidate moves with evaluation scores via the `chess-api.com` WebSocket (in `src/hooks/useChessGame.ts` `makeAIMove`).
- **LLM (Cerebras Gemma-4)**: Receives the context and selects the move index based on the session objective. The `/api/move` route enforces index bounds and returns 422 on out-of-range or missing indices (no silent fallback).

### 2. Prompting Strategy
To prevent LLM hallucinations regarding move indices, the system uses:
- **Strict Execution Logic**: A step-by-step instructional chain in the system prompt.
- **Reference Mapping**: Explicitly mapping opening names to moves and then moves to candidate indices.
- **Externalized Prompts**: Prompts are stored in `src/lib/prompts/index.ts` for manual tweaking without code changes.

### 3. Board Representation
- **ASCII Board** (`generateAsciiBoard`): Converts FEN strings into an ASCII grid for LLM spatial awareness.
- **Semantic State** (`generateSemanticState`): Derives real game phase (opening/middlegame/endgame via move number + major-piece count), material balance (P=1/N=3/B=3/R=5/Q=9 with per-piece diff detail), turn, and piece counts from the FEN. Both live in `src/lib/utils/board.ts`.

## Component Architecture (post-Phase 5 decomposition)
```
src/components/
  ChessGame.tsx      # thin orchestrator (135 lines): owns shared refs, wires hooks
  Board.tsx          # chessboard wrapper, captured pieces, status pill
  ChatPanel.tsx      # message list + input
  MoveHistory.tsx    # paired move list
  AuthBadge.tsx      # login/logout UI
src/hooks/
  useAuth.ts             # session subscription, login, logout
  useChessGame.ts        # board state, AI move loop, board init (211 lines)
  useCoachChat.ts        # chat, consultation phase, /api/chat (209 lines)
  useGamePersistence.ts  # gameId/opponent, saveGameMove, createGame, restoreGame (237 lines)
src/lib/utils/
  chess.ts          # getPieceImage, processFen, computeCapturedPieces
  boardInput.ts     # handleChessInput (cm-chessboard move-input handler)
  board.ts          # generateAsciiBoard, generateSemanticState
```

**Cross-hook wiring:** the orchestrator owns the shared refs (`chessGameRef`, `boardInstanceRef`, `boardRef`, `sessionGoalRef`). Two latest-callback refs break the circular call-order dependency: `setChatMessagesRef` (let `useChessGame.makeAIMove` append AI commentary) and `applyRestoredStateRef` (let `useGamePersistence`'s restore effect sync the other hooks' UI state after replay).

## Tech Stack
- **Frontend/Backend**: Next.js (App Router), TypeScript, Tailwind CSS.
- **Database**: Supabase (PostgreSQL).
- **Chess Logic**: `chess.js`, `cm-chessboard` (board UI).
- **Testing**: Vitest (unit/component/scenario, with JSDOM + Testing Library + jest-dom) + Playwright E2E (opt-in, `npm run test:e2e`, against local Supabase). See `ENGINEERING_PLAN.md` Phase 3 for the full harness.

## Key Workflows
- **Goal Alignment**: If a user sets a goal (e.g., "Caro-Kann"), the system filters the opening book, identifies the move `c6`, finds `c6` in the Stockfish candidates, and forces the LLM to select that index.
- **Consultation Phase**: Before a game starts, the user chats with the coach to set a goal. The coach can suggest a FEN (`SET_FEN:`) or transition to play (`TRANSITION_TO_GAME`).
- **Game Persistence**: Moves, chat, and FEN are persisted to Supabase. On reload, the game is restored by replaying move history from the `moves` table.
