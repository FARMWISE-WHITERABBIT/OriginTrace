# Buyer Org Provisioning — Runbook

_One-pager. What happens after a buyer/importer submits a demo request, who provisions their account, and by when. Companion to `docs/IMPORTER-FUNNEL-PLAN.md` (see D1(a): the buyer funnel intentionally ends at a human step, not self-serve signup)._

## Why this exists

The `/importers` funnel and `/demo?role=buyer` form route buyer leads into the same lead pipeline exporters use — but **submitting the form does not create a buyer account.** Self-serve buyer registration was deliberately removed (`app/api/auth/buyer-register/route.ts` returns HTTP 410). If nobody acts on the lead, the funnel dead-ends: the buyer gets an auto-reply and a Cal.com link, but never gets into the product. This runbook is the manual step that closes that gap.

## What happens automatically on submit

`app/api/contact/route.ts` fires four things the instant a `persona: buyer` demo form is submitted — no human involved yet:

1. Internal notification email to `LEAD_NOTIFY_EMAIL` (defaults to `hello@origintrace.trade`), including persona, org type, and biggest-concern fields.
2. Auto-reply to the lead with a Cal.com booking link.
3. A HubSpot contact upsert + Deal created in stage `appointmentscheduled` (`lib/hubspot.ts`).
4. A `lead_nurture_jobs` row (status `active`) that drives an automated email drip via `app/api/cron/nurture-drip/route.ts`.

**There is no Slack notification and no superadmin UI listing new demo leads.** The internal email and the HubSpot deal are the only signals that a buyer org needs provisioning.

## Who provisions the buyer org

A **superadmin** — any `system_admins` role except `support_agent` or `compliance_manager` (enforced in `app/api/superadmin/create-buyer-org/route.ts`, see `lib/superadmin-rbac.ts`).

**Steps:**

1. After the discovery call (booked via the Cal.com link from the auto-reply) confirms the buyer is a real prospect, go to **`/superadmin/buyer-orgs`**.
2. Click **Create buyer org**. Required fields: `companyName`, `adminName`, `adminEmail`. Optional: `country`, `industry`.
3. This creates:
   - A row in `buyer_organizations` (separate table from exporter `organizations` — there is no shared "org type" flag; buyer and exporter orgs are structurally separate).
   - A Supabase auth user + a `buyer_profiles` row with `role: buyer_admin`.
   - A welcome email (Resend) with login instructions. If email delivery fails, the UI surfaces a copyable temp password as a fallback — send it to the buyer manually.
4. If `adminEmail` already has an account (HTTP 409), the buyer already exists — don't create a duplicate; help them recover access to the existing login instead.
5. Buyer logs in at `/auth/login` and lands in the buyer portal (`app/app/buyer/*`), which reads from `buyer_profiles`/`buyer_organizations` — entirely separate from the exporter RBAC model in `lib/rbac.ts`.

## SLA (recommended — not yet a formally agreed target)

No SLA is currently tracked or enforced anywhere in the codebase for this step. Proposed default, pending sign-off:

- **Discovery call booked:** within 2 business days of the demo-request email (matches the Cal.com auto-reply framing).
- **Buyer org provisioned:** within 1 business day of the call confirming the buyer is a real prospect.

If this cadence turns out to be wrong in practice, update this section — don't let it silently drift out of sync with what the team actually does.

## Known gap

Because there's no lead dashboard, provisioning relies entirely on someone reading the notification email or checking HubSpot. If `LEAD_NOTIFY_EMAIL` bounces or a deal gets buried in HubSpot, the lead can sit unprovisioned indefinitely with no alarm. Worth a follow-up ticket (out of scope for P1) to surface pending buyer leads in `/superadmin/buyer-orgs` directly, e.g. flagging HubSpot deals in `appointmentscheduled` with `persona: buyer` and no matching `buyer_organizations` row.
