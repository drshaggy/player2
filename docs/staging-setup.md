# Staging Supabase setup (Phase 4, step 15)

**Why manual:** the Supabase MCP server in this workspace is linked to the
**production** project (`zdfscobeyhohhvgylhbh`) and exposes no project-creation
tool. Per the Supabase "Supabase for Platforms" docs, projects are created via
the Management API: `POST /v1/projects`. Run these steps yourself; they take
~5 minutes plus ~2 minutes for the project to become healthy.

> Docs backing each step are cited inline. Source: https://supabase.com/docs/guides/integrations/supabase-for-platforms

---

## 0. Prerequisites
- A Supabase account + a Personal Access Token (PAT): https://supabase.com/dashboard/account/tokens
- The Supabase CLI: `npx supabase --version` (≥ 2.x)
- Your organization slug (visible in the dashboard URL or via
  `GET /v1/organizations` with the PAT).

## 1. Create the staging project (Management API)

Per the docs ("Launching projects"): use smart region selection and a strong,
unique DB password. Free tier = omit `desired_instance_size` (Nano/scale-to-zero
is restricted; Micro is the smallest paid instance — for free tier, do **not**
pass `desired_instance_size` so the project uses the default free instance).

```sh
curl https://api.supabase.com/v1/projects \
  --request POST \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer $SUPABASE_PAT" \
  --data '{
    "name": "player2-staging",
    "organization_slug": "<YOUR_ORG_SLUG>",
    "db_pass": "<SUPER_SECURE_PASSWORD>",
    "region_selection": { "type": "smartGroup", "code": "americas" }
  }'
```

The response returns a `ref` (the project ref, e.g. `abcdefgh.supabase.co`).
Save it as `$STAGING_REF`.

## 2. Wait for healthy

Per the docs: poll health until `ACTIVE_HEALTHY`.

```sh
curl "https://api.supabase.com/v1/projects/$STAGING_REF/health" \
  --header "Authorization: Bearer $SUPABASE_PAT"
```

## 3. Enable + fetch API keys

Per the docs ("Recommended API keys"): the project may still be on the legacy
`anon`/`service_role` keys. Check first; if only `publishable`/`secret` exist,
use those. Otherwise enable them.

Check:
```sh
curl "https://api.supabase.com/v1/projects/$STAGING_REF/api-keys?reveal=true" \
  --header "Authorization: Bearer $SUPABASE_PAT"
```

Enable (if needed):
```sh
curl "https://api.supabase.com/v1/projects/$STAGING_REF/api-keys" \
  --request POST --header "Content-Type: application/json" \
  --header "Authorization: Bearer $SUPABASE_PAT" \
  --data '{ "type": "publishable", "name": "default" }'

curl "https://api.supabase.com/v1/projects/$STAGING_REF/api-keys?reveal=true" \
  --request POST --header "Content-Type: application/json" \
  --header "Authorization: Bearer $SUPABASE_PAT" \
  --data '{ "type": "secret", "name": "default", "secret_jwt_template": { "role": "service_role" } }'
```

Record three values:
- `NEXT_PUBLIC_SUPABASE_URL` = `https://$STAGING_REF.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the `publishable` key
- `SUPABASE_SERVICE_ROLE_KEY` = the `secret` key

## 4. Push migrations + seed to staging

Link locally to the staging project, then push migrations. Per the GitHub
integration docs, migrations are applied automatically via `db push`.

```sh
supabase link --project-ref $STAGING_REF
supabase db push                 # applies all supabase/migrations/*.sql
# Seed: pipe seed.sql via the SQL editor or psql, e.g.
supabase db execute --file supabase/seed.sql   # or paste into the dashboard SQL editor
```

This seeds the test user (`test@player2.local` / `password123`) and the Coach
bot so previews are usable on first load.

## 5. Configure Vercel Preview env vars

In the Vercel dashboard → `player2` project → Settings → Environment Variables.
Set **Preview** scope only (leave Production untouched):

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://$STAGING_REF.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | staging publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | staging secret key |
| `LLM_API_KEY` | reuse the production value (LLM is stateless — safe to share) |
| `LLM_ENDPOINT` | reuse production value |
| `LLM_MODEL` | reuse production value |

> Production env vars stay pointed at the prod project (`zdfscobeyhohhvgylhbh`).

## 6. Keep staging in sync

Per `ENGINEERING_PLAN §4.6`: whenever a new migration lands on `main`, re-run
against staging so previews don't drift:

```sh
supabase link --project-ref $STAGING_REF   # if not already linked
supabase db push
```

## 7. Verify

- Open any Vercel Preview URL → the app should load against staging data.
- Sign in as `test@player2.local` / `password123` to confirm the seed worked.
- Confirm production (`https://player2-drab.vercel.app`) still hits the prod DB.

---

## Future upgrade: Supabase Branching (paid)

Per `ENGINEERING_PLAN §4.4`, if the plan is upgraded, swap the Vercel Preview
env vars for the Supabase-Vercel branch integration (per-branch DB) and delete
the staging project. The rest of the workflow is unchanged.
