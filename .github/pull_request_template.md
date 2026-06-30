## Summary

<!-- Brief description of the change and why. -->

## Verification

- [ ] `npm run verify` passes (typecheck + lint + unit/component/scenario tests)
- [ ] If this touches the DB: `npm run db:reset && npm run test:e2e` passes against local Supabase
- [ ] If this touches UI: smoke-tested the relevant flow on the Vercel Preview URL (or `npm run dev`)

## Deployment notes

<!--
Preview deployments point at the **staging** Supabase project (see ENGINEERING_PLAN §4.4).
Merging to `main` deploys to production.
- New DB migrations: after merge, run `supabase db push` against staging so previews stay in sync.
- Never push directly to `main`.
-->
