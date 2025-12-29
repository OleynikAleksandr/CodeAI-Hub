# Plan.md — Project Orchestrator

**Версия:** 1.0
**Дата создания:** 2025-12-28
**Последнее обновление:** 2025-12-28

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

## 1. Правила выполнения

### 1.1 Правила параллелизма

- **Волна** — группа задач, которые можно выполнять одновременно
- **[Агент X]** — логический поток работы
- **"Ждёт:"** — явная зависимость от результатов предыдущей волны
- Следующая волна начинается **только после завершения предыдущей**

### 1.2 Правила задач

- Каждая задача затрагивает **≤ 3 файлов**
- После каждой задачи — **обязательный Git Commit**

### 1.3 Гейты качества (перед каждым коммитом)

```bash
./scripts/check-architecture.sh
npx ultracite check
npx ts-prune
npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"
npm run check:links
npm run build:webview   # или таргетная сборка
```

---

## 2. Волна 1 — Независимые задачи

> Эти задачи не имеют зависимостей друг от друга.
> Можно запустить 3 агентов параллельно.

---

### [Агент A] FlowWizard UI компонент

**Назначение:** Создать React-компонент визарда с кубиками этапов Flow.

#### Task W1.A.1 — Создать базовую структуру FlowWizard

**Цель:** Файловая структура и базовый компонент.

**Файлы:**
- `src/client/ui/src/components/flow-wizard/index.tsx` (новый)
- `src/client/ui/src/components/flow-wizard/flow-stage.tsx` (новый)
- `src/client/ui/src/components/flow-wizard/styles.ts` (новый)

**Критерии готовности:**
- [ ] Компонент рендерится без ошибок
- [ ] Принимает props: `onStageClick`, `activeStage`
- [ ] Отображает 4 этапа: Idea → Spec → Plan → Execute

**Статус:** `DONE`
**Дата:** 2025-12-29
**Commit:** `b61de20`

##### Git Commit: `feat(ui): add flow wizard component structure`

---

#### Task W1.A.2 — Стилизация FlowWizard

**Цель:** Стили для кубиков: active/disabled/hover состояния.

**Файлы:**
- `src/client/ui/src/components/flow-wizard/styles.ts`
- `src/client/ui/src/components/flow-wizard/flow-stage.tsx`

**Критерии готовности:**
- [ ] Active кубик имеет accent цвет
- [ ] Disabled кубики серые с opacity
- [ ] Hover эффект на active кубиках

**Статус:** `IN_PROGRESS`
**Дата:** 2025-12-29
**Commit:**

##### Git Commit: `style(ui): add flow wizard stage styling`

---

### [Агент B] JSON Schema для Idea Collector

**Назначение:** Создать Structured Output схему для агента сбора идей.

#### Task W1.B.1 — Создать idea-collector-schema.json

**Цель:** JSON Schema для направления диалога агента.

**Файлы:**
- `~/.codeai-hub/templates/schemas/idea-collector-schema.json` (новый)

**Критерии готовности:**
- [ ] Поле `conversation_state` с `collected`, `coverage_percent`
- [ ] Поле `next_action` с enum: `ask_question`, `clarify`, `summarize`, `finalize`
- [ ] Поле `suggested_response` для следующего вопроса
- [ ] Schema валидна по JSON Schema Draft-07

**Статус:** `TODO`
**Дата:**
**Commit:**

##### Git Commit: `feat(orchestrator): add idea collector json schema`

---

### [Агент C] Системный промпт Idea Collector

**Назначение:** Инструкция для агента: цель, чек-лист, стиль диалога.

#### Task W1.C.1 — Создать idea-collector-prompt.md

**Цель:** Промпт для Guided Conversation (не анкета!).

**Файлы:**
- `~/.codeai-hub/templates/flows/full-development-flow/idea-collector-prompt.md` (новый)

**Критерии готовности:**
- [ ] Цель: создать Idea.md
- [ ] Чек-лист информации (не порядок вопросов!)
- [ ] Стиль: живая беседа, уточняющие вопросы
- [ ] Критерии завершения: coverage >= 80%

**Статус:** `TODO`
**Дата:**
**Commit:**

##### Git Commit: `feat(orchestrator): add idea collector system prompt`

---

## 3. Волна 2 — После Волны 1

> Эти задачи требуют результатов из Волны 1.
> Начинать только после полного завершения Волны 1.

---

### [Агент A] Интеграция FlowWizard с ProviderPicker

**Ждёт:** FlowWizard UI компонент готов (Волна 1, Агент A)
**Назначение:** Показывать FlowWizard после выбора Codex.

#### Task W2.A.1 — Добавить состояние FlowWizard

**Цель:** Расширить state management для показа визарда.

**Файлы:**
- `src/client/ui/src/app-host/provider-picker-state.ts`

**Критерии готовности:**
- [ ] Новое состояние `flowWizardVisible: boolean`
- [ ] Функция `openFlowWizard(providerId)`
- [ ] Функция `closeFlowWizard()`

**Статус:** `TODO`
**Дата:**
**Commit:**

##### Git Commit: `feat(ui): add flow wizard state management`

---

#### Task W2.A.2 — Интегрировать FlowWizard в AppHost

**Цель:** Условный показ визарда после выбора Codex.

**Файлы:**
- `src/client/ui/src/app-host.tsx`
- `src/client/ui/src/provider-picker.tsx`

**Критерии готовности:**
- [ ] При confirm Codex → показать FlowWizard
- [ ] При confirm других провайдеров → стандартный flow
- [ ] Cancel в визарде → возврат к ProviderPicker

**Статус:** `TODO`
**Дата:**
**Commit:**

##### Git Commit: `feat(ui): integrate flow wizard with provider picker`

---

### [Агент B] Интеграция Idea Collector с Codex SDK

**Ждёт:** Schema + Prompt готовы (Волна 1, Агенты B и C)
**Назначение:** Подключить агента к UI через Codex exec.

#### Task W2.B.1 — Создать IdeaCollectorService

**Цель:** Сервис для запуска и управления агентом.

**Файлы:**
- `src/client/ui/src/services/idea-collector-service.ts` (новый)

**Критерии готовности:**
- [ ] Загружает schema и prompt
- [ ] Метод `startCollection()` запускает Codex exec
- [ ] Метод `continueConversation(userMessage)` для продолжения
- [ ] Обрабатывает Structured Output ответы

**Статус:** `TODO`
**Дата:**
**Commit:**

##### Git Commit: `feat(orchestrator): add idea collector service`

---

## 4. Волна 3 — После Волны 2

> Финальная интеграция всех компонентов.

---

### [Агент A] Полная интеграция Flow

**Ждёт:** FlowWizard интегрирован + IdeaCollectorService готов (Волна 2)
**Назначение:** Связать клик на "Idea" с запуском агента.

#### Task W3.A.1 — Подключить FlowWizard к IdeaCollectorService

**Цель:** End-to-end flow: клик → диалог → Idea.md

**Файлы:**
- `src/client/ui/src/components/flow-wizard/index.tsx`
- `src/client/ui/src/app-host.tsx`

**Критерии готовности:**
- [ ] Клик на "Idea" вызывает `startCollection()`
- [ ] Диалог отображается в UI
- [ ] Ответы агента через Structured Output
- [ ] Финализация генерирует Idea.md

**Статус:** `TODO`
**Дата:**
**Commit:**

##### Git Commit: `feat(ui): connect flow wizard to idea collector agent`

---

## 5. Сценарии проверки

### После Волны 1
1. [ ] FlowWizard рендерится изолированно (storybook/dev)
2. [ ] Schema проходит валидацию
3. [ ] Prompt читается корректно

### После Волны 2
1. [ ] New Session → Codex → видим FlowWizard
2. [ ] New Session → Claude → стандартная сессия
3. [ ] IdeaCollectorService запускает Codex без ошибок

### После Волны 3 (Финальная)
1. [ ] Полный flow: New Session → Codex → Idea → диалог → Idea.md
2. [ ] Idea.md создаётся в `.codeai-hub/orchestrator/`
3. [ ] Structured Output ответы корректно парсятся
4. [ ] UI показывает прогресс диалога

---

## 6. Отклонения от спецификации

> Заполняется **только если** агент был вынужден отойти от плана.

| Task ID | Причина | Решение | Требует обновления Spec |
|---------|---------|---------|------------------------|
| - | - | - | - |

---

## 7. Обновляемые документы

- [ ] `.codeai-hub/orchestrator/idea.md`
- [ ] `doc/Project_Docs/knowledge/Автоматизация Flow разработки на основе Plan.md.md`
- [ ] `doc/Architecture/Architecture.md` (после завершения Волны 3)
- [ ] `README.md` (после успешного тестирования)

---

## 8. Завершение сессии

### Сессия 023 (текущая)

**Session ID:** S023
**Статус:** `in_progress`

### Выполнено
- Волна: подготовительная (документация)
- Tasks: 
  - Создана структура `.codeai-hub/`
  - Создан `idea-template.md`
  - Создан `idea.md` для Project Orchestrator
  - Обновлены документы Flow и Plan шаблон
- Commits: (будут после завершения обсуждения)

### Следующая сессия

**Продолжить с:** W1.A.1 (FlowWizard компонент)
**Обязательно прочитать:**
- `doc/TODO/todo-plan.md`
- `.codeai-hub/orchestrator/idea.md`
- `src/client/ui/src/provider-picker.tsx`

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
