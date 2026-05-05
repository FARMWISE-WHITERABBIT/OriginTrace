# Sales Funnel Optimisation — Design Spec
**Date:** 2026-04-07
**Status:** Approved for implementation

---

## Problem Statement

Two bottlenecks identified:
1. **Mid-funnel no-shows** — leads submit the demo form, receive a single auto-reply, then wait 24-72h for a human to schedule a call. By the time the call is booked, intent has cooled and leads don't show up.
2. **Top-of-funnel SEO gap** — insufficient organic traffic; marketing pages lack structured data, dynamic sitemap, and consistent meta tags.

## Solution Overview

Five modules built on top of the existing HubSpot + Resend stack:

1. **Instant Calendar Booking** — Cal.com embed on `/demo/confirm` + link in auto-reply
2. **Lead Nurture Drip** — 3-email Resend sequence for non-bookers (T+24h, T+72h, T+7d)
3. **Cal.com Webhook + WhatsApp** — Meta WhatsApp Cloud API for booking confirmation + reminders
4. **Cron Jobs** — Hourly reminder-check + daily nurture-drip
5. **SEO** — Dynamic sitemap, robots.txt, JSON-LD structured data, `lib/seo.ts` utility

---

## Third-Party Services

| Service | Cost | Purpose |
|---------|------|---------|
| Cal.com | Free (webhooks included) | Calendar booking |
| Meta WhatsApp Cloud API | ~$0.005/conversation in NG | WhatsApp reminders |
| Resend | Already integrated (3k/mo free) | Nurture + reminder emails |
| HubSpot | Already integrated (free CRM) | Deal stage progression |

**New environment variables:**
```
CALCOM_LINK               # e.g. https://cal.com/origintrace/discovery
CALCOM_WEBHOOK_SECRET     # From Cal.com webhook settings
META_WA_PHONE_NUMBER_ID   # From Meta Business Dashboard
META_WA_ACCESS_TOKEN      # Long-lived system user token
META_WA_TEMPLATE_NAMESPACE # Business template namespace
```

---

## Database

### New table: `lead_nurture_jobs`
```sql
CREATE TABLE lead_nurture_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_email      TEXT NOT NULL,
  lead_name       TEXT NOT NULL,
  lead_phone      TEXT,
  lead_company    TEXT,
  commodity       TEXT,
  org_type        TEXT,
  hubspot_deal_id TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  meeting_at      TIMESTAMPTZ,
  nurture_step    INT NOT NULL DEFAULT 0,
  reminders_sent  JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_nurture_jobs_email ON lead_nurture_jobs(lead_email);
CREATE INDEX idx_lead_nurture_jobs_status ON lead_nurture_jobs(status);
CREATE INDEX idx_lead_nurture_jobs_meeting_at ON lead_nurture_jobs(meeting_at);
```

Status values: `active | booked | no_show | completed | cancelled | nurture_dropped`

---

## Module 1: Calendar Booking

### `/app/(marketing)/demo/confirm/page.tsx`
- Shows "Request received" confirmation
- Renders Cal.com inline embed (`@calcom/embed-react`) pre-filled with name + email from query params
- If no params, renders embed without pre-fill

### Demo form update
- On success: redirect to `/demo/confirm?name=...&email=...` instead of showing inline success

### Auto-reply email update
- Add "Book Your Discovery Call →" button with `CALCOM_LINK` above the existing 4-step timeline

---

## Module 2: Lead Nurture Drip

### Three email templates in `lib/email/templates.ts`

**Email 1 (T+24h):** `buildNurtureEmail1(name, calcomLink)`
- Subject: "Still happy to show you OriginTrace"
- Short, one CTA

**Email 2 (T+72h):** `buildNurtureEmail2(name, commodity, orgType, calcomLink)`
- Subject: "What does EUDR compliance actually cost you?"
- Personalised with commodity + org type

**Email 3 (T+7d):** `buildNurtureEmail3(name, calcomLink)`
- Subject: "Closing your pilot slot"
- Scarcity framing, final CTA

### `/api/cron/nurture-drip/route.ts`
- Runs daily at 08:00 UTC
- Queries `lead_nurture_jobs` where `status = 'active'`
- Sends next email based on `nurture_step` and time elapsed
- Updates `nurture_step`; sets `status = 'nurture_dropped'` after step 3

---

## Module 3: Cal.com Webhook + WhatsApp

### `/api/webhooks/calcom/route.ts`
- Verifies `X-Cal-Signature-256` HMAC-SHA256 signature
- Handles: `BOOKING_CREATED`, `BOOKING_CANCELLED`, `BOOKING_RESCHEDULED`
- On `BOOKING_CREATED`:
  - Updates `lead_nurture_jobs`: status → booked, meeting_at → datetime
  - Updates HubSpot deal stage → `meeting_scheduled`
  - Sends WhatsApp booking confirmation
  - Sends Resend confirmation email

### `lib/meta-whatsapp.ts`
Four functions using Meta WhatsApp Cloud API (`https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages`):
- `sendBookingConfirmation(phone, name, meetingDatetime, rescheduleLink)`
- `send24hReminder(phone, name, meetingDatetime, calLink)`
- `send1hReminder(phone, name, meetingDatetime)`
- `sendNoShowRecovery(phone, name, rescheduleLink)`

Phone numbers normalised to E.164 via `formatPhoneE164(phone, 'NG')`.
WhatsApp steps skipped silently if phone is null.

### WhatsApp templates (submit to Meta before go-live)
1. `origintrace_booking_confirmation` — `{{1}}` name, `{{2}}` datetime, `{{3}}` commodity, `{{4}}` reschedule link
2. `origintrace_reminder_24h` — `{{1}}` name, `{{2}}` datetime, `{{3}}` reschedule link
3. `origintrace_reminder_1h` — `{{1}}` name, `{{2}}` datetime
4. `origintrace_noshow_recovery` — `{{1}}` name, `{{2}}` rebook link

---

## Module 4: Cron Jobs

### `/api/cron/reminder-check/route.ts`
Runs hourly. Three queries per run:

**24h reminder:**
- `status = 'booked' AND meeting_at BETWEEN NOW()+23h AND NOW()+25h AND reminders_sent->>'24h' IS NULL`
- Sends WhatsApp + email, sets `reminders_sent->>'24h' = true`

**1h reminder:**
- `status = 'booked' AND meeting_at BETWEEN NOW()+55m AND NOW()+65m AND reminders_sent->>'1h' IS NULL`
- Sends WhatsApp, sets `reminders_sent->>'1h' = true`

**No-show detection (30-min grace period):**
- `status = 'booked' AND meeting_at < NOW()-30m AND reminders_sent->>'no_show' IS NULL`
- Sends WhatsApp recovery + Resend recovery email
- Updates HubSpot stage → `no_show`, sets `status = 'no_show'`

All crons verify `Authorization: Bearer {CRON_SECRET}`.

### `vercel.json` additions
```json
{ "path": "/api/cron/nurture-drip",   "schedule": "0 8 * * *" },
{ "path": "/api/cron/reminder-check", "schedule": "0 * * * *" }
```

---

## Module 5: SEO

### `/app/sitemap.ts`
Dynamic Next.js sitemap. Static pages + dynamic blog posts from Supabase.
Priority: `/` = 1.0, `/demo` = 0.9, compliance/industry = 0.8, blog = 0.6.

### `/app/robots.ts`
Allows all except `/app/` and `/api/`. References sitemap URL.

### `lib/seo.ts`
`buildMetaTags(config: SeoConfig)` utility used by all marketing pages.
Generates: `<title>`, `<meta name="description">`, Open Graph, Twitter Card tags.

### JSON-LD Structured Data
- Homepage: `SoftwareApplication` + `Organization`
- `/demo`: `Service` with `BookAction`
- `/compliance/*`: `Article`
- `/blog/[slug]`: `BlogPosting`

---

## HubSpot Deal Stage Map

| Stage key | Triggered by |
|-----------|-------------|
| `new_lead` | Form submission |
| `meeting_scheduled` | Cal.com `BOOKING_CREATED` |
| `meeting_rescheduled` | Cal.com `BOOKING_RESCHEDULED` |
| `no_show` | No-show cron |
| `nurture_dropped` | Nurture drip step 3 complete |

`updateDealStage(dealId, stage)` added to `lib/hubspot.ts`.

---

## Modified Files

- `lib/hubspot.ts` — add `updateDealStage()`
- `lib/email/templates.ts` — add 3 nurture templates + update auto-reply
- `/api/contact/route.ts` — insert `lead_nurture_jobs`, redirect to `/demo/confirm`
- `vercel.json` — add 2 new cron entries

## New Files

- `lib/meta-whatsapp.ts`
- `lib/seo.ts`
- `supabase/migrations/20260407_lead_nurture_jobs.sql`
- `/app/(marketing)/demo/confirm/page.tsx`
- `/api/webhooks/calcom/route.ts`
- `/api/cron/nurture-drip/route.ts`
- `/api/cron/reminder-check/route.ts`
- `/app/sitemap.ts`
- `/app/robots.ts`
