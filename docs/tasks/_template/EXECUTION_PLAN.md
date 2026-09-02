# Execution Plan: <Feature Name>

Parent issue: #_
Feature dir: docs/tasks/<slug>/

## Slices

Vertical slices only. Each slice = one PR = one tracer bullet through all layers.

- [ ] **Slice 1: <observable behavior>**
  - Issue: #_
  - Acceptance: `pnpm test:run src/test/<file>.test.ts` passes; <behavior description>
  - Blocked by: none

- [ ] **Slice 2: <observable behavior>**
  - Issue: #_
  - Acceptance: ...
  - Blocked by: Slice 1

## Executor

<!-- cursor | gnhf | firstmate — set when Stage 2 starts -->

Default: `cursor` (builder-pipeline in Cursor)

## Notes

<!-- Decisions from discovery that a builder agent needs but aren't in the issues -->
