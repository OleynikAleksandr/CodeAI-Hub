# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/DiagramModules_TwoColumnModuleTable_Cleanup_Architecture.md`
- **Read this context before implementation:**
  - `packages/agents/diagram-modules-agent/assets/product-part-template.md`
  - `packages/agents/diagram-modules-agent/assets/diagram-modules-field-reference.md`
  - `src/client/project-manager/components/diagram-editor/diagram-modules-staged-part-parser.ts`
  - `src/client/project-manager/components/diagram-editor/diagram-modules-staged-part-parser-shared.ts`
  - `src/client/project-manager/components/diagram-editor/diagram-modules-staged-part-parser.test.ts`
  - `packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts`
  - `packages/core/src/remote-bridge/handlers/development-tree-snapshot.test.ts`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (§6.3, §6.4)
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача ≤ 3 файлов, после каждой — отдельный `Git Commit: ...`.
- Husky hooks (pre-commit / pre-push) прогоняют архитектуру, lint, knip, format, dup и link checks.
- Таргетные сборки только для затронутых пакетов и только перед закрытием Stream/Phase.
- Артефакты не регенерируем: production workspace уже в 2-колоночном формате, правим только чтение.

## Phase 1 — Parser Cleanup (owner: CodeAI Hub Bot, updated: 2026-04-21)

### Stream A: Browser staged-part parser
1. [TODO] Align browser parser regex and shared helper with 2-column contract — scope: `diagram-modules-staged-part-parser.ts`, `diagram-modules-staged-part-parser-shared.ts`.
2. [TODO] Git Commit: `fix: align diagram staged part parser with two-column module table contract` (hash: TBD)
3. [TODO] Rewrite staged-part parser tests under 2-column contract — scope: `diagram-modules-staged-part-parser.test.ts`.
4. [TODO] Git Commit: `test: cover two-column module table contract in staged part parser` (hash: TBD)

### Stream B: Core development-tree-snapshot
5. [TODO] Update MODULE_ROW_RE and bound standalone-body by next `##` header — scope: `packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts`.
6. [TODO] Git Commit: `fix: align development tree snapshot with two-column module table contract` (hash: TBD)
7. [TODO] Refresh snapshot tests: 2-column fixture and Simple Relations isolation regression — scope: `packages/core/src/remote-bridge/handlers/development-tree-snapshot.test.ts`.
8. [TODO] Git Commit: `test: cover two-column module table and relations isolation in development tree snapshot` (hash: TBD)

### Stream C: SSOT sync
9. [TODO] Add 2-column module table tolerance note to SystemArchitecture §6.4 — scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`.
10. [TODO] Git Commit: `docs: align diagram modules parser contract with two-column module table` (hash: TBD)

## Phase 2 — Release 1.2.37 (owner: CodeAI Hub Bot, updated: 2026-04-21)

### Stream D: Release prep
11. [TODO] Update `README.md` and `CHANGELOG.md` with target version 1.2.37 (diagram two-column cleanup closeout) — scope: `README.md`, `CHANGELOG.md`.
12. [TODO] Git Commit: `docs: prepare diagram two-column cleanup release notes (1.2.37)` (hash: TBD)

### Stream E: Build
13. [TODO] Run `./scripts/build-all.sh` (version bump commits land here).
14. [TODO] Run `./scripts/build-release.sh --use-current-version` (produces `codeai-hub-1.2.37.vsix`).

### Stream F: Cycle closeout
15. [TODO] Archive planning-doc → `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramModules_TwoColumnModuleTable_Cleanup_Architecture.md`; archive todo-plan → `doc/TODO/Archive/todo-plan-phase2-diagram-two-column-cleanup.md`; update `doc/SolidWorks-WorkFlow/Docs_Index.md`.
16. [TODO] Git Commit: `docs: archive diagram two-column cleanup cycle (1.2.37)` (hash: TBD)
17. [TODO] Create `doc/Sessions/Session074.md` (completion report, type A).
