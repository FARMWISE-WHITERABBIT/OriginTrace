---
name: conventional-commits
description: >
  Use this skill to execute stage-by-stage Git version control using Conventional
  Commits. Analyzes diffs, stages files atomically, and generates structured,
  searchable commit history. Triggers for "git add", "commit my changes",
  "save this work", or "version control".
---

# Skill: Autonomous Version Control (Conventional Commits)

## 1. Overview
- **Description:** This skill executes stage-by-stage Git version control. It analyzes code diffs, stages files in logical atomic units, and generates highly structured, industry-standard commit messages based on the Conventional Commits specification.
- **Primary Use Cases:** Ensures the repository maintains a clean, searchable, and rollback-friendly history. It provides the structured data required by the `release-notes` skill to generate accurate changelogs.

## 2. When to Use
- **Scenario 1:** The agent has successfully completed a specific, isolated task (e.g., finished a new function, updated a UI component, or patched a bug).
- **Scenario 2:** Before the agent switches context to a completely different file or feature (enforcing atomic commits).
- **Scenario 3:** Prior to running a deployment or triggering a build pipeline.

## 3. When NOT to Use
- Do NOT use if the codebase is currently in a broken state or failing unit tests (unless explicitly saving a "WIP" branch).
- Do NOT bundle unrelated changes into a single massive commit.

## 4. Workflow / How to Use
1. **Context Analysis (`git status` & `git diff`):** Review currently modified files.
2. **Logical Staging (`git add`):** Stage *only* the files relevant to the specific feature or fix. Avoid `git add .` if there are unrelated modifications.
3. **Drafting the Payload (The Conventional Format):**
   `[type]([optional scope]): [subject]`
   `[optional body explaining the WHY, not just the WHAT]`
4. **Execution (`git commit`):** Execute the commit.

## 5. Parameters & Configuration
| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `files_to_stage` | Yes | Specific file paths to stage. | `["lib/services/scoring/eudr.ts"]` |
| `type` | Yes | One of: `feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test`, `perf`. | `feat` |
| `scope` | No | The specific module or layer affected. | `scoring` or `ui-dashboard` |
| `subject` | Yes | Short summary in imperative mood, no capitalization, no period. | `add EUDR geolocation validation to scoring engine` |
| `body` | No | Deeper explanation of why the change was made. | `EUDR requires GPS polygons for all farm boundaries...` |

## 6. Scopes for OriginTrace

Use these scopes to match the project's module structure:
- `scoring` — shipment readiness scoring engine
- `compliance` — EUDR, DDS, pedigree, DPP
- `geo` — farm boundaries, PostGIS, Leaflet maps
- `sync` — offline sync, IndexedDB, service worker
- `rbac` — roles, permissions, route gating
- `ui` — components, theming, design system
- `api` — API route handlers
- `db` — migrations, schema, RLS policies
- `i18n` — translations, locale files
- `deploy` — deployment, environment, CI/CD

## 7. Examples

### Example 1: Committing a New Scoring Framework
**User Request:** "I just finished writing the China Green Trade scorer. Save the work."
**Actions:**
1. `git add lib/services/scoring/china-green-trade.ts lib/services/scoring/index.ts`
2. Generate Conventional Commit message.
**Response:**
```text
[SUCCESS] Commit 8f3a2b1 created.
Message:
feat(scoring): add China Green Trade (GACC) regulatory framework scorer

Implements GACC registration checks, phytosanitary protocol validation,
and traceability documentation requirements for China-bound shipments.
```

### Example 2: Committing a Bug Fix
**User Request:** "Fixed the GeoJSON coordinate order bug in the farm map."
**Actions:**
1. `git add components/farm-polygon-map.tsx`
2. Generate Conventional Commit message.
**Response:**
```text
[SUCCESS] Commit a1b2c3d created.
Message:
fix(geo): correct coordinate order in farm polygon map component

Leaflet uses [lat, lng] but GeoJSON uses [lng, lat]. The map center
was being set with GeoJSON order, causing farms to render in the wrong
location.
```
