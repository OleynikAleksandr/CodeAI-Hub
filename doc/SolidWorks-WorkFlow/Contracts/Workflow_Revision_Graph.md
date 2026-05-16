# Workflow Revision Graph

**Status:** Active future contract; partially implemented in current runtime
**Created:** 2026-05-07
**Updated:** 2026-05-16
**Owner:** Oleksandr + Codex

## 1. Purpose

Managed workflow progress must be revision-based, not memory-based. Current runtime implements the foundation for this contract through stable Diagram Modules ids, content revision hashing for diagram DSL/parser projections, review revision task numbering in managed stage plans, and technical-stage dirty-gate classification for future revision snapshot paths. Full revision snapshot writing and downstream migration planning remain future scope.

Canonical chain:

```text
diagramRevision N
  -> skeletonRevision N
  -> qualityGatesRevision N
  -> developmentTreeRevision N
```

Each accepted revision must be recoverable from tracked workspace state, not from provider chat memory. Until full revision snapshots are implemented, the active recovery truth is the committed stage artifacts, managed stage plans, Git history, and Core parser/validator outputs.

## 2. Stable Identity

`Diagram Modules` artifacts must preserve stable ids for:

- Product Part;
- Cluster;
- Module;
- Facade boundary.

Display names, descriptions, ordering, and paths may change. Stable ids are the basis for diffing, migration planning, and avoiding accidental delete+add churn.

## 3. Revision Storage

Target storage for future revision snapshots is tracked `.codeai-hub/<workspaceSlug>/workflow/revisions/`:

```text
.codeai-hub/workflow/revisions/
  diagram-modules/
  application-skeleton/
  quality-gates/
```

Current code already reserves these paths in technical-stage dirty-gate classification, but does not yet write full snapshot objects there. Future snapshots should include schema version, source artifact paths, stable ids, content hash, timestamp, and parent revision reference.

## 4. Diff Classes

When a user changes `Diagram Modules`, future Core migration planning will classify the new revision against the previous accepted one:

- `added`: create downstream tasks for new ids;
- `changed`: create refactor tasks for affected contracts, skeleton paths, gates, and drafts;
- `removed`: create removal/deprecation tasks and orphan checks;
- `renamed`: preserve identity when stable id is unchanged;
- `moved`: preserve identity when ownership/path changes but stable id is unchanged.

Core must not silently mutate downstream application files based only on a semantic diff.

## 5. Migration Tasks

Future diff output becomes plan work:

- deterministic lifecycle repair can be auto-applied by Core;
- semantic changes become explicit `todo-plan.md` streams;
- each generated stream must respect the micro-task rule of no more than 3 files per task;
- each implementation task must be paired with a separate `Git Commit: ...` item.

The migration planner prepares work. Agents and the user make semantic decisions.
