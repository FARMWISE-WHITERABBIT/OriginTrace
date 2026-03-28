---
name: release-notes
description: >
  Use this skill to analyze raw technical diffs and architectural changes to
  translate them into clear, engaging, non-technical release notes or changelogs.
  Triggers for any mention of "release notes", "changelog", "what changed",
  "summarize my work", or "README update".
---

# Skill: Human-Readable Release Notes (The README Translator)

## 1. Overview
- **Description:** This skill analyzes raw technical diffs, code commits, and architectural changes made by the agent, and translates them into a clear, engaging, non-technical README or Changelog.
- **Primary Use Cases and Value Proposition:** Bridges the gap between engineering and stakeholders. It ensures that users, marketing teams, or non-technical co-founders immediately understand *what* was changed, *why* it matters to them, and *how* they will experience the update in the product.

## 2. When to Use
- **Scenario 1:** Immediately after the agent successfully completes a feature integration, bug fix, or refactor.
- **Scenario 2:** When preparing for a new version release and summarizing a batch of recent commits.
- **Scenario 3:** When a stakeholder explicitly asks, "What did the AI just build/change?"

## 3. When NOT to Use
- Do NOT use for generating API documentation, Architectural Decision Records (ADRs), or deep developer-to-developer technical documentation.
- Do NOT use if no actual code changes or logic updates were successfully committed.

## 4. Workflow / How to Use
1. **Ingest Technical Context:** The agent reads the list of modified files, git diffs, or internal task logs.
2. **Feature Extraction:** Identify the core outcome of the code (e.g., *Is the app faster? Is there a new button? Did a crash get fixed?*).
3. **Jargon Translation:** Strictly replace technical terms with user-facing benefits (e.g., change "Optimized SQLite DAO queries" to "The dashboard now loads instantly").
4. **Structure & Format:** Group the changes into logical buckets: "🎉 New Features", "🐛 Bug Fixes", and "⚙️ Under the Hood".
5. **Generate Examples:** For every major user-facing change, provide a concrete, real-world example of how it looks or behaves now.

## 5. Parameters & Configuration
| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `technical_summary` | Yes | Raw commit logs or agent task completion notes | "Updated BFS algorithm to ignore 'Search' UI nodes." |
| `project_name` | Yes | The name of the product being updated | "OriginTrace" |
| `audience` | No | Target reader level (Default: non-technical) | "End User" or "Investor" |

## 6. Output Format
Returns a beautifully formatted Markdown string utilizing emojis, bold text for emphasis, and clear bullet points. It must never include raw code blocks unless explicitly requested.

## 7. Examples
### Example 1: Translating a Backend Algorithm Change
**User Request:** (System Trigger) "Generate a user-friendly README update for the latest push. I just updated the AccessibilityService parser to debounce UI events and filter out non-contact UI strings."
**Thought Process:** The user doesn't know what "debouncing" or "AccessibilityService" means. They only care about what happens on their screen. The benefit here is accuracy and fewer glitches.
**Actions:** Translate "debounce" to "smoother tracking" and "filter out non-contact strings" to "no more fake contacts."
**Response:** ```markdown
## 🚀 What's New in OriginTrace!

### 🎉 Smoother, Smarter Tracking
We've completely upgraded how OriginTrace understands your screen! 
* **Say Goodbye to 'Ghost' Contacts:** Previously, the app might accidentally log system buttons like "Search" or "Settings" as if they were your friends. We've taught the engine to ignore that noise. 
* *Example:** Your "Top Contacts" list will now be 100% accurate, showing only actual human conversations!

### ⚙️ Under the Hood
* **Battery Optimization:** We smoothed out the tracking engine so it does less unnecessary work in the background, saving your battery life while keeping your stats perfectly accurate.
```
