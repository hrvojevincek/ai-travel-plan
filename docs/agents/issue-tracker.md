# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues on `hrvojevincek/ai-travel-plan`. Prefer **gh-axi** over bare `gh` for all GitHub operations.

## Conventions

- **Create an issue**: `gh-axi issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh-axi issue view <number> --comments`
- **List issues**: `gh-axi issue list --state open --label ready-for-agent`
- **Comment on an issue**: `gh-axi issue comment <number> --body "..."`
- **Apply / remove labels**: `gh-axi issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh-axi issue close <number> --comment "..."`
- **Create PR**: `gh-axi pr create --title "..." --body "..."`

Infer the repo from `git remote -v` — gh/gh-axi do this automatically inside a clone.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## Pipeline artifacts

The two-stage agent pipeline stores local mirrors under `docs/tasks/feature-<slug>/`:

| File | Role |
|------|------|
| `PRD.md` | Human-readable product spec |
| `EXECUTION_PLAN.md` | Checklist of vertical slices for Stage 2 |
| `HANDOFF.md` | Optional session bridge to Firstmate / GNHF |

GitHub issues are the durable contract for each slice. `EXECUTION_PLAN.md` links to them by number.

## When a skill says "publish to the issue tracker"

Create a GitHub issue with `gh-axi issue create`.

## When a skill says "fetch the relevant ticket"

Run `gh-axi issue view <number> --comments`.
