# Project Instructions: Player 2

## Documentation
- **AGENTS.md** - Update this file with commands and rules specific to this project
- **ARCHITECTURE.md**
- **ENGINEERING_PLAN.md** - Architecture, testing harness, and deployment strategy (Phases 1-5 complete)
- **DYNAMIC_FEN_PLAN.md**
- **Update all Docs**  - When asked to update all docs, all .md files
- Add new md files to this list so you know to read them

## Project Setup
- **Project Path**: `/Users/connor/Repos/cerebras-hackathon/player2`
- **Tech Stack**: Next.js (App Router), TypeScript, Tailwind CSS, Supabase.
- **Key Libraries**: 
  - `chess.js`: Handles chess game logic, move validation, and FEN/PGN generation.
  - `cm-chessboard`: Provides the visual chessboard UI. Lacks official types — `src/types/cm-chessboard.d.ts` is a shim.

## Development Commands
- **Run Development Server**: `npm run dev`
- **Build Project**: `npm run build`
- **Run Tests**: `npm run test`
- **Watch Tests**: `npm run test:watch`
- **Run Scenario Tests (move pipeline)**: `npm run test:scenarios`
- **Run E2E (opt-in, needs local Supabase)**: `npm run test:e2e`
- **Reset local DB**: `npm run db:reset` (→ `supabase db reset`)
- **Typecheck**: `npm run typecheck`
- **Lint**: `npm run lint`
- **Verify (all-in-one gate)**: `npm run verify` — runs typecheck + lint + test (unit/component/scenario). Run this before declaring any task complete. E2E is NOT included.
- **Supabase**: Use the Supabase MCP Server

## Verification Protocol (for agents)
Before completing any task:
1. `npm run verify` (typecheck + lint + unit/component/scenario tests)
2. If touching DB: ensure local Supabase is running and `.env.local` points at `http://127.0.0.1:54321` (the `npm run dev` guard enforces this — see README "Local dev never hits production"), then `npm run db:reset && npm run test:e2e`
3. If touching UI: smoke-test the relevant flow in the browser via `npm run dev`
Never: skip a test, weaken an assertion, or commit with a failing `verify`. Fix the root cause.

## Testing Conventions
- Pure functions: collocated `*.test.ts`, exhaustive cases.
- API routes: mock `fetch` (LLM + Lichess + Supabase), test status codes and response shapes.
- Components: `*.test.tsx` with Testing Library + jest-dom (matchers registered in `vitest.setup.ts`), test behavior not implementation.
- Move pipeline: scenario-driven via `src/lib/pipeline/` (`movePipeline.ts` + `scenarios/*.json` + `movePipeline.test.ts`). The route (`/api/move/route.ts`) is a thin adapter over `runMovePipeline` — add new pipeline behavior to the extracted module, not the route.
- Fixtures live in `src/__fixtures__/`. Never inline magic FENs in tests — import from `FENS`.
- E2E tests live in `tests/e2e/` and run against local Supabase only. They are excluded from vitest.
- Never mock the module under test — mock at the boundaries (fetch, external services).

## Safe-to-touch vs. Dangerous Zones
- **Safe (iterate freely):** `src/lib/**`, `src/components/**` (presentational components are decomposed), `src/hooks/**`, `supabase/migrations/**`, tests, fixtures, prompts.
- **Dangerous (flag for human review before changing):**
  - RLS policies — source of truth is `supabase/migrations/20260629100103_rls_policies.sql`. Do not edit the `supabase/rls.sql` reference copy as the canonical policy set.
  - `next.config.ts`, `vercel.json`, Vercel project config, env var wiring.
  - `supabase/config.toml` (local stack config).
- **Component size rule:** No component file should exceed ~250 lines. If it does, extract a hook or a child component. (See ENGINEERING_PLAN §2.1.)

## Tooling
- **CLI Tools Available**: `vercel`, `cloudflare`, `gh`, `vitest`
- When unit tests fail, ALWAYS fix the root cause. Never skip the failing test, or coerce the test to pass. Never change the test, escalate to the user if it is genuinely broken.

## Database Schema
- `profiles`: Users and AI bots (`is_bot` flag, `bot_style`, `difficulty_level`).
- `games`: Current match state (`current_fen`, `current_turn`, `status`).
- `moves`: Chronological move history linked to games.
- `game_chat`: Chat messages linked to games.
- **Auth**: Integrated with Supabase Auth; automatic profile creation via PG trigger.
- **RLS**: Source of truth is `supabase/migrations/20260629100103_rls_policies.sql`.

## Deployment (Vercel)
- **Production URL**: https://player2-drab.vercel.app
- **Required Env Vars** (see `.env.example`):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `LLM_API_KEY`
  - `LLM_ENDPOINT` (optional, defaults to Cerebras)
  - `LLM_MODEL` (optional, defaults to gemma-4-31b)
- **Deployment Command**: `vercel --prod`
- **Preview deployments**: Currently share production env vars. Staging Supabase project planned (Phase 4, ENGINEERING_PLAN §4.4).
- **Known Build Fixes**: 
  - `src/app/page.tsx` uses `export const dynamic = 'force-dynamic'` because `ChessGame` eagerly creates a Supabase client at module load.
  - `cm-chessboard` requires a custom TypeScript declaration file (`src/types/cm-chessboard.d.ts`).
  - `ChessGame.tsx` has a scoped `eslint-disable` for `react-hooks/refs` (the `applyRestoredStateRef` latest-callback pattern). The hook files have scoped `eslint-disable`s for `any`/`exhaustive-deps`/`refs` where cm-chessboard's untyped event handlers and the latest-callback ref pattern require them.
  - **Local Supabase on Colima**: `[analytics] enabled = false` in `supabase/config.toml` — the `vector` log-forwarder container bind-mounts the docker socket, which Colima's VZ runtime cannot support. Analytics (log shipping) is not needed for E2E. Start Colima with `colima start` (socket at `~/.colima/default/docker.sock`); `npx supabase start` then works. For E2E, `.env.local` must point at local Supabase (`http://127.0.0.1:54321`) — back up the prod-pointing `.env.local`, swap, run `npm run db:reset && npm run test:e2e`, then restore.

## Architecture Summary (post-Phase 5)
- `ChessGame.tsx` (135 lines) is now a thin orchestrator: owns the shared refs (`chessGameRef`, `boardInstanceRef`, `boardRef`, `sessionGoalRef`) and wires the hooks. The remaining `any`/`react-hooks/refs` disables are scoped to the hook files where cm-chessboard's untyped event handlers and the latest-callback ref pattern require them.
- Hooks extracted: `useAuth`, `useChessGame` (board state, AI move loop, board init), `useCoachChat` (chat, consultation phase, `/api/chat`), `useGamePersistence` (gameId, opponent, saveGameMove, createGame, restoreGame effect).
- Presentational components extracted: `Board`, `ChatPanel`, `MoveHistory`, `AuthBadge`.
- Pure helpers in `src/lib/utils/chess.ts` (`getPieceImage`, `processFen`, `computeCapturedPieces`) and `src/lib/utils/boardInput.ts` (`handleChessInput`, cm-chessboard move-input handler).
- AI pipeline: opening book → Lichess masters → Stockfish candidates → LLM pick (with 422 on bad index, no silent fallback).
- `generateSemanticState` is real (phase detection + material balance), not a stub.
- Move pipeline extracted to `src/lib/pipeline/movePipeline.ts` (`runMovePipeline`); `/api/move/route.ts` is a thin NextResponse adapter. Scenario tests in `src/lib/pipeline/scenarios/` + `movePipeline.test.ts`.
- Test fixtures centralized in `src/__fixtures__/` (`fens.ts`, `games.ts`, `lichessResponses.ts`, `llmResponses.ts`).
- Component tests for `Board`, `ChatPanel`, `MoveHistory` (Testing Library + jest-dom, matchers in `vitest.setup.ts`).
- E2E: Playwright (`playwright.config.ts`, `tests/e2e/`), opt-in via `npm run test:e2e`, excluded from vitest.
- **Consultation phase playable-state guard**: the player is always White and moves first. The consultation LLM prompt (`/api/chat/route.ts`) constrains `SET_FEN` to side-to-move `w` (returning a position one ply earlier for naturally-Black-to-move scenarios). The client (`useCoachChat.ts`) additionally auto-calls `makeAIMove()` after the transition-to-game if the loaded FEN has Black to move, so consultation always exits with White to move regardless of LLM behavior. `processFen` is intentionally left generic — side-to-move enforcement lives at the consultation boundary, not the utility.

## Current Progress
- [x] Project initialized with Next.js, TS, Tailwind.
- [x] Core chess dependencies installed.
- [x] Implement basic playable board.
- [x] Integrate Stockfish API for AI moves.
- [x] Implement move history and captured pieces display.
- [x] Setup Supabase schema.
- [x] Implement collocated unit tests with Vitest.
- [x] Implement iterative Opening Book lookup to support multi-turn opening goals.
- [x] Integrate Lichess Masters Database for theory-based move suggestions.
- [x] Deployed to Vercel and configured environment variables.
- [x] ENGINEERING_PLAN Phase 1 — Foundations (verify harness, fixed broken tests, lint cleanup).
- [x] ENGINEERING_PLAN Phase 2 — Architecture (real `generateSemanticState`, persona cleanup, 422 on bad index, decomposed `ChessGame.tsx`).
- [x] Unblocked local dev + production build (`.env.local` fix, `force-dynamic`).
- [x] ENGINEERING_PLAN Phase 3 — Testing harness (fixtures, scenario pipeline extracted from route, component tests, Playwright E2E).
- [x] ENGINEERING_PLAN Phase 4 — Deployment isolation (`.env.example` tiers, seed.sql, PR template). Staging backend (step 15) deferred indefinitely — develop against local Supabase.
- [x] ENGINEERING_PLAN Phase 5 — Agent enablement audit (added Safe-to-touch vs. Dangerous Zones, surfaced 250-line component rule in AGENTS.md).
- [x] Extract `useChessGame` / `useCoachChat` / `useGamePersistence` hooks from `ChessGame.tsx` (657 → 135 lines; all extracted files under the 250-line rule).
- [x] Consultation playable-state guard — prompt constrains side-to-move `w`; client auto-plays Black if LLM/user gives a Black-to-move FEN.
