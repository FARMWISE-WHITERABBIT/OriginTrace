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
  -- Should return 0 rows for any table that holds tenant data
  ```

### Build
- [ ] Production build succeeds locally:
  ```bash
  npm run build
  ```
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

### `next.config.js` PWA config
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/,
      handler: 'NetworkFirst',
      options: { cacheName: 'api-cache', networkTimeoutSeconds: 10 },
    },
    {
      urlPattern: /\/api\/.*/,
      handler: 'NetworkFirst',
      options: { cacheName: 'local-api-cache', networkTimeoutSeconds: 8 },
    },
  ],
})
```

After deployment, verify the service worker is active:
- Open Chrome DevTools → Application → Service Workers
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
1. **Database Migrations**: Run all scripts in `migrations/` against the production Supabase instance.
2. **Type Generation**: Run `npx supabase gen types typescript --project-id ...` to ensure `database.types.ts` is up to date.
3. **PWA Generation**: Ensure the service worker is rebuilt to cache the latest reference data.

---

## 5. Gotchas

- **PostgreSQL Regions**: Deploy the Supabase project in the same region as the Vercel project to minimize latency for non-edge routes.
- **Storage Buckets**: Ensure `compliance_docs` and `avatars` buckets are created with correct public/private access levels before go-live.
- **RLS Consistency**: Verify that production RLS policies match local development exactly. 
rollback)
# Write a reverse migration and apply it:
## 10. Gotchas

- **Service worker caches the old build.** Users may see the old version for up to 24h after deployment. Force update by setting `skipWaiting: true` in the PWA config and showing a "New version available — refresh" banner.
- **Supabase connection limits.** The free/pro Supabase plan has a connection pool limit. Use `pgbouncer` connection string for production: `?pgbouncer=true` in the `DATABASE_URL`.
- **`NEXT_PUBLIC_*` variables are baked into the client bundle at build time.** Changing them requires a redeployment — they are not picked up at runtime.
- **Replit sleeps after inactivity.** Use a cron job (e.g., UptimeRobot) to ping the Replit URL every 5 minutes to keep it awake during demos.
