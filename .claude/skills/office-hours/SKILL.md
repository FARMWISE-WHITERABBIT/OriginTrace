---
name: office-hours
description: >
  Use this skill when the user describes a new product idea, asks to brainstorm
  something, asks whether an idea is worth building, wants help thinking through
  design decisions before code exists, says "office hours", "I have an idea",
  "brainstorm this", "help me think through this", or needs a product/design
  document before implementation. Produces a design doc only; never starts
  implementation.
---

# Office Hours Skill

## Purpose

Run YC-style office hours before implementation. The outcome is a saved design
document that downstream planning, engineering, and design review skills can use.

This skill has two modes:

- **Startup mode**: force clarity on demand, status quo, specific users,
  narrowest wedge, observed usage, and future-fit.
- **Builder mode**: brainstorm the coolest useful version for side projects,
  hackathons, learning, open source, or research.

## Hard Gate

Do not write code, scaffold files, create migrations, implement UI, or invoke
implementation skills. This skill produces design docs and handoff decisions.

If the user asks to skip questions and implement anyway, ask the two most critical
remaining office-hours questions, then proceed to premises and alternatives. If
they push back a second time, respect it and move to premises.

## Phase 1: Context Gathering

Understand the repo and the idea before proposing approaches.

1. Read `AGENTS.md`, `CLAUDE.md`, and `TODOS.md` if they exist.
2. Run `git log --oneline -30` and `git diff origin/main --stat 2>/dev/null`
   to understand recent activity.
3. Use `rg` and `rg --files` to map code areas relevant to the idea.
4. List prior design docs under `~/.gstack/projects/<repo-slug>/*-design-*.md`
   when the directory exists.
5. Ask the user what their goal is, one question only:

   "Before we dig in, what's your goal with this?"

   Suggested choices when a structured question tool is available:
   - Building a startup
   - Intrapreneurship or internal company project
   - Hackathon or demo
   - Open source or research
   - Learning
   - Having fun

Map startup and intrapreneurship to Startup mode. Map hackathon, open source,
research, learning, and fun to Builder mode.

For startup or intrapreneurship, also assess product stage:

- Pre-product
- Has users
- Has paying customers

Say what you understand about the project and the area the user wants to change
before moving into questions.

## Question Rules

- Ask questions one at a time and stop for the answer.
- Use `request_user_input` when available and appropriate. Otherwise ask directly
  in chat.
- Push for concrete answers. Names, roles, workflows, hours, dollars, and exact
  user behavior beat broad categories.
- Smart-skip questions already answered by the user's prompt or prior answers.
- Do not batch all questions into one message.

## Phase 2A: Startup Mode

Use direct product diagnosis. Interest is not demand. The status quo is the real
competitor. Narrow beats wide early.

### Routing by Stage

- Pre-product: ask Q1, Q2, Q3.
- Has users: ask Q2, Q4, Q5.
- Has paying customers: ask Q4, Q5, Q6.
- Pure engineering or infrastructure: ask Q2 and Q4 only.

### Q1: Demand Reality

Ask:

"What's the strongest evidence you have that someone actually wants this, not
`is interested`, not `signed up for a waitlist`, but would be genuinely upset if
it disappeared tomorrow?"

Push for specific behavior: paying, expanding usage, building workflows around it,
or scrambling if it vanished.

Red flags:

- "People say it's interesting."
- "We got waitlist signups."
- "VCs are excited about the space."

After the first answer, check framing:

- Are key terms measurable?
- What hidden assumption is the answer taking for granted?
- Is this real observed pain or hypothetical pain?

If framing is imprecise, restate the idea in sharper terms and ask whether that
captures it.

### Q2: Status Quo

Ask:

"What are your users doing right now to solve this problem, even badly? What does
that workaround cost them?"

Push for a specific workflow, hours spent, money wasted, tools stitched together,
manual labor, or internal tools maintained by engineers.

If the answer is "nothing", challenge whether the problem is painful enough to
act on.

### Q3: Desperate Specificity

Ask:

"Name the actual human who needs this most. What's their title? What gets them
promoted? What gets them fired? What keeps them up at night?"

Push until the answer names a person, role, and consequence. Categories are not
people. You cannot email a category.

### Q4: Narrowest Wedge

Ask:

"What's the smallest possible version of this that someone would pay real money
for this week, not after you build the platform?"

Push for one feature or one workflow that can ship in days. If the user says the
full platform is required, challenge whether the value proposition is clear.

Bonus push:

"What if the user did not have to do anything at all to get value? No login, no
integration, no setup. What would that look like?"

### Q5: Observation and Surprise

Ask:

"Have you actually sat down and watched someone use this without helping them?
What did they do that surprised you?"

Push for a specific surprise. Surveys and demos do not count as observation.

### Q6: Future-Fit

Ask:

"If the world looks meaningfully different in three years, and it will, does your
product become more essential or less?"

Push for a specific claim about how the user's world changes and why that makes
the product more valuable. Market growth is not a product thesis.

## Phase 2B: Builder Mode

Use enthusiastic, opinionated design-partner energy. Delight is the currency.
The goal is the coolest version that can actually be shown to people.

Ask these one at a time, smart-skipping anything already answered:

1. "What's the coolest version of this? What would make it genuinely delightful?"
2. "Who would you show this to? What would make them say `whoa`?"
3. "What's the fastest path to something you can actually use or share?"
4. "What existing thing is closest to this, and how is yours different?"
5. "What would you add if you had unlimited time? What's the 10x version?"

If the user starts talking about customers, revenue, fundraising, or a real
company, switch to Startup mode and say you are going to ask harder questions.

## Phase 2.5: Related Design Discovery

After the user states the problem, extract three to five significant keywords and
search prior design docs under `~/.gstack/projects/<repo-slug>/`.

If related docs are found, read the most relevant one and say:

"Related design found: `<title>` on `<date>`. Key overlap: `<one-line summary>`."

Ask whether to build on it or start fresh. Stop for the answer.

## Phase 2.75: Landscape Awareness

Search before building when the user allows it. First ask:

"I'd like to search for what the world thinks about this space to inform our
discussion. This sends generalized category terms, not your specific idea, to a
search provider. OK to proceed?"

If the user declines, skip search and proceed with local knowledge only.

Use generalized category terms, never stealth names or proprietary phrases.

Startup mode searches:

- `<problem space> startup approach <current year>`
- `<problem space> common mistakes`
- `why <incumbent solution> fails` or `why <incumbent solution> works`

Builder mode searches:

- `<thing being built> existing solutions`
- `<thing being built> open source alternatives`
- `best <thing category> <current year>`

Synthesize:

- Layer 1: What everyone already knows.
- Layer 2: What current discourse says.
- Layer 3: Given this user's answers, where conventional wisdom is wrong or sound.

If a real insight emerges, call it out as `EUREKA:` and explain the implication.

## Phase 3: Premise Challenge

Before approaches, challenge premises:

1. Is this the right problem?
2. What happens if we do nothing?
3. What existing code partially solves this?
4. If the deliverable is a CLI, package, container, app, or other artifact, how
   will users get it?
5. Startup mode only: does the diagnostic evidence support this direction?

Output clear premise statements:

```text
PREMISES:
1. <statement> - agree/disagree?
2. <statement> - agree/disagree?
3. <statement> - agree/disagree?
```

Ask the user to confirm. If they disagree, revise and loop back.

## Phase 3.5: Second Opinion

Offer a second opinion from an independent AI perspective. If current system
instructions allow subagents and the user approves, dispatch one with only a
structured summary of the session, not hidden conclusions. Otherwise skip this
phase and note that it did not run.

For Startup mode, ask the second opinion for:

1. The strongest version of what the user is trying to build.
2. The one answer that reveals the most about what to build.
3. One premise that may be wrong and evidence that would prove it.
4. A 48-hour prototype plan.

For Builder mode, ask for:

1. The coolest version the user has not considered.
2. The answer that reveals what excites them most.
3. Existing open source or tools that get halfway there.
4. A weekend build plan.

If a premise is challenged, ask the user whether to revise it or keep the
original. Stop for the answer.

## Phase 4: Alternatives Generation

Produce two or three distinct approaches. This phase is mandatory.

Each approach must include:

```text
APPROACH A: <Name>
Summary: <1-2 sentences>
Effort: <S/M/L/XL>
Risk: <Low/Med/High>
Pros:
- <specific pro>
- <specific pro>
Cons:
- <specific con>
- <specific con>
Reuses: <existing code or pattern>
```

Required approach types:

- Minimal viable: smallest diff, fastest path.
- Ideal architecture: best long-term trajectory.
- Creative or lateral: optional, but preferred when meaningfully different.

End with a recommendation mapped to the user's stated goal. Then ask the user to
choose an approach and stop. Do not write the design doc until the user chooses.

## Optional Visual Sketch

If the chosen approach includes user-facing UI, sketch the core flow before the
design doc:

- Check for `DESIGN.md` and existing UI conventions.
- Generate a rough, intentionally plain HTML wireframe if a browser/render path is
  available.
- Show one to three states: normal, empty, error, loading, or partial.
- Ask whether the layout feels right and iterate once if requested.

Skip silently for backend-only, infrastructure-only, or non-UI ideas.

## Phase 4.5: Founder Signal Synthesis

Track signals observed during the session:

- Real problem someone actually has.
- Specific users named.
- User pushed back on premises with reasoning.
- Other people need the project.
- Domain expertise.
- Taste.
- Agency.
- Defended a premise against a second opinion with reasoning.

Use these signals in the design doc's "What I noticed" section and closing.

## Phase 5: Design Doc

Save the doc under `~/.gstack/projects/<repo-slug>/` when writable. If that path is
unavailable, save under `.gstack/projects/<repo-slug>/` in the repo and state the
fallback path.

Use the templates in `references/design-doc-templates.md`.

Name the file:

```text
<user>-<branch>-design-<YYYYMMDD-HHMMSS>.md
```

If a prior design exists on the same branch, add `Supersedes: <prior filename>`.

After writing, say:

"Design doc saved to: <full path>. Other skills can find it automatically."

## Spec Review

Review the doc before presenting it:

- Completeness: all requirements, edge cases, and constraints covered.
- Consistency: no contradictions.
- Clarity: an engineer can implement without guessing.
- Scope: no unnecessary expansion.
- Feasibility: approach can actually be built.

If subagents are explicitly permitted and available, use an independent reviewer.
Otherwise self-review with the same dimensions. Fix clear issues and add a
`Reviewer Concerns` section for unresolved concerns.

Present the doc for approval:

- Approve: mark `Status: APPROVED` and proceed to handoff.
- Revise: ask which sections need changes and update the doc.
- Start over: return to questions.

## Phase 6: Handoff

After approval:

1. Give one concrete assignment. This must be a real-world action, not "go build
   it." Startup examples: talk to three named users, watch one workflow, ask one
   buyer for money. Builder examples: build the shareable slice, publish a demo,
   ask three friends to try it.
2. Share two or three relevant founder/builder resources from
   `references/founder-resources.md`, avoiding repeats when prior profile data is
   available.
3. Recommend the next skill:
   - `plan-ceo-review` for ambitious product strategy.
   - `plan-eng-review` for implementation planning.
   - `plan-design-review` for visual or UX review.

## Completion Status

End with one of:

- `DONE`: design doc approved.
- `DONE_WITH_CONCERNS`: design doc approved with open concerns.
- `NEEDS_CONTEXT`: user left key questions unanswered.
- `BLOCKED`: unable to proceed, with what was tried and what is needed.

## References

- `references/design-doc-templates.md`: startup and builder design doc templates.
- `references/founder-resources.md`: resource pool for closing handoff.
