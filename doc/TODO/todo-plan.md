# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_Commentary_Restore.md`
  - `doc/Sessions/Session063.md`
  - `doc/Sessions/Session064.md` (после создания)
- TODO Plan состоит из Phase/Stream; каждая подзадача затрагивает не более 3 файлов или пакетов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещён).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.
- Release stream закрывается только на чистом дереве и строго по `Release Build Checklist`.

---

## Phase 290 — Restore GPT-5.4 workflow commentary in Project Manager (owner: Oleksandr, updated: 2026-03-06)

### Stream 0: Убрать legacy structured-output default из Codex runtime
1. [DONE] Убрать автоподстановку дефолтной schema в Codex structured-output controller, чтобы raw workflow turn без явного `outputSchema` не превращался в JSON-only контракт; raw `agent_message` снова проходит без JSON-only prompt и без JSON extractor path по умолчанию (scope: `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts`; actual commit: `fix(codex): disable default structured output injection`).
2. [DONE] Git Commit: `fix(codex): disable default structured output injection` (hash: `2be5a234`)
3. [DONE] Ограничить передачу `--output-schema` в Codex CLI только explicit structured turn, не затрагивая обычные workflow turns PM; explicit structured-output marker теперь обязателен даже при наличии schema file path (scope: `packages/Codex_Module/src/sdk/codex-sdk-patches.ts`; actual commit: `fix(codex): gate output schema cli flag behind opt-in`).
4. [DONE] Git Commit: `fix(codex): gate output schema cli flag behind opt-in` (hash: `bfa283f5`)

### Stream 1: Очистить PM/Core caller contract для raw workflow turns
1. [DONE] Убрать legacy schema-loading из отправки обычных workflow сообщений в PM, чтобы `Description`/`Virtual Simulation` не просили structured response по умолчанию; sender переведён в raw send path, PM helper для schema fetch удалён как неиспользуемый (scope: `src/client/project-manager/components/sessions/session-message-sender.ts`, `src/client/project-manager/services/idea-collector-submit-service.ts`; actual commit: `fix(pm): stop default schema requests for workflow turns`).
2. [DONE] Git Commit: `fix(pm): stop default schema requests for workflow turns` (hash: `8a918fcc`)
3. [DONE] Довести Core bridge contract до явного opt-in: workflow stage не должен подмешивать structured-output semantics без прямого запроса caller-а; marker `allowStructuredOutput` теперь нужен только для осознанного workflow structured path и удаляется до передачи в provider layer (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/Codex_Module/src/types/index.ts`; actual commit: `fix(core): keep workflow turn options raw by default`).
4. [DONE] Git Commit: `fix(core): keep workflow turn options raw by default` (hash: `3c148191`)

### Stream 2: Вернуть и сохранить промежуточные commentary messages
1. [DONE] Восстановить обработку промежуточных `agent_message/commentary` для raw workflow turns, чтобы Codex message processor не схлопывал поток в один финальный ответ; suppress commentary оставлен только для явных structured turns, raw workflow commentary снова проходит в stream pipeline (scope: `packages/Codex_Module/src/messaging/message-processor.ts`; actual commit: `fix(codex): surface workflow commentary messages`).
2. [TODO] Git Commit: `fix(codex): surface workflow commentary messages` (hash: TBD)
3. [TODO] Проверить и при необходимости скорректировать сохранение intermediate commentary/thinking в unified dialog history JSONL, чтобы PM видел те же промежуточные сообщения после reopen/replay (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/unified-session/storage.ts`; expected commit: `fix(core): persist intermediate codex workflow commentary`).
4. [TODO] Git Commit: `fix(core): persist intermediate codex workflow commentary` (hash: TBD)

### Stream 3: Уточнить prompt contract для обязательных progress updates
1. [TODO] Обновить prompt Description Agent: полный документ не публикуется в чат, но progress commentary по ходу работы и после значимых правок файла обязателен (scope: `packages/agents/description-agent/assets/description-collector-prompt.md`; expected commit: `docs(prompts): require commentary in description workflow`).
2. [TODO] Git Commit: `docs(prompts): require commentary in description workflow` (hash: TBD)
3. [TODO] Обновить prompt Virtual Simulation тем же контрактом: короткие рабочие комментарии обязательны, запрещён только dump полного артефакта в чат (scope: `packages/core/src/templates/source/virtual-simulation-prompt.md`; expected commit: `docs(prompts): require commentary in virtual simulation workflow`).
4. [TODO] Git Commit: `docs(prompts): require commentary in virtual simulation workflow` (hash: TBD)

### Stream 4: Таргетная валидация и regression coverage
1. [TODO] Добавить таргетную проверку Core bridge на opt-in structured-output boundary для workflow turns, чтобы дефолтный raw path больше не регрессировал (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; expected commit: `test(core): cover raw workflow turn options`).
2. [TODO] Git Commit: `test(core): cover raw workflow turn options` (hash: TBD)
3. [TODO] Добавить PM/session regression coverage: промежуточные commentary из workflow turn должны оставаться в dialog stream и после snapshot replay/open history (scope: `src/client/project-manager/components/sessions/session-stream.test.ts`, `src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`; expected commit: `test(pm): cover workflow commentary replay`).
4. [TODO] Git Commit: `test(pm): cover workflow commentary replay` (hash: TBD)

### Stream 5: Архитектурная синхронизация перед релизом
1. [TODO] Синхронизировать SSOT после кода: обновить системные и модульные документы под raw workflow contract, opt-in structured output и обязательные commentary updates (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_Commentary_Restore.md`; expected commit: `docs(codex): sync workflow commentary contract`).
2. [TODO] Git Commit: `docs(codex): sync workflow commentary contract` (hash: TBD)

### Stream 6: Release build по инструкции
1. [TODO] Перед релизом синхронизировать пользовательские документы под новый versioned behavior: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md` и связанные release notes, чтобы release собирался уже на актуальном описании поведения GPT-5.4 workflow commentary (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): sync workflow commentary restore notes`).
2. [TODO] Git Commit: `docs(release): sync workflow commentary restore notes` (hash: TBD)
3. [TODO] На чистом дереве прогнать релизный цикл строго по checklist: `./scripts/build-all.sh`, затем после проверки clean tree — `./scripts/build-release.sh --use-current-version`; принять только артефакт, где подтверждены `Verifying SDK exclusions`, `Removing dev dependencies...`, `✅ Package created` (scope: version bumps, release manifests, `doc/tmp/releases/`, `~/.codeai-hub/releases/`; expected commit: `chore(release): build-all vNEXT workflow commentary restore`).
4. [TODO] Git Commit: `chore(release): build-all vNEXT workflow commentary restore` (hash: TBD)
5. [TODO] После успешного релиза оформить сессионный отчёт и закрытие Phase: создать `doc/Sessions/Session065.md`, обновить/заархивировать завершённый `todo-plan.md` и зафиксировать финальные артефакты релиза (scope: `doc/Sessions/Session065.md`, `doc/TODO/todo-plan.md`, `doc/TODO/Archive/todo-plan-up-to-phase290-<date>.md`; expected commit: `docs(session): record workflow commentary restore release`).
6. [TODO] Git Commit: `docs(session): record workflow commentary restore release` (hash: TBD)
