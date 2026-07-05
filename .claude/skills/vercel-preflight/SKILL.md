---
name: vercel-preflight
description: >
  Use this skill before pushing ANY change that touches app/ pages, layouts,
  API routes, middleware, next.config, or marketing pages — i.e. anything that
  affects the Next.js build. Triggers for "push", "deploy", "vercel build",
  "build error", "before I commit", "ready to ship", "use client", "Suspense",
  "useSearchParams", "server component", "middleware". A large share of this
  repo's fix commits are App-Router/Vercel traps caught only at deploy (function
  props Server->Client, missing Suspense, middleware rename, Hobby cron limits).
  Run the checklist locally so these fail on your machine, not on Vercel.
---

# Vercel Preflight Skill

Next.js 16 App Router + Vercel. These traps have each broken the Vercel build
more than once (see `docs/FRICTION-AUDIT.md` cluster C3). Check before pushing.

## Run the gate

```
npm run preflight     # check:migrations && tsc && next build
```
If you only touched a page/route, at minimum run `npm run check && npm run build`.
`tsc` passing is NOT enough — several breakages were build-only.

## The checklist

1. **No function props Server → Client.** A Server Component must not pass a
   function/handler as a prop to a Client Component. Move the handler into the
   client component or pass serializable data only. (`bab6624`)
2. **`useSearchParams()` needs a Suspense boundary.** Any page/component calling
   `useSearchParams` (or `usePathname` in some cases) must be wrapped in
   `<Suspense>`, or the build fails with a prerender error. (`4dda692`, `bb3a107`)
3. **`'use client'` is the FIRST line** of a client module, before imports.
4. **Middleware lives in `proxy.ts`**, not `middleware.ts` (Next 16 rename in
   this repo). (`46af1df`)
5. **Cron respects Vercel Hobby limits** — limited schedules/day. Don't add cron
   entries to `vercel.json` beyond the plan. (`57ce3b9`, `65df0b5`)
6. **No undefined build-time constants** — e.g. exported color/enum maps must be
   defined before use in a Server Component (`DEFORESTATION_COLORS`). (`cce9c89`)
7. **Sentry config is conditional** on its env/DSN so builds without it succeed.

## Metadata title trap

Marketing layout sets `template: '%s | OriginTrace'`. Page `metadata.title` must
be the **bare** title — no `| OriginTrace` suffix, or it doubles. Nested layouts
(e.g. `compliance/layout.tsx`) re-export their own template. (`009b9c7`)
