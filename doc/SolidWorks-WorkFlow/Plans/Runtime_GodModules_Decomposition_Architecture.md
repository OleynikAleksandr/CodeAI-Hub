# Runtime God-Modules Decomposition Architecture

**Status:** Draft
**Created:** 2026-03-27
**Owner:** Oleksandr

---

## 1. Problem

В репозитории накопился не один случайный oversized file, а целый слой operational god-modules.

Текущее состояние handwritten source surface после исправления architecture gate:

- `32` source-файла уже превышают лимит `300` строк и вынесены во временный debt allowlist
- `55` source-файлов находятся в warning zone `250-300`
- самая опасная зона — Core runtime orchestration и provider runtime

Ключевые файлы первой волны:

- `packages/core/src/remote-bridge/handlers/session-request-handler.ts` — `4291` lines
- `packages/core/src/provider-registry/index.ts` — `1225` lines
- `packages/Gemini_Module/src/session/gemini-session-manager.ts` — `987` lines

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
  - pending retry set
  - recovery attempts

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
  - settings load
  - auth refresh
  - argv/config/client bootstrap
  - session creation result
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
- `gemini-idle-watchdog.ts`
  - watchdog lifecycle
- `gemini-session-closer.ts`
  - close/reset chat
  - final state cleanup

Правило:

- фасад не должен одновременно владеть bootstrap, runtime turn loop, tool-call orchestration, alias storage и close semantics

---

## 4. Second Wave After Key Files

После первой волны в следующий backlog переходят:

- `packages/core/src/remote-bridge/handlers/http-api-router.ts`
- `packages/core/src/remote-bridge/index.ts`
- `packages/core/src/workflow/diagram-dsl/diagram-modules-parser.ts`
- `packages/core/src/workspace-runtime/workspace-runtime-facade.ts`
- provider message processors:
  - `packages/Claude_Module/src/messaging/message-processor.ts`
  - `packages/Codex_Module/src/messaging/message-processor.ts`
  - `packages/Gemini_Module/src/messaging/message-processor.ts`

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
