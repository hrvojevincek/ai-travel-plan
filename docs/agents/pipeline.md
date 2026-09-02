# Two-Stage Agent Pipeline

Discovery and execution are separate stages with a handoff artifact.

```
[ Voice / "Discovery" ]
         │
         ▼
  discovery-pipeline  →  docs/tasks/feature-<slug>/
                         ├── PRD.md
                         └── EXECUTION_PLAN.md
                         + GitHub issues (parent + slices)
         │
         ▼
  builder-pipeline    →  per-slice: TDD → no-mistakes --yes → PR
         │
         ▼ (optional)
  Firstmate fleet     →  GNHF crewmates for overnight / parallel slices
```

## Tool roles

| Tool | Stage | Responsibility |
|------|-------|----------------|
| **grilling**, **domain-modeling**, **to-prd**, **to-issues** | Discovery | Socratic spec + vertical slices |
| **tdd**, **review** | Execution | Tracer-bullet implementation |
| **no-mistakes** | Execution | Review, test, lint, push, PR, CI gate |
| **GNHF** | Execution (optional) | Iterative agent loop for large slices |
| **Firstmate** | Execution (optional) | Fleet orchestration, isolated worktrees, supervision |

## Autonomy contract

When Stage 2 is active (`builder-pipeline` or a Firstmate ship task referencing an execution plan):

- Commits, pushes, and PR creation are **pre-authorized** per slice — no per-slice captain approval.
- no-mistakes gates run with `--yes` (standing consent for auto-fix and ask-user resolution within slice scope).
- PR merge remains human unless Firstmate `yolo` is enabled on the project.
- Escalate to the captain only for: security/privacy/auth findings, scope invalidation, or unrecoverable gate failures after 3 retries.

## Verification commands (Voyago)

```bash
pnpm lint          # Biome
pnpm test:run      # Vitest (full suite)
pnpm test:run src/test/<file>.test.ts   # single file
pnpm build         # Next.js build (before large UI slices)
```

## Firstmate registration (one-time)

Register Voyago in your Firstmate home so fleet dispatch can run slices autonomously:

```bash
# From your Firstmate home (FM_HOME, typically ~/firstmate)
# Add voyago with no-mistakes-prod-only posture (product work → pipeline, internal tooling → direct-PR)
# See firstmate project-management skill for exact procedure.

cd projects/voyago   # after clone/add
no-mistakes init && no-mistakes doctor
```

Dispatch a slice to the fleet by giving Firstmate a ship brief that references:

- `docs/tasks/feature-<slug>/EXECUTION_PLAN.md` slice title
- Linked GitHub issue number
- Mode: `no-mistakes`, yolo: `off`
- Harness: `cursor` or GNHF-backed agent per project config

Firstmate spawns an isolated worktree, the crewmate implements + runs no-mistakes, and reports `done: PR <url> checks green`.

## GNHF registration

GNHF is an outer loop around a coding agent. Use it when a slice is too large for one Cursor session:

```bash
gnhf --help   # confirm CLI installed
gnhf \
  --agent cursor \
  --max-iterations 20 \
  --stop-when "pnpm test:run passes and acceptance criteria in issue #N are met" \
  --prevent-sleep on \
  "Implement slice N from docs/tasks/feature-<slug>/EXECUTION_PLAN.md. Follow /tdd vertical-slice discipline. Commit on branch feature/<slug>-slice-N. Do not merge."
```

After GNHF stops, run no-mistakes on the branch:

```bash
no-mistakes axi run --yes --intent "<slice objective from issue #N>"
```

## Trigger phrases

| Phrase | Stage |
|--------|-------|
| "Discovery", "New Feature", product ideation | Stage 1 |
| "Start Building", "Run Execution Plan", "Stage 2" | Stage 2 |
| "Fleet dispatch", "Firstmate", "GNHF overnight" | Stage 2 (alternate executor) |
