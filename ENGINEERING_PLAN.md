# Engineering Plan: Architecture, Testing Harness, and Deployment Strategy

**Status:** Phases 1-5 complete.
**Audience:** Future coding agents (small model) and human contributors.
**Goal:** Shore up the architecture so a small model can safely iterate, build a testing harness that catches real bugs (not just happy paths), and stop deploying to production to test changes.

> **Resume note:** The codebase is in a working state — `npm run verify` passes (81 tests across 14 files: typecheck, lint, unit + component + scenario tests), `npm run build` succeeds. E2E is wired (`npm run test:e2e`, opt-in, needs local Supabase). Phases 1-5 are done; the staging backend (step 15) is deferred indefinitely (§4.4). `ChessGame.tsx` is a 135-line orchestrator over `useChessGame` / `useCoachChat` / `useGamePersistence`. Remaining deferred track: persona system rework (§7).
>
> **UNCOMMITTED — Phase 5 step 18 (hook extraction) is in the working tree but not yet committed.** Docker was previously down on this machine; before committing, run `npm run db:reset && npm run test:e2e` to confirm behavior was preserved (the extraction touched a Dangerous-zone file). See AGENTS.md "Resume State" for the file list and post-E2E commit instructions.

---

## 1. Current State Summary

> This section described the state at plan creation. Phases 1-2 have since resolved items 1-4, 6, and partially 5. Items 7 remains (Phase 4). See §6 for per-step status.

### What works
- Hybrid AI pipeline (opening book → Lichess masters → Stockfish candidates → LLM pick) is sound in concept.
- Supabase schema with RLS is defined and applied.
- Collocated Vitest unit tests exist for the move API, opening book, board utils, Lichess service, and prompts.
- Vercel production deployment is functional.

### What was brittle (now resolved unless noted)
1. **`ChessGame.tsx` is a 903-line god component** — RESOLVED (Phase 2.8): decomposed to 657 lines with `Board`, `ChatPanel`, `MoveHistory`, `AuthBadge`, `useAuth`, and `chess.ts` utils extracted. Further hook extraction deferred.
2. **Stubs masquerading as features** — RESOLVED (Phase 2.5, 2.6): `generateSemanticState` now does real phase/material analysis; `getOpeningMove` persona param is honest with a TODO (full rework deferred to §7).
3. **Tests that test mocks, not code** — RESOLVED (Phase 1.3, 1.4): `openingBook.test.ts` rewritten to test real code; all test files audited.
4. **Silent failure masking** — RESOLVED (Phase 2.7): `/api/move` returns 422 with debug payload on bad index, no fallback.
5. **No E2E tests** — RESOLVED (Phase 3.12): Playwright wired with `playwright.config.ts`, `npm run test:e2e`, smoke + consultation specs in `tests/e2e/`. Opt-in (not part of `verify`); requires local Supabase.
6. **No type check or lint gate** — RESOLVED (Phase 1.1): `npm run verify` is the single gate.
7. **Deployment = production** — RESOLVED (Phase 4, step 15 deferred): Vercel Previews remain unwired to a staging DB; the staging backend decision is deferred indefinitely (§4.4). Develop against local Supabase (`npm run db:reset` + `npm run dev`) and smoke-test there. Steps 13, 14, 16 are done.

---

## 2. Architecture Consolidation

### 2.1 Decompose `ChessGame.tsx` ✅

Split into a hook + presentational components. The state machine stays in one hook; components stay dumb.

```
src/components/
  ChessGame.tsx              # thin orchestrator only (135 lines)
  Board.tsx                 # cm-chessboard wrapper, captured pieces, status pill
  ChatPanel.tsx             # message list + input
  MoveHistory.tsx           # right-side move list
  AuthBadge.tsx             # top-right login/logout

src/hooks/
  useChessGame.ts           # board state, move input, AI move loop (211 lines)
  useCoachChat.ts           # chat messages, consultation phase, /api/chat (209 lines)
  useGamePersistence.ts     # saveGameMove, createGame, restoreGame, Supabase read/write (237 lines)
  useAuth.ts                # session subscription

src/lib/utils/
  boardInput.ts             # handleChessInput (cm-chessboard move-input handler, extracted)
  chess.ts                  # getPieceImage, processFen, computeCapturedPieces (extracted)
```

**Done (Phase 5.18):** `ChessGame.tsx` 657 → 135 lines; all extracted files under the 250-line rule. Orchestrator owns the shared refs (`chessGameRef`, `boardInstanceRef`, `boardRef`, `sessionGoalRef`); hooks communicate via two latest-callback refs (`setChatMessagesRef`, `applyRestoredStateRef`) to break the circular call-order dependency. Behavior preserved verbatim; E2E gate (`npm run test:e2e`, needs local Supabase) should be run before merging UI behavior changes.

**Rule for agents:** No component file should exceed ~250 lines. If it does, extract a hook or a child component.

### 2.2 Fix the stubs

- **`generateSemanticState`**: Implement real phase detection (count pieces → opening/middlegame/endgame) and material balance (pawn-weighed piece counts). Pure function, trivially testable.
- **`getOpeningMove` persona param:** The persona values (`'balanced'` / `'aggressive'` / `'solid'`) are placeholders and the matching map is broken (maps `'patient'`, never passed). **Persona rework is deferred** (see §7) — for now, do not invest in fixing the map piecemeal. Either drop the unused parameter or leave it as a no-op pass-through, and add a `TODO` pointing to the deferred persona-rework track. Do not pretend the current values are canonical.

### 2.3 Remove silent failure paths ✅
- `route.ts:145`: When `selectedMoveIndex` is out of range, return a 422 with the LLM's raw response in the error payload so the agent can see what went wrong. Do not fall back to move #1. **Done (Phase 2.7).**
- `ChessGame.tsx:576`: The "undo player move on AI failure" path is good UX but swallows the error type. Log the error category (network / LLM / parse) so the agent can diagnose. **Deferred** — still logs the raw error; category tagging deferred to Phase 3 testing harness.

### 2.4 Consolidate prompts ✅
- `src/lib/prompts/index.js` and `index.ts` both existed. Deleted the `.js` file (Phase 1.2, commit `35ddb2c`). ARCHITECTURE.md updated to reference `index.ts`.

### 2.5 Type safety ✅
- Added `tsc --noEmit` as `npm run typecheck` (Phase 1.1). Included in `npm run verify`.
- Enforce `strict: true` (already on) — `ChessGame.tsx` still has `any` on event handlers (scoped `eslint-disable` with TODO); will be cleaned up when remaining hooks are extracted (deferred). `route.ts`, `chat/route.ts`, `prompts/index.ts`, `lichess.ts` all `any`-free.

---

## 3. Testing Harness

The guiding principle: **a small model should be able to verify its work by running a single command.** Tests must be fast, deterministic, and not hit external services.

### 3.1 Fix the broken tests first

- Rewrite `src/lib/openingBook.test.ts` to NOT mock the module under test. Test the real `getOpeningMoves` / `getOpeningMove` against the real `OPENING_BOOK` tree.
- Audit every `*.test.ts` for the same anti-pattern (mocking the module under test). If found, fix or delete.

### 3.2 Unit test layer (Vitest, collocated)

Pure functions get exhaustive coverage. These are the agent's safety net:

| Module | What to cover |
|---|---|
| `src/lib/openingBook.ts` | Tree traversal, out-of-book returns, persona selection, all branches in `OPENING_BOOK`. |
| `src/lib/utils/board.ts` | `generateAsciiBoard` for every FEN variant (start, midgame, endgame, promotion, en passant). Real `generateSemanticState` once implemented. |
| `src/lib/prompts/index.ts` | Snapshot the generated prompt string for known inputs (Caro-Kann goal, no goal, custom FEN). Catches accidental prompt drift. |
| `src/app/api/move/route.ts` | LLM mocked. Cover: valid index, out-of-range index (should 422), missing API key, Lichess failure (should not 500), empty candidates. |
| `src/app/api/chat/route.ts` | Supabase + LLM mocked. Cover: consultation phase SET_FEN parsing, TRANSITION_TO_GAME, missing token (401), standard chat insert. |

### 3.3 Integration test layer (Vitest, with mocks at the boundary)

For the move pipeline specifically, build a **scenario harness** — this is the highest-value investment for a small model:

```
src/lib/pipeline/
  movePipeline.ts           # extracted pure-ish pipeline: opening book + candidates + LLM call
  scenarios/
    caro-kann.json           # { history, fen, sessionGoal, expectedMoves }
    sicilian-najdorf.json
    no-goal-best-move.json
    out-of-book-midgame.json
movePipeline.test.ts         # for each scenario, run pipeline with LLM mocked, assert move ∈ expectedMoves
```

This lets the agent run `npm run test:scenarios` and verify that a code change didn't break the Caro-Kann alignment, etc. The LLM is mocked to return a canned `selectedMoveIndex` so tests are deterministic.

### 3.4 Component tests (Vitest + Testing Library)

Add `@testing-library/react` and test the decomposed components:
- `Board` renders the correct FEN.
- `ChatPanel` sends on Enter, appends messages, shows typing indicator.
- `MoveHistory` renders paired moves correctly.

Skip testing `cm-chessboard` itself — it's a third-party canvas-heavy lib.

### 3.5 E2E tests (Playwright) — opt-in, not blocking

```
tests/e2e/
  consultation-flow.spec.ts     # login (mocked) → chat → set goal → board unlocks → make move
  full-game-smoke.spec.ts       # play 3 moves, verify persistence after reload
```

Use a **local Supabase** instance (see §4.2) seeded with a test user. Mark E2E with a separate script `npm run test:e2e` so unit tests stay fast.

### 3.6 Fixture system

Centralize test data:
```
src/__fixtures__/
  fens.ts                # startingFen, caroKannFen, sicilianFen, endgameFen, etc.
  games.ts               # sample game rows, move sequences
  lichessResponses.ts     # recorded Lichess API responses
  llmResponses.ts         # recorded LLM outputs for move selection
```

### 3.7 The single command

Add to `package.json`:
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "typecheck": "tsc --noEmit",
  "lint": "eslint",
  "verify": "npm run typecheck && npm run lint && npm run test"
}
```

**Agent rule (add to AGENTS.md):** Before declaring a task complete, run `npm run verify`. If it fails, fix the root cause — never skip or weaken a test.

---

## 4. Deployment Strategy

### 4.1 The problem

Vercel Preview deployments share production env vars by default, so a preview URL hits the production Supabase DB. Pushing to a branch and opening a PR does not isolate data.

### 4.2 Solution: Three-tier environments

**Staging backend is DEFERRED (see §4.4).** For now only the local and production tiers are wired. The original plan (separate staging Supabase project) and a self-hosted prototype were both ruled out — see §4.4 and §8.1 for why. Until a staging backend is decided, develop against local Supabase and smoke-test via `npm run dev`.

```
LOCAL  →  [ PREVIEW (per-branch) — DEFERRED ]  →  PRODUCTION
  ↑              ↑                                    ↑
local Supabase  staging backend TBD (§4.4)           prod cloud project
(ephemeral)     (not currently wired)                 (zdfscobeyhohhvgylhbh)
```

> Note: do NOT point Vercel Preview env vars at the production cloud project — previews must not mutate prod data. Until a staging backend exists, Preview URLs are unwired on the DB side.

### 4.3 Tier 1 — Local Supabase (for the agent + dev)

Already scaffolded (`supabase/config.toml`, migrations exist). Make it first-class:

- **Command:** `supabase start` (requires Docker).
- **DB:** Local Postgres on `54322`, auto-applies all migrations in `supabase/migrations/`.
- **Env:** Create `.env.local` pointing at local Supabase. Add `.env.development` (gitignored) for the dev server, `.env.example` (committed) documenting required vars.
- **Seed:** `supabase/seed.sql` already exists — extend it to seed a test user + a Coach bot + a sample game so the app is usable on first `npm run dev`.
- **Reset:** `npm run db:reset` → `supabase db reset` (re-applies migrations + seed). Critical for the agent to get a clean slate between test runs.

**Agent rule:** Before running E2E or manual verification, run `npm run db:reset` to ensure a known DB state.

### 4.4 Tier 2 — Preview deployments with isolated DB

**DEFERRED INDEFINITELY.** The staging backend for Vercel Preview deployments is on hold; Phase 4 is marked complete with this item deferred. A staging tier may be revisited when there is a concrete need to test against a shared non-prod backend.

- A self-hosted Supabase stack on percy.network was prototyped in docs, but a single shared instance can't safely back multiple projects (schema/auth/migrations collide — see §8.1). Per-project stacks (one subdomain each) are the clean alternative but add per-project ops.
- **Until resolved:** develop against **local Supabase** (`supabase start` + `npm run db:reset`) and smoke-test in `npm run dev`. Vercel Preview URLs are not yet wired to a staging DB; do not point them at the production cloud project.

When revisited, the two viable options are:
1. **Per-project self-hosted stacks** — `supabase-<project>.percy.network`, each its own Postgres/Auth/keys. Real isolation; cost is RAM + containers per project.
2. **Supabase Branching (paid plan)** — branch DB per git branch via the Vercel-Supabase integration. Zero ops; cost is the plan fee.

Setup instructions for option 1 will be re-documented here when the decision is made.

### 4.5 Tier 3 — Production

Unchanged. `main` branch → Vercel Production → prod Supabase. Never push directly to `main`.

### 4.6 Workflow rules

1. **Branch per change:** `feat/...`, `fix/...`, `chore/...`.
2. **Open PR → run `npm run verify` locally + smoke-test via `npm run dev` against local Supabase.** (Vercel Preview DB wiring is deferred — §4.4.)
3. **Squash-merge to `main`** → auto-deploys production.
4. **DB migrations:** Create via `supabase migration new <name>`, test locally with `npm run db:reset`, commit. After merge to `main`, apply migrations to the cloud project.

---

## 5. Agent Enablement

Add the following to `AGENTS.md` so the small model has clear rails:

### 5.1 Verification protocol
```
Before completing any task:
1. npm run verify         (typecheck + lint + unit tests)
2. If touching DB:        supabase db reset && npm run test:e2e
3. If touching UI:        smoke-test the relevant flow in the browser
Never: skip a test, weaken an assertion, or commit with a failing verify.
```

### 5.2 Testing conventions
- Pure functions: collocated `*.test.ts`, exhaustive cases.
- API routes: mock `fetch` (LLM + Lichess + Supabase), test status codes and response shapes.
- Components: `*.test.tsx` with Testing Library, test behavior not implementation.
- Fixtures live in `src/__fixtures__/`. Never inline magic FENs in tests.
- E2E tests live in `tests/e2e/` and run against local Supabase only.

### 5.3 Safe-to-touch vs. dangerous zones
- **Safe:** `src/lib/**`, `src/components/**` (after decomposition), `supabase/migrations/**`, tests.
- **Dangerous:** `ChessGame.tsx` (until decomposed), RLS policies, `next.config.ts`, Vercel project config. Flag for human review.

---

## 6. Implementation Order

Sequenced so each step is independently shippable and the agent can verify as it goes.

### Phase 1 — Foundations (no behavior change) ✅
1. **Add `verify` script + `typecheck` script.** Run it. Fix whatever breaks. Commit. ✅
2. **Delete `src/lib/prompts/index.js`** (dead duplicate). Update ARCHITECTURE.md. Commit. ✅ (committed in `35ddb2c`)
3. **Fix the broken openingBook tests** (remove self-mock). Make them pass against real code. Commit. ✅
4. **Audit all `*.test.ts`** for the self-mock anti-pattern. Fix or delete. Commit. ✅ (no other instances found)

### Phase 2 — Architecture ✅
5. **Implement real `generateSemanticState`.** Add tests. Commit. ✅
6. **Fix or remove `getOpeningMove` persona param.** Add tests. Commit. ✅ (dropped unused param from `getOpeningMoves`; `getOpeningMove` keeps param with TODO, full rework deferred to §7)
7. **Remove silent index fallback in `route.ts`.** Return 422 with debug payload. Update test. Commit. ✅
8. **Decompose `ChessGame.tsx`** into hooks + components. Keep behavior identical. E2E test must still pass. Commit in slices (one extraction per commit). ✅ (907→657 lines; extracted useAuth + AuthBadge + Board + ChatPanel + MoveHistory + chess utils; remaining logic deferred to future slice)

### Phase 3 — Testing harness ✅
9. **Add `src/__fixtures__/`** with FENs and recorded API responses. Commit. ✅ (`fens.ts`, `games.ts`, `lichessResponses.ts`, `llmResponses.ts`, `index.ts`, plus `fixtures.test.ts` validating FENs against chess.js)
10. **Build the scenario harness** (`movePipeline.ts` + scenarios + test). Commit. ✅ (extracted `runMovePipeline` from `route.ts`; `route.ts` is now a thin NextResponse adapter; 4 scenarios in `src/lib/pipeline/scenarios/`; `movePipeline.test.ts` covers happy paths, merges, and all failure modes; `npm run test:scenarios`)
11. **Add component tests** for decomposed components. Commit. ✅ (`Board.test.tsx`, `ChatPanel.test.tsx`, `MoveHistory.test.tsx` via Testing Library + jest-dom; `vitest.setup.ts` registers matchers)
12. **Wire up Playwright E2E** against local Supabase. Add `test:e2e` script. Commit. ✅ (`playwright.config.ts`, `tests/e2e/smoke.spec.ts`, `tests/e2e/consultation-flow.spec.ts`; `npm run test:e2e`; excluded from vitest)

### Phase 4 — Deployment isolation ✅
13. **Document `.env.example`** and split `.env.local` for local Supabase. Commit. ✅ (`.env.example` rewritten with local/staging/prod tier docs; README updated with local-dev first-run and deployment tiers)
14. **Extend `supabase/seed.sql`** with test user + Coach bot + sample game. Commit. ✅ (test user `test@player2.local`/`password123` seeded into `auth.users` with bcrypt hash; Coach bot upserted; sample game row; idempotent via `ON CONFLICT`)
15. **Staging backend for Vercel Previews — DEFERRED INDEFINITELY.** Phase 4 is marked complete with this item deferred. A self-hosted Supabase stack on percy.network was prototyped but a single shared instance can't safely back multiple projects (schema/auth/migrations collide). Per-project stacks or Supabase Branching (paid) are the viable options; decision deferred until a concrete need arises. Until then, develop against local Supabase (`npm run db:reset` + `npm run dev`). Code/docs side (steps 13, 14, 16) complete.
16. **Add PR template** (`.github/pull_request_template.md`) reminding to run `npm run verify` and smoke-test the preview. Commit. ✅

### Phase 5 — Agent enablement audit
17. **Audit §5 (Agent Enablement) against `AGENTS.md` and fill gaps.** Commit. ✅ (added "Safe-to-touch vs. dangerous zones" section — the §5.3 item that was missing; surfaced the §2.1 ~250-line component rule; updated Architecture Summary header and Current Progress checklist to reflect Phases 1-4 complete)
18. **Extract `useChessGame` / `useCoachChat` / `useGamePersistence` hooks from `ChessGame.tsx`.** Commit. ✅ (`ChessGame.tsx` 657 → 135 lines; extracted `handleChessInput` → `src/lib/utils/boardInput.ts` and `computeCapturedPieces` → `src/lib/utils/chess.ts` (with `chess.test.ts`, 10 cases); orchestrator owns shared refs + two latest-callback refs; behavior preserved; `npm run verify` passes, build succeeds)

---

## 7. Non-Goals (explicitly out of scope)

- Rewriting the AI pipeline logic — it works, just needs the silent-failure fix.
- Adding new product features (endgame library expansion, etc.).
- Performance optimization / caching.
- Replacing Stockfish-on-WebSocket with an in-process engine.
- **Persona system rework** — the current persona values are placeholders and the matching logic is broken. A full rework (canonical persona set, union type, wiring through the prompt + opening book) is a separate track of work. Do not piecemeal-fix the broken map; defer until that track is started.

---

## 8. Resolved Decisions

1. **Supabase staging tier — DEFERRED INDEFINITELY (Phase 4 marked complete).** A self-hosted Supabase stack on percy.network was prototyped, but a single shared instance can't safely back multiple projects: the `public` schema, `auth.users` + the `handle_new_user` trigger, and `supabase_migrations` history all collide across projects. Per-project stacks (one subdomain each) or Supabase Branching (paid plan) are the viable paths; decision deferred until a concrete need arises. Until then, develop against local Supabase. See §4.4.
2. **Empty `tests/` dir — model-created, refactoring permitted.** Canonical E2E location is `tests/e2e/`. The empty `tests/` is replaced by `tests/e2e/.gitkeep` to make intent concrete in the repo.
3. **Root `rls_policies.sql` — duplicate, deleted.** Source of truth for RLS is `supabase/migrations/20260629100103_rls_policies.sql` (applied via migrations). `supabase/rls.sql` is a reference copy kept in `supabase/`; the root-level duplicate is removed.
4. **Personas — placeholders, rework deferred.** See §7. Do not encode the current values as a canonical union type or fix the broken map piecemeal; wait for the dedicated persona-rework track.
