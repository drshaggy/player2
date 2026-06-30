## Summary

<!-- Brief description of the change and why. -->

## Verification

- [ ] `npm run verify` passes (typecheck + lint + unit/component/scenario tests)
- [ ] If this touches the DB: `npm run db:reset && npm run test:e2e` passes against local Supabase
- [ ] If this touches UI: smoke-tested the relevant flow on the Vercel Preview URL (or `npm run dev`)

## Deployment notes

<!--
Staging backend is deferred (see ENGINEERING_PLAN §4.4). Develop against
local Supabase for now. Merging to `main` deploys to production.
- New DB migrations: after merge, apply to the cloud project.
- Never push directly to `main`.
-->
