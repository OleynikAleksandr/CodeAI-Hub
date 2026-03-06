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
2. [DONE] Git Commit: `fix(codex): surface workflow commentary messages` (hash: `be98fb1d`)
3. [DONE] Проверить и скорректировать сохранение intermediate commentary/thinking в unified dialog history JSONL: dialog history reader теперь явно сохраняет порядок промежуточных сообщений при одинаковом timestamp, а отдельный regression test подтверждает чтение `assistant/thinking` из JSONL и tail-cursor replay для PM dialog refresh (scope: `packages/core/src/remote-bridge/handlers/dialog-history-service.ts`, `packages/core/src/remote-bridge/handlers/dialog-history-service.test.ts`; actual commit: `fix(core): persist intermediate codex workflow commentary`).
4. [DONE] Git Commit: `fix(core): persist intermediate codex workflow commentary` (hash: `3ef70fcc`)

### Stream 3: Уточнить prompt contract для обязательных progress updates
1. [DONE] Обновить prompt Description Agent: полный документ не публикуется в чат, но progress commentary по ходу работы и после значимых правок файла обязателен (scope: `packages/agents/description-agent/assets/description-collector-prompt.md`; actual commit: `docs(prompts): require commentary in description workflow`).
2. [DONE] Git Commit: `docs(prompts): require commentary in description workflow` (hash: `3484ecfd`)
3. [DONE] Обновить prompt Virtual Simulation тем же контрактом: короткие рабочие комментарии обязательны, запрещён только dump полного артефакта в чат (scope: `packages/core/src/templates/source/virtual-simulation-prompt.md`; actual commit: `docs(prompts): require commentary in virtual simulation workflow`).
4. [DONE] Git Commit: `docs(prompts): require commentary in virtual simulation workflow` (hash: `c17b2839`)

### Stream 4: Таргетная валидация и regression coverage
1. [DONE] Добавить таргетную проверку Core bridge на opt-in structured-output boundary для workflow turns, чтобы дефолтный raw path больше не регрессировал; test подтверждает strip schema по умолчанию и сохранение schema только через `allowStructuredOutput` без утечки marker-а в provider layer (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; actual commit: `test(core): cover raw workflow turn options`).
2. [DONE] Git Commit: `test(core): cover raw workflow turn options` (hash: `02c6988d`)
3. [DONE] Добавить PM/session regression coverage: промежуточные commentary из workflow turn должны оставаться в dialog stream и после snapshot replay/open history; compact replay-suite теперь проверяет сохранение ролей `assistant/thinking` и refresh через `dialog:history` на live `dialog:message` (scope: `src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`; actual commit: `test(pm): cover workflow commentary replay`).
4. [DONE] Git Commit: `test(pm): cover workflow commentary replay` (hash: `d6e1176f`)

### Stream 5: Архитектурная синхронизация перед релизом
1. [DONE] Синхронизировать SSOT после кода: обновить системные и модульные документы под raw workflow contract, opt-in structured output и обязательные commentary updates; в SSOT зафиксированы raw-by-default workflow, explicit `allowStructuredOutput`, commentary suppress только для structured turns и обязательные prompt commentary (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Contracts/Codex_Workflow_Commentary_Restore.md`; actual commit: `docs(codex): sync workflow commentary contract`).
2. [DONE] Git Commit: `docs(codex): sync workflow commentary contract` (hash: `bcf08939`)

### Stream 6: Release build по инструкции
1. [DONE] Перед релизом синхронизировать пользовательские документы под новый versioned behavior: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md` и связанные release notes, чтобы release собирался уже на актуальном описании поведения GPT-5.4 workflow commentary; release target зафиксирован как `v1.1.715` (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; actual commit: `docs(release): sync workflow commentary restore notes`).
2. [DONE] Git Commit: `docs(release): sync workflow commentary restore notes` (hash: `7ed44385`)
3. [DONE] На чистом дереве прогнать `./scripts/build-all.sh` строго по checklist; версия поднята до `v1.1.715`, собраны provider/core/ui/launcher tarball-артефакты и обновлены release manifests без использования флагов (scope: version bumps, release manifests, `doc/tmp/releases/`, `~/.codeai-hub/releases/`; actual commit: `chore(release): build-all v1.1.715 workflow commentary restore`).
4. [TODO] Git Commit: `chore(release): build-all v1.1.715 workflow commentary restore` (hash: TBD)
5. [TODO] После commit на чистом дереве прогнать `./scripts/build-release.sh --use-current-version`; принять только артефакт, где подтверждены `Verifying SDK exclusions`, `Removing dev dependencies...`, `✅ Package created` (scope: VSIX packaging, final release verification; expected commit: `chore(release): build-release v1.1.715 workflow commentary restore`).
6. [TODO] Git Commit: `chore(release): build-release v1.1.715 workflow commentary restore` (hash: TBD)
7. [TODO] После успешного релиза оформить сессионный отчёт и закрытие Phase: создать `doc/Sessions/Session065.md`, обновить/заархивировать завершённый `todo-plan.md` и зафиксировать финальные артефакты релиза (scope: `doc/Sessions/Session065.md`, `doc/TODO/todo-plan.md`, `doc/TODO/Archive/todo-plan-up-to-phase290-<date>.md`; expected commit: `docs(session): record workflow commentary restore release`).
8. [TODO] Git Commit: `docs(session): record workflow commentary restore release` (hash: TBD)
