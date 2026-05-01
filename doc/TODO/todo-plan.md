# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/StatusPanel_ModelReasoningDecoupling_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (§3 Invariants 14, 26, 27)
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Claude_StatusPanel_ModelSwitch_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_StatusPanel_ModelSwitch_Architecture.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase. В каждой Phase некоторое количество Stream, в каждом Stream — микро-задачи ≤3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** запускаем перед закрытием Stream: `npm run build --workspace …` или `npm run build:project-manager` / `npm run typecheck:webview`.
- **Real-time documentation:** SSOT-документы синхронизируются ДО коммита.
- Phase завершается на чистом дереве: `./scripts/build-all.sh` → tarball-ы в `doc/tmp/releases/` → `./scripts/build-release.sh --use-current-version`.
- **doc/TODO/todo-plan.md обновляется после КАЖДОГО коммита**: статус задачи + hash коммита заносится сразу.

---

## Phase 1 — Status Panel: model/reasoning decoupling (owner: codeai-bot, updated: 2026-05-01)

### Stream A: Transport contracts split

1. [TODO] Расширить `session-stream-contracts.ts`: добавить `ClaudeThinkingSwitchRequestPayload`, `CodexReasoningSwitchRequestPayload`, новые члены `SessionIncomingMessage`; сократить `ClaudeModelSwitchRequestPayload` до `{ sessionId; targetModelId }`, `CodexModelSwitchRequestPayload` до `{ sessionId; targetModelId }`. Scope: `packages/core/src/remote-bridge/session-stream-contracts.ts` (1 файл).
2. [TODO] Git Commit: `feat(core): split status panel switch transport types` (hash: TBD)
3. [TODO] Расширить `incoming-message-validator.ts`: новые валидаторы `isClaudeThinkingSwitchPayload`, `isCodexReasoningSwitchPayload`; обновить existing validators под новые сокращённые типы; зарегистрировать в `PAYLOAD_VALIDATORS`. Scope: `packages/core/src/remote-bridge/handlers/incoming-message-validator.ts` (1 файл).
4. [TODO] Git Commit: `feat(core): validate split status panel switch payloads` (hash: TBD)
5. [TODO] Обновить `remote-bridge-message-router.ts`: добавить case-ветки для `session:claude:thinking-switch` и `session:codex:reasoning-switch`; включить новые типы в scope-проверку. Scope: `packages/core/src/remote-bridge/remote-bridge-message-router.ts` (1 файл).
6. [TODO] Git Commit: `feat(core): route split status panel switch commands` (hash: TBD)

### Stream B: Claude handlers split

1. [TODO] Упростить `session-request-handler-claude-model-switch.ts` до model-only: `targetModelId` остаётся, `thinkingEnabled`/`targetReasoningEffort` берутся из `session.modelBinding`; capability-нормализация current effort на новой модели через `findClaudeModelCapabilities`. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler-claude-model-switch.ts` (1 файл).
2. [TODO] Git Commit: `refactor(core): claude model-switch handler is model-only` (hash: TBD)
3. [TODO] Создать `session-request-handler-claude-thinking-switch.ts`: thinking-only handler, mutates `reasoningEffort`+`thinkingEnabled`, сохраняет `baseModelId` из previous binding, broadcast `session:model:update`. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler-claude-thinking-switch.ts` (1 файл).
4. [TODO] Git Commit: `feat(core): add claude thinking-switch handler` (hash: TBD)
5. [TODO] Wire в `session-request-handler.ts`: новый field `claudeThinkingSwitch`, конструктор + публичный метод `handleClaudeThinkingSwitch`; обновить сигнатуру `handleClaudeModelSwitch` под новый payload. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts` (1 файл).
6. [TODO] Git Commit: `feat(core): wire claude thinking-switch through session handler` (hash: TBD)

### Stream C: Codex handlers split

1. [TODO] Упростить `session-request-handler-codex-model-switch.ts` до model-only; effort переносится из `session.modelBinding`. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler-codex-model-switch.ts` (1 файл).
2. [TODO] Git Commit: `refactor(core): codex model-switch handler is model-only` (hash: TBD)
3. [TODO] Создать `session-request-handler-codex-reasoning-switch.ts`: reasoning-only handler, сохраняет `baseModelId`, взводит `pendingModelSwitchInjection = true`, broadcast `session:model:update`. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler-codex-reasoning-switch.ts` (1 файл).
4. [TODO] Git Commit: `feat(core): add codex reasoning-switch handler` (hash: TBD)
5. [TODO] Wire в `session-request-handler.ts`: новый field `codexReasoningSwitch` + публичный `handleCodexReasoningSwitch`; обновить сигнатуру `handleCodexModelSwitch`. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts` (1 файл).
6. [TODO] Git Commit: `feat(core): wire codex reasoning-switch through session handler` (hash: TBD)

### Stream D: PM client API + helpers + controller

1. [TODO] Обновить `core-stream-message-types.ts` и `api.ts`: новые типы в outbound union, новые методы `requestClaudeThinkingSwitch(sessionId, thinkingEnabled, targetReasoningEffort?)` и `requestCodexReasoningSwitch(sessionId, targetReasoningEffort)`, упростить `requestClaudeModelSwitch` и `requestCodexModelSwitch`. Scope: `src/client/project-manager/core-stream-message-types.ts` + `src/client/project-manager/api.ts` (2 файла).
2. [TODO] Git Commit: `feat(pm): split status panel switch client api` (hash: TBD)
3. [TODO] Упростить `project-manager-dialog-model-switch-helpers.ts`: `resolveDialogClaudeSwitchRequest` → model-only, `resolveDialogCodexBaseModelId` остаётся для model-switch ветки; убрать `visibleModelId` для reasoning paths; обновить `sendDialogClaudeSwitchRequest`. Scope: `src/client/project-manager/components/sessions/project-manager-dialog-model-switch-helpers.ts` (1 файл).
4. [TODO] Git Commit: `refactor(pm): decouple dialog switch helpers from reasoning` (hash: TBD)
5. [TODO] Обновить `use-project-manager-dialog-session-controller.ts`: `requestCodexReasoningSwitch`/`requestClaudeThinkingSwitch` отправляют только reasoning через новые api-методы; `requestCodexModelSwitch`/`requestClaudeModelSwitch` отправляют только модель. Scope: `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts` (1 файл).
6. [TODO] Git Commit: `refactor(pm): dialog controller dispatches independent switches` (hash: TBD)

### Stream E: Status Panel UI cleanup

1. [TODO] Очистить `status-panel-model-picker.tsx`: убрать `nextReasoning` суффикс на model-карте, убрать `<span>active</span>` на reasoning-карте, упростить `onSelectModel` до `(modelId: string) => void`. Scope: `src/client/ui/src/session/status-panel-model-picker.tsx` (1 файл).
2. [TODO] Git Commit: `feat(ui): status panel pickers no longer mix model and reasoning` (hash: TBD)
3. [TODO] Обновить `status-panel.tsx`: `handlePickerSelectModel(modelId)` без второго параметра, propы `onSelectClaudeModel(modelId)` и `onSelectModel(modelId)` без reasoning; цепочка callbacks в `SessionView`/`SessionViewHelpers`. Scope: `src/client/ui/src/session/status-panel.tsx` + `src/client/ui/src/session/session-view.tsx` (≤2 файла; при необходимости добавить `session-view-helpers.tsx`).
4. [TODO] Git Commit: `refactor(ui): status panel select-model callback is model-only` (hash: TBD)

### Stream F: Provider-tinted active highlight

1. [TODO] Добавить `data-provider`/`data-active` атрибуты в опции picker'а; провайдерный класс на корневом контейнере popup для CSS-каскада. Scope: `src/client/ui/src/session/status-panel-model-picker.tsx` (1 файл).
2. [TODO] Git Commit: `feat(ui): mark active picker option with provider tokens` (hash: TBD)
3. [TODO] CSS-правила для активной опции в провайдерных токенах (border + soft fill, выравнивание с button class'ами). Scope: `media/session-view.css` (или таргетный bundle CSS — уточнить grep'ом перед правкой) (1 файл).
4. [TODO] Git Commit: `feat(ui): tint active picker option with provider color` (hash: TBD)

### Stream G: Tests rewrite

1. [TODO] Обновить `session-request-handler-claude-model-switch.test.ts` под model-only payload + создать `session-request-handler-claude-thinking-switch.test.ts` (thinking on/off, effort transitions, model preserved). Scope: 2 файла.
2. [TODO] Git Commit: `test(core): cover claude model-only and thinking-only switches` (hash: TBD)
3. [TODO] Обновить `session-request-handler-codex-model-switch.test.ts` под model-only + создать `session-request-handler-codex-reasoning-switch.test.ts` (reasoning transitions, model preserved, pendingModelSwitchInjection true). Scope: 2 файла.
4. [TODO] Git Commit: `test(core): cover codex model-only and reasoning-only switches` (hash: TBD)
5. [TODO] Переписать `project-manager-dialog-model-switch-helpers.test.ts` под упрощённые сигнатуры. Scope: 1 файл.
6. [TODO] Git Commit: `test(pm): align dialog switch helpers tests with split flow` (hash: TBD)
7. [TODO] Обновить `status-panel-model-picker.test.tsx`: проверки "model click does not affect reasoning", "reasoning click does not affect model", `data-active` highlight. Scope: 1 файл.
8. [TODO] Git Commit: `test(ui): cover decoupled status panel picker` (hash: TBD)

### Stream H: SSOT update + release prep + build

1. [TODO] Обновить SSOT: SystemArchitecture §3 Invariant 14 (Claude/Codex switch contract), SessionStatusPanel SSOT, Modules/Claude.md, Modules/Codex.md (по делу — сократить ссылки на coupled payload). Scope: ≤3 файла за коммит, при необходимости разбить на 2 коммита.
2. [TODO] Git Commit: `docs(ssot): document decoupled status panel switch transport` (hash: TBD)
3. [TODO] README + CHANGELOG для версии 1.2.120: "Current Release — v1.2.120" + новая секция в CHANGELOG. Scope: `README.md` + `CHANGELOG.md` (2 файла).
4. [TODO] Git Commit: `docs: prepare release 1.2.120` (hash: TBD)
5. [TODO] Запустить `./scripts/build-all.sh` (поднимет версии до `1.2.120`, пересоберёт пакеты, выложит tarball-ы), скопировать tarball-ы в `doc/tmp/releases/`. Scope: build artefacts + version bumps (контролируется скриптом).
6. [TODO] Git Commit: `chore: build release 1.2.120` (hash: TBD)
7. [TODO] Запустить `./scripts/build-release.sh --use-current-version`, проверить SDK exclusions / VSIX surface, забрать `codeai-hub-1.2.120.vsix`. Scope: VSIX artefact.
8. [TODO] Git Commit: `chore: finalize release 1.2.120` (hash: TBD)
9. [TODO] Архивировать `Plans/StatusPanel_ModelReasoningDecoupling_Architecture.md` (после миграции итогов в SSOT) в `Plans/Archive/`, архивировать `todo-plan.md` в `doc/TODO/Archive/todo-plan-status-panel-decoupling.md`, обновить `Docs_Index.md`. Scope: ≤3 файла.
10. [TODO] Git Commit: `docs: close status panel decoupling scope` (hash: TBD)
