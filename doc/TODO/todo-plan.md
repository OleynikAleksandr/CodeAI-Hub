# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом каждого stream открыть: `AGENTS.md`, `doc/Sessions/Session158.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Plans/ProviderFailure_Recovery_And_CoreDriven_ProviderSwitch_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/MultiProvider_Orchestration_Scenarios.md`
- Этот `TODO Plan` реализует **один MVP scope**: resilience bugfix + provider/model switch + PM health guardian как база для будущего multi-provider orchestration
- Отдельного сокращённого варианта внутри этого плана нет: **все Phase 67-71 вместе и есть MVP**
- Каждая микро-задача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Husky gates не обходить (`--no-verify` запрещён)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Перед закрытием каждого stream выполнять таргетные проверки затронутых пакетов/клиентов
- Для Core stream-ов таргетная проверка по умолчанию: `npm run build --workspace=@codeai-hub/core`
- Для PM/UI stream-ов таргетная проверка по умолчанию: `npm run build:webview` + `npm run typecheck:webview`
- `packages/core/src/remote-bridge/handlers/session-request-handler.ts` считается hotspot-файлом; после каждой микро-задачи, которая его меняет, обязателен немедленный `npm run build --workspace=@codeai-hub/core`
- Даже если автоматические тесты вынесены в отдельный stream, после каждой реализации обязателен targeted build и короткий smoke-check затронутого user flow
- Финальный release stream выполняется только после синхронизации документации и чистого дерева

---

## MVP Outcome

Критерии завершения этого плана:
- transient provider errors больше не рвут binding и не оставляют UI в вечном running state
- поддержан bounded retry budget: 1 safe silent retry для transient errors, 1 auto-resume для `session_binding_recoverable`
- поддержаны `retry_in_place`, `switch_model`, `switch_provider`
- cross-provider takeover использует `unified-dialog.prompt.md` + `provider-switch-handoff.md`, а не provider-native JSONL
- PM показывает явный crash/unavailable UX, если Core недоступен
- все контракты остаются provider-neutral и совместимыми с будущим `multi-provider-orchestrator`

## MVP Assumptions

- отдельный stage-specific artifact resolver в рамках этого MVP не вводится; используем canonical artifacts текущего stage из существующего runtime/workflow context
- persistent session-scoped model override в MVP не вводится; если explicit `targetModelId` не передан, используется текущий settings default
- `pendingSwitchIntent` в MVP хранится только in-memory на стороне PM; disk-persistence переносится за пределы этого плана

---

## Phase 67 — Core resilience invariants for provider failure (owner: Oleksandr, updated: 2026-03-26)

### Stream: Failure classification and bounded retry
1. [DONE] Ввести `ProviderFailureClassifier` и первичную классификацию `transient_turn_failure | session_binding_recoverable | provider_runtime_failure | terminal_session_failure`; подключить её до runtime teardown в Core (scope: `packages/core/src/recovery/provider-failure-classifier.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/provider-registry/index.ts`; expected commit: `feat(core): classify provider failures before teardown`)
2. [DONE] Git Commit: `feat(core): classify provider failures before teardown` (hash: a205f3c6)
3. [DONE] Targeted verification — `npm run build --workspace=@codeai-hub/core`; smoke-check: classifier path не ломает старт/сборку Core после правки hotspot-файла (scope: `@codeai-hub/core`)
4. [DONE] Встроить retry budget и `pending user intent TTL=60s`, чтобы recovery был конечным и не создавал бесконечных retry loops (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/types.ts`, `src/client/project-manager/core-stream-message-types.ts`; expected commit: `fix(core): bound retries and surface undelivered turn state`)
5. [DONE] Git Commit: `fix(core): bound retries and surface undelivered turn state` (hash: 92d0f57a)
6. [DONE] Targeted verification — `npm run build --workspace=@codeai-hub/core`; smoke-check: недоставленное сообщение получает конечный outcome, без бесконечного retry loop (scope: `@codeai-hub/core`)

### Stream: Turn lifecycle and no-silent-drop
7. [DONE] Гарантировать `turn_failed`/UI unlock для failed turns и убрать silent drop при missing binding, сохранив continuity dialog (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`, `packages/core/src/workspace-runtime/workspace-runtime-facade.test.ts`; expected commit: `fix(core): finalize failed turns without dropping continuity`)
8. [DONE] Git Commit: `fix(core): finalize failed turns without dropping continuity` (hash: 44948bf1)
9. [DONE] Targeted verification — `npm run build --workspace=@codeai-hub/core`; smoke-check: transient failure разблокирует UI, follow-up message не теряется (scope: `@codeai-hub/core`)

---

## Phase 68 — Same-provider recovery and switch_model path (owner: Oleksandr, updated: 2026-03-26)

### Stream: Same-provider retry orchestration
1. [DONE] Реализовать same-provider auto-resume через сохранённый `providerSessionId` и явный `retry_in_place` path в recovery orchestration (scope: `packages/core/src/recovery/dialog-switch-orchestrator.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/session-manager/index.ts`; expected commit: `feat(core): add same-provider recovery orchestration`)
2. [IN_PROGRESS] Git Commit: `feat(core): add same-provider recovery orchestration` (hash: TBD)
3. [DONE] Targeted verification — `npm run build --workspace=@codeai-hub/core`; smoke-check: same-provider retry и auto-resume проходят без ручного recreate session (scope: `@codeai-hub/core`)

### Stream: Model switch for current provider
4. [DONE] Добавить `switch_model` в target resolver и generic switch contracts, используя текущие provider defaults как базовый MVP behavior (scope: `packages/core/src/recovery/recovery-target-resolver.ts`, `packages/core/src/remote-bridge/types.ts`, `src/client/project-manager/core-stream-message-types.ts`; expected commit: `feat(core): add switch-model recovery mode`)
5. [IN_PROGRESS] Git Commit: `feat(core): add switch-model recovery mode` (hash: TBD)
6. [DONE] Targeted verification — `npm run build --workspace=@codeai-hub/core`; smoke-check: user-initiated switch_model продолжает тот же logical dialog (scope: `@codeai-hub/core`)
7. [TODO] Закрыть тестами happy path для same-provider retry и user-initiated model switch при живом Core (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`, `src/client/project-manager/components/sessions/session-stream.test.ts`, `src/client/project-manager/components/sessions/session-stream-provider-fallback.test.ts`; expected commit: `test(core): cover same-provider retry and switch-model flows`)
8. [TODO] Git Commit: `test(core): cover same-provider retry and switch-model flows` (hash: TBD)
9. [TODO] Targeted verification — `npm run build --workspace=@codeai-hub/core`; smoke-check: automated tests не оставили broken Core build (scope: `@codeai-hub/core`)

---

## Phase 69 — Cross-provider switch and provider-neutral transfer package (owner: Oleksandr, updated: 2026-03-26)

### Stream: Provider-neutral takeover package
1. [TODO] Создать builders для `CanonicalSessionPreamble`, `unified-dialog.prompt.md` и `provider-switch-handoff.md` как provider-neutral takeover package (scope: `packages/core/src/recovery/canonical-session-preamble-resolver.ts`, `packages/core/src/recovery/provider-facing-dialog-builder.ts`, `packages/core/src/recovery/unified-dialog-transfer-builder.ts`; expected commit: `feat(core): add provider-neutral switch transfer builders`)
2. [TODO] Git Commit: `feat(core): add provider-neutral switch transfer builders` (hash: TBD)
3. [TODO] Targeted verification — `npm run build --workspace=@codeai-hub/core`; smoke-check: builders генерируют plain-dialog payload без provider-native envelopes (scope: `@codeai-hub/core`)
4. [TODO] Подключить materialization transfer package к unified dialog source и recovery orchestration без зависимости от provider-native JSONL (scope: `packages/core/src/remote-bridge/handlers/dialog-history-service.ts`, `packages/core/src/unified-session/storage.ts`, `packages/core/src/recovery/dialog-switch-orchestrator.ts`; expected commit: `feat(core): build switch transfer package from unified dialog history`)
5. [TODO] Git Commit: `feat(core): build switch transfer package from unified dialog history` (hash: TBD)
6. [TODO] Targeted verification — `npm run build --workspace=@codeai-hub/core`; smoke-check: transfer package materializes from unified dialog history, а не из rollout JSONL (scope: `@codeai-hub/core`)

### Stream: Generic switch protocol
7. [TODO] Перевести recovery bridge на generic `dialog:switch:*` protocol и зафиксировать `retry_in_place | switch_model | switch_provider` как единый MVP contract (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/types.ts`, `src/client/project-manager/core-stream-message-types.ts`; expected commit: `feat(core): add generic dialog switch protocol`)
8. [TODO] Git Commit: `feat(core): add generic dialog switch protocol` (hash: TBD)
9. [TODO] Targeted verification — `npm run build --workspace=@codeai-hub/core`; smoke-check: `dialog:switch:*` flow проходит от offer до confirm без поломки hotspot-файла (scope: `@codeai-hub/core`)

---

## Phase 70 — PM health guardian and switch UX (owner: Oleksandr, updated: 2026-03-26)

### Stream: Core health guardian in PM
1. [TODO] Усилить PM-side health guardian: connection loss, status polling, restart state propagation и связь с supervisor UX (scope: `src/client/ui/src/core-bridge/core-bridge.ts`, `src/client/ui/src/core-bridge/core-bridge-reconnect.ts`, `src/client/project-manager/components/sessions/status-hydrator.ts`; expected commit: `feat(pm): add core health guardian states for recovery UX`)
2. [TODO] Git Commit: `feat(pm): add core health guardian states for recovery UX` (hash: TBD)
3. [TODO] Targeted verification — `npm run build:webview` + `npm run typecheck:webview`; smoke-check: PM корректно показывает reconnect/crash state при недоступном Core (scope: `webview + PM UI`)

### Stream: User-facing switch and crash UX
4. [TODO] Добавить session-level switch/recovery UX: crash banner, manual `switch model / switch provider`, approve/reject actions (scope: `src/client/ui/src/session/status-panel.tsx`, `src/client/ui/src/session/input-panel.tsx`, `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx`; expected commit: `feat(pm): add switch and crash recovery session UX`)
5. [TODO] Git Commit: `feat(pm): add switch and crash recovery session UX` (hash: TBD)
6. [TODO] Targeted verification — `npm run build:webview` + `npm run typecheck:webview`; smoke-check: manual switch actions и crash banner доступны в session UX (scope: `webview + PM UI`)
7. [TODO] Добавить PM/UI tests для crash banner, user-initiated switch request и post-reconnect recovery path (scope: `src/client/ui/src/session/input-panel.test.tsx`, `src/client/project-manager/components/sessions/session-stream.test.ts`, `src/client/project-manager/components/sessions/session-stream-provider-fallback.test.ts`; expected commit: `test(pm): cover crash banner and manual switch flows`)
8. [TODO] Git Commit: `test(pm): cover crash banner and manual switch flows` (hash: TBD)
9. [TODO] Targeted verification — `npm run build:webview` + `npm run typecheck:webview`; smoke-check: test additions не сломали PM/UI сборку (scope: `webview + PM UI`)

---

## Phase 71 — Documentation sync, verification, and release build (owner: Oleksandr, updated: 2026-03-26)

### Stream: Documentation synchronization
1. [TODO] Синхронизировать runtime и архитектурные документы с реализованным MVP switch/recovery behavior и foundation для multi-provider orchestration (scope: `doc/BugRegistry.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `README.md`; expected commit: `docs: sync provider switch MVP architecture and recovery behavior`)
2. [TODO] Git Commit: `docs: sync provider switch MVP architecture and recovery behavior` (hash: TBD)
3. [TODO] Обновить release-facing документы и planning references перед сборкой: changelog + финальные cross-links между planning docs и MVP scope (scope: `CHANGELOG.md`, `doc/SolidWorks-WorkFlow/Plans/ProviderFailure_Recovery_And_CoreDriven_ProviderSwitch_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/MultiProvider_Orchestration_Scenarios.md`; expected commit: `docs: finalize release notes and planning cross-links for switch MVP`)
4. [TODO] Git Commit: `docs: finalize release notes and planning cross-links for switch MVP` (hash: TBD)

### Stream: Release build and session wrap-up
5. [TODO] После зелёных таргетных проверок выполнить release sequence по инструкции: `./scripts/build-all.sh` → `./scripts/build-release.sh --use-current-version`, зафиксировать артефакты, обновить `doc/Sessions/Session159.md` и финальные статусы в `doc/TODO/todo-plan.md` (scope: `doc/Sessions/Session159.md`, `doc/TODO/todo-plan.md`; expected commit: `chore(release): bump version for provider switch MVP`)
6. [TODO] Git Commit: `chore(release): bump version for provider switch MVP` (hash: TBD)
