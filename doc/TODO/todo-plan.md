# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules)
- TODO Plan состоит из Phase (Фаз). В каждой Phase — Stream (стримы) с микро‑задачами.
- Каждая микро‑задача затрагивает **≤ 3 файлов** (или пакетов).
- Каждая микро‑задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро‑задачи прогоняем гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка затронутого пакета/клиента.
- После зелёных гейтов: Git Commit + немедленный апдейт статусов/хешей в этом файле.

Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.

Source of Truth (архитектура):
- `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`

---

## Phase 183 — Осмысленные `dialogId` (имена файлов/папок) (owner: Codex+Oleksandr, updated: 2026-02-15)

**Goal:**
- `~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<dialogId>.jsonl` получает человекочитаемое имя, включающее:
  - префикс провайдера (например `codex`, `claude`, `gemini` или `codexCli`, если решим оставить providerId),
  - стабильный уникальный идентификатор (uuid),
  - суффикс роли агента (`reviewer` / `collector`, и т.п.).
- Папки continuity становятся осмысленными (по `dialogId`), чтобы пользователь мог понять «что где».

### Stream: Design/Contracts (именование и миграция)
1. [TODO] Docs: зафиксировать формат `dialogId` и правила миграции/обратной совместимости (scope: `doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`; expected commit message: `docs(flow): dialogId naming contract`)
2. [TODO] Git Commit: `docs(flow): dialogId naming contract` (hash: TBD)

### Stream: Core — генерация/нормализация `dialogId`
1. [TODO] Implement: единый генератор/нормализатор `dialogId` (provider + uuid + role) и точка применения при создании/резюме диалога (scope: `packages/core/*` (≤3 файлов); expected commit message: `feat(core): human-readable dialogId format`)
2. [TODO] Git Commit: `feat(core): human-readable dialogId format` (hash: TBD)

### Stream: Core — метаданные сегментов в `<dialogId>.jsonl` (replay-safe UI)
1. [TODO] Implement: при старте нового provider-сегмента (rollover) Core дописывает в `<dialogId>.jsonl` разделитель сегмента + одноразовые метаданные для `#1 (..%) | #2 (..%)`; UI восстанавливает divider и token summary при `dialog:history` (scope: `packages/core/*`, `src/client/ui/*`, `src/client/project-manager/*` (разбить на микрозадачи ≤3 файлов); expected commit message: `feat(dialog): persist segment meta in dialog jsonl`)
2. [TODO] Git Commit: `feat(dialog): persist segment meta in dialog jsonl` (hash: TBD)

### Stream: Core — миграция/alias для старых uuid-only dialogId
1. [TODO] Implement: обеспечить чтение/открытие старых диалогов (uuid-only) + мягкая миграция/alias в `continuity/index.json` и `chain.json` (scope: `packages/core/*` (≤3 файлов); expected commit message: `feat(core): dialogId alias for legacy ids`)
2. [TODO] Git Commit: `feat(core): dialogId alias for legacy ids` (hash: TBD)

### Stream: PM — отображение «человеческого имени»
1. [TODO] Implement: показать понятный label в UI (таб/заголовок) на базе `dialogId` (scope: `src/client/project-manager/*` (≤3 файлов); expected commit message: `feat(pm): display friendly dialog labels`)
2. [TODO] Git Commit: `feat(pm): display friendly dialog labels` (hash: TBD)

---

## Phase 184 — Release Build (New Patch Release) (owner: Codex, updated: 2026-02-15)

### Stream: Release Build (New Patch Release)
1. [TODO] Gates: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd ...`, `npm run check:links` + таргетные сборки затронутых пакетов (scope: repo; expected commit message: `chore: quality gates before release`)
2. [TODO] Git Commit: `chore: quality gates before release` (hash: TBD)
3. [TODO] Build: `./scripts/build-all.sh` (version bump) (scope: repo; expected commit message: `chore(release): build-all for next patch`)
4. [TODO] Git Commit: `chore(release): build-all for next patch` (hash: TBD)
5. [TODO] Build: `./scripts/build-release.sh --use-current-version` (VSIX) (scope: repo build)
6. [TODO] Docs: обновить этот план статусами/датами/путями артефактов релиза (scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record patch release build`)
7. [TODO] Git Commit: `docs(todo): record patch release build` (hash: TBD)
