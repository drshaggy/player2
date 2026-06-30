# Engineering Plan: Architecture, Testing Harness, and Deployment Strategy

**Status:** Phases 1-3 complete. Phase 4 (deployment isolation) is next.
**Audience:** Future coding agents (small model) and human contributors.
**Goal:** Shore up the architecture so a small model can safely iterate, build a testing harness that catches real bugs (not just happy paths), and stop deploying to production to test changes.

> **Resume note:** The codebase is in a working state — `npm run verify` passes (71 tests across 13 files: typecheck, lint, unit + component + scenario tests), `npm run build` succeeds. E2E is wired (`npm run test:e2e`, opt-in, needs local Supabase). Phase 4 starts at step 13 below.

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
7. **Deployment = production** — STILL OPEN (Phase 4): Vercel Previews still hit prod Supabase. Staging project planned.

---

## 2. Architecture Consolidation

### 2.1 Decompose `ChessGame.tsx`

Split into a hook + presentational components. The state machine stays in one hook; components stay dumb.

```
src/components/
  ChessGame.tsx              # thin orchestrator only
  Board.tsx                 # cm-chessboard wrapper, captured pieces, status pill
  ChatPanel.tsx             # message list + input
  MoveHistory.tsx           # right-side move list
  AuthBadge.tsx             # top-right login/logout

src/hooks/
  useChessGame.ts           # board state, move input, AI move loop
  useCoachChat.ts           # chat messages, consultation phase, /api/chat
  useGamePersistence.ts     # saveGameMove, restoreGame, Supabase read/write
  useAuth.ts                 # session subscription
```

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

**Decision (free Supabase tier):** use a separate staging Supabase project for previews. Branching is documented as the future upgrade path but not the current approach.

```
LOCAL  →  PREVIEW (per-branch)        →  PRODUCTION
 ↑              ↑                            ↑
local Supabase  staging Supabase project      prod Supabase
(ephemeral)     (shared across all previews)  (shared)
```

> Note: Vercel Preview URLs will share the staging DB across branches. This is acceptable because staging data is throwaway and isolated from prod. Per-branch DB isolation requires Supabase Branching (paid plan) — see §4.4.

### 4.3 Tier 1 — Local Supabase (for the agent + dev)

Already scaffolded (`supabase/config.toml`, migrations exist). Make it first-class:

- **Command:** `supabase start` (requires Docker).
- **DB:** Local Postgres on `54322`, auto-applies all migrations in `supabase/migrations/`.
- **Env:** Create `.env.local` pointing at local Supabase. Add `.env.development` (gitignored) for the dev server, `.env.example` (committed) documenting required vars.
- **Seed:** `supabase/seed.sql` already exists — extend it to seed a test user + a Coach bot + a sample game so the app is usable on first `npm run dev`.
- **Reset:** `npm run db:reset` → `supabase db reset` (re-applies migrations + seed). Critical for the agent to get a clean slate between test runs.

**Agent rule:** Before running E2E or manual verification, run `npm run db:reset` to ensure a known DB state.

### 4.4 Tier 2 — Preview deployments with isolated DB

**Chosen approach: self-hosted Supabase on percy.network.** A self-hosted Supabase instance at `supabase.percy.network` backs all Vercel Preview deployments. Data is throwaway; isolated from production. One instance is shared across all percy.network projects (not just player2), amortising the ops cost. Free of recurring SaaS charges; the tradeoff is self-managed updates/backups/TLS (see `docs/self-hosting-setup.md §9`).

Setup (full step-by-step in `docs/self-hosting-setup.md`):
1. On percy.network, bootstrap the Supabase Docker stack and generate secrets (`utils/generate-keys.sh` + `utils/add-new-auth-keys.sh`).
2. Set `SUPABASE_PUBLIC_URL` / `API_EXTERNAL_URL` / `SITE_URL` to `https://supabase.percy.network`; set `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD`.
3. Start with HTTPS via the bundled Caddy override (`docker-compose.caddy.yml` → auto Let's Encrypt).
4. Apply migrations from the player2 repo with `supabase db push --db-url` (self-hosted does NOT use `supabase link`); seed via `psql … -f supabase/seed.sql`.
5. In Vercel → Settings → Environment Variables, set **Preview** scope to the self-hosted instance:
   - `NEXT_PUBLIC_SUPABASE_URL` → `https://supabase.percy.network`.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `ANON_KEY` (or `sb_publishable_…`) from `sh run.sh secrets`.
   - `SUPABASE_SERVICE_ROLE_KEY` → `SERVICE_ROLE_KEY` (or `sb_secret_…`) — server-only.
   - `LLM_API_KEY`, `LLM_ENDPOINT`, `LLM_MODEL` → reuse production values (LLM is stateless, safe to share).
6. Seed the self-hosted DB with the test user + Coach bot (§6 step 14) so previews are usable on first load.

**Future upgrade path — Supabase Branching (requires paid plan):** enables a branch DB per git branch, auto-provisioned via the Vercel-Supabase integration. If the plan is upgraded later, swap the Vercel Preview env vars for the branch integration and retire the self-hosted instance. The rest of the workflow is unchanged.

### 4.5 Tier 3 — Production

Unchanged. `main` branch → Vercel Production → prod Supabase. Never push directly to `main`.

### 4.6 Workflow rules

1. **Branch per change:** `feat/...`, `fix/...`, `chore/...`.
2. **Open PR → Vercel auto-creates Preview pointed at the self-hosted Supabase instance.**
3. **Run `npm run verify` locally + smoke-test the preview URL.**
4. **Squash-merge to `main`** → auto-deploys production.
5. **DB migrations:** Create via `supabase migration new <name>`, test locally, commit. After merge to `main`, push migrations to the self-hosted instance via `supabase db push --db-url` so previews stay in sync.

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

### Phase 4 — Deployment isolation (partially complete)
13. **Document `.env.example`** and split `.env.local` for local Supabase. Commit. ✅ (`.env.example` rewritten with local/staging/prod tier docs; README updated with local-dev first-run and deployment tiers)
14. **Extend `supabase/seed.sql`** with test user + Coach bot + sample game. Commit. ✅ (test user `test@player2.local`/`password123` seeded into `auth.users` with bcrypt hash; Coach bot upserted; sample game row; idempotent via `ON CONFLICT`)
15. **Self-host Supabase on percy.network** (`supabase.percy.network`) — generic instance shared across all percy.network projects. Push migrations + seed, configure Vercel Preview env vars (§4.4). Document in `docs/self-hosting-setup.md` + README. Commit. ⏳ **MANUAL ops** (bootstrap on the server) — instructions in `docs/self-hosting-setup.md`; code/docs side complete.
16. **Add PR template** (`.github/pull_request_template.md`) reminding to run `npm run verify` and smoke-test the preview. Commit. ✅

---

## 7. Non-Goals (explicitly out of scope)

- Rewriting the AI pipeline logic — it works, just needs the silent-failure fix.
- Adding new product features (endgame library expansion, etc.).
- Performance optimization / caching.
- Replacing Stockfish-on-WebSocket with an in-process engine.
- **Persona system rework** — the current persona values are placeholders and the matching logic is broken. A full rework (canonical persona set, union type, wiring through the prompt + opening book) is a separate track of work. Do not piecemeal-fix the broken map; defer until that track is started.

---

## 8. Resolved Decisions

1. **Supabase staging tier — self-hosted on percy.network.** Replaced the earlier "free cloud staging project" approach (which can't create extra free projects and a paid second project isn't justified) with a self-hosted Supabase Docker stack at `supabase.percy.network`, shared across all percy.network projects. See §4.4 and `docs/self-hosting-setup.md`. Supabase Branching remains the future upgrade path.
2. **Empty `tests/` dir — model-created, refactoring permitted.** Canonical E2E location is `tests/e2e/`. The empty `tests/` is replaced by `tests/e2e/.gitkeep` to make intent concrete in the repo.
3. **Root `rls_policies.sql` — duplicate, deleted.** Source of truth for RLS is `supabase/migrations/20260629100103_rls_policies.sql` (applied via migrations). `supabase/rls.sql` is a reference copy kept in `supabase/`; the root-level duplicate is removed.
4. **Personas — placeholders, rework deferred.** See §7. Do not encode the current values as a canonical union type or fix the broken map piecemeal; wait for the dedicated persona-rework track.
