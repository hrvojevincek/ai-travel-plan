# Matt Pocock Skills for Cursor

This repository has been configured with Matt Pocock's engineering skills for AI coding agents. These skills provide structured workflows for common engineering tasks like TDD, debugging, architecture improvement, and more.

## What are Matt Pocock Skills?

Matt Pocock's skills are a collection of engineering workflow procedures that help AI agents (like Cursor) follow professional engineering discipline. They're designed to help agents build better code by enforcing best practices like test-driven development, architectural design, and systematic debugging.

## Installed Skills

All 36 skills from the `mattpocock/skills` repository have been installed in `.agents/skills/`. The skills are organized into categories:

### Core Engineering Skills

These are the most important skills for day-to-day development:

- **`ask-matt`** - A router that helps you find the right skill for your situation
- **`tdd`** - Test-driven development with red-green-refactor cycles
- **`diagnosing-bugs`** - Systematic debugging workflow: reproduce → minimize → hypothesize → instrument → fix → test
- **`codebase-design`** - Vocabulary and patterns for designing deep modules with clean interfaces
- **`domain-modeling`** - Build and maintain project glossaries, `CONTEXT.md`, and ADRs
- **`improve-codebase-architecture`** - Scan codebase for architectural improvements

### Planning & Design

- **`grill-me`** - Adversarial interview to sharpen ideas (stateless, for non-codebase work)
- **`grill-with-docs`** - Same as `grill-me` but creates `CONTEXT.md` and ADRs
- **`prototype`** - Create throwaway prototypes to answer design questions
- **`to-prd`** - Turn conversation threads into proper PRDs
- **`to-issues`** - Break PRDs into vertical-slice issues

### Workflow Management

- **`triage`** - Move issues through a triage state machine
- **`implement`** - Execute on a single issue with full context
- **`handoff`** - Bridge context between agent sessions
- **`setup-matt-pocock-skills`** - One-time repo configuration (run this first!)

### Additional Skills

- **`teach`** - Learn concepts over multiple sessions
- **`writing-great-skills`** - Reference for writing custom skills
- **`resolving-merge-conflicts`** - Structured merge/rebase workflow
- And many more specialized skills...

## How to Use These Skills

### First Time Setup

Before using the engineering skills, run the setup:

```
/setup-matt-pocock-skills
```

This will configure:
- Issue tracker integration (GitHub/GitLab/local markdown)
- Triage label vocabulary
- Domain documentation layout

### Recommended Workflow

For new features or significant changes:

1. **Start with grilling**: `/grill-with-docs` to sharpen your idea
2. **For complex work**: `/to-prd` → `/to-issues` to break it down
3. **Build with TDD**: Use `/tdd` to implement features test-first
4. **Debug systematically**: Use `/diagnosing-bugs` for hard bugs
5. **Maintain architecture**: Run `/improve-codebase-architecture` periodically

### Quick Reference

- Need help choosing a skill? → `/ask-matt`
- Starting a feature? → `/grill-with-docs`
- Writing code? → `/tdd`
- Debugging? → `/diagnosing-bugs`
- Improving architecture? → `/improve-codebase-architecture`

## The Main Development Flow

```
Idea → /grill-with-docs → (optional: /to-prd → /to-issues) → /implement with /tdd → Ship
```

For multi-session work:
- Use `/handoff` to bridge between sessions
- Use `/prototype` for throwaway code to answer design questions

## Benefits for Your Voyago App

These skills will help you:

1. **Write better TypeScript** - TDD workflow ensures type safety and testability
2. **Maintain clean architecture** - Regular architecture scans catch technical debt early
3. **Document decisions** - ADRs and CONTEXT.md keep knowledge in the codebase
4. **Debug faster** - Systematic debugging loops find root causes efficiently
5. **Scale development** - Break work into agent-ready vertical slices

## Learn More

- GitHub Repository: https://github.com/mattpocock/skills
- Skills are stored in: `.agents/skills/`
- Skills lock file: `skills-lock.json`

## Updating Skills

To update to the latest version:

```bash
npx skills@latest update
```

To add additional skills:

```bash
npx skills@latest add <skill-name>
```
