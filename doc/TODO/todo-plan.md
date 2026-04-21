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
1. [TODO] `git rm -r packages/Codex_Module/`, убрать entry `packages/Codex_Module` из `knip.json` workspaces, убрать `packages/Codex_Module/**` из `.vscodeignore`, запустить `npm install` для регенерации `package-lock.json`.
2. [TODO] Git Commit: `chore: remove legacy Codex SDK module` (hash: TBD)

### Stream B: SSOT doc updates (module + architecture + facade diagram)
3. [TODO] Обновить `doc/SolidWorks-WorkFlow/Modules/Codex.md` (3 места: legacy bullet строка 14, stable-artifact-name строка 18, release-packaging bullet строка 71) — убрать fallback формулировку, зафиксировать app-server как canonical single implementation с сохранением stable artifact name.
4. [TODO] Обновить `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §4 provider-modules bullet (строка 173): упростить до `packages/Claude_Module/`, `packages/Codex_AppServer_Module/`, `packages/Gemini_Module/`.
5. [TODO] Обновить `doc/SolidWorks-WorkFlow/Contracts/Formal_Module_Cluster_Facade_Architecture.md` строка 428: в mermaid-диаграмме заменить `Codex_Module` на `Codex_AppServer_Module`.
6. [TODO] Git Commit: `docs: retire legacy Codex module from canonical SSOT` (hash: TBD)

### Stream C: Contract SSOT path updates
7. [TODO] Обновить `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md` строка 107: путь `packages/Codex_Module/src/sdk/codex-sdk-manager.ts` заменить на app-server эквивалент; verify invariant по-прежнему применим.
8. [TODO] Обновить `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md` строка 139: путь `packages/Codex_Module/src/messaging/codex-applied-turn-config.ts` заменить на app-server эквивалент.
9. [TODO] Git Commit: `docs: retarget codex contract references at app-server module` (hash: TBD)

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
