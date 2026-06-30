# Engine Hosting & SaaS Plan

Status: **planned, not yet implemented.** This doc captures the design decisions
agreed for moving Stockfish off the public `wss://chess-api.com/v1` endpoint onto
a self-hosted worker on `percy.network`, plus the free/paid gating that turns
`player2` into a defensible SaaS product.

## Motivation

Today `src/hooks/useChessGame.ts` opens a WebSocket to the public `chess-api.com`
service **from the browser** on every AI move:

- No rate-limit handling, no caching, no per-user throttling.
- No way to swap backends without shipping client code.
- Public dependency on a free third-party service — fine for a hackathon, not
  for a SaaS SLA.

The real cost gate for SaaS is **LLM calls**, not Stockfish compute. Stockfish is
a single static CPU-bound binary — cheap to self-host. The plan below treats
engine hosting and SaaS gating as related but separate concerns.

---

## Architecture

```
Browser ──> /api/engine (Vercel) ──> https://percy.network/engine (self-hosted Stockfish)
            │                         │
            ├─ plan gate (free/paid)  ├─ single long-lived stockfish child process (UCI)
            ├─ in-process FEN cache    ├─ concurrency semaphore (cap 3 on 4-core i5-6600K)
            └─ wss://chess-api.com     └─ in-process Map<fen+depth, result> (TTL 30d)
               as fallback on percy failure
```

Why no Redis:
- "Free = 1 game per account" means the game-count gate is the abuse ceiling;
  without an active game, `/api/engine` calls are useless (no LLM pick to act on).
- FEN cache fits in-process on the worker (shared across requests in one Node
  process; lost on restart, rebuilt as games replay).
- Per-user LLM burst limiter is in-memory on each Vercel instance — sufficient
  to stop runaway client loops and tight scraping; cross-instance truth is not
  required at this scale. Swap to Upstash Redis later if abuse shows up.

---

## Engine worker on percy.network

Co-located in this repo at `engine-worker/`. Node + `http` (no framework), one
long-lived `stockfish` child process managed over UCI stdin/stdout, multiplexed
via a request-id so concurrent analyses share one process.

### Files to create
```
engine-worker/
├─ package.json
├─ tsconfig.json
├─ Dockerfile                       ← optional, if you switch to Docker later
├─ stockfish-engine.service         ← systemd unit
├─ nginx.conf.snippet               ← drop into existing nginx site
├─ .env.example
├─ README.md                        ← install, run, deploy to percy
└─ src/
   ├─ index.ts                      ← HTTP server on 127.0.0.1:7000
   ├─ uci.ts                        ← Stockfish child-process wrapper, multiplexed
   ├─ analyze.ts                    ← POST /analyze handler, semaphore-bounded
   ├─ cache.ts                      ← in-process Map<string, AnalyzeResult>, TTL 30d
   └─ analyze.test.ts               ← spawns stockfish, asserts shape + concurrency
```

### Endpoint contract
`POST /analyze` with `X-Engine-Key` header:
```json
{ "fen": "...", "variants": 3, "depth": 18 }
```
Response:
```json
{ "candidates": [
    { "san": "Nf3", "from": "g1", "to": "f3", "eval": "0.32", "depth": 18 }
  ],
  "bestmove": "Nf3" }
```
On concurrency saturation → wait up to 8s → 503 (proxy falls back to chess-api.com).
On bad FEN / bad depth → 400.

### Config
| Env var | Where | Default | Notes |
|---|---|---|---|
| `ENGINE_KEY` | worker | — (required) | shared secret, checked against `X-Engine-Key` |
| `ENGINE_MAX_CONCURRENT` | worker | `3` | leaves 1 core for nginx + OS on the 4-core 6600K |
| `STOCKFISH_BIN` | worker | `/srv/player2-worker/stockfish` | path to SF16 binary (user installs) |
| `ENGINE_CACHE_TTL_MS` | worker | `2592000000` (30d) | eval for a given FEN+depth never changes |
| `ENGINE_PORT` | worker | `7000` | loopback only, nginx in front |

### Percy.network setup (user-executed)
1. `mkdir -p /srv/player2-worker/stockfish` and install Stockfish 16 binary there.
2. Clone repo (or `scp` just `engine-worker/`) to `/srv/player2-worker`.
3. `cp .env.example .env`, fill `ENGINE_KEY`, optionally tune `ENGINE_MAX_CONCURRENT`.
4. `npm install`, `npm run build`.
5. Drop `engine-worker/nginx.conf.snippet` into existing nginx site (TLS termination,
   `location /engine/` → `proxy_pass http://127.0.0.1:7000;`, `proxy_read_timeout 15s`).
6. `cp engine-worker/stockfish-engine.service /etc/systemd/system/`,
   `systemctl enable --now stockfish-engine`.
7. Verify: `curl -H "X-Engine-Key: $ENGINE_KEY" -H "Content-Type: application/json" \
   -d '{"fen":"startpos","variants":3,"depth":12}' \
   https://percy.network/engine/analyze`

---

## Vercel proxy `/api/engine`

Replaces the in-browser WebSocket. Thin Next.js route.

### Files to create/modify
- `src/app/api/engine/route.ts` — new
- `src/app/api/engine/route.test.ts` — new

### Responsibilities
1. Authenticate user from Supabase session in request.
2. Look up `profiles.plan` (`free` or `paid`).
3. Per-user in-memory burst limiter (`/@/lib/llmRateLimit` shared with `/api/chat`):
   30 calls/min for paid, 5 calls/min for free (defensive only — game gate is the real limit).
4. Validate FEN (chess.js).
5. Default depth by plan: `free` = 12, `paid` = 18. Override via request body capped at plan max.
6. POST to `https://percy.network/engine/analyze` with `X-Engine-Key: $ENGINE_KEY`, 12s timeout.
7. On percy 5xx/timeout: fall through to existing `wss://chess-api.com/v1` fallback
   (WebSocket code moved server-side, same resilience pattern as today's client catch).
8. Return `{ candidates: [...] }` in the same shape `useChessGame.ts:75` already consumes.

### Client change `src/hooks/useChessGame.ts:74-123`
Replace the inline WebSocket block with:
```ts
const res = await fetch('/api/engine', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fen: currentChessGame.fen(), variants: 3, depth: 18 }),
});
candidates = (await res.json()).candidates;
```
Surrounding try/catch + fallback-candidate logic unchanged. ~15 line diff.

---

## SaaS gating

The LLM is the real cost. Stockfish compute is cheap; gating the *game* is what
protects LLM budget.

### Plan column on `profiles`
Migration: `supabase/migrations/20260630XXXXXX_add_plan_to_profiles.sql`
```sql
alter table profiles
  add column plan text not null default 'free'
    check (plan in ('free', 'paid'));
```
- Default `'free'` for new signups **and existing users** (per explicit decision;
  existing users manually upgrade themselves via SQL or admin tooling).
- Two-tier only (`free` / `paid`). Per-stripe-billing you'll set `plan = 'paid'`
  when a checkout completes, and `plan = 'free'` on subscription cancellation.

### Free-tier policy (decided)
- **One (1) game per account, lifetime.** Once a free user has created a game,
  they can no longer consult the coach (`/api/chat`) or create a new game without
  upgrading. Finishing the game does **not** free the slot. Strictest cost control.
- Free-tier blocked from `/api/chat` entirely once their 1 game exists — no LLM
  call wasted on repeat consultation attempts. Client surfaces an upgrade prompt.

### Gate A — server-side `createGame` (authoritative)
New route `src/app/api/games/route.ts` (POST). Client `useGamePersistence.createGame`
now POSTs here instead of doing a client-side Supabase insert. Route logic:
1. Auth user from session.
2. `select plan from profiles where id = $user_id`
3. `select count(*) from games where white_player_id = $user_id`
4. If `plan = 'free'` and count >= 1 → 402 with `{ error: 'FREE_TIER_LIMIT' }`.
5. Else insert + return row (matches existing `createGame` shape).

### Gate B — pre-check in `/api/chat` (saves LLM cost)
At route entry, before any LLM call:
1. `select plan from profiles where id = $user_id`
2. `select count(*) from games where white_player_id = $user_id`
3. If `plan = 'free'` and count >= 1 → short-circuit with static response
   `{ blocked: true, reason: 'FREE_TIER_LIMIT', message: 'Upgrade to keep
   coaching…' }`. **No LLM call.** Client (`useCoachChat`) shows upgrade UI and
   stops the loop.

### Gate C — RLS backstop (bulletproof)
Migration: `supabase/migrations/20260630XXXXXX_game_insert_free_tier_rls.sql`
```sql
-- Block further game inserts once a free-tier user has 1 game.
drop policy if exists "free_tier_one_game_max" on games;
create policy "free_tier_one_game_max" on games
  for insert to authenticated
  with check (
    (select plan from profiles where id = auth.uid()) = 'paid'
    or (select count(*) from games where white_player_id = auth.uid()) < 1
  );
```
Defense in depth: even if a user scripts around the client and around
`/api/games`, Supabase itself rejects the insert.

### Tests
- `src/app/api/engine/route.test.ts` — mock `fetch` to percy + chess-api, mock
  Supabase; assert cache short-circuits, plan-gated depth, fallback fires on
  percy 5xx, rate-limit 429.
- `src/app/api/games/route.test.ts` — paid insert works; free at limit 402s;
  free under limit inserts.
- Extend `src/app/api/chat/route.test.ts` — free user with 1 game → no LLM call,
  returns static upgrade message.
- `useChessGame` scenario tests — update any pinning the chess-api WS URL to
  instead expect `/api/engine` fetch.
- E2E: `npm run db:reset && npm run test:e2e` validates the RLS gate.

---

## Paid-tier rate limiting (LLM)

Per user burst cap: **30 LLM calls/min** in-memory on each Vercel instance.
Bound way above any normal flow (≈1 call per AI move, played over minutes), low
enough to kill a runaway client loop or tight scrape.

Implementation: `src/lib/llmRateLimit.ts` — simple `Map<userId, number[]>` of
timestamps in the last 60s, pruned on each call. Used by both `/api/chat` and
`/api/engine`. Swap to Upstash Redis later if cross-instance truth becomes
required.

---

## New env vars (Vercel)

| Var | Example | Notes |
|---|---|---|
| `ENGINE_URL` | `https://percy.network/engine` | nil → fallback WS only (legacy mode) |
| `ENGINE_KEY` | random 32-byte secret | must match worker's `ENGINE_KEY` |
| `ENGINE_FALLBACK_WS` | `wss://chess-api.com/v1` | optional; empty string disables public fallback |

Worker-side vars (percy): `ENGINE_KEY`, `STOCKFISH_BIN`, `ENGINE_MAX_CONCURRENT`,
`ENGINE_CACHE_TTL_MS`, `ENGINE_PORT`. Worker does not need Vercel env.

---

## Implementation order (when work begins)

1. **Profiles migration** — `plan` column, default `free`. Local `db:reset` to apply.
2. **`engine-worker/` scaffold** — uci wrapper, http server, cache, tests. Run locally
   against installed stockfish to validate shape.
3. **`/api/engine` route + tests** — proxy + cache + depth gate + chess-api fallback.
4. **`useChessGame.ts` client swap** — WS → fetch. Run `npm run dev` smoke + scenario tests.
5. **`/api/games` route + tests** — server-side createGame with gate A.
6. **`/api/chat` pre-check (gate B)** — extend tests for the no-LLM-call path.
7. **RLS migration (gate C)** — applies last to avoid lockout during step 5/6.
8. **Percy deploy** — install stockfish, drop worker, nginx snippet, systemd unit,
   verify via curl.
9. **Vercel env vars** — `ENGINE_URL`, `ENGINE_KEY`, deploy.
10. **Update docs** — `AGENTS.md` (add to docs list, add envs to Dangerous Zones),
    `ENGINE_HOSTING.md` (deployment runbook — may be folded into this file).

---

## Decisions log

- **Engine hosting**: self-host on percy.network (4-core i5-6600K, existing nginx).
- **Worker runtime**: Node (not Bun) — boring and safe.
- **Stockfish version**: 16, user installs at `/srv/player2-worker/stockfish`.
- **Worker install path**: `/srv/player2-worker/`.
- **Process supervisor**: systemd (Dockerfile also provided for a future flip).
- **Repo layout**: `engine-worker/` co-located in this repo.
- **Redis**: skip. In-process `Map` on worker for FEN cache; in-memory per-Instance
  `Map` on Vercel for LLM burst limit. Add Upstash only if/when needed.
- **Plan column**: separate `plan` enum on `profiles` (does not overload
  `difficulty_level`); values `free` / `paid`; default `free` for everyone.
- **Free-tier policy**: 1 game per account, lifetime. No re-consultation after the
  game (Lifetime-slot blocked from `/api/chat`).
- **Gate strategy**: A + B + C — server-side `/api/games` (A), `/api/chat` pre-check
  (B, saves LLM cost), RLS INSERT policy (C, backstop).
- **Cache TTL**: 30 days for `engine:{sha256(fen)}:{depth}`. Stockfish eval for a
  given FEN+depth never changes — TTL is purely memory reclamation.
- **Paid LLM burst limit**: 30 calls/min/user in-memory per Vercel instance.
- **Free depth cap**: 12 (still engine-quality, weaker eval). Paid: 18.