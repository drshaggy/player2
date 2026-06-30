# Project Instructions: Player 2

## Documentation
- **AGENTS.md** - Update this file with commands and rules specific to this project
- **ARCHITECTURE.md**
- **ENGINEERING_PLAN.md** - Architecture, testing harness, and deployment strategy (Phases 1-3 complete; Phase 4 in progress)
- **DYNAMIC_FEN_PLAN.md**
- **docs/staging-setup.md** - Step-by-step staging Supabase project creation (Phase 4 step 15, manual)
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
2. If touching DB: `npm run db:reset && npm run test:e2e`
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
  - `ChessGame.tsx` has a scoped `eslint-disable` for `any`/`exhaustive-deps`/`react-hooks/refs` — to be cleaned up when the remaining game logic is extracted into hooks (deferred).

## Architecture Summary (post-Phase 2)
- `ChessGame.tsx` (657 lines) is the orchestrator: game state, AI move loop, persistence, chat, restoration. Further extraction into `useChessGame` / `useCoachChat` / `useGamePersistence` hooks is deferred.
- Presentational components extracted: `Board`, `ChatPanel`, `MoveHistory`, `AuthBadge`.
- `useAuth` hook extracted.
- Pure helpers in `src/lib/utils/chess.ts` (`getPieceImage`, `processFen`).
- AI pipeline: opening book → Lichess masters → Stockfish candidates → LLM pick (with 422 on bad index, no silent fallback).
- `generateSemanticState` is real (phase detection + material balance), not a stub.
- Move pipeline extracted to `src/lib/pipeline/movePipeline.ts` (`runMovePipeline`); `/api/move/route.ts` is a thin NextResponse adapter. Scenario tests in `src/lib/pipeline/scenarios/` + `movePipeline.test.ts`.
- Test fixtures centralized in `src/__fixtures__/` (`fens.ts`, `games.ts`, `lichessResponses.ts`, `llmResponses.ts`).
- Component tests for `Board`, `ChatPanel`, `MoveHistory` (Testing Library + jest-dom, matchers in `vitest.setup.ts`).
- E2E: Playwright (`playwright.config.ts`, `tests/e2e/`), opt-in via `npm run test:e2e`, excluded from vitest.

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
- [ ] ENGINEERING_PLAN Phase 4 — Deployment isolation (staging Supabase, seed, PR template).
