# Repository Duplication Debt Reduction Architecture

## Context

The release pipeline currently reports repository-wide `jscpd` duplication above the enforced `3%` threshold when `check:dup` scans the whole `src` tree.

The latest measured state is:

- repository surface scanned by `check:dup`: `src`
- duplicated lines: `1824 / 43414`
- duplication ratio: `4.2%`

This is now a delivery risk because every new UI iteration inherits an advisory warning during release packaging.

## Problem Statement

The current duplication debt is not caused by one isolated copy-paste block. It comes from several high-symmetry UI clusters:

1. provider settings dialogs (`CodexReasoningDialog` / `GeminiThinkingDialog`)
2. diagram stage panels (`DiagramModulesPanel` / `DiagramFacadesPanel`)
3. diagram relation editors (`ModuleRelationEditor` / `FacadeRelationEditor`)
4. cross-surface helper pairs that still exist separately in PM and UI

There is also an operational mismatch:

- `scripts/check-architecture.sh` scans a narrower subset of the repository
- `npm run check:dup` scans the entire `src`
- `build-release.sh` uses the wider repository scan

That means pre-commit feedback and release feedback do not currently describe the same duplication surface.

## Reduction Target

The target of this phase is:

1. reduce repository-wide `jscpd` duplication below `3%`
2. preserve current diagram workflow behavior and user-surface contract
3. align the duplication gate so architecture checks and release checks evaluate the same source surface

## Approved Strategy

### 1. Remove the highest-value structural clones first

Prioritize shared abstractions where the duplicated logic is real structure, not incidental text:

- shared provider reasoning/thinking dialog shell
- shared diagram stage panel scaffold
- shared relation editor scaffold
- shared PM/UI helper extraction where both surfaces intentionally use the same logic

### 2. Do not hide the debt with ignore rules

The phase must not solve the problem by:

- raising the `jscpd` threshold
- excluding new high-value UI folders from the scan
- converting runtime code into template strings just to fool the detector

### 3. Keep product behavior stable

Refactors in this phase are implementation-only unless explicitly noted otherwise:

- `Artifacts / Source / Help` contract must remain unchanged
- diagram stages must stay diagram-first
- manual node movement persistence must remain intact
- settings screens must keep the same visible behavior

### 4. Measure after each structural extraction

After every major clone reduction:

- run repository-wide `jscpd` on `src`
- verify the touched package/client builds
- only continue to the next extraction if duplication is still above target

## Candidate Refactor Units

### A. Shared provider option dialog shell

Extract a reusable dialog for provider-specific selectable reasoning/thinking levels.

Expected sources:

- `codex-reasoning-dialog.tsx`
- `gemini-thinking-dialog.tsx`
- new shared settings dialog shell

### B. Shared diagram stage panel scaffold

Extract the common diagram-stage frame:

- loading / error / pending handling
- visual-surface intro copy
- shared `DiagramEditorShell` mounting
- shared conflict warning section

Expected sources:

- `diagram-modules-panel.tsx`
- `diagram-facades-panel.tsx`
- new shared diagram stage scaffold

### C. Shared relation editor scaffold

Extract the shared relation editing flow:

- selected relation state
- draft loading/reset
- add/update/delete buttons
- shared field chrome

Expected sources:

- `module-relation-editor.tsx`
- `facade-relation-editor.tsx`
- new shared relation editor scaffold

### D. Shared helper extraction

If duplication still remains above threshold after A-C:

- extract `dialog-segment-meta` helpers into a shared client module
- then reevaluate before touching any lower-value clones

## Gate Alignment

Once repository-wide duplication is back under `3%`, align the duplication gate definitions so:

- `scripts/check-architecture.sh`
- `npm run check:dup`
- `scripts/build-release.sh`

all rely on the same effective scan surface.

## Exit Criteria

This phase is complete only when all of the following are true:

1. `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"` passes
2. the touched UI and PM builds still pass
3. release packaging no longer reports repository-wide duplication as advisory debt
4. planning docs, `todo-plan.md`, and the session report document the exact structural reductions that removed the debt
