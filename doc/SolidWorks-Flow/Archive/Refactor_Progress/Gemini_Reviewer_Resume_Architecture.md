# Gemini Reviewer Resume Architecture (Phase 119)

**Status:** ARCHIVED (implemented baseline; historical)
**Archived:** 2026-02-17
**Owner:** Oleksandr

Этот документ перенесён в `Archive/Refactor_Progress/` как историческая фиксация Phase 119.
Актуальный SSOT-референс по Gemini провайдеру: `doc/SolidWorks-Flow/Stacks/Gemini_CLI_Module.md` (Appendix: Reviewer resume baseline).

---

## 0. Operational Note (Pause)

- Реализация reviewer resume для Gemini подтверждена рабочей.
- Дальнейшие Gemini-изменения временно заморожены до появления надёжного runtime-механизма контроля остатка контекстного окна.
- До снятия паузы допускаются только bugfix-изменения без расширения функционала.

---

## 1. Problem Statement

В текущей реализации CodeAI Hub workflow-ветка `description/reviewer` выбирает провайдера только из адаптеров, у которых реализован `resumeSession`.

Практический эффект в релизе `1.1.537`:
- Description-collector может работать на `geminiCli`.
- Reviewer auto-start переключается на `claudeCodeCli`, хотя в Gemini CLI доступен `/resume`.

Root cause на уровне кода:
1. `WorkflowRuntime.resolvePreferredReviewerProviderId` отбрасывает провайдер без `adapter.resumeSession`.
2. `GeminiProviderAdapter` не реализует `resumeSession`.
3. `GeminiSessionManager` формирует CLI args с `resume: undefined`, поэтому bridge не использует resume-path Gemini CLI.

---

## 2. Target Invariants

1. Если collector-сессия ветки `description` была на `geminiCli`, reviewer auto-start должен оставаться на `geminiCli` при доступном адаптере.
2. Gemini provider adapter обязан поддерживать `resumeSession(sessionId, workspacePath?)` в том же контракте, что Claude/Codex адаптеры.
3. Gemini session runtime обязан передавать `resume` в CLI-конфигурацию при resume-path.
4. При недоступном Gemini допускается контролируемый fallback на `claudeCodeCli`/`codexCli` с явной диагностикой причины.
5. После реализации проходит полный релизный цикл (`build-all` + `build-release --use-current-version`).

---

## 3. Architecture Decision

### 3.1 Gemini Resume Contract

Добавляется native resume-путь в `Gemini_Module`:
- `GeminiProviderAdapter.resumeSession(...)` делегирует в `GeminiSessionManager.resumeSession(...)`.
- `GeminiSessionManager.resumeSession(...)` создаёт runtime с `argv.resume=<providerSessionId>`.
- После инициализации фиксируется canonical session id из Gemini runtime и поддерживаются alias-переходы (`requested -> actual`) для непрерывности подписок и JSONL.

### 3.2 Reviewer Provider Selection

`WorkflowRuntime` сохраняет текущий принцип:
- сначала пытается использовать `snapshot.session.providerId`;
- fallback по заранее заданному списку.

После добавления `resumeSession` у Gemini preferred provider больше не отбрасывается и reviewer может стартовать на том же провайдере, что collector.

### 3.3 Compatibility and Safety

- Внешний контракт `ProviderAdapter` не меняется (resume остаётся optional), но Gemini теперь ему соответствует.
- Если resume в Gemini runtime вернёт ошибку/несуществующий session id, включается существующая error-поверхность через `session:error` и runtime failure handling.
- Fallback не удаляется: он остаётся guard-веткой на случай регрессии в Gemini CLI.

---

## 4. Module-Level Change Scope

### Stream A: Gemini Resume Runtime

Файлы:
1. `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`
2. `packages/Gemini_Module/src/session/gemini-session-manager.ts`
3. `packages/Gemini_Module/src/session/types.ts`

Результат:
- Adapter/SessionManager реализуют resume lifecycle.
- Gemini CLI получает `resume` аргумент в нужной ветке создания сессии.

### Stream B: Reviewer Selection + Core Diagnostics

Файлы:
1. `packages/core/src/workflow/runtime/workflow-runtime.ts`
2. `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
3. `packages/core/src/provider-registry/index.ts` (только при необходимости дополнительной диагностики)

Результат:
- reviewer auto-start предсказуемо выбирает preferred Gemini при доступном resume.
- Диагностика причин fallback остается читаемой.

### Stream C: Regression Tests

Файлы:
1. `packages/Gemini_Module/src/session/gemini-session-manager.test.ts`
2. `packages/Gemini_Module/src/provider/gemini-provider-adapter.test.ts`
3. `packages/core/src/workflow/runtime/workflow-runtime.test.ts`

Результат:
- покрыты сценарии `collector(gemini) -> reviewer(gemini)` и fallback-path.

---

## 5. Validation Plan

Обязательные гейты для каждого микро-шага:
1. `./scripts/check-architecture.sh`
2. `npx ultracite check`
3. `npx ts-prune`
4. `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`
5. `npm run check:links`
6. таргетные сборки затронутых пакетов (`@codeai-hub/gemini-module`, `@codeai-hub/core`, webview/project-manager при необходимости)

Release gate:
1. `./scripts/build-all.sh`
2. `./scripts/build-release.sh --use-current-version`

---

## 6. Risks

1. Gemini runtime может вернуть новый session id при resume; требуется корректное alias-сопоставление и подписки.
2. Возможны расхождения workspace allowlist при инструментальных вызовах Gemini; это отдельный риск и должен диагностироваться отдельно от resume.
3. Изменение выбора reviewer-провайдера влияет на continuity и telemetry, поэтому обязательны regression-тесты на workflow runtime.
