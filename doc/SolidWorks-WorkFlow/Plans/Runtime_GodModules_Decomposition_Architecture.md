# Runtime God-Modules Decomposition Architecture

**Status:** Draft
**Created:** 2026-03-27
**Owner:** Oleksandr

---

## 1. Problem

В репозитории накопился не один случайный oversized file, а целый слой operational god-modules.

Текущее состояние handwritten source surface после первых façade cuts:

- `30` source-файлов ещё превышают лимит `300` строк и остаются во временном debt allowlist
- `64` source-файла находятся в warning zone `250-300`
- blind spot в architecture gate закрыт, а первые façade cuts уже сняли oversized debt с `provider-registry/index.ts` и `gemini-session-manager.ts`
- самая опасная зона теперь сместилась в Core remote bridge, diagram DSL и provider message processors

Ключевые файлы первой волны:

- `packages/core/src/remote-bridge/handlers/session-request-handler.ts` — `3174` lines
- `packages/core/src/provider-registry/index.ts` — `272` lines after façade extraction
- `packages/Gemini_Module/src/session/gemini-session-manager.ts` — `295` lines after façade extraction

Это уже не вопрос стиля. Это вопрос архитектурной управляемости:

- одна точка содержит несколько независимых responsibility layers
- фасад и внутренняя реализация слиты в один giant file
- quality gate раньше не видел значительную часть живого runtime code
- декомпозиция по кластерам и фасадам декларирована как правило проекта, но фактически не соблюдается в critical path runtime

---

## 2. Decisions

### 2.1. Architecture gate

- `scripts/check-architecture.sh` обязан сканировать весь handwritten source surface:
  - корневой `src/`
  - каждый `packages/**/src/`
- generated/build trees исключаются только по директориям:
  - `dist/`
  - `build/`
  - `node_modules/`
- уже существующий oversized debt фиксируется только через явный allowlist
- новые oversized файлы вне allowlist должны ломать gate

### 2.2. Refactor strategy

- giant files режем не “по 300 строк механически”, а по responsibility seams
- внешний import surface должен оставаться стабильным
- исходный giant file после декомпозиции остаётся только фасадом/entrypoint
- каждый extracted submodule получает одну узкую responsibility
- если появляются stateful orchestration rules, они выносятся в отдельный coordinator/service, а не растворяются в фасаде

### 2.3. Scope discipline

- одна микрозадача — не более `3` файлов
- в первой фазе не пытаемся вылечить все `32` oversized files
- сначала режем файлы с максимальной fan-in/fan-out критичностью
- только после этого идём во вторую волну debt reduction

---

## 3. Target Architecture

### 3.1. `session-request-handler.ts`

Роль после декомпозиции:

- остаётся фасадом remote-bridge session orchestration
- принимает входящие session requests
- делегирует создание, bind, continuity, rollover, provider-event routing специализированным submodules

Целевые submodules:

- `session-provider-session-resolver.ts`
  - create vs resume provider session
  - provider session id resolution
- `session-shell-factory.ts`
  - shell session creation
  - early broadcast path
- `session-bound-factory.ts`
  - bind runtime session to provider session
  - subscribe/unsubscribe lifecycle
- `session-description-dialog-sync.ts`
  - description dialog lookup
  - legacy dialog promotion
  - history backfill
- `session-continuity-rollover-orchestrator.ts`
  - flow-node rollover
  - continuity report lifecycle
  - bootstrap resume unlock
- `session-provider-event-router.ts`
  - provider event normalization
  - dispatch to message/history/runtime channels
- `session-provider-failure-recovery.ts`
  - failure classification
  - retry budget
  - recovery trigger

Правило:

- `session-request-handler.ts` не должен содержать длинную procedural orchestration логику
- giant internal maps/state registries должны уходить в dedicated service modules рядом с их responsibility

### 3.2. `provider-registry/index.ts`

Роль после декомпозиции:

- остаётся фасадом provider registry
- владеет только registry lifecycle, descriptor catalog, external API `listProviders/getAdapter/initialize/handleRuntimeFailure`

Целевые submodules:

- `provider-installer-paths.ts`
  - canonical installer paths
  - home-derived path resolution
  - запрет на user-specific absolute paths в коде
- `provider-installed-path-resolver.ts`
  - latest pointer resolution
  - version scan fallback
- `provider-module-loader.ts`
  - Claude/Codex/Gemini module loading
  - override path resolution
  - bundled fallback
- `provider-usage-limits-bridge-factory.ts`
  - Claude/Codex/Gemini usage limits bridge assembly
- `provider-descriptor-factory.ts`
  - descriptor creation
  - adapter attachment on bootstrap
- `provider-recovery-scheduler.ts`
  - retry timers
  - retry callback wiring
- `provider-recovery-coordinator.ts`
  - pending retry bookkeeping
  - recovery attempts
  - inactive/degraded status transitions

Правило:

- `index.ts` не должен знать детали installer-path scanning и module-loading internals одновременно
- bridge factories и recovery scheduler — отдельные модули, а не скрытые static regions внутри одного файла

### 3.3. `gemini-session-manager.ts`

Роль после декомпозиции:

- остаётся фасадом Gemini session lifecycle
- наружный API сохраняется:
  - `listSessions`
  - `getSession`
  - `createSession`
  - `resumeSession`
  - `sendMessage`
  - `closeSession`

Целевые submodules:

- `gemini-session-bootstrapper.ts`
  - requested session id bootstrap
  - auth refresh
  - config/client bootstrap
  - session creation result
- `gemini-session-settings-resolver.ts`
  - settings load
  - settings snapshot resolution
  - model/thinking/context defaults
  - argv/auth resolution
- `gemini-session-store.ts`
  - sessions map
  - alias map
  - require/promote/prune helpers
- `gemini-turn-runner.ts`
  - `processTurns`
  - `runTurn`
  - assistant segment accounting
- `gemini-tool-call-orchestrator.ts`
  - tool execution chain
  - response parts aggregation
  - tool execution events
- `gemini-session-lifecycle.ts`
  - idle watchdog lifecycle
  - pending model override application
  - close/reset chat
  - token usage extraction

Правило:

- фасад не должен одновременно владеть bootstrap, runtime turn loop, tool-call orchestration, alias storage и close semantics

---

## 4. Second Wave After Key Files

После первых façade cuts следующая волна oversized debt приоритизируется так:

- `packages/core/src/remote-bridge/handlers/http-api-router.ts`
- `packages/core/src/remote-bridge/index.ts`
- `packages/core/src/workflow/diagram-dsl/diagram-modules-parser.ts`
- `packages/core/src/workspace-runtime/workspace-runtime-facade.ts`
- `packages/core/src/config/index.ts`
- `packages/core/src/remote-bridge/types.ts`
- provider message processors and adjacent runtime clusters:
  - `packages/Claude_Module/src/messaging/message-processor.ts`
  - `packages/Codex_Module/src/messaging/message-processor.ts`
  - `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts`
  - `packages/Gemini_Module/src/messaging/message-processor.ts`

Из allowlist должны исчезать сразу после успешного façade cut:

- `packages/core/src/provider-registry/index.ts`
- `packages/Gemini_Module/src/session/gemini-session-manager.ts`

Старый first-wave backlog, который уже закрыт как oversized debt, больше не считается кандидатом wave 2:

- `packages/core/src/provider-registry/index.ts`
- `packages/Gemini_Module/src/session/gemini-session-manager.ts`

Для них применяем тот же принцип:

- giant file сначала классифицируется по responsibility seams
- затем превращается в cluster of micro-modules
- giant root file остаётся только фасадом или исчезает в пользу явного фасада

---

## 5. Execution Rules For TODO Phase

- первая фаза после этого planning doc не должна смешивать “fix behavior” и “structural decomposition”
- задача первой волны — behavior-preserving refactor с синхронным обновлением документации
- каждый stream закрывает один cluster boundary
- тестовые giant files режем только после стабилизации production фасада этого же кластера
- allowlist должен только уменьшаться; расширение допускается только если появляется новый утверждённый handwritten root file, без которого невозможен безопасный intermediate step

---

## 6. Expected Outcome

После закрытия первой фазы:

- blind spot в architecture gate отсутствует
- ключевые god-modules превращены в закрытые module-clusters с фасадами
- наружный import surface остаётся стабильным
- дальнейшее снижение oversized debt становится последовательной, а не хаотичной работой
