# Engineering Plan: Architecture, Testing Harness, and Deployment Strategy

**Status:** Proposed
**Audience:** Future coding agents (small model) and human contributors.
**Goal:** Shore up the architecture so a small model can safely iterate, build a testing harness that catches real bugs (not just happy paths), and stop deploying to production to test changes.

---

## 1. Current State Summary

### What works
- Hybrid AI pipeline (opening book → Lichess masters → Stockfish candidates → LLM pick) is sound in concept.
- Supabase schema with RLS is defined and applied.
- Collocated Vitest unit tests exist for the move API, opening book, board utils, Lichess service, and prompts.
- Vercel production deployment is functional.

### What's brittle (high-risk for a small model to touch)
1. **`ChessGame.tsx` is a 903-line god component** handling auth, board rendering, chat, AI moves, persistence, restoration, FEN parsing, and UI. Any change risks collateral damage.
2. **Stubs masquerading as features:**
   - `generateSemanticState` (`src/lib/utils/board.ts:28`) always returns `"The board is in a mid-game state. Material is equal."` — the LLM is fed misinformation.
   - `getOpeningMove` persona matching (`src/lib/openingBook.ts:153`) maps `'patient'` but callers pass `'balanced'`, so style matching always falls through to `moves[0]`.
3. **Tests that test mocks, not code:**
   - `src/lib/openingBook.test.ts:4` mocks `@/lib/openingBook` then imports `getOpeningMoves` from the same module — the assertions validate the mock's return value, not real behavior.
   - `src/lib/openingBook.test.ts:27` asserts `bookOptions` is `null` after `mockReturnValue(null)`, but `getOpeningMoves` returns `[]` (never `null`) — the test only passes because it's testing the mock.
4. **Silent failure masking:** `route.ts:145` falls back to `processedCandidates[0]` on a bad LLM index. This hides LLM hallucinations rather than surfacing them.
5. **No E2E tests.** Playwright is installed (`@playwright/test`) but unused. `tests/` is an empty directory.
6. **No type check or lint gate.** `npm run test` runs but `npm run lint` / `tsc --noEmit` is never enforced before push.
7. **Deployment = production.** Vercel Preview deployments inherit production env vars, so they hit the production Supabase DB. There is no staging environment.

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
- **`getOpeningMove` persona map**: Either remove the `persona` parameter (callers pass `'balanced'` which isn't in the map anyway) or extend the map to include `'balanced'`. Decide and document.

### 2.3 Remove silent failure paths

- `route.ts:145`: When `selectedMoveIndex` is out of range, return a 422 with the LLM's raw response in the error payload so the agent can see what went wrong. Do not fall back to move #1.
- `ChessGame.tsx:576`: The "undo player move on AI failure" path is good UX but swallows the error type. Log the error category (network / LLM / parse) so the agent can diagnose.

### 2.4 Consolidate prompts

- `src/lib/prompts/index.js` and `index.ts` both exist. Delete the `.js` file. ARCHITECTURE.md references the `.js` — update the doc.

### 2.5 Type safety

- Add `tsc --noEmit` as a script: `"typecheck": "tsc --noEmit"`.
- Enforce `strict: true` (already on) — remove `any` from `ChessGame.tsx` event handlers via a proper `ChessboardInputEvent` type.

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

```
LOCAL  →  PREVIEW (per-branch)  →  PRODUCTION
 ↑              ↑                      ↑
local Supabase   branch Supabase        prod Supabase
(ephemeral)      (Supabase Branching)   (shared)
```

### 4.3 Tier 1 — Local Supabase (for the agent + dev)

Already scaffolded (`supabase/config.toml`, migrations exist). Make it first-class:

- **Command:** `supabase start` (requires Docker).
- **DB:** Local Postgres on `54322`, auto-applies all migrations in `supabase/migrations/`.
- **Env:** Create `.env.local` pointing at local Supabase. Add `.env.development` (gitignored) for the dev server, `.env.example` (committed) documenting required vars.
- **Seed:** `supabase/seed.sql` already exists — extend it to seed a test user + a Coach bot + a sample game so the app is usable on first `npm run dev`.
- **Reset:** `npm run db:reset` → `supabase db reset` (re-applies migrations + seed). Critical for the agent to get a clean slate between test runs.

**Agent rule:** Before running E2E or manual verification, run `npm run db:reset` to ensure a known DB state.

### 4.4 Tier 2 — Preview deployments with isolated DB

Use **Supabase Branching** (requires paid plan, but it's the cleanest solution). Each Vercel Preview deployment gets its own Supabase branch DB.

Setup:
1. Enable Supabase Branching on the project (Dashboard → Settings → Branching).
2. Connect the Supabase project to the GitHub repo — Supabase will auto-create a branch DB per git branch.
3. In Vercel, set **Preview Environment** env vars to point at the branch DB:
   - `NEXT_PUBLIC_SUPABASE_URL` → the branch project URL (Supabase exposes this via the integration, or use the Vercel-Supabase integration which auto-injects).
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → branch anon key.
   - `SUPABASE_SERVICE_ROLE_KEY` → branch service role key.
   - `LLM_API_KEY`, `LLM_ENDPOINT`, `LLM_MODEL` → reuse production values (LLM is stateless, safe to share).
4. Vercel's Supabase integration auto-provisions per-branch env vars if both are connected to the same GitHub repo. Prefer this over manual env var management.

**If branching is not available** (free tier), fallback:
- Create a second Supabase project (`player2-staging`).
- Run the same migrations against it.
- Point Vercel Preview env vars at the staging project.
- Manually keep migrations in sync (the agent should run `supabase db push --linked` against staging after merging to main).

### 4.5 Tier 3 — Production

Unchanged. `main` branch → Vercel Production → prod Supabase. Never push directly to `main`.

### 4.6 Workflow rules

1. **Branch per change:** `feat/...`, `fix/...`, `chore/...`.
2. **Open PR → Vercel auto-creates Preview with isolated DB.**
3. **Run `npm run verify` locally + smoke-test the preview URL.**
4. **Squash-merge to `main`** → auto-deploys production.
5. **DB migrations:** Create via `supabase migration new <name>`, test locally, commit. They apply to preview branches automatically and to prod on merge.

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

### Phase 1 — Foundations (no behavior change)
1. **Add `verify` script + `typecheck` script.** Run it. Fix whatever breaks. Commit.
2. **Delete `src/lib/prompts/index.js`** (dead duplicate). Update ARCHITECTURE.md. Commit.
3. **Fix the broken openingBook tests** (remove self-mock). Make them pass against real code. Commit.
4. **Audit all `*.test.ts`** for the self-mock anti-pattern. Fix or delete. Commit.

### Phase 2 — Architecture
5. **Implement real `generateSemanticState`.** Add tests. Commit.
6. **Fix or remove `getOpeningMove` persona param.** Add tests. Commit.
7. **Remove silent index fallback in `route.ts`.** Return 422 with debug payload. Update test. Commit.
8. **Decompose `ChessGame.tsx`** into hooks + components. Keep behavior identical. E2E test must still pass. Commit in slices (one extraction per commit).

### Phase 3 — Testing harness
9. **Add `src/__fixtures__/`** with FENs and recorded API responses. Commit.
10. **Build the scenario harness** (`movePipeline.ts` + scenarios + test). Commit.
11. **Add component tests** for decomposed components. Commit.
12. **Wire up Playwright E2E** against local Supabase. Add `test:e2e` script. Commit.

### Phase 4 — Deployment isolation
13. **Document `.env.example`** and split `.env.local` for local Supabase. Commit.
14. **Extend `supabase/seed.sql`** with test user + Coach bot + sample game. Commit.
15. **Enable Supabase Branching** (or create staging project). Configure Vercel Preview env vars. Document in README. Commit.
16. **Add PR template** (`.github/pull_request_template.md`) reminding to run `npm run verify` and smoke-test the preview. Commit.

---

## 7. Non-Goals (explicitly out of scope)

- Rewriting the AI pipeline logic — it works, just needs the silent-failure fix.
- Adding new product features (endgame library expansion, new personas, etc.).
- Performance optimization / caching.
- Replacing Stockfish-on-WebSocket with an in-process engine.

---

## 8. Open Questions for Human

1. **Supabase plan tier?** Branching requires a paid plan. If on free tier, we use the staging-project fallback (§4.4).
2. **Is `tests/` (empty) intended for Playwright?** If so, rename to `tests/e2e/` and document. If not, delete it.
3. **`rls_policies.sql` at repo root** duplicates `supabase/migrations/20260629100103_rls_policies.sql` and `supabase/rls.sql`. Which is the source of truth? Recommend deleting the root copy.
4. **Persona model:** is `'balanced'` / `'aggressive'` / `'solid'` the canonical set? If so, encode it as a union type and use it everywhere.
