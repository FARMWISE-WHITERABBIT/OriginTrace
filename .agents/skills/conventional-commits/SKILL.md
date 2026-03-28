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
- **Primary Use Cases and Value Proposition:** Ensures the repository maintains a clean, searchable, and rollback-friendly history. It provides the exact structured data required by the `Human-Readable Release Notes` skill to generate accurate changelogs.

## 2. When to Use
- **Scenario 1:** The agent has successfully completed a specific, isolated task (e.g., finished writing a new function, updated a UI component, or patched a bug).
- **Scenario 2:** Before the agent switches context to a completely different file or feature (enforcing atomic commits).
- **Scenario 3:** Prior to running a deployment or triggering a build pipeline.

## 3. When NOT to Use
- Do NOT use if the codebase is currently in a broken state or failing unit tests (unless explicitly saving a "WIP" branch).
- Do NOT bundle unrelated changes into a single massive commit (e.g., do not commit a UI color change and a database schema update at the same time).

## 4. Workflow / How to Use
1. **Context Analysis (`git status` & `git diff`):** The agent reviews the currently modified files to understand exactly what lines of code were altered.
2. **Logical Staging (`git add`):** The agent stages *only* the files relevant to the specific feature or fix. It must avoid `git add .` if there are unrelated modifications.
3. **Drafting the Payload (The Conventional Format):** The agent constructs the message using this strict syntax:
   `[type]([optional scope]): [subject]`
   `[optional body explaining the WHY, not just the WHAT]`
4. **Execution (`git commit`):** The agent executes the commit via the CLI or GitHub API.

## 5. Parameters & Configuration
| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `files_to_stage` | Yes | List of specific file paths to stage. | `["app/src/main/java/.../Parser.kt"]` |
| `type` | Yes | Must be one of: `feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test`, `perf`. | `feat` |
| `scope` | No | The specific module or layer affected. | `accessibility` or `ui-dashboard` |
| `subject` | Yes | Short summary in imperative mood, no capitalization, no period at end. | `add node debouncing to filter ui noise` |
| `body` | No | Deeper explanation of why the change was made and any side effects. | `Prevents the parser from logging 'Search' buttons as contacts.` |

## 6. Output Format
Returns a structured confirmation of the Git execution, including the final commit hash and the exact message used.

## 7. Examples

### Example 1: Committing a New Feature (OriginTrace Context)
**User Request:** (System Trigger) "I just finished writing the new engagement scoring algorithm. Save the work."
**Thought Process:** The files modified are `RelationshipScoreUseCase.kt` and `UsageDao.kt`. This is a new feature for the scoring engine. I will stage these two files and write a `feat` commit.
**Actions:** 1. `git add RelationshipScoreUseCase.kt UsageDao.kt`
2. Generate Conventional Commit message.
**Response:** ```text
[SUCCESS] Commit 8f3a2b1 created.
Message: 
feat(scoring): implement frequency-weighted relationship algorithm

Added a multiplier to the DAO queries to weight session count alongside total duration, distinguishing between burst communicators and long-session users.
```
