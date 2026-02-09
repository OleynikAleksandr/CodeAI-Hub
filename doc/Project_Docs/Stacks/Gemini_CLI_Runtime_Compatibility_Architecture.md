# Gemini CLI Runtime Compatibility Architecture

**Date:** 2026-02-09 11:19 (CET)
**Status:** Proposed (Phase 117)
**Scope:** `packages/Gemini_Module` runtime loader + tool execution compatibility for `@google/gemini-cli-core` 0.17.x и 0.27.x

---

## 1. Проблема

В релизе `1.1.535` Gemini provider может переходить в состояние `UNAVAILABLE` до шага аутентификации.

Симптом:
- `ERR_MODULE_NOT_FOUND` при загрузке `nonInteractiveToolExecutor.js` из `@google/gemini-cli-core`.

Корневая причина:
- runtime bridge в `packages/Gemini_Module/src/runtime/cli-bridge.ts` жёстко ожидает legacy модуль:
  - `dist/src/core/nonInteractiveToolExecutor.js` или `dist/core/nonInteractiveToolExecutor.js`.
- в `@google/gemini-cli-core@0.27.x` этот entrypoint удалён; актуальный backend переехал в `dist/src/scheduler/tool-executor.js` (и используется через `coreToolScheduler`).

Следствие:
- провайдер не инициализируется, хотя `gemini login` и credentials могут быть валидными.

---

## 2. Цели и инварианты

1. Инициализация Gemini provider должна работать для двух веток API:
   - legacy: `@google/gemini-cli-core` 0.17.x;
   - current: `@google/gemini-cli-core` 0.27.x.
2. Контракт выполнения tool-call внутри `GeminiSessionManager` должен быть единым и не зависеть от layout внутренних модулей CLI Core.
3. Ошибки должны быть разделены по категориям:
   - `auth/login` проблемы;
   - `runtime module compatibility` проблемы.
4. Автообновление не должно ломать рабочий provider без явной диагностики и fallback.

---

## 3. Матрица совместимости

| Компонент | 0.17.x | 0.27.x |
|---|---|---|
| `coreToolScheduler` | есть | есть |
| `nonInteractiveToolExecutor` | есть | нет |
| `scheduler/tool-executor` | нет | есть (используется как backend внутри scheduler path) |
| `turn` | есть | есть |
| `thoughtUtils` | есть | есть |

Вывод:
- Нельзя полагаться только на `nonInteractiveToolExecutor`.
- Нужен совместимый фасад исполнения tool-call с runtime detection backend.

---

## 4. Архитектурное решение

### 4.1 Runtime loader (cli-bridge)

`packages/Gemini_Module/src/runtime/cli-bridge.ts`:
- сохраняет загрузку обязательных модулей (`config`, `settings`, `extension`, `coreToolScheduler`, `turn`, `thoughtUtils`);
- для tool execution использует multi-path стратегию:
  1. попытка legacy backend (`nonInteractiveToolExecutor`);
  2. fallback на scheduler backend через `coreToolScheduler` (без hard dependency на legacy module entrypoint).

В metadata bridge добавляется диагностическое поле backend (например, `legacy_non_interactive` / `scheduler_fallback`).

### 4.2 Фасад исполнения tool-call

Добавляется микро-класс фасад (новый файл):
- `GeminiToolExecutorFacade`.

Контракт:
- `execute(config, request, signal): Promise<CompletedToolCall>`.

Реализация:
- если доступен legacy `executeToolCall` — используем его;
- иначе выполняем через scheduler backend (сбор `CompletedToolCall` в совместимом формате).

`GeminiSessionManager` вызывает только фасад и не знает о конкретном backend.

### 4.3 Installer/Provider safety

`GeminiInstaller` и `GeminiProviderAdapter`:
- перед финальной инициализацией провайдера выполняют bridge self-check;
- при module-compatibility ошибке возвращают отдельный reason (не смешивая с `auth_required`);
- автообновление не фиксируется как успешное, если post-update bridge load падает.

---

## 5. Изменяемые модули

- `packages/Gemini_Module/src/runtime/cli-bridge.ts`
- `packages/Gemini_Module/src/runtime/cli-types.ts`
- `packages/Gemini_Module/src/session/gemini-tool-executor-facade.ts` (new)
- `packages/Gemini_Module/src/session/gemini-session-manager.ts`
- `packages/Gemini_Module/src/installer/gemini-installer.ts`
- `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`

Ограничения:
- без изменений стабильных потоков Phase 115/116 (Core continuity lock contract не трогаем).

---

## 6. Тестирование

### 6.1 Unit/Regression

1. loader fallback test: при отсутствии `nonInteractiveToolExecutor` выбирается scheduler backend.
2. facade test: единый `execute` возвращает корректный `CompletedToolCall` для legacy и fallback backend.
3. installer/provider test: compatibility error классифицируется отдельно от auth error.

### 6.2 Targeted runtime smoke

1. Инициализация Gemini provider в установленном окружении.
2. Отправка анкеты (description flow) через Gemini без `UNAVAILABLE`.
3. Базовый tool-call цикл без падения в module-loader.

---

## 7. Гейты и релиз

Обязательные гейты после каждой микрозадачи:
- `./scripts/check-architecture.sh`
- `npx ultracite check`
- `npx ts-prune`
- `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`
- `npm run check:links`
- таргетные сборки:
  - `npm run build --workspace @codeai-hub/gemini-module`
  - `npm run build --workspace @codeai-hub/core`
  - `npm run build:webview`
  - `npm run build:project-manager`
  - `npm run typecheck:webview`

Релизный финал:
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

---

## 8. Решение к утверждению

К реализации предлагается вариант:
- совместимый loader + фасад tool execution + installer self-check,
- затем полный релизный цикл с smoke-валидацией Gemini в установленном provider runtime.
