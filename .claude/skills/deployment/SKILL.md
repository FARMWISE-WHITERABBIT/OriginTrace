---
name: deployment
description: >
  Use this skill when deploying the application, setting up environment
  variables, configuring the Supabase project for production, regenerating the
  PWA service worker, or running through the pre-deploy checklist. Triggers
  for any mention of "deploy", "production", "Vercel", "Replit deploy",
  "environment variables", "service worker", "PWA manifest", "production
  build", or "go live". Always use this skill before any production deployment
  to follow the complete checklist and avoid common deployment failures.
---

# Deployment Skill

## 1. Overview

OriginTrace deploys to **Vercel** (primary) or **Replit** (demo environments),
backed by a production **Supabase** project. The app is a Next.js PWA with a
generated service worker — deployment order matters.

---

## 2. Deployment Targets

| Environment | Platform | Supabase Project | Purpose |
|-------------|---------|-----------------|---------|
| Production | Vercel | `origintrace-prod` | Live customer data |
| Staging | Vercel (preview) | `origintrace-staging` | Pre-release testing |
| Demo | Replit | `origintrace-demo` | Sales demos, onboarding |
| Local | localhost:3000 | `origintrace-local` | Development |

---

## 3. Required Environment Variables

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # Never expose to client — server only

# App
NEXT_PUBLIC_APP_URL=https://app.origintrace.com
NEXT_PUBLIC_APP_NAME=OriginTrace

# Optional integrations
HEDERA_ACCOUNT_ID=0.0.xxxxxxx
HEDERA_PRIVATE_KEY=302e...
XRPL_WALLET_SEED=s...
CIRCLE_API_KEY=...

# Analytics / monitoring
NEXT_PUBLIC_POSTHOG_KEY=phc_...
SENTRY_DSN=https://...@sentry.io/...
```

**Validation:** Before every deploy, verify env vars are set:
```bash
npx vercel env ls production
```

---

## 4. Pre-Deploy Checklist

### Code
- [ ] All migrations are committed and applied to the target Supabase project
- [ ] `schema.sql` is in sync with the latest migration
- [ ] No `console.log` or debug statements in production code
- [ ] `DRY_RUN` flags are removed or set to `false`
- [ ] TypeScript builds without errors: `npx tsc --noEmit`

### Database
- [ ] Run pending migrations on the target Supabase project:
  ```bash
  supabase link --project-ref PROD_PROJECT_REF
  supabase db push --linked
  ```
- [ ] Verify RLS is enabled on all tenant-scoped tables:
  ```sql
  SELECT tablename, rowsecurity FROM pg_tables
  WHERE schemaname = 'public' AND rowsecurity = false;
  ```
- [ ] Run type generation: `npx supabase gen types typescript --project-id ...`

### Build
- [ ] Production build succeeds locally: `npm run build`
- [ ] PWA service worker is regenerated (see Section 5)
- [ ] Bundle size check: `npx next build --profile`

### Security
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is not in `NEXT_PUBLIC_*` variables
- [ ] CORS settings on Supabase are restricted to production domain
- [ ] Supabase Auth redirect URLs include only production domain

---

## 5. PWA Service Worker

The service worker is generated at build time by `next-pwa`. It must be
regenerated for every deployment to cache the latest assets.

```bash
# Service worker is auto-generated during next build
npm run build
# Output: public/sw.js and public/workbox-*.js
```

After deployment, verify the service worker is active:
- Chrome DevTools → Application → Service Workers
- Check `sw.js` is registered and status is "activated"

---

## 6. Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Deploy preview (staging)
vercel
```

---

## 7. Rollback

If a deployment fails, roll back to the previous build:
```bash
vercel rollback
```

For database rollbacks, write a reverse migration and apply it.

---

## 8. Gotchas

- **Service worker caches the old build.** Users may see the old version for up to 24h. Force update by setting `skipWaiting: true` in PWA config and showing a "New version available — refresh" banner.
- **Supabase connection limits.** Use `pgbouncer` connection string for production: `?pgbouncer=true` in `DATABASE_URL`.
- **`NEXT_PUBLIC_*` variables are baked into the client bundle at build time.** Changing them requires a redeployment.
- **Replit sleeps after inactivity.** Use UptimeRobot to ping the URL every 5 minutes during demos.
- **PostgreSQL Regions**: Deploy Supabase in the same region as Vercel to minimize latency.
- **Storage Buckets**: Ensure `compliance_docs` and `avatars` buckets are created with correct access levels.
- **RLS Consistency**: Verify production RLS policies match local development.
- **Tier gating**: Verify `lib/api/tier-guard.ts` feature flags are configured for the target environment.
