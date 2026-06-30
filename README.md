This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Local Development

### Prerequisites
- Node.js (see `.nvmrc`/`package.json` engines)
- Docker (for local Supabase)
- Supabase CLI: `npm install -g supabase` (or `npx supabase`)

### First run
```bash
npm install
supabase start            # boots local Postgres + Auth (Docker)
npm run db:reset          # apply migrations + seed (test user, Coach bot, sample game)
cp .env.example .env.local
# Edit .env.local:
#   NEXT_PUBLIC_SUPABASE_URL  → http://127.0.0.1:54321
#   NEXT_PUBLIC_SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY → from `supabase status`
#   LLM_API_KEY               → your Cerebras (or compatible) key
npm run dev
```

The seeded test user is `test@player2.local` / `password123` (local only — never in staging/prod).

### Common commands
| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run verify` | typecheck + lint + unit/component/scenario tests (run before every commit) |
| `npm run test:e2e` | Playwright E2E against local Supabase (needs `npm run db:reset` first) |
| `npm run test:scenarios` | Run the move-pipeline scenario tests only |
| `npm run db:reset` | Reset local DB (migrations + seed) |
| `npm run build` | Production build |

## Deployment

See `ENGINEERING_PLAN.md §4` for the full three-tier strategy.

| Tier | Vercel target | Supabase | Notes |
|---|---|---|---|
| Local | — | `supabase start` | ephemeral, seeded |
| Preview | per-branch | `player2-staging` (shared) | throwaway data; isolated from prod |
| Production | `main` | prod project | never push directly to `main` |

**Branch workflow:** branch → PR → Vercel auto-creates a Preview pointed at staging Supabase → run `npm run verify` + smoke-test the preview → squash-merge to `main`.

**DB migrations:** create with `supabase migration new <name>`, test locally, commit. After merge to `main`, re-run `supabase db push` against staging so previews stay in sync.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- Project architecture: `ARCHITECTURE.md`, `ENGINEERING_PLAN.md`
