# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/LegacyCodexModule_Removal_Architecture.md`
- **Read this context before implementation:**
  - `packages/Codex_Module/` (legacy, удаляется целиком)
  - `packages/Codex_AppServer_Module/package.json` (canonical version source для Codex line)
  - `packages/core/src/provider-registry/provider-module-loader.ts`
  - `packages/core/src/provider-registry/provider-installer-paths.ts`
  - `knip.json` (workspaces entry)
  - `.vscodeignore`
  - `package-lock.json`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (§4 provider modules list)
  - `doc/SolidWorks-WorkFlow/Contracts/Formal_Module_Cluster_Facade_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача ≤ 3 файлов, после каждой — отдельный `Git Commit: ...`.
- Husky hooks (pre-commit / pre-push) прогоняют архитектуру, lint, knip, format, dup и link checks.
- Package deletion выполняется как `git rm -r` + правка `knip.json` в том же commit'е; `npm install` регенерирует `package-lock.json` до commit'а.
- Таргетные сборки только для затронутых пакетов и только перед закрытием Phase (в Stream E это `./scripts/build-all.sh`).
- Не трогать `CHANGELOG.md` / `doc/TODO/Archive/` / `doc/SolidWorks-WorkFlow/Plans/Archive/` / `doc/Sessions/` / `doc/BugRegistry.md` — historical audit trail.

## Phase 1 — Legacy Codex Module Removal (owner: CodeAI Hub Bot, updated: 2026-04-21)

### Stream A: Remove legacy package
1. [DONE] `git rm -r packages/Codex_Module/`, убрать entry `packages/Codex_Module` из `knip.json` workspaces, убрать `packages/Codex_Module/**` из `.vscodeignore`, `rm package-lock.json && npm install` для полной перегенерации lockfile без extraneous записей.
2. [DONE] Git Commit: `chore: remove legacy Codex SDK module` (hash: 05b702072)

### Stream B: SSOT doc updates (module + architecture + facade diagram)
3. [DONE] Обновлён `doc/SolidWorks-WorkFlow/Modules/Codex.md`: legacy fallback bullet удалён, раздел `Внешний контракт` переписан под app-server as canonical, release packaging bullet обновлён.
4. [DONE] Обновлён `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §4 provider-modules bullet.
5. [DONE] Обновлён `doc/SolidWorks-WorkFlow/Contracts/Formal_Module_Cluster_Facade_Architecture.md` mermaid-диаграмма.
6. [DONE] Git Commit: `docs: retire legacy Codex module from canonical SSOT` (hash: 4c7d30310)

### Stream C: Contract SSOT path updates
7. [DONE] Обновлён `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`: путь перенаправлен на `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts`.
8. [DONE] Обновлён `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`: путь перенаправлен на app-server facade с явным упоминанием `CODEX_APPLIED_TURN_CONFIG_KEY`.
9. [DONE] Git Commit: `docs: retarget codex contract references at app-server module` (hash: 0604b445c)

## Phase 2 — Release 1.2.38 (owner: CodeAI Hub Bot, updated: 2026-04-21)

### Stream D: Release prep
10. [TODO] Обновить `README.md` (`## Current Release — v1.2.38` + summary) и `CHANGELOG.md` (секция `## [1.2.38] - 2026-04-21` с Removed / Docs) — scope: `README.md`, `CHANGELOG.md`.
11. [TODO] Git Commit: `docs: prepare legacy codex module removal release notes (1.2.38)` (hash: TBD)

### Stream E: Build
12. [TODO] Run `./scripts/build-all.sh` (version bumps до 1.2.38 + tarballs в `doc/tmp/releases/`).
13. [TODO] Git Commit: `build: release 1.2.38` (hash: TBD)
14. [TODO] Run `./scripts/build-release.sh --use-current-version` → produces `codeai-hub-1.2.38.vsix`.

### Stream F: Cycle closeout
15. [TODO] Archive planning-doc → `doc/SolidWorks-WorkFlow/Plans/Archive/LegacyCodexModule_Removal_Architecture.md`; archive todo-plan → `doc/TODO/Archive/todo-plan-phase3-legacy-codex-module-removal.md`; update `doc/SolidWorks-WorkFlow/Docs_Index.md`; recreate empty `doc/TODO/todo-plan.md` stub.
16. [TODO] Git Commit: `docs: archive legacy codex module removal cycle (1.2.38)` (hash: TBD)
17. [TODO] Create `doc/Sessions/Session075.md` (completion report, type A).
