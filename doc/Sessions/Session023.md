# Session 023 — Project Orchestrator Foundation

**Date:** 2025-12-28 18:30 (CET)
**Branch:** main
**Version:** 1.1.359

---

# 1. Work Done in This Session

## Work summary
- Обсуждена и задокументирована концепция **Project Orchestrator** — модуля автоматизации Flow разработки
- Создана файловая структура `.codeai-hub/` для проектных артефактов
- Создан первый артефакт **Idea.md** для Project Orchestrator
- Обновлены ключевые документы концепции до версии 2.0
- Введён формат плана с **Волнами** для визуализации параллелизма

## Key decisions made
1. **Название модуля:** Project Orchestrator
2. **Инверсия ролей:** AI задаёт вопросы → генерирует артефакты → Пользователь утверждает
3. **Guided Conversation:** живая беседа вместо жёсткого опросника
4. **Волны параллелизма:** структура плана = визуализация (не метки!)
5. **Провайдеры:** Codex/Claude через Structured Outputs, Gemini — только инструкции

## Git commits
- `5653f67 feat(orchestrator): add Project Orchestrator foundation and wave-based plan`

---

# 2. Created Artifacts

## Глобальные шаблоны
```
~/.codeai-hub/templates/
├── flows/full-development-flow/
│   └── idea-template.md
└── schemas/
    └── (будут созданы в Волне 1)
```

## Проектная структура
```
.codeai-hub/
├── orchestrator/
│   └── idea.md          ← Первый артефакт!
├── sessions/
├── knowledge/
└── ideas/
```

## Обновлённые документы
- `doc/Project_Docs/knowledge/Автоматизация Flow разработки на основе Plan.md.md` (v2.0)
- `doc/Project_Docs/knowledge/Образец Plan.md.md` (v2.0)
- `doc/TODO/todo-plan.md` (формат с Волнами)

---

# 3. Plan Structure Overview

```
Волна 1 — Независимые задачи (3 агента параллельно)
├── [Агент A] FlowWizard UI компонент
│   ├── W1.A.1 — Базовая структура (3 файла)
│   └── W1.A.2 — Стилизация (2 файла)
├── [Агент B] JSON Schema
│   └── W1.B.1 — idea-collector-schema.json
└── [Агент C] Системный промпт
    └── W1.C.1 — idea-collector-prompt.md

Волна 2 — После Волны 1
├── [Агент A] Интеграция FlowWizard → ProviderPicker
│   ├── W2.A.1 — Состояние FlowWizard
│   └── W2.A.2 — Интеграция в AppHost
└── [Агент B] Интеграция Idea Collector с Codex SDK
    └── W2.B.1 — IdeaCollectorService

Волна 3 — После Волны 2
└── [Агент A] Полная интеграция
    └── W3.A.1 — Подключить FlowWizard к агенту
```

---

# 4. Instructions for Next Session

## Required documents to review before work
1. `doc/TODO/todo-plan.md` — **ГЛАВНЫЙ ДОКУМЕНТ**, содержит план с волнами
2. `.codeai-hub/orchestrator/idea.md` — описание модуля Project Orchestrator
3. `doc/Project_Docs/knowledge/Автоматизация Flow разработки на основе Plan.md.md` — концепция v2.0
4. `src/client/ui/src/provider-picker.tsx` — текущий UI выбора провайдера
5. `src/client/ui/src/app-host.tsx` — главный компонент приложения

## How to start implementation

### Вариант A: Один агент последовательно
1. Начать с **W1.A.1** — создать FlowWizard компонент
2. Продолжить по порядку задач в Волне 1
3. После завершения Волны 1 — перейти к Волне 2

### Вариант B: Три агента параллельно (оптимально)
- **Агент A:** W1.A.1 → W1.A.2 (FlowWizard UI)
- **Агент B:** W1.B.1 (JSON Schema)
- **Агент C:** W1.C.1 (Системный промпт)

После завершения Волны 1 всеми агентами — переход к Волне 2.

## First task details (W1.A.1)

**Цель:** Создать базовую структуру FlowWizard компонента

**Файлы для создания:**
- `src/client/ui/src/components/flow-wizard/index.tsx`
- `src/client/ui/src/components/flow-wizard/flow-stage.tsx`
- `src/client/ui/src/components/flow-wizard/styles.ts`

**Референс для стилей:**
- `src/client/ui/src/provider-picker.tsx` — аналогичный UI паттерн
- `src/client/ui/src/components/settings/` — примеры стилизации

---

# 5. Context for AI Agent

## Что такое Project Orchestrator
Модуль автоматизации процесса разработки, где:
- AI-агенты ведут пользователя через формализованные этапы (Flow)
- Агент задаёт вопросы для создания артефактов (Idea → Spec → Plan)
- Structured Outputs гарантируют качество ответов агента
- План содержит волны для параллельного выполнения задач

## Flow разработки (4 артефакта)
1. **Idea.md** — агент собирает требования через живую беседу
2. **Spec.md** — архитектура, классы, контракты
3. **Plan.md** — исполняемый план с волнами
4. **Code + Reports** — реализация с гейтами качества

## Ключевая идея UI
После нажатия "New Session" → выбора Codex → появляется **FlowWizard** с кубиками этапов:
```
[ Idea ] → [ Spec ] → [ Plan ] → [ Execute ]
   ↑
   └── только этот активен, остальные disabled
```

Клик на "Idea" → запускает Codex агента с Structured Output для сбора идеи.

---

# 6. Open Questions (to resolve during implementation)

- [ ] Точный формат Structured Output для Idea Collector (уточнить при создании schema)
- [ ] Механизм отображения диалога с агентом в UI
- [ ] Сохранение Idea.md — через агента или отдельный сервис?

---

# 7. Risks

- Интеграция с Codex exec может потребовать доработок в message-processor
- UI Flow Wizard должен корректно работать с существующим provider-picker flow

