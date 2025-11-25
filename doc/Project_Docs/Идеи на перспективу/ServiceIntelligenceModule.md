# Service Intelligence Module (SIM)

## Purpose
SIM — служебный стек CodeAI-Hub, выполняющий дополнительные задачи поверх провайдеров. Стартовый сценарий — перевод reasoning-чункoв Codex/Gemini на язык диалога и замена текста в UI/логах. Архитектура должна легко расширяться на анализ запросов, статистику и постоянный LLM-контроль качества.

### Phase A Goals
1. Настройка «Translate reasoning to dialog language» (`disabled`/`dialog-language`) доступна в UI и хранится в `~/.codeai-hub/settings/sim.json`.
2. Codex и Gemini отображают мысли сразу и подменяют текст переводом ≤ 2 секунд после получения результата от SIM.
3. Unified JSONL пишет только финальный текст, если перевод включён; при выключенном режиме сохраняется оригинал.
4. Все вызовы переводчика проходят через SIM Orchestrator (дальнейшие функции будут подключаться в тот же канал).

## Architecture Overview
```
Provider Wrapper (Codex/Gemini)
  └─ submit SimTask(type=ReasoningTranslate, payload=thinking, dialogueLang)
        SIM Orchestrator
           ├─ Capability Registry (поддерживаемые executors)
           └─ Executor Adapter (Gemini Flash Light / Local CLI)
  └─ receive SimResult → emit thinkingTranslated → Remote Bridge → UI / JSONL
```

### Core Components
- **SIM Orchestrator (`core/sim/orchestrator.ts`)** – принимает задачи, управляет таймаутами, ретраями, очередями.
- **Capability Registry (`core/sim/capabilities.ts`)** – описывает исполнителей (название, поддерживаемые языки, стоимость, признак online/offline, feature-флаги).
- **Executor Adapters**:
  - `GeminiFlashLightExecutor` — HTTP/WebSocket клиент Gemini 2.5 Flash Light (Phase A).
  - `LocalTranslatorExecutor` — заглушка для CLI/LLM (Phase B).
- **SIM API**:
  ```ts
  type SimTask = {
    id: string;
    type: "ReasoningTranslate" | "PromptAudit" | "CodeQuality";
    payload: string;
    sourceLanguage: string;
    targetLanguage: string;
    sessionId: string;
    metadata?: Record<string, unknown>;
  };
  type SimResult = {
    taskId: string;
    status: "ok" | "error" | "partial";
    translatedText?: string;
    error?: string;
  };
  submitTask(task: SimTask): Promise<SimResult>;
  subscribeTask(taskId: string, listener: (chunk: SimResult) => void);
  ```
- **Settings Bridge (`core/settings/sim-config.ts`)** – управляет блоком настроек:
  ```json
  {
    "sim": {
      "reasoningTranslation": {
        "mode": "disabled" | "dialog-language",
        "executor": "gemini-flash-light"
      }
    }
  }
  ```

## Data Flow: Reasoning Translation
1. Провайдерский враппер получает chunk `thinking` (английский).
2. Если перевод включён, враппер отправляет `SimTask` в orchestrator и немедленно отображает оригинал.
3. Orchestrator выбирает исполнителя: приоритет `gemini-flash-light`, fallback — локальный executor (когда появится).
4. Результат приходит через `SimResult`, провайдер эмитит событие `thinkingTranslated` в Remote Bridge.
5. Remote Bridge обновляет UI и JSONL (подменяет текст). Если перевода нет в заданный SLA, UI остаётся на оригинале, а core логирует ошибку.

## Integration Points
| Слой | Изменения | Файлы |
| --- | --- | --- |
| Settings | новая секция `sim` + UI-переключатель | `src/client/ui/src/settings`, `core/settings/sim-config.ts` |
| Core | SIM Orchestrator, Capability registry, событие `sim:result` | `packages/core/src/sim/**`, `remote-bridge` |
| Codex/Gemini модули | инъекция SimClient, отправка задач, обработка ответов, запись в JSONL | `packages/Codex_Module`, `packages/Gemini_Module` |
| UI | блок мыслей слушает `thinkingTranslated` и подменяет текст | `src/client/ui/src/dialog-panel` |
| Docs | README/CHANGELOG/SystemArchitecture описывают опцию | соответствующие md |

## Phase Breakdown (для todo-plan)
| Task ID | Описание | Deliverable |
| --- | --- | --- |
| A1 | SIM Orchestrator + Capability Registry + unit tests | `core/sim` модуль + типовки |
| A2 | Gemini Flash Light executor + хранение API key | адаптер + конфиг | 
| A3 | Настройки и Remote Bridge маршрутизация `sim:result` | UI toggle + core wiring |
| A4 | Codex/Gemini integration: отправка `thinking` в SIM, получение перевода, запись JSONL | обновлённые враперы |
| A5 | UI: отображение оригинала и подмена после перевода | webview/standalone |
| A6 | Docs & release notes | README/CHANGELOG/SystemArchitecture/SIM stack |

## Risks & Dependencies
- **Secrets**: требуется безопасно хранить ключ Gemini (использовать существующий secrets storage).
- **Rate limiting**: нужен throttling на уровне SIM (максимум N задач/минуту) и fallback к оригиналу при ошибке.
- **Latency**: при переключении на локальный executor важно не блокировать UI; оркестратор должен поддерживать отмену задач при закрытии сессии.
- **Caching**: при повторном открытии сессии нужно решить, кэшируем ли переводы (open question).

## Testing Strategy
- Unit: распределение задач, таймауты, ретраи SIM Orchestrator.
- Integration: mock Gemini executor, удостовериться, что Codex/Gemini получают `thinkingTranslated` и подменяют текст, JSONL содержит переведённый вариант.
- UI Manual: включить/выключить перевод, проверить, что блок мыслей сначала показывает английский текст, затем автоматически заменяется на русский/украинский.

## Roadmap Beyond Phase A
- **Phase B**: `LocalTranslatorExecutor` (argos-translate или локальная LLM), стратегия `local-first`.
- **Phase C**: Prompt Audit — анализ пользовательских запросов до отправки провайдеру (SIM возвращает чек-лист уточнений).
- **Phase D**: Continuous Code Quality — SIM периодически анализирует изменения в репозитории и выдаёт подсказки до коммита.

## Open Questions
1. Нужно ли кэшировать переводы для повторного отображения (например, хранить в JSONL отдельное поле `translation_source`)?
2. Какая политика приоритетов между типами задач, если позже появятся анализ/статистика?
3. Требуется ли пользовательский выбор fallback (допустить оригинал или скрывать мысль, если перевод сломался)?
