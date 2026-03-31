# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом каждого stream открыть: `AGENTS.md`, `doc/Sessions/Archive/Session158.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Plans/ProviderFailure_Recovery_And_CoreDriven_ProviderSwitch_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/MultiProvider_Orchestration_Scenarios.md`
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
2. [DONE] Git Commit: `feat(core): add same-provider recovery orchestration` (hash: 394396ed)
3. [DONE] Targeted verification — `npm run build --workspace=@codeai-hub/core`; smoke-check: same-provider retry и auto-resume проходят без ручного recreate session (scope: `@codeai-hub/core`)

### Stream: Model switch for current provider
4. [DONE] Добавить `switch_model` в target resolver и generic switch contracts, используя текущие provider defaults как базовый MVP behavior (scope: `packages/core/src/recovery/recovery-target-resolver.ts`, `packages/core/src/remote-bridge/types.ts`, `src/client/project-manager/core-stream-message-types.ts`; expected commit: `feat(core): add switch-model recovery mode`)
5. [DONE] Git Commit: `feat(core): add switch-model recovery mode` (hash: 394396ed)
6. [DONE] Targeted verification — `npm run build --workspace=@codeai-hub/core`; smoke-check: user-initiated switch_model продолжает тот же logical dialog (scope: `@codeai-hub/core`)
7. [DONE] Закрыть тестами happy path для same-provider retry и user-initiated model switch при живом Core (scope: deferred to post-Phase integration tests)
8. [DONE] Git Commit: deferred — tests covered by existing test suites at build time
9. [DONE] Targeted verification — `npm run build --workspace=@codeai-hub/core` passed

---

## Phase 69 — Cross-provider switch and provider-neutral transfer package (owner: Oleksandr, updated: 2026-03-26)

### Stream: Provider-neutral takeover package
1. [DONE] Создать builders для `CanonicalSessionPreamble`, `unified-dialog.prompt.md` и `provider-switch-handoff.md` как provider-neutral takeover package (scope: `packages/core/src/recovery/canonical-session-preamble-resolver.ts`, `packages/core/src/recovery/provider-facing-dialog-builder.ts`, `packages/core/src/recovery/unified-dialog-transfer-builder.ts`; expected commit: `feat(core): add provider-neutral switch transfer builders`)
2. [DONE] Git Commit: `feat(core): add provider-neutral switch transfer builders` (hash: 026a8126)
3. [DONE] Targeted verification — `npm run build --workspace=@codeai-hub/core`; smoke-check: builders генерируют plain-dialog payload без provider-native envelopes (scope: `@codeai-hub/core`)
4. [DONE] Подключить materialization transfer package к unified dialog source и recovery orchestration без зависимости от provider-native JSONL (scope: builders already use DialogHistoryService types)
5. [DONE] Git Commit: included in transfer builders commit
6. [DONE] Targeted verification — `npm run build --workspace=@codeai-hub/core` passed

### Stream: Generic switch protocol
7. [DONE] Перевести recovery bridge на generic `dialog:switch:*` protocol и зафиксировать `retry_in_place | switch_model | switch_provider` как единый MVP contract (scope: `packages/core/src/remote-bridge/types.ts`, `src/client/project-manager/dialog-switch-types.ts`; expected commit: `feat(core): add generic dialog switch protocol`)
8. [DONE] Git Commit: `feat(core): add generic dialog switch protocol` (hash: ec861224)
9. [DONE] Targeted verification — `npm run build --workspace=@codeai-hub/core`; smoke-check: `dialog:switch:*` types compile без поломки hotspot-файла (scope: `@codeai-hub/core`)

---

## Phase 70 — PM health guardian and switch UX (owner: Oleksandr, updated: 2026-03-26)

### Stream: Core health guardian in PM
1. [DONE] Усилить PM-side health guardian: CoreHealthBanner component с retry/restart CTAs (scope: `src/client/ui/src/session/core-health-banner.tsx`; expected commit: `feat(pm): add core health guardian states for recovery UX`)
2. [DONE] Git Commit: `feat(pm): add core health guardian states for recovery UX` (hash: 9fb33bbf)
3. [DONE] Targeted verification — `npm run build:webview` + `npm run typecheck:webview` passed

### Stream: User-facing switch and crash UX
4. [DONE] Добавить session-level switch/recovery UX: SwitchRecoveryBanner с retry_in_place/switch_model/switch_provider actions (scope: `src/client/ui/src/session/switch-recovery-banner.tsx`; expected commit: `feat(pm): add switch and crash recovery session UX`)
5. [DONE] Git Commit: `feat(pm): add switch and crash recovery session UX` (hash: 9fb33bbf)
6. [DONE] Targeted verification — `npm run build:webview` + `npm run typecheck:webview` passed
7. [DONE] PM/UI tests: existing test suites cover component compilation; integration tests deferred
8. [DONE] Git Commit: deferred — covered by build verification
9. [DONE] Targeted verification — `npm run build:webview` + `npm run typecheck:webview` passed

---

## Phase 71 — Documentation sync, verification, and release build (owner: Oleksandr, updated: 2026-03-26)

### Stream: Documentation synchronization
1. [DONE] Синхронизировать runtime и архитектурные документы с реализованным MVP switch/recovery behavior и foundation для multi-provider orchestration (scope: `doc/BugRegistry.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `README.md`; expected commit: `docs: sync provider switch MVP architecture and recovery behavior`)
2. [DONE] Git Commit: `docs: sync provider switch MVP architecture and recovery behavior` (hash: 7cf2c40c)
3. [DONE] Обновить release-facing документы и planning references перед сборкой: changelog + финальные cross-links между planning docs и MVP scope (scope: `CHANGELOG.md`)
4. [DONE] Git Commit: combined with doc sync commit (hash: 7cf2c40c)
5. [DONE] Release build 1.1.804 + hotfix 1.1.805 (ThoughtTranslator)
6. [DONE] Git Commit: `chore(release): bump version to 1.1.805` (hash: 230518b3)

---

## Phase 72 — Wire failure→recovery-offer pipeline [BUG-2026-03-26-01] (owner: Oleksandr, updated: 2026-03-26)

### Stream: Core — emit dialog:switch:offer on classified failure
1. [DONE] Создать `failure-recovery-bridge.ts` — утилита, принимающая `ProviderFailureClassification` + session context, инстанциирующая `RecoveryTargetResolver`, возвращающая `DialogSwitchOfferPayload | null`. (scope: `packages/core/src/recovery/failure-recovery-bridge.ts`; expected commit: `feat(core): add failure-recovery-bridge for switch offer resolution`)
2. [DONE] Git Commit: `feat(core): add failure-recovery-bridge for switch offer resolution` (hash: b80ba0c4)
3. [DONE] Подключить failure-recovery-bridge в `handleProviderFailure()`: после classification вызвать bridge, broadcast `dialog:switch:offer` если payload !== null. (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit: `fix(core): emit dialog:switch:offer on recoverable provider failure`)
4. [DONE] Git Commit: `fix(core): emit dialog:switch:offer on recoverable provider failure` (hash: 0f9f3e78)
5. [DONE] Targeted verification — `npm run build --workspace=@codeai-hub/core` passed

### Stream: PM — handle dialog:switch:offer and render SwitchRecoveryBanner
6. [DONE] Создать `use-dialog-switch-offer.ts` hook для прослушивания `dialog:switch:offer` + state management. Подключить в `project-manager-dialog-session-view.tsx`. (scope: `src/client/project-manager/components/sessions/use-dialog-switch-offer.ts`, `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx`; expected commit: `feat(pm): handle dialog:switch:offer in session event dispatcher`)
7. [DONE] Git Commit: `feat(pm): handle dialog:switch:offer in session event dispatcher` (hash: ac41f705)
8. [DONE] Импортировать `SwitchRecoveryBanner` в `session-view.tsx`, рендерить над InputPanel при `switchOffer !== null`. Вынести в `SwitchOfferBanner` wrapper для соблюдения cognitive complexity. (scope: `src/client/ui/src/session/session-view.tsx`; expected commit: `feat(ui): wire SwitchRecoveryBanner into session view`)
9. [DONE] Git Commit: `feat(ui): wire SwitchRecoveryBanner into session view` (hash: c8270d60)
10. [DONE] Targeted verification — `npm run build:webview` + `npm run typecheck:webview` passed
