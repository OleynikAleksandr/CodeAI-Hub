# Gemini SDK 0.35.0 Compatibility & Thought Translator Architecture

**Status:** Approved
**Created:** 2026-03-25
**Scope:** Phase 64 + Phase 65 of todo-plan.md
**Owner:** Oleksandr

---

## 1. Context & Problem

### 1.1 Breaking change: gemini-cli-core@0.35.0

Google выпустил `@google/gemini-cli-core@0.35.0`, который сломал наш Gemini provider:

**Удалено:**
- `nonInteractiveToolExecutor` модуль — полностью удалён из SDK. Наш `findAndLoadOptionalModule()` возвращает `null`, legacy путь мёртв.

**Изменено:**
- `CoreToolScheduler` конструктор: вместо `{ config: Config, getPreferredEditor, onEditorClose, onAllToolCallsComplete }` теперь требует `{ context: AgentLoopContext, getPreferredEditor, onAllToolCallsComplete, outputUpdateHandler?, onToolCallsUpdate? }`.
- `onEditorClose` — удалён.

**Добавлено:**
- `AgentLoopContext` interface — dependency injection контейнер:
  ```typescript
  interface AgentLoopContext {
    readonly config: Config;
    readonly promptId: string;
    readonly toolRegistry: ToolRegistry;
    readonly messageBus: MessageBus;
    readonly geminiClient: GeminiClient;
    readonly sandboxManager: SandboxManager;
  }
  ```
- Новые `GeminiEventType`: `ModelInfo`, `AgentExecutionStopped`, `AgentExecutionBlocked`.
- `MessageBus` — event bus для tool confirmation/policy.
- `PolicyEngine` — policy/approval system.
- `Scheduler` (event-driven) — параллельно с `CoreToolScheduler`.

**Результат в нашем приложении:**
Все tool calls Gemini провайдера падают с `TypeError: Cannot read properties of undefined (reading 'messageBus')` при создании `CoreToolScheduler`. Сессия "зависает" — Gemini пытает разные tool calls (read_file → cat → ls → wc), все падают, после 8 итераций — тишина.

### 1.2 UX Problem: отсутствие промежуточных ответов

Gemini (в отличие от Claude и Codex) не выдаёт промежуточные текстовые ответы. SDK предоставляет только `Thought` events (длинные, на английском, скрыты под плашкой). Пользователь 3-5 минут смотрит пустой экран диалога.

---

## 2. Solution Architecture

### 2.1 Phase 64: CoreToolScheduler API fix

**Подход:** Собрать `AgentLoopContext` из `Config` (deprecated getters) и передать в `CoreToolScheduler`.

`Config` в 0.35.0 содержит deprecated getters:
- `config.toolRegistry` → `ToolRegistry`
- `config.messageBus` → `MessageBus`
- `config.geminiClient` → `GeminiClient`
- `config.sandboxManager` → `SandboxManager`
- `config.promptId` → `string` (session ID)

Эти getters помечены `@deprecated`, но работают. Canonical способ — получать `AgentLoopContext` через injection, но в нашем bridge-сценарии Config — единственный источник.

**Файл:** `packages/Gemini_Module/src/session/gemini-tool-executor-facade.ts`

**До (сломано):**
```typescript
const scheduler = new Scheduler({
  config,
  getPreferredEditor: () => {},
  onEditorClose: () => {},        // ← не существует в 0.35.0
  onAllToolCallsComplete: (calls) => { ... },
});
```

**После (фикс):**
```typescript
const context: AgentLoopContext = {
  config,
  promptId: request.prompt_id ?? (config as any).promptId ?? "unknown",
  toolRegistry: (config as any).toolRegistry,
  messageBus: (config as any).messageBus,
  geminiClient: (config as any).geminiClient,
  sandboxManager: (config as any).sandboxManager,
};

const scheduler = new Scheduler({
  context,
  getPreferredEditor: () => undefined,
  onAllToolCallsComplete: (calls) => { ... },
});
```

**Legacy cleanup:**
- Удалить `toolExecutor` из `GeminiCliModules` (всегда null)
- Удалить `GeminiToolExecutionBackend` тип
- Удалить `resolveToolExecutionBackend()` из cli-bridge.ts
- Удалить legacy branch в `execute()` метод facade

**Новые event handlers:**
- `ModelInfo` → system event с информацией о выбранной модели
- `AgentExecutionStopped` → warning (агент остановлен)
- `AgentExecutionBlocked` → warning (агент заблокирован)

### 2.2 Phase 65: Thought Translator Service

**Подход:** Fire-and-forget перевод каждого Thought event через дешёвую модель `gemini-2.0-flash-lite`.

```
Gemini 3.1 Pro (основной агент)
   │
   ├── Thought event ──→ thinking-плашка (как сейчас, англ.)
   │
   └── Thought event ──→ ThoughtTranslatorService [async, fire-and-forget]
                              │
                              ├── GoogleGenAI client (gemini-2.0-flash-lite)
                              ├── Промпт: "Переведи размышление AI-агента на русский.
                              │            Убери вводные слова. Сохрани суть."
                              ├── Timeout: 5 сек
                              └── emit dialog_message(role: "assistant", translatedText)
                                   → пользователь видит русскую реплику в диалоге
```

**Характеристики:**
- Thoughts приходят раз в 30-90 сек → Flash отвечает за 1-2 сек → latency не проблема
- ~250 токенов вход, ~150 выход → стоимость ~0 (бесплатный tier Flash-lite)
- Graceful degradation: ошибка Flash → thought не переводится, основная сессия не страдает
- API ключ тот же, что у основного Gemini провайдера
- SDK `@google/genai` уже в зависимостях

**Новый файл:** `packages/Gemini_Module/src/messaging/thought-translator-service.ts`

```typescript
// Pseudo-interface
class ThoughtTranslatorService {
  constructor(apiKey: string, reporter?: ModuleReporter);
  translateThought(thought: { subject: string; description: string }): Promise<string | null>;
  // Returns null on error (graceful), logs via reporter
}
```

**Интеграция:** `message-processor.ts` → `handleThoughtEvent()`:
1. Показать thinking-плашку (как сейчас)
2. Fire-and-forget: `this.translator?.translateThought(thought).then(text => emitDialogMessage(...))`

**Инициализация:** `gemini-session-manager.ts` → конструктор:
- Получить API ключ из Gemini provider config
- Создать `ThoughtTranslatorService(apiKey, reporter)`
- Передать в `GeminiMessageProcessor` options

---

## 3. Files Affected

### Phase 64 (SDK fix)
| File | Action | Scope |
|------|--------|-------|
| `packages/Gemini_Module/src/session/gemini-tool-executor-facade.ts` | REWRITE | AgentLoopContext, remove legacy |
| `packages/Gemini_Module/src/runtime/cli-types.ts` | EDIT | Remove toolExecutor, toolExecutionBackend |
| `packages/Gemini_Module/src/runtime/cli-bridge.ts` | EDIT | Remove legacy loader, resolveToolExecutionBackend |
| `packages/Gemini_Module/src/messaging/message-processor.ts` | EDIT | Add 3 new event handlers |

### Phase 65 (Thought Translator)
| File | Action | Scope |
|------|--------|-------|
| `packages/Gemini_Module/src/messaging/thought-translator-service.ts` | NEW | ~80-100 lines |
| `packages/Gemini_Module/src/messaging/message-processor.ts` | EDIT | Wire translator |
| `packages/Gemini_Module/src/session/gemini-session-manager.ts` | EDIT | Create & pass translator |

---

## 4. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Config deprecated getters удалят в будущем SDK | Tool executor сломается | Следить за gemini-cli-core releases; при удалении — рефактор на прямое получение AgentLoopContext |
| Flash-lite rate limit на бесплатном tier | Переводы перестанут работать | Graceful degradation — основная сессия не страдает |
| Flash-lite качество перевода | Плохие реплики в диалоге | Промпт настраиваемый, можно корректировать |
| Thoughts приходят слишком часто (< 5 сек) | Спам в диалоге | Можно добавить debounce/throttle позже |

---

## 5. Execution Plan

Детали в `doc/TODO/todo-plan.md` — Phase 64 (4 streams) + Phase 65 (4 streams).

Порядок:
1. Phase 64: SDK fix → legacy cleanup → event handlers → build/test
2. Phase 65: ThoughtTranslatorService → integration → build/test → docs → release
