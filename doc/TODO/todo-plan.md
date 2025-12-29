# Plan.md — Project Orchestrator

**Версия:** 1.0
**Дата создания:** 2025-12-28
**Последнее обновление:** 2025-12-29

> Этот документ является **источником истины** для разработки Project Orchestrator.
> Структура плана визуализирует параллелизм — что можно делать одновременно.

---

## 0. Мета-информация

**Проект:** Project Orchestrator (Flow Wizard для CodeAI-Hub)
**Flow:** Full Development Flow
**Провайдер для тестирования:** Codex (Structured Outputs)

### Связанные артефакты
- Idea.md: `.codeai-hub/orchestrator/idea.md`
- Spec.md: `.codeai-hub/orchestrator/spec.md` (будет создан)
- Session Reports: `.codeai-hub/sessions/`
- Шаблоны: `~/.codeai-hub/templates/`

---


## 0.1 Правила ручной параллельной оркестрации (важно)

- Оркестратор выдаёт саб-агенту **входной пакет (выжимку)**, а не полный текст плана.
  В пакете: `assignment` (Task ID/цель/критерии), `scope` (≤3 файла), `must_read` (минимум), `handoff` (как отчитаться).
- Саб-агент выполняет только свой `assignment` и **не начинает** задачи других волн/стримов без нового входного пакета.
- Метки `[Агент A/B/C]` — это **логические стримы**, не «имена процессов». Для реальных исполнителей используйте `Worker-1/Worker-2/Worker-3`.
- После выполнения саб-агент обязан в отчёте указать, какие пункты отметить `DONE` (дата + commit hash).
  - Для изменений в `~/.codeai-hub/templates/` (вне git) фиксируйте `Commit: N/A (global)`.

## 1. Правила выполнения

### 1.1 Правила параллелизма

- **Волна** — группа задач, которые можно выполнять одновременно
- **[Агент X]** — логический поток работы
- **"Ждёт:"** — явная зависимость от результатов предыдущей волны
- Следующая волна начинается **только после завершения предыдущей**

### 1.2 Правила задач

- Каждая задача затрагивает **≤ 3 файлов**
- После каждой задачи — **обязательный Git Commit**

### 1.3 Гейты качества

- Гейты запускаются автоматически git-hook'ом при `git commit` (команды не дублируем в плане, чтобы не тратить контекст).
- Если hook красный — задача не считается выполненной: исправить причину и повторить коммит.
- При необходимости ручного прогона: `./scripts/check-architecture.sh`.
---

## 2. Волна 1 — Независимые задачи

> Эти задачи не имеют зависимостей друг от друга.
> Можно запустить 3 агентов параллельно.

---

### [Stream W1.A] FlowWizard UI компонент

**Назначение:** Создать React-компонент визарда с кубиками этапов Flow.

1. [DONE] W1.A.1 Создать базовую структуру FlowWizard (scope: `src/client/ui/src/components/flow-wizard/index.tsx`, `src/client/ui/src/components/flow-wizard/flow-stage.tsx`, `src/client/ui/src/components/flow-wizard/styles.ts`; DoD: рендер без ошибок; props `onStageClick`/`activeStage`; 4 этапа) (date: 2025-12-29)
2. [DONE] Git Commit: `feat(ui): add flow wizard component structure` (hash: b61de20)
3. [DONE] W1.A.2 Стилизация FlowWizard (scope: `src/client/ui/src/components/flow-wizard/styles.ts`, `src/client/ui/src/components/flow-wizard/flow-stage.tsx`; DoD: active accent; disabled opacity; hover) (date: 2025-12-29)
4. [DONE] Git Commit: `style(ui): add flow wizard stage styling` (hash: efd5dc6)

---

### [Stream W1.B] JSON Schema для Idea Collector

**Назначение:** Создать Structured Output схему для агента сбора идей.

1. [DONE] W1.B.1 Создать `idea-collector-schema.json` (scope: `~/.codeai-hub/templates/schemas/idea-collector-schema.json`; DoD: Draft-07; `next_action=finalize` требует `artifact`) (date: 2025-12-29)
2. [DONE] Git Commit: `feat(orchestrator): add idea collector json schema` (hash: N/A (global))

---

### [Stream W1.C] Системный промпт Idea Collector

**Назначение:** Инструкция для агента: цель, чек-лист, стиль диалога.

1. [DONE] W1.C.1 Создать `idea-collector-prompt.md` (scope: `~/.codeai-hub/templates/flows/full-development-flow/idea-collector-prompt.md`; DoD: RU; агент начинает сам; ответы валидируются schema; `finalize` только после явного «ОК/утверждаю») (date: 2025-12-29)
2. [DONE] Git Commit: `feat(orchestrator): add idea collector system prompt` (hash: N/A (global))

---

## 3. Волна 2 — После Волны 1

> Эти задачи требуют результатов из Волны 1.
> Начинать только после полного завершения Волны 1.

---

### [Stream W2.A] Интеграция FlowWizard с ProviderPicker

**Ждёт:** FlowWizard UI компонент готов (Волна 1, Stream W1.A)
**Назначение:** Показывать FlowWizard после выбора Codex.

1. [DONE] W2.A.1 Добавить состояние FlowWizard (scope: `src/client/ui/src/app-host/provider-picker-state.ts`; DoD: `flowWizardVisible`; `openFlowWizard()`; `closeFlowWizard()`) (date: 2025-12-29)
2. [DONE] Git Commit: `feat(ui): add flow wizard state management` (hash: c2f6c1c)
3. [DONE] W2.A.2 Интегрировать FlowWizard в AppHost (scope: `src/client/ui/src/app-host.tsx`, `src/client/ui/src/provider-picker.tsx`, `src/client/ui/src/app-host/session-region.tsx`; DoD: confirm Codex → FlowWizard; другие провайдеры без изменений; cancel → ProviderPicker; запуск сессии по клику "Idea") (date: 2025-12-29)
4. [DONE] Git Commit: `feat(ui): integrate flow wizard with provider picker` (hash: 2db9709)

---

### [Stream W2.B] Интеграция Idea Collector с Codex SDK

**Ждёт:** Schema + Prompt готовы (Волна 1, Stream W1.B + Stream W1.C)
**Назначение:** Подключить агента к UI через Codex exec.

1. [DONE] W2.B.1a Прокинуть `turnOptions` из UI в core (scope: `src/client/ui/src/core-bridge/core-bridge.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/provider-registry/index.ts`; DoD: `session:message` принимает `turnOptions`, core передаёт их в adapter) (date: 2025-12-29)
2. [DONE] Git Commit: `feat(orchestrator): pass turn options from ui to core` (hash: b33d18d)
3. [DONE] W2.B.1b Прокинуть `turnOptions` до Codex SDK manager (scope: `packages/Codex_Module/src/provider/codex-provider-adapter.ts`, `packages/Codex_Module/src/sdk/codex-sdk-manager.ts`; DoD: adapter принимает options, processor получает их) (date: 2025-12-29)
4. [DONE] Git Commit: `feat(codex): forward turn options to sdk manager` (hash: 0154b62)
5. [DONE] W2.B.1c Поддержать Idea Collector schema/prompt в Codex Structured Output (scope: `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts`, `packages/Codex_Module/src/messaging/message-processor.ts` [+ возможно `packages/Codex_Module/src/messaging/answer-json-stream-extractor.ts`]; DoD: `suggested_response` выводится в SessionView, `artifact` доступен при finalize) (date: 2025-12-29)
6. [DONE] Git Commit: `feat(codex): support idea collector structured output` (hash: 18b4405)
7. [DONE] W2.B.1d Реализовать `IdeaCollectorService` (scope: `src/client/ui/src/services/idea-collector-service.ts` [+ до 2 файлов интеграции]; DoD: `startCollection()`/`continueConversation()`; подставляет schema+prompt; использует текущий SessionView) (date: 2025-12-29)
8. [DONE] Git Commit: `feat(orchestrator): add idea collector service` (hash: dfbae3c)

---

## 4. Волна 3 — После Волны 2

> Финальная интеграция всех компонентов.

---

### [Stream W3.A] Полная интеграция Flow

**Ждёт:** FlowWizard интегрирован + IdeaCollectorService готов (Волна 2, Stream W2.A + Stream W2.B)
**Назначение:** Связать клик на "Idea" с запуском агента.

1. [BLOCKED] W3.A.1 Подключить FlowWizard к IdeaCollectorService (scope: `src/client/ui/src/components/flow-wizard/index.tsx`, `src/client/ui/src/app-host.tsx`; DoD: клик "Idea" вызывает `startCollection()`; диалог в UI; structured output парсится; финализация генерирует `Idea.md`) (blocked_by: W2.B.1)
2. [DONE] Git Commit: `feat(ui): connect flow wizard to idea collector agent` (hash: bbf4af3) — MVP: клик "Idea" создаёт Codex-сессию и отправляет kickoff prompt.

---

## 5. Сценарии проверки

### После Волны 1
- [TODO] FlowWizard рендерится изолированно (storybook/dev)
- [TODO] Schema проходит валидацию
- [TODO] Prompt читается корректно

### После Волны 2
- [TODO] New Session → Codex → видим FlowWizard
- [TODO] New Session → Claude → стандартная сессия
- [TODO] IdeaCollectorService запускает Codex без ошибок

### После Волны 3 (Финальная)
- [TODO] Полный flow: New Session → Codex → Idea → диалог → Idea.md
- [TODO] Idea.md создаётся в `.codeai-hub/orchestrator/`
- [TODO] Structured Output ответы корректно парсятся
- [TODO] UI показывает прогресс диалога

---

## 6. Отклонения от спецификации

> Заполняется **только если** агент был вынужден отойти от плана.

| Task ID | Причина | Решение | Требует обновления Spec |
|---------|---------|---------|------------------------|
| - | - | - | - |

---

## 7. Обновляемые документы

- [TODO] `.codeai-hub/orchestrator/idea.md`
- [TODO] `doc/Project_Docs/knowledge/Автоматизация Flow разработки на основе Plan.md.md`
- [TODO] `doc/Architecture/Architecture.md` (после завершения Волны 3)
- [TODO] `README.md` (после успешного тестирования)

---

## 8. Завершение сессии

### Сессия 023 (текущая)

**Session ID:** S023
**Статус:** `in_progress`

### Выполнено
- Волна 1: UI+контракты (частично в global templates)
- Commits (repo): `b61de20`, `efd5dc6`, `c2f6c1c`, `2db9709`, `bbf4af3`, `00fcd14`, `94727a2`, `ba4b8c0`, `3a50aa2`
- Изменения вне git: `~/.codeai-hub/templates/schemas/idea-collector-schema.json`, `~/.codeai-hub/templates/flows/full-development-flow/idea-collector-prompt.md`

### Следующая сессия

**Продолжить с:** W2.B.1 (IdeaCollectorService)
**Обязательно прочитать:**
- `doc/TODO/todo-plan.md`
- `.codeai-hub/orchestrator/idea.md`
- `src/client/ui/src/provider-picker.tsx`
- `src/client/ui/src/app-host/session-region.tsx`

**Открытые вопросы:**
- Точный формат Session Report (уточняется при отладке)

**Риски:**
- Интеграция с Codex exec может потребовать доработок

---

## 9. Правило продолжения

> При начале новой сессии агент **обязан**:

1. Прочитать этот план
2. Загрузить файлы из раздела "Обязательно прочитать"
3. Найти первую незавершённую задачу в текущей волне
4. Продолжить выполнение
5. При неясностях — задать вопросы пользователю
