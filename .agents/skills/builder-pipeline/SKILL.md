---
name: builder-pipeline
description: >-
  Stage 2 of the two-stage pipeline. Autonomous TDD execution — read
  EXECUTION_PLAN.md, implement vertical slices, commit, run no-mistakes with
  full gate autonomy, open PRs. Use when the user says "Start Building",
  "Run Execution Plan", "Stage 2", or points at docs/tasks/*/EXECUTION_PLAN.md.
disable-model-invocation: true
---

# Builder Pipeline (Stage 2)

Autonomous execution engine. Reads `docs/tasks/<slug>/EXECUTION_PLAN.md` and ships each slice through TDD + no-mistakes + PR.

Read `docs/agents/pipeline.md`, `docs/agents/issue-tracker.md`, and `CONTEXT.md` before starting.

## Autonomy override

**Pipeline mode is active.** This skill pre-authorizes, per slice:

- Creating feature branches
- Committing implementation + tests
- Pushing to origin
- Opening PRs via gh-axi
- Running `no-mistakes axi run --yes` and driving gates with `--yes`

Do **not** ask for commit/PR approval between slices. Escalate only for:

- Security, privacy, auth, billing, or data-migration `ask-user` findings that contradict product intent
- Scope invalidation (acceptance criteria impossible given codebase)
- Gate failure after 3 fix rounds on the same finding

PR **merge** remains human unless the captain explicitly enabled Firstmate yolo.

## Preconditions

Before the first slice:

```bash
git fetch origin
git status --short          # must be clean or only pipeline-owned changes
no-mistakes axi             # home view — no conflicting active run on this branch
```

If the repo is not initialized: `no-mistakes init && no-mistakes doctor`.

Default branch: `main`.

## Execution loop

For each unchecked `- [ ]` slice in `EXECUTION_PLAN.md` (respect `Blocked by` order):

### 1. Branch

```bash
git checkout main && git pull --ff-only
git checkout -b feature/<slug>-slice-<n>
```

### 2. Read spec

Fetch the linked GitHub issue:

```bash
gh-axi issue view <number> --comments
```

The issue body is the contract. Behaviors and acceptance criteria win over file guesses.

### 3. Implement (TDD)

Run **`/tdd`** — vertical tracer bullets only:

```
RED → GREEN per behavior, one test at a time
```

Voyago verification:

```bash
pnpm test:run src/test/<file>.test.ts   # during development
pnpm lint
pnpm test:run                            # before commit
```

For UI-heavy slices, also run `pnpm build` before commit.

### 4. Commit

Stage only files for this slice. Conventional commit:

```bash
git commit -m "feat(<scope>): <slice title>"
```

### 5. Ship via no-mistakes

Build intent from the issue + conversation decisions (not a diff summary):

```bash
no-mistakes axi run --yes --intent "<full slice objective, constraints, acceptance criteria>"
```

Drive until `outcome: checks-passed`:

```bash
# On gate:
no-mistakes axi respond --yes --action fix    # or approve / skip per gate help
```

Rules while a run is active:

- Never hand-edit code during an active gate — use `--action fix`
- Never abort mid-run to circumvent a gate
- Read `branch_sync.next_action` before follow-up commits; run `no-mistakes axi sync` when code says `sync`
- On `checks-passed`, report the PR URL from the help line — do not wait for merge

If `no-mistakes axi` is unavailable, fall back:

```bash
git push -u origin HEAD
gh-axi pr create --title "feat(<scope>): <slice title>" --body "Closes #<issue>. <acceptance criteria summary>"
```

### 6. Mark complete

Update `EXECUTION_PLAN.md`: `- [x]` for the slice.

Comment on the issue:

```bash
gh-axi issue comment <number> --body "Shipped in PR <url>. Checks green."
```

### 7. Next slice

Repeat from step 1 on a fresh branch from updated `main`.

## Alternate executors

### GNHF (large slices / overnight)

When the captain says "GNHF" or a slice exceeds ~3 behaviors:

1. Complete steps 1–2 above
2. Launch GNHF (Hands-Off mode per `/gnhf` skill):

```bash
gnhf \
  --agent cursor \
  --max-iterations 25 \
  --stop-when "pnpm test:run passes and GitHub issue #<N> acceptance criteria are met" \
  --prevent-sleep on \
  "<objective from issue, tdd vertical slices, no unrelated refactors>"
```

3. After GNHF exits, run step 5 (no-mistakes) on the resulting branch

### Firstmate fleet (parallel / supervised)

When the captain says "fleet" or "Firstmate":

1. Write `docs/tasks/<slug>/HANDOFF.md` with per-slice briefs (see template below)
2. Tell the captain to dispatch each slice as a Firstmate **ship** task:
   - Project: voyago
   - Mode: `no-mistakes`, yolo: `off`
   - Brief: slice title + issue link + acceptance criteria
3. Do not implement in Cursor — Firstmate owns the worktree

HANDOFF brief template:

```markdown
## Ship: <slice title>
Project: voyago
Mode: no-mistakes
Issue: #<N>
Branch prefix: feature/<slug>-slice-<n>

Objective: <from issue What to build>

Acceptance:
- <criterion 1>
- pnpm test:run passes
- pnpm lint passes

Stop: done: PR <url> checks green
```

## Completion

When all slices are `[x]`:

```markdown
## Pipeline complete: <feature name>

| Slice | PR | Issue |
|-------|-----|-------|
| ... | https://... | #N |

N PRs opened, all checks green. Ready for captain review and merge.
```

Run **`/review`** on the last slice if the captain asks for a standards check.
