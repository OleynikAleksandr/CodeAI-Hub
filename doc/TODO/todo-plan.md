# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед работой по этому scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/Sessions/Session156.md`
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Каждая микро-задача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново
- Husky gates не обходить (`--no-verify` запрещен)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Перед закрытием stream выполнять таргетные проверки затронутых пакетов/клиентов
- После закрытия release stream: выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, записать результаты в `doc/Sessions/`

---

## Phase 64 — Full gemini-cli-core@0.35.0 compatibility (owner: Oleksandr, updated: 2026-03-25)

### Problem statement
`@google/gemini-cli-core@0.35.0` внёс breaking changes в tool execution API:
1. `nonInteractiveToolExecutor` полностью удалён — наш legacy путь мёртв
2. `CoreToolScheduler` конструктор изменился: `config: Config` → `context: AgentLoopContext`
3. `AgentLoopContext` = `{ config, promptId, toolRegistry, messageBus, geminiClient, sandboxManager }`
4. Добавлены новые `GeminiEventType`: `ModelInfo`, `AgentExecutionStopped`, `AgentExecutionBlocked`

Результат: все tool calls Gemini провайдера падают с `TypeError: Cannot read properties of undefined (reading 'messageBus')`, сессия "зависает".

### Key finding
`Config` в 0.35.0 содержит deprecated getters для `toolRegistry`, `messageBus`, `geminiClient`, `sandboxManager`, `promptId`. Собираем `AgentLoopContext` из Config и передаём в CoreToolScheduler как `context`.

### Stream 1: Fix CoreToolScheduler API + remove legacy executor

1. [DONE] **Rewrite `gemini-tool-executor-facade.ts`** — полная адаптация к CoreToolScheduler@0.35.0:
   - Удалён `SchedulerConstructor` cast-тип — заменён на `SchedulerConstructor035` с `AgentLoopContextLike`
   - Удалён legacy branch (`modules.toolExecutor?.executeToolCall`) — в 0.35.0 его нет
   - В `execute()`: собирается `AgentLoopContext` из `config` (deprecated getters) + `promptId` из `request.prompt_id`
   - Передаётся `{ context, getPreferredEditor, onAllToolCallsComplete }` — убран `onEditorClose`
   (scope: `packages/Gemini_Module/src/session/gemini-tool-executor-facade.ts` — 1 файл)

2. [DONE] Git Commit: `fix(gemini): rewrite tool executor for CoreToolScheduler@0.35.0 AgentLoopContext API` (hash: 5734f1fe)

### Stream 2: Clean up dead legacy code in cli-bridge & cli-types

3. [DONE] **Remove `nonInteractiveToolExecutor` from `cli-bridge.ts` and `cli-types.ts`**:
   - `cli-types.ts`: удалён `toolExecutor`, `GeminiToolExecutionBackend`, `toolExecutionBackend`
   - `cli-bridge.ts`: удалён `findAndLoadOptionalModule`, `isModuleNotFoundError`, `resolveToolExecutionBackend()`, убраны поля из `loadGeminiModules()`
   - `types/index.ts`: удалён `toolExecutionBackend` из `GeminiCliBridgeMetadata`
   - Тесты обновлены: `cli-bridge.test.ts`, `gemini-tool-executor-facade.test.ts`

4. [DONE] Git Commit: `refactor(gemini): remove dead nonInteractiveToolExecutor legacy code` (hash: 21e4eef7)

### Stream 3: Handle new GeminiEventType values

5. [DONE] **Add handlers for new 0.35.0 events** in `message-processor.ts`:
   - `ModelInfo` — emit system event с информацией о модели
   - `AgentExecutionStopped` — emit warning с причиной
   - `AgentExecutionBlocked` — emit warning с причиной

6. [DONE] Git Commit: `feat(gemini): handle ModelInfo, AgentExecutionStopped, AgentExecutionBlocked events` (hash: c025e817)

### Stream 4: Targeted build & verification (Phase 64)

7. [DONE] **Targeted build** — `npm run build --workspace packages/Gemini_Module` — TS fix applied and build clean.
8. [TODO] **Functional test** — запустить Gemini сессию в PM, проверить:
   - tool calls (read_file, run_shell_command) выполняются
   - thoughts отображаются
   - content streaming работает

---

## Phase 65 — Gemini Thought Translator: real-time Russian translation via Flash (owner: Oleksandr, updated: 2026-03-25)

### Problem statement
Gemini (в отличие от Claude и Codex) не выдаёт промежуточные текстовые ответы пользователю. Thoughts приходят на английском, скрыты под плашкой. Пользователь 3-5 минут смотрит пустой экран диалога.

### Solution: Variant B — Gemini Flash translator
Каждый incoming Thought event параллельно (fire-and-forget) отправляется в `gemini-2.0-flash-lite` для перевода на русский. Результат показывается в диалоге как промежуточный ответ агента. Основной поток не блокируется.

Ключевые параметры:
- Thoughts приходят с интервалами 30-90 сек → latency Flash (1-2 сек) не проблема
- Промпт: ~30 токенов инструкции + ~100-200 токенов thought → ~250 токенов вход, ~150 выход
- Стоимость: практически нулевая (Flash-lite бесплатный tier)
- Graceful degradation: если Flash упал — мысль просто не переводится, основная сессия не страдает
- SDK `@google/genai` уже в зависимостях, API ключ у пользователя уже есть

### Stream 1: Create ThoughtTranslatorService

1. [DONE] **Create `thought-translator-service.ts`** (~70 строк):
   - GoogleGenAI клиент, модель gemini-2.0-flash-lite, промпт на английском
   - Fire-and-forget: логирует через reporter, null при сбое, 5 сек timeout

2. [DONE] Git Commit: `feat(gemini): add ThoughtTranslatorService for real-time Russian translation via Flash` (hash: TBD)

### Stream 2: Integrate translator into message-processor

3. [TODO] **Update `message-processor.ts`** — wire ThoughtTranslatorService:
   - В конструкторе: принять и сохранить `ThoughtTranslatorService` (optional)
   - В `handleThoughtEvent()`: после показа thinking-плашки (как сейчас), запустить `translateThought()` через `.then()` (fire-and-forget)
   - При успешном переводе: `emitDialogMessage(session, "assistant", translatedText, promptId)`
   - Пользователь видит: thinking-плашка (англ.) + русская реплика в диалоге
   (scope: `packages/Gemini_Module/src/messaging/message-processor.ts` — 1 файл)

4. [TODO] **Wire service in `gemini-session-manager.ts`** — создать ThoughtTranslatorService при инициализации GeminiMessageProcessor:
   - Получить API ключ из config
   - Создать `ThoughtTranslatorService(apiKey, reporter)`
   - Передать в `GeminiMessageProcessor`
   (scope: `packages/Gemini_Module/src/session/gemini-session-manager.ts` — 1 файл)

5. [TODO] Git Commit: `feat(gemini): integrate thought translation into message processor pipeline` (hash: TBD)

### Stream 3: Targeted build & verification (Phase 65)

6. [TODO] **Targeted build** — `npm run build --workspace packages/Gemini_Module`, verify no TS errors.
7. [TODO] **Functional test** — запустить Gemini сессию в PM, проверить:
   - Thoughts переводятся на русский и появляются в диалоге
   - Thinking-плашка по-прежнему отображает оригинал
   - При ошибке Flash (нет сети, невалидный ключ) — основная сессия не ломается
   - Latency перевода не задерживает основной поток

### Stream 4: Release build

8. [TODO] Update `README.md`, `CHANGELOG.md` for new version — описать:
   - Fix: Gemini tool execution compatibility with gemini-cli-core@0.35.0
   - Feature: Real-time Russian translation of Gemini agent thoughts via Flash
   - New event handlers: ModelInfo, AgentExecutionStopped, AgentExecutionBlocked
   - Cleanup: removed legacy nonInteractiveToolExecutor dead code
9. [TODO] Update `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` — добавить секцию ThoughtTranslatorService, обновить Gemini provider architecture.
10. [TODO] Git Commit: `docs: update README, CHANGELOG, SystemArchitecture for v<new>` (hash: TBD)
11. [TODO] `./scripts/build-all.sh` → version bump + full build.
12. [TODO] `./scripts/build-release.sh --use-current-version` → VSIX.
13. [TODO] Git Commit: `chore(release): bump version to <new_version>` (hash: TBD)
14. [TODO] Create `doc/Sessions/Session157.md`.
