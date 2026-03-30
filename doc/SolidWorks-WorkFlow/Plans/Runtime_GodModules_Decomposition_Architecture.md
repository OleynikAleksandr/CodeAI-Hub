# Runtime God-Modules Decomposition Architecture

**Status:** Approved for Wave 2026-03-30
**Created:** 2026-03-27
**Owner:** Oleksandr

---

## 1. Problem

В репозитории проблема giant operational modules не исчезла, а сменила форму.

После `Session197` blocking oversized debt уже снят вместе с allowlist legacy-хвостом, но это не означает, что архитектурный риск закрыт:

- architecture gate теперь блокирует только файлы `> 500` строк;
- warning zone смещена в диапазон `400-500`;
- в этой зоне остаются production-hotspots, которые почти гарантированно перерастут лимит при следующем feature/fix цикле;
- особенно опасны orchestration/runtime файлы с высокой fan-in/fan-out связностью.

Ключевые production-hotspots на момент открытия текущей волны:

- `packages/core/src/remote-bridge/handlers/session-request-handler.ts` — `477` lines
- `packages/Claude_Module/src/auth/sdk-auth-manager.ts` — `496` lines
- `packages/Gemini_Module/src/runtime/cli-bridge.ts` — `486` lines
- `packages/Gemini_Module/src/installer/gemini-installer.ts` — `450` lines

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
- в текущей фазе не пытаемся лечить всю warning-zone целиком
- сначала режем production hotspots с максимальной fan-in/fan-out критичностью
- test files и native-safe deferred modules идут отдельной волной после закрытия текущих runtime clusters

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

## 4. Deferred Backlog After Current Wave

После закрытия текущей волны следующими кандидатами остаются:

- `packages/core/src/provider-usage-limits/providers/claude/claude-usage-limits-facade.ts`
- `packages/cef-launcher/src/launcher_handler.cc`
- test/support files из warning-zone:
  - `packages/core/src/workspace-runtime/workspace-runtime-facade.test.ts`
  - `packages/core/src/remote-bridge/handlers/session-request-handler.test-helpers.ts`
  - `packages/Gemini_Module/src/session/gemini-session-manager.test.ts`

Дальше, уже после них, валиден старый broader backlog runtime debt reduction:

- `packages/core/src/remote-bridge/handlers/http-api-router.ts`
- `packages/core/src/remote-bridge/index.ts`
- `packages/core/src/workflow/diagram-dsl/diagram-modules-parser.ts`
- `packages/core/src/workspace-runtime/workspace-runtime-facade.ts`
- `packages/core/src/config/index.ts`
- `packages/core/src/remote-bridge/types.ts`
- provider message processors and adjacent runtime clusters

Для каждого следующего кандидата остаётся тот же принцип:

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

---

## 7. Approved Wave After 500-Line Gate (2026-03-30)

После `Session197` architecture gate уже переведён на:

- blocking threshold: `500` lines
- warning zone: `400-500` lines

Oversized debt как blocking-class на текущем этапе закрыт, но новая practical wave теперь должна работать с production-файлами, которые уже находятся в warning zone и с высокой вероятностью снова перерастут лимит при следующем feature/fix цикле.

Текущая warning zone на момент старта этой волны:

- production / runtime:
  - `packages/core/src/remote-bridge/handlers/session-request-handler.ts` — `477`
  - `packages/Claude_Module/src/auth/sdk-auth-manager.ts` — `496`
  - `packages/Gemini_Module/src/runtime/cli-bridge.ts` — `486`
  - `packages/Gemini_Module/src/installer/gemini-installer.ts` — `450`
  - `packages/core/src/provider-usage-limits/providers/claude/claude-usage-limits-facade.ts` — `440`
  - `packages/cef-launcher/src/launcher_handler.cc` — `411`
- test / test-support:
  - `packages/core/src/workspace-runtime/workspace-runtime-facade.test.ts` — `400`
  - `packages/core/src/remote-bridge/handlers/session-request-handler.test-helpers.ts` — `411`
  - `packages/Gemini_Module/src/session/gemini-session-manager.test.ts` — `495`

### 7.1. Scope approved by user for this phase

В эту фазу входят только первые три production направления:

1. остаточный thin-facade tail `session-request-handler.ts`
2. `sdk-auth-manager.ts`
3. связка `gemini-installer.ts` + `cli-bridge.ts`

### 7.2. Explicitly out of scope for this phase

- test files и test helpers из warning zone не режем;
- `claude-usage-limits-facade.ts` откладывается на следующую волну;
- `launcher_handler.cc` откладывается на отдельную native-safe волну.

Это сделано сознательно:

- tests сейчас не являются архитектурным риском того же уровня, что production orchestration files;
- `claude-usage-limits-facade.ts` уже ближе к корректной фасадной роли и не должен смешиваться с более срочными orchestration/runtime cuts;
- `launcher_handler.cc` требует отдельной осторожности из-за CEF/native boundary.

---

## 8. Wave-1 Target Architecture

### 8.1. `session-request-handler.ts` — final thin-facade closure

История этого файла уже длинная: основные крупные seams вынесены в предыдущих сессиях, и текущая задача не в том, чтобы "разрезать монолит с нуля", а в том, чтобы честно добить остаточный root tail.

Текущий root должен быть доведён до роли:

- façade / orchestration entrypoint;
- ownership of only public handler surface (`handleCreate`, `handleDialogSend`, `handleSwitchRequest`, `createSessionForWorkflow`, `handleMessage`, `handleDelete`, `handleStop`);
- minimal state bookkeeping, которое невозможно вынести без искусственного раздробления API.

Что ещё нельзя оставлять в root:

- жирные constructor-local runtime closures и event-emitter wiring;
- procedural glue, который можно отдать рядом стоящему helper/service без изменения public API;
- растущий pass-through state logic, если он уже образует отдельную responsibility seam.

Wave-1 expectation:

- root file опускается существенно ниже текущих `477` строк;
- остаётся façade-level orchestration surface;
- новые helpers живут рядом с уже существующим `session-request-handler-runtime*` cluster, а не создают вторую параллельную архитектуру.

### 8.2. `sdk-auth-manager.ts` — split auth bootstrap responsibilities

Сейчас в одном файле смешаны:

- provider-home bridge для macOS / provider HOME;
- legacy `.claude` state linking/copying;
- credentials migration;
- OAuth token bootstrap;
- auth probe execution;
- auth environment assembly.

Целевая форма:

- `SDKAuthManager` остаётся внешним coordinator/facade;
- platform/provider-home bootstrap logic уходит в отдельный helper;
- OAuth bootstrap + auth probe execution уходит в отдельный helper;
- `getAuthEnvironment()` и публичный внешний API остаются стабильными.

Принцип:

- user-visible auth behavior не меняется;
- decomposition должна быть behavior-preserving;
- platform-specific branching не должна продолжать накапливаться в root manager.

### 8.3. `gemini-installer.ts` + `cli-bridge.ts` — one runtime cluster

Эти два файла нужно рассматривать как один cluster, а не как независимые случайные warning-zone files.

Сейчас responsibilities распределены неудачно:

- `cli-bridge.ts` одновременно делает candidate scanning, package root resolution, ESM loading и compatibility validation;
- `gemini-installer.ts` одновременно владеет installer lifecycle, npm package management, path normalization, runtime integrity validation и bridge load diagnostics.

Целевая форма:

- `cli-bridge.ts` остаётся thin runtime entrypoint;
- candidate scanning / root resolution выносятся в focused helper;
- module loading / compatibility validation выносятся в отдельный helper;
- `gemini-installer.ts` остаётся installer coordinator;
- npm package install/update/recovery helpers выносятся отдельно;
- installer и bridge должны продолжать выглядеть как единый runtime cluster без split-brain contracts.

Принцип:

- не менять внешний installer/bridge contract;
- не смешивать structural split с новой Gemini feature work;
- если нужно выбирать очередность, сначала режем resolution/loading seams в runtime, затем package-management seam в installer.
