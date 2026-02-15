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
1. [DONE] Docs: зафиксировать формат `dialogId` и правила миграции/обратной совместимости (scope: `doc/SolidWorks-Flow/Architecture/Dialogs_And_Continuity_Routing_Refactor.md`; expected commit message: `docs(flow): dialogId naming contract`)
2. [DONE] Git Commit: `docs(flow): dialogId naming contract` (hash: 8c27a8b6)

### Stream: Core — генерация/нормализация `dialogId`
1. [DONE] Implement: генератор `dialogId` (provider + uuid + role) + применение для flow‑сессий (continuity root) (scope: `packages/core/src/session-continuity/dialog-id.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `feat(core): human-readable dialogId for flow sessions`)
2. [DONE] Git Commit: `feat(core): human-readable dialogId for flow sessions` (hash: 7f2fd026)

### Stream: Core — убрать «шумные» пустые unified-session JSONL
1. [DONE] Fix: не создавать пустые `*.jsonl` (≈136 байт) с одним `session-open`, пока не пришло первое реальное сообщение (scope: `packages/core/src/unified-session/storage.ts`; expected commit message: `fix(core): lazy init unified-session writer`)
2. [DONE] Git Commit: `fix(core): lazy init unified-session writer` (hash: d98152ef)

### Stream: Dialog — segment meta в `<dialogId>.jsonl` (replay-safe UI)
1. [DONE] Core: при старте нового provider‑сегмента (rollover) дописать marker+divider+meta в `<dialogId>.jsonl` **один раз** (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `feat(core): persist dialog segment meta in jsonl`)
2. [DONE] Git Commit: `feat(core): persist dialog segment meta in jsonl` (hash: 660f1d3f)
3. [DONE] UI: распознавать divider по marker в content, рендерить только label, и не инжектить implicit boundaries если в истории уже есть explicit divider (scope: `src/client/ui/src/session/dialog-panel-message-utils.ts`, `src/client/ui/src/session/dialog-panel.tsx`, `src/client/ui/src/session/virtual-conversation.tsx`; expected commit message: `feat(ui): render explicit dialog segment boundaries`)
4. [DONE] Git Commit: `feat(ui): render explicit dialog segment boundaries` (hash: be607adc)
5. [DONE] PM/UI: восстановление token summary `#1 (..%) | #2 (..%)` из boundary-meta при `dialog:history` + обновление в live по system‑сообщению (scope: `src/client/ui/src/session/session-view.tsx`, `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx`, `src/client/project-manager/components/sessions/dialog-segment-meta.ts`; expected commit message: `feat(pm): restore token summary from segment meta`)
6. [DONE] Git Commit: `feat(pm): restore token summary from segment meta` (hash: 9878a092)

### Stream: Core — миграция/alias для старых uuid-only dialogId
1. [TODO] Implement: обеспечить чтение/открытие старых диалогов (uuid-only) + мягкая миграция/alias в `continuity/index.json` и `chain.json` (scope: `packages/core/*` (≤3 файлов); expected commit message: `feat(core): dialogId alias for legacy ids`)
2. [TODO] Git Commit: `feat(core): dialogId alias for legacy ids` (hash: TBD)

### Stream: PM — отображение «человеческого имени»
1. [TODO] Implement: показать понятный label в UI (таб/заголовок) на базе `dialogId` (scope: `src/client/project-manager/*` (≤3 файлов); expected commit message: `feat(pm): display friendly dialog labels`)
2. [TODO] Git Commit: `feat(pm): display friendly dialog labels` (hash: TBD)

---

## Phase 184 — Release Build (New Patch Release) (owner: Codex, updated: 2026-02-15)

### Stream: Release Build (New Patch Release)
1. [DONE] Gates: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd ...`, `npm run check:links` + таргетные сборки `npm run build:core`, `npm run build:project-manager`, `npm run build:webview`, `npm run typecheck:webview` (scope: repo)
2. [DONE] Git Commit: `chore: quality gates before release` (hash: N/A — clean tree)
3. [DONE] Build: `./scripts/build-all.sh` (version bump -> `1.1.601`) (scope: repo)
4. [DONE] Git Commit: `chore(release): build-all for next patch` (hash: 24869a50)
5. [DONE] Build: `./scripts/build-release.sh --use-current-version` (VSIX) (scope: repo build)
6. [DONE] Docs: обновить этот план статусами/датами/путями артефактов релиза (scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record patch release build (1.1.601)`)
   - VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.601.vsix`
   - Tarballs (release cache): `/Users/oleksandroliinyk/.codeai-hub/releases/*-1.1.601.tar.bz2`
   - Tarballs (repo copy): `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/releases/*-1.1.601.tar.bz2`
7. [TODO] Git Commit: `docs(todo): record patch release build (1.1.601)` (hash: TBD)
