<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Voyago

Next.js **16.3.1** App Router (`src/app`). Do not use Pages Router APIs (`pages/`, `getServerSideProps`, `getStaticProps`).

## Next.js docs (source of truth)

1. **Bundled (matches this install):** `node_modules/next/dist/docs/`
2. **Network index:** https://nextjs.org/docs/llms.txt — append `.md` to any docs URL
3. **Runtime:** `next-devtools` MCP after `pnpm dev` (`.mcp.json` / `.cursor/mcp.json`)

Cache Components (`cacheComponents: true`) is **not** enabled. Use the previous caching model until that migration is done: `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`.

## Agent skills

### Issue tracker

GitHub Issues on `hrvojevincek/ai-travel-plan` via gh-axi. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles mapped to GitHub labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.

### Two-stage pipeline

Discovery → `docs/tasks/feature-<slug>/` → autonomous builder with no-mistakes. See `docs/agents/pipeline.md`.

| Stage | Skill | Trigger |
|-------|-------|---------|
| 1 Discovery | `discovery-pipeline` | "Discovery", "New Feature" |
| 2 Builder | `builder-pipeline` | "Start Building", "Run Execution Plan" |
