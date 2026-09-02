# Workflow: Two-Stage Feature Pipeline

## Trigger

**Event:** Captain voices or types a new feature idea in Cursor Composer.

## Checkpoint

After Stage 1 (discovery), captain reviews `EXECUTION_PLAN.md` slice list and approves granularity before Stage 2 runs.

## Stages

### Stage 1 — Discovery (`discovery-pipeline`)

1. `/grilling` — one question at a time
2. `/domain-modeling` — CONTEXT.md + ADRs
3. Write `docs/tasks/feature-<slug>/PRD.md` + `EXECUTION_PLAN.md`
4. `/to-prd` → GitHub parent issue
5. `/to-issues` → GitHub slice issues
6. **Checkpoint:** captain approves plan

### Stage 2 — Build (`builder-pipeline`)

For each unchecked slice:

1. Branch `feature/<slug>-slice-<n>`
2. `/tdd` vertical tracer bullets
3. `pnpm lint` + `pnpm test:run`
4. Commit
5. `no-mistakes axi run --yes --intent "..."`
6. PR opens, checks green
7. Mark `[x]` in plan

## Alternate executors

| When | Use |
|------|-----|
| Large slice, captain sleeping | GNHF hands-off → no-mistakes |
| Parallel slices, supervision wanted | Firstmate ship tasks |
| Default | Cursor builder-pipeline |

## Push right

Defer the captain checkpoint until discovery is complete — maximal spec work before human review.

## Brief (checkpoint output)

When discovery finishes, present:

- Link to `EXECUTION_PLAN.md`
- Slice count and issue numbers
- Recommended executor (cursor / gnhf / firstmate)
- One-line: "Approve to start Stage 2?"

## Definition of done

All slices `[x]` in `EXECUTION_PLAN.md`, each with a green PR link recorded in the plan or issue comments.
