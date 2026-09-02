---
name: discovery-pipeline
description: >-
  Stage 1 of the two-stage pipeline. Socratic discovery — grill assumptions,
  write PRD + ADR + EXECUTION_PLAN, publish GitHub issues. Use when the user
  says "Discovery", "New Feature", describes a product idea, or starts voice
  ideation for a feature.
disable-model-invocation: true
---

# Discovery Pipeline (Stage 1)

Socratic product architect. **No code** until the captain approves the execution plan.

Read `docs/agents/pipeline.md` for the full architecture. Read `docs/agents/issue-tracker.md` and `docs/agents/domain.md` before exploring.

## Phase 1 — Grill

Run these skills in order:

1. **`/grilling`** — one question at a time. Cover:
   - Scope boundaries (what is explicitly NOT in this feature?)
   - Failure modes (LLM timeout, external API down, cache miss)
   - Data and state transitions (inputs, persistence, user-visible outcomes)
2. **`/domain-modeling`** — update `CONTEXT.md` and offer ADRs in `docs/adr/` when trade-offs are hard to reverse.

If a question can be answered by exploring the codebase, explore instead of asking.

**Stop grilling** when the captain says "proceed", "good enough", or answers the open questions.

## Phase 2 — Specify

Pick a slug: `feature-<kebab-case-name>` (e.g. `feature-trip-sharing`).

Create `docs/tasks/<slug>/` with:

### PRD.md

```markdown
# <Feature Name>

## Core Value Proposition
## Non-Goals (Out of Scope)
## User Stories
## Feasibility & Trade-offs
## Testing Seams
```

Use Voyago vocabulary from `CONTEXT.md`. No file paths in the PRD.

### EXECUTION_PLAN.md

Vertical slices only — **not** horizontal layers. Each slice cuts through schema → API → UI → tests.

```markdown
# Execution Plan: <Feature Name>

Parent issue: #<number>
Feature dir: docs/tasks/<slug>/

## Slices

- [ ] **Slice 1: <behavior users can verify>**
  - Issue: #<number>
  - Acceptance: `pnpm test:run src/test/<relevant>.test.ts` passes; <observable behavior>
  - Blocked by: none

- [ ] **Slice 2: ...**
  - Issue: #<number>
  - Acceptance: ...
  - Blocked by: Slice 1
```

Rules for slices:

- One tracer bullet per slice (see `/tdd` — never horizontal test-then-implement)
- Acceptance criteria are **observable behaviors**, not file paths
- Each slice is independently shippable as one PR

### ADR (if needed)

Only when `/domain-modeling` identified a hard-to-reverse decision. Use `docs/adr/NNNN-<slug>.md`.

## Phase 3 — Publish

1. Run **`/to-prd`** to publish the PRD as a GitHub parent issue. Label: `ready-for-agent`, `enhancement`, `pipeline:discovery-complete`.
2. Run **`/to-issues`** to publish each slice as a child issue. Label each: `ready-for-agent`, `enhancement`.
3. Backfill issue numbers into `EXECUTION_PLAN.md`.

Get captain approval on slice granularity before publishing if they haven't already confirmed.

## Completion

State exactly:

> Discovery complete. `docs/tasks/<slug>/EXECUTION_PLAN.md` generated with N slices. Run **Stage 2**: `/builder-pipeline` on `docs/tasks/<slug>/`, or dispatch to Firstmate/GNHF per `docs/agents/pipeline.md`.

Do not write implementation code in this stage.
