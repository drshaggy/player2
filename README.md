This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Local Development

### Prerequisites
- Node.js (see `.nvmrc`/`package.json` engines)
- Docker (for local Supabase). On macOS we recommend **Colima** (`brew install colima`): `colima start`. Docker Desktop works too.
- Supabase CLI: `npm install -g supabase` (or `npx supabase`)

> **Colima note:** the local Supabase `vector` log-forwarder container bind-mounts the docker socket, which Colima's VZ runtime cannot support. `[analytics] enabled = false` is already set in `supabase/config.toml` to skip it. Log shipping is not needed for local dev/E2E. If you switch to Docker Desktop you can re-enable analytics.

### First run
```bash
npm install
colima start            # macOS only; skip if using Docker Desktop
supabase start          # boots local Postgres + Auth (Docker)
npm run db:reset        # apply migrations + seed (test user, Coach bot, sample game)
cp .env.example .env.local
# Edit .env.local — for LOCAL dev, pull keys from `supabase status`:
#   NEXT_PUBLIC_SUPABASE_URL          → http://127.0.0.1:54321
#   NEXT_PUBLIC_SUPABASE_ANON_KEY     → sb_publishable_...  (from `supabase status`)
#   SUPABASE_SERVICE_ROLE_KEY         → sb_secret_...       (from `supabase status`)
#   LLM_API_KEY                       → your Cerebras (or compatible) key
npm run dev
```

The seeded test user is `test@player2.local` / `password123` (local only — never in staging/prod).

### Common commands
| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run verify` | typecheck + lint + unit/component/scenario tests (run before every commit) |
| `npm run test:e2e` | Playwright E2E against local Supabase (needs `npm run db:reset` first; see E2E run below) |
| `npm run test:scenarios` | Run the move-pipeline scenario tests only |
| `npm run db:reset` | Reset local DB (migrations + seed) |
| `npm run build` | Production build |

### Running E2E locally
E2E is opt-in (not part of `npm run verify`) because it needs a running local Supabase stack and a DB-shaped `.env.local`. The `playwright.config.ts` `webServer` boots `npm run dev` itself; you only need Supabase + env.

```bash
colima start && supabase start     # macOS + Colima; skip colima on Docker Desktop
npm run db:reset                   # clean seeded state (test user, Coach bot)
# Back up your prod-pointing .env.local, then point it at local Supabase:
cp .env.local .env.local.bak
#   NEXT_PUBLIC_SUPABASE_URL          → http://127.0.0.1:54321
#   NEXT_PUBLIC_SUPABASE_ANON_KEY     → sb_publishable_...  (from `supabase status`)
#   SUPABASE_SERVICE_ROLE_KEY         → sb_secret_...       (from `supabase status`)
npm run test:e2e
mv .env.local.bak .env.local       # restore prod-pointing env
supabase stop                      # tear down the stack when done
```

## Deployment

See `ENGINEERING_PLAN.md §4` for the full three-tier strategy.

| Tier | Vercel target | Supabase | Notes |
|---|---|---|---|
| Local | — | `supabase start` | ephemeral, seeded |
| Preview | per-branch | (deferred — see ENGINEERING_PLAN §4.4) | staging backend TBD |
| Production | `main` | cloud project (`zdfscobeyhohhvgylhbh`) | never push directly to `main` |

> **Staging is deferred.** For now, develop against local Supabase (`supabase start` + `npm run db:reset`) and smoke-test in `npm run dev`. A staging backend for Vercel Previews will be revisited once a multi-project isolation strategy is decided.

**Branch workflow:** branch → PR → run `npm run verify` + smoke-test locally via `npm run dev` → squash-merge to `main`.

**DB migrations:** create with `supabase migration new <name>`, test locally with `npm run db:reset`, commit. After merge to `main`, apply migrations to the cloud project.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- Project architecture: `ARCHITECTURE.md`, `ENGINEERING_PLAN.md`
