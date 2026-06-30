# Self-hosted Supabase on percy.network (staging + reusable)

**Decision (Phase 4, step 15):** instead of a paid second cloud Supabase
project, we self-host Supabase via Docker on `percy.network` at a **generic**
subdomain `supabase.percy.network`. One instance serves as the staging backend
for *all* projects on percy.network — not just player2 — so the ops cost is
amortised. Vercel Preview env vars for player2 (and any future project) point
at this instance; production stays on the cloud project.

This is a generic per-infra doc. Project-specific env-var wiring lives in the
project's own README / `.env.example`.

> All steps below are backed by the official Supabase self-hosting docs:
> - Bootstrap: https://supabase.com/docs/guides/self-hosting/docker
> - HTTPS/proxy: https://supabase.com/docs/guides/self-hosting/self-hosted-proxy-https
> - CLI `--db-url`: https://github.com/supabase/cli (go reference)

---

## 0. Prerequisites (on percy.network)

- Docker + Docker Compose (rootless ok — set `DOCKER_SOCKET_LOCATION` in `.env`)
- Ports 80 + 443 open for Let's Encrypt
- DNS A record `supabase.percy.network` → percy.network's public IP
- (Optional) SMTP credentials for Auth emails

## 1. Bootstrap the Supabase stack

On percy.network, in a directory you'll keep (e.g. `/opt/supabase`):

```sh
# Sparse-clone just the docker/ dir from supabase/supabase
git clone --depth 1 https://github.com/supabase/supabase
mkdir -p /opt/supabase && cp -rf supabase/docker/* /opt/supabase
cd /opt/supabase
cp .env.example .env
docker compose pull
```

> Alternatively, the one-liner installer does the clone + secret generation:
> `curl -fsSL https://supabase.link/setup.sh | sh` (Linux). It prompts for
> `SUPABASE_PUBLIC_URL`, `API_EXTERNAL_URL`, `SITE_URL`, `PROXY_DOMAIN`.

## 2. Generate secrets

The docker dir ships helper scripts — run both, in order:

```sh
sh utils/generate-keys.sh            # POSTGRES_PASSWORD, JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY, etc.
sh utils/add-new-auth-keys.sh --update-env   # EC P-256 pair, JWKS, sb_publishable / sb_secret keys
```

Print all credentials any time with `sh run.sh secrets`. **Save the output** —
you'll need `ANON_KEY` / `SERVICE_ROLE_KEY` (or the `sb_publishable` / `sb_secret`
equivalents) and `POSTGRES_PASSWORD` for project wiring.

Other auto-generated secrets (set by the scripts, listed for reference):
`SECRET_KEY_BASE` (`openssl rand -base64 48`), `VAULT_ENC_KEY`
(`openssl rand -hex 16`), `PG_META_CRYPTO_KEY` (`openssl rand -base64 24`).

## 3. Configure URLs + dashboard auth

Edit `/opt/supabase/.env`:

```sh
# The HTTPS domain (set DNS A record first — see §0)
SUPABASE_PUBLIC_URL=https://supabase.percy.network
API_EXTERNAL_URL=https://supabase.percy.network
SITE_URL=https://supabase.percy.network

# Studio (dashboard) HTTP basic auth — REQUIRED, must contain a letter
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=<strong-password-with-letters>

# Postgres password (letters + numbers only, to avoid URL-encoding issues)
POSTGRES_PASSWORD=<strong-password>

# For Nginx + Let's Encrypt (§4):
PROXY_DOMAIN=supabase.percy.network
CERTBOT_EMAIL=you@percy.network

# SMTP (optional, for Auth confirmation emails):
# SMTP_ADMIN_EMAIL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SENDER_NAME
```

> If you already run Traefik / HAProxy / Nginx Proxy Manager for percy.network,
> you can reuse it instead of the bundled Caddy/Nginx (§4). Requirements:
> proxy to the API gateway on port `8000`, enable WebSocket support (Realtime),
> add `X-Forwarded` headers, and update the three URL vars above to HTTPS.

## 4. Start with HTTPS (Caddy = simplest)

The bundled `docker-compose.caddy.yml` provisions + renews Let's Encrypt certs
automatically with zero config. Caddy also handles HTTP→HTTPS redirect,
WebSocket upgrades, and HTTP/2/3.

```sh
docker compose -f docker-compose.yml -f docker-compose.caddy.yml up -d
```

Caddy config: `volumes/proxy/caddy/Caddyfile`. Nginx + Certbot is the
alternative (`docker-compose.nginx.yml`) if you want more control.

Verify HTTPS — expect a `401` (Auth reachable, just unauthenticated):

```sh
curl -I https://supabase.percy.network/auth/v1/
```

If the cert doesn't issue: check ports 80/443, DNS A record, and
`docker logs supabase-caddy`. Mind Let's Encrypt rate limits.

## 5. Apply migrations + seed (from the player2 repo)

The Supabase CLI can push migrations to a self-hosted DB **without `supabase
link`** by passing `--db-url`. From the player2 repo root:

```sh
# Connection string uses Supavisor (pooler). User is `postgres.<tenant>`.
# Default POOLER_TENANT_ID in .env is `your-tenant-id` — change it in /opt/supabase/.env
# and use the same value here. Percent-encode the password (RFC 3986).
DB_URL="postgres://postgres.your-tenant-id:$(python3 -c 'import urllib.parse,os;print(urllib.parse.quote(os.environ["POSTGRES_PASSWORD"]))')@supabase.percy.network:5432/postgres"

supabase db push --db-url "$DB_URL"
```

Then seed (the seed.sql from this repo — test user + Coach bot + sample game):

```sh
psql "$DB_URL" -f supabase/seed.sql
# or: paste supabase/seed.sql into the Studio SQL editor at
#      https://supabase.percy.network (DASHBOARD_USERNAME / _PASSWORD)
```

> Direct Postgres (bypassing Supavisor) is also possible if you expose the `db`
> container's port — see the docker guide's "Postgres connection details".
> For migrations the Supavisor session-mode port (5432) is fine.

## 6. Wire Vercel Preview env vars (per project)

For player2 → Vercel dashboard → Settings → Environment Variables, **Preview**
scope:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://supabase.percy.network` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `ANON_KEY` (or `sb_publishable_…`) from `sh run.sh secrets` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY` (or `sb_secret_…`) — server-only |
| `LLM_API_KEY`, `LLM_ENDPOINT`, `LLM_MODEL` | reuse production values (LLM is stateless) |

Production env vars stay on the cloud project. For other percy.network
projects, repeat this step with their own Vercel project.

## 7. Keep in sync

When a new migration lands on `main` for any project using this instance:

```sh
cd /path/to/<project-repo>
DB_URL="postgres://postgres.your-tenant-id:<pwd>@supabase.percy.network:5432/postgres"
supabase db push --db-url "$DB_URL"
```

Migrations across projects share one `supabase_migrations` history table — keep
migration filenames prefixed by project (the `YYYYMMDDHHMMSS_` timestamp already
disambiguates) and don't drop shared tables.

## 8. Verify end-to-end

- `curl -I https://supabase.percy.network/auth/v1/` → 401 (reachable)
- Open `https://supabase.percy.network` → Studio loads (basic auth)
- Open a player2 Vercel Preview URL → app loads against self-hosted data
- Sign in as `test@player2.local` / `password123` (seeded) to confirm seed
- Confirm production (`https://player2-drab.vercel.app`) still hits the cloud DB

## 9. Operational notes

- **Backups:** self-hosted = your responsibility. Snapshot the `db` volume
  (`docker run --rm -v <db-volume>:/data alpine tar czf - /data`) on a schedule.
- **Updates:** `cd /opt/supabase && git pull && docker compose pull && docker compose up -d`.
- **Never expose port 9901** (Envoy admin) — `/config_dump` leaks all keys/JWTs.
- **Rotation:** `sh utils/rotate-new-api-keys.sh --update-env` rotates the `sb_`
  keys without touching the EC pair; `sh utils/db-passwd.sh` rotates the DB pass.
