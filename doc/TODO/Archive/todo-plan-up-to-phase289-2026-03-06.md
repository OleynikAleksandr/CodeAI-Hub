# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/Sessions/Session062.md`
  - `doc/Sessions/Session063.md` (после создания)
- TODO Plan состоит из Phase/Stream; каждая подзадача затрагивает не более 3 файлов или пакетов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещён).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.

---

## Phase 289 — Codex general model: GPT-5.4 rollout (owner: Oleksandr, updated: 2026-03-05)

### Stream 0: Shared registry + UI settings compatibility
1. [DONE] Заменить `gpt-5.2` на `gpt-5.4` в shared Codex model registry и UI/extension normalization, сохранив мягкую совместимость для legacy settings (`gpt-5.2 -> gpt-5.4`) (scope: `src/types/codex-model-registry.ts`, `src/extension-module/settings/codex-settings.ts`, `src/client/ui/src/components/settings/settings-state-model.ts`; actual commit: `feat(codex): expose gpt-5.4 general model`).
2. [DONE] Git Commit: `feat(codex): expose gpt-5.4 general model` (hash: `b78d78a8`)

### Stream 1: Runtime compatibility + stale env hotfix
1. [DONE] Обновить Core/Codex runtime compatibility: legacy `gpt-5.2` из settings/env нормализуется в `gpt-5.4`, удалён stale SDK override, SSOT Codex закрепляет `settings.json` как источник правды над stale boot env для model/reasoning (scope: `packages/core/src/config/index.ts`, `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`, `packages/Codex_Module/src/sdk/codex-sdk-manager.ts`, `packages/Codex_Module/src/sdk/codex-sdk-patches.ts`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`; actual commit: `fix(codex): honor gpt-5.4 settings across runtime`).
2. [DONE] Git Commit: `fix(codex): honor gpt-5.4 settings across runtime` (hash: `93d75291`)

### Stream 2: Release build v1.1.714
1. [DONE] Прогнать таргетные сборки и релизный цикл (`build:webview`, `build @codeai-hub/codex-module`, `build @codeai-hub/core`, `build-all`, `build-release`), затем принять version bump/manifest/media updates до `v1.1.714` (scope: `media/react-chat.js`, release manifests, workspace `package.json`; actual commit: `chore(release): build-all v1.1.714`).
2. [DONE] Git Commit: `chore(release): build-all v1.1.714` (hash: `81c9928e`)

### Stream 3: Release docs + session log
1. [DONE] Синхронизировать `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session063.md` и архив предыдущего плана под финальный hotfix `v1.1.714` (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session063.md`, `doc/TODO/Archive/todo-plan-up-to-phase288-2026-03-05.md`; expected commit: `docs(release): sync v1.1.714 codex notes`).
2. [DONE] Git Commit: `docs(release): sync v1.1.714 codex notes` (hash: `a84c7dfa`)
