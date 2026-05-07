# Workflow Revision Graph

**Status:** Active contract
**Created:** 2026-05-07
**Owner:** Oleksandr + Codex

## 1. Purpose

After managed mode starts, workflow progress is revision-based, not memory-based.

Canonical chain:

```text
diagramRevision N
  -> skeletonRevision N
  -> qualityGatesRevision N
  -> developmentTreeRevision N
```

Each accepted revision must be recoverable from tracked workspace state, not from provider chat memory.

## 2. Stable Identity

`Diagram Modules` artifacts must preserve stable ids for:

- Product Part;
- Cluster;
- Module;
- Facade boundary.

Display names, descriptions, ordering, and paths may change. Stable ids are the basis for diffing, migration planning, and avoiding accidental delete+add churn.

## 3. Revision Storage

Core stores revision snapshots under tracked `.codeai-hub/workflow/revisions/`:

```text
.codeai-hub/workflow/revisions/
  diagram-modules/
  application-skeleton/
  quality-gates/
```

Snapshots should include schema version, source artifact paths, stable ids, content hash, timestamp, and parent revision reference.

## 4. Diff Classes

When a user changes `Diagram Modules`, Core classifies the new revision against the previous accepted one:

- `added`: create downstream tasks for new ids;
- `changed`: create refactor tasks for affected contracts, skeleton paths, gates, and drafts;
- `removed`: create removal/deprecation tasks and orphan checks;
- `renamed`: preserve identity when stable id is unchanged;
- `moved`: preserve identity when ownership/path changes but stable id is unchanged.

Core must not silently mutate downstream application files based only on a semantic diff.

## 5. Migration Tasks

Diff output becomes plan work:

- deterministic lifecycle repair can be auto-applied by Core;
- semantic changes become explicit `todo-plan.md` streams;
- each generated stream must respect the micro-task rule of no more than 3 files per task;
- each implementation task must be paired with a separate `Git Commit: ...` item.

The migration planner prepares work. Agents and the user make semantic decisions.
