# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Codex_GPT55_Model_Addition.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Codex_GPT55_Model_Addition.md`
  - `doc/SolidWorks-WorkFlow/Plans/Codex_Instruction_Stack_StepByStep_Flag_Tests.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стримов), в каждом Stream — микрозадачи.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Если по факту разработки конкретная подзадача Stream затрагивает больше 3 файлов, задача должна быть разбита на более мелкие и список задач в Stream переписывается.
- **Gates (автоматически через Husky hooks):**
  - `git commit` -> `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` -> `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- Ручной прогон этих команд обычно не нужен, кроме диагностики.
- После добавления модели обязателен новый релизный пакет для пользовательского retest.
- После пользовательского retest Codex анализирует свежие `.jsonl` / `.md` native capture логи и сравнивает `gpt-5.5` provider base/system instructions с уже снятыми `gpt-5.3-codex` и `gpt-5.4`.
- **Commit**: после зеленых gates — Git Commit с максимально релевантным описанием; `todo-plan.md` обновляется сразу после коммита с hash/status.
- Stream закрывается только после проверки лога пользователем и решения по дальнейшей стратегии compact Codex base instructions.
- Phase закрывается на чистом дереве и с актуальным `doc/Sessions/SessionXXX.md`.

## Phase 0 — GPT-5.5 Planning Bootstrap (owner: Codex, updated: 2026-04-25)

### Stream: Planning And Recovery Context

1. [DONE] Create planning doc and active TODO plan for the GPT-5.5 Codex model addition — scope: `doc/SolidWorks-WorkFlow/Plans/Codex_GPT55_Model_Addition.md`, `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; commit message: `docs: plan codex gpt 5.5 model addition`
2. [DONE] Git Commit: `docs: plan codex gpt 5.5 model addition` (hash: `618d40984`)

## Phase 1 — Codex GPT-5.5 Model Surface (owner: Codex, updated: 2026-04-25)

### Stream: Registry And Core Defaults

1. [DONE] Add `gpt-5.5` to the shared Codex settings model registry and Core settings/default snapshots — source scope: `src/types/codex-model-registry.ts`, `packages/core/src/config/provider-defaults-resolver.ts`, `packages/core/src/remote-bridge/handlers/settings-persistence-snapshot.ts`; generated bundle: `media/react-chat.js`; verification: `npm run build --workspace=@codeai-hub/core`, `npm run build:webview`, `npm run typecheck:webview`; commit message: `feat: add codex gpt 5.5 model option`
2. [DONE] Git Commit: `feat: add codex gpt 5.5 model option` (hash: `741c9544c`)

## Phase 2 — GPT-5.5 Capture Release (owner: Codex, updated: 2026-04-25)

### Stream: Release Package For User Retest

1. [DONE] Prepare release notes for the next version with the new GPT-5.5 Codex model option — scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; commit message: `docs: prepare codex gpt 5.5 release notes`
2. [TODO] Git Commit: `docs: prepare codex gpt 5.5 release notes` (hash: TBD)
3. [TODO] Build a new release package and stop for user retest — scope: release-generated version files, `doc/TODO/todo-plan.md`; artifacts: next `codeai-hub-<version>.vsix` and tarballs under `doc/tmp/releases/`; verification: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`; commit message: `chore: build codex gpt 5.5 capture release`
4. [TODO] Git Commit: `chore: build codex gpt 5.5 capture release` (hash: TBD)

## Phase 3 — GPT-5.5 Prompt Inventory (owner: Codex, updated: 2026-04-25)

### Stream: User Capture Analysis

1. [TODO] Analyze user-provided GPT-5.5 native capture logs and compare provider base/system instructions with `gpt-5.3-codex` and `gpt-5.4` — scope: `doc/SolidWorks-WorkFlow/Plans/Codex_GPT55_Model_Addition.md`, `doc/TODO/todo-plan.md`; commit message: `docs: record codex gpt 5.5 prompt inventory`
2. [TODO] Git Commit: `docs: record codex gpt 5.5 prompt inventory` (hash: TBD)
