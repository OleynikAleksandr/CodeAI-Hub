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

1. [DONE] Расширить `session-stream-contracts.ts`: добавить `ClaudeThinkingSwitchRequestPayload`, `CodexReasoningSwitchRequestPayload`, новые члены `SessionIncomingMessage`; сократить `ClaudeModelSwitchRequestPayload` до `{ sessionId; targetModelId }`, `CodexModelSwitchRequestPayload` до `{ sessionId; targetModelId }`. Scope: `packages/core/src/remote-bridge/session-stream-contracts.ts` (1 файл).
2. [DONE] Git Commit: `feat(core): split status panel switch transport types` (hash: 9f387dfd3)
3. [DONE] Расширить `incoming-message-validator.ts`: новые валидаторы `isClaudeThinkingSwitchPayload`, `isCodexReasoningSwitchPayload`; обновить existing validators под новые сокращённые типы; зарегистрировать в `PAYLOAD_VALIDATORS`. Scope: `packages/core/src/remote-bridge/handlers/incoming-message-validator.ts` (1 файл).
4. [DONE] Git Commit: `feat(core): validate split status panel switch payloads` (hash: 1273224a7)
5. [DONE] Обновить `remote-bridge-message-router.ts`: добавить case-ветки для `session:claude:thinking-switch` и `session:codex:reasoning-switch`; включить новые типы в scope-проверку. Scope: `packages/core/src/remote-bridge/remote-bridge-message-router.ts` (1 файл).
6. [DONE] Git Commit: `feat(core): route split status panel switch commands` (hash: 2134d8cfe)

### Stream B + Stream C: Claude/Codex handlers split (объединённое исполнение)

1. [DONE] Упростить `session-request-handler-claude-model-switch.ts` до model-only.
2. [DONE] Git Commit: `refactor(core): claude model-switch handler is model-only` (hash: ce58a2627)
3. [DONE] Создать `session-request-handler-codex-reasoning-switch.ts` + `session-request-handler-claude-thinking-switch.ts`.
4. [DONE] Упростить `session-request-handler-codex-model-switch.ts` до model-only.
5. [DONE] Git Commit: `refactor(core): codex model-switch handler is model-only` (hash: 854337310, заодно added claude-thinking-switch.ts)
6. [DONE] Wire всех четырёх handlers в `session-request-handler.ts`.
7. [DONE] Git Commit: `feat(core): wire decoupled status panel switch handlers` (hash: 75680e738)

### Stream D: PM client API + helpers + controller

1. [DONE] Обновить `core-stream-message-types.ts` + `api.ts` + новые `services/switch-payloads.ts`, `services/switch-api.ts` (вынесены чтобы api.ts остался ≤500 строк).
2. [DONE] Git Commit: `feat(pm): split status panel switch client api` (hash: f5abe8198)
3. [DONE] Упростить helpers + controller + project-manager-runtime-session-view (callers получили model-only/reasoning-only сигнатуры).
4. [DONE] Git Commit: `refactor(pm): dialog controller dispatches independent switches` (hash: f6351c5b7)

### Stream E: Status Panel UI cleanup

1. [DONE] `status-panel-model-picker.tsx` без reasoning suffix и слова "active"; `onSelectModel(modelId)` без reasoning; `status-panel.tsx`, `session-view.tsx`, PM dialog session view синхронизированы под новую сигнатуру.
2. [DONE] Git Commit: `feat(ui): status panel pickers no longer mix model and reasoning` (hash: ca8fe5db2)

### Stream F: Provider-tinted active highlight

1. [DONE] CSS-правила для `.session-status-picker__option[data-active="true"][data-provider="..."]` в `media/session-view.css` (RGBA взяты из existing button-tokens).
2. [DONE] Git Commit: `feat(ui): tint active picker option with provider color` (hash: 9056e0045)

### Stream G: Tests rewrite

1. [DONE] Переписан `session-request-handler-claude-model-switch.test.ts` под model-only + создан `session-request-handler-claude-thinking-switch.test.ts`.
2. [DONE] Git Commit: `test(core): cover claude model-only and thinking-only switches` (hash: a480a0357)
3. [DONE] Переписан `session-request-handler-codex-model-switch.test.ts` + создан `session-request-handler-codex-reasoning-switch.test.ts`.
4. [DONE] Git Commit: `test(core): cover codex model-only and reasoning-only switches` (hash: b7123827f)
5. [DONE] Обновлены `project-manager-dialog-model-switch-helpers.test.ts`, `status-panel-model-picker.test.tsx`, `project-manager-session-view.test.tsx` под decoupled API.
6. [DONE] Git Commit: `test(pm,ui): cover decoupled status panel switch surfaces` (hash: 7bb50bf09)
7. [DONE] Fix-up: claude effort assertion выровнен под текущие capabilities (все три модели поддерживают xhigh).
8. [DONE] Git Commit: `test(core): align claude model-switch effort assertion with capabilities` (hash: 7058b3881)

### Stream H: SSOT update + release prep + build

1. [DONE] Обновить SSOT: SystemArchitecture Invariant 14 (1.2.120 entry о raздельных switch-командах) + SessionStatusPanel SSOT (контракт и подсветка активного пункта).
2. [DONE] Git Commit: `docs(ssot): document decoupled status panel switch transport` (hash: 25cc21086)
3. [DONE] README + CHANGELOG для версии 1.2.120: "Current Release — v1.2.120" + новая секция в CHANGELOG.
4. [DONE] Git Commit: `docs: prepare release 1.2.120` (hash: b6872e846)
5. [DONE] `./scripts/build-all.sh` отработал; tarball-ы скопированы в `doc/tmp/releases/`.
6. [DONE] Git Commit: `chore: build release 1.2.120` (hash: e972bbb03)
7. [DONE] `./scripts/build-release.sh --use-current-version` отработал; SDK exclusions verified, VSIX surface verified, `codeai-hub-1.2.120.vsix` (2.7M, sha256 `de64b7ce20c1b934d0f51627e1f0cc2bfc514240ee303618309f4a8f673fedaa`) готов.
8. [DONE] Git Commit: `chore: finalize release 1.2.120` (hash: ee5d187ea)
9. [BLOCKED-ON-USER] **Передать VSIX пользователю и дождаться явного подтверждения retest'а** (model-only клик не трогает reasoning, reasoning-only клик не трогает модель, активный пункт обеих карт подсвечен провайдерным цветом без слова "active" и без reasoning-суффикса). Closeout/архивирование запрещено до получения подтверждения. При найденных регрессиях — открывать новые micro-задачи перед closeout.
10. [TODO] Архивировать `Plans/StatusPanel_ModelReasoningDecoupling_Architecture.md` (после миграции итогов в SSOT и после пользовательского подтверждения) в `Plans/Archive/`, архивировать `todo-plan.md` в `doc/TODO/Archive/todo-plan-status-panel-decoupling.md`, обновить `Docs_Index.md`. Scope: ≤3 файла.
11. [TODO] Git Commit: `docs: close status panel decoupling scope` (hash: TBD)
