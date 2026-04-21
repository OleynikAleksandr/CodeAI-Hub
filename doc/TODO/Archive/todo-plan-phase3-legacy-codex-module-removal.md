# План разработки (Development TODO Plan)

**Execution Scope Status:** COMPLETED (archived 2026-04-21, release 1.2.38)

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
10. [DONE] Обновлены `README.md` и `CHANGELOG.md` с целевой версией 1.2.38 (Removed / Unchanged / Docs секции).
11. [DONE] Git Commit: `docs: prepare legacy codex module removal release notes (1.2.38)` (hash: 72af7cd3f)

### Stream E: Build
12. [DONE] `./scripts/build-all.sh` отработал чисто, version bumps до 1.2.38 + tarballs в `doc/tmp/releases/`.
13. [DONE] Git Commit: `build: release 1.2.38` (hash: 59db47521)
14. [DONE] `./scripts/build-release.sh --use-current-version` → `codeai-hub-1.2.38.vsix` (~2.37 MB).
15. [DONE] Follow-up cleanup в `scripts/build-release.sh`: удалена auto-append логика для legacy `Codex_Module/**` и `@codeai-hub/codex-module` в .vscodeignore.
16. [DONE] Git Commit: `build: stop auto-appending legacy Codex_Module to .vscodeignore` (hash: 0c8de64b3)

### Stream F: Cycle closeout
17. [IN_PROGRESS] Archive planning-doc + todo-plan, update `doc/SolidWorks-WorkFlow/Docs_Index.md`, recreate empty `doc/TODO/todo-plan.md` stub.
18. [TODO] Git Commit: `docs: archive legacy codex module removal cycle (1.2.38)` (hash: TBD)
19. [TODO] Create `doc/Sessions/Session075.md` (completion report, type A).
