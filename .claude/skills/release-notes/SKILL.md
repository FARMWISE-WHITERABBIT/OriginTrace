---
name: release-notes
description: >
  Use this skill to analyze raw technical diffs and architectural changes to
  translate them into clear, engaging, non-technical release notes or
  changelogs. Triggers for any mention of "release notes", "changelog", "what
  changed", "summarize my work", or "README update".
---

# Release Notes Skill

## 1. Overview

This skill bridge the gap between technical commits and user-facing value.
It summarizes changes into "What's New," "Fixes," and "Technical Improvements."

---

## 2. Workflow

1. **Analyze**: Review `git log` or recent commits (from `conventional-commits`).
2. **Categorize**: Group by user impact (Features, Improvements, Fixes).
3. **Draft**: Write in a clear, non-technical voice.
4. **Output**: Generate Markdown for the `CHANGELOG.md` or a release modal.

---

## 3. Example

**Commit Log:**
- `feat(scoring): add EUDR geolocation validation`
- `fix(geo): fix coordinate order in map`
- `chore: update dependencies`

**Release Note:**
### 🚀 New Features
- **Enhanced EUDR Compliance**: The shipment scoring engine now automatically
  validates farm geolocation data to ensure compliance with EU Deforestation
  Regulations.

### 🛠️ Improvements & Fixes
- **Map Accuracy**: Fixed an issue where farm boundaries were rendered in the
  wrong location due to coordinate swapping.
- **Stability**: General system maintenance and dependency updates.

---

## 4. Best Practices

- **Focus on Value**: Don't just say "added a column"; say "you can now track
  expiry dates for certificates."
- **Keep it Concise**: Use bullet points.
- **Cross-Reference**: Link to the `conventional-commits` skill to ensure
  source data is high quality.
