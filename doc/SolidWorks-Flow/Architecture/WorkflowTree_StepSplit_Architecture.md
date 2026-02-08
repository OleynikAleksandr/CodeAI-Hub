# Архитектура: Split шагов Workflow Tree и раздельные агенты

**Date:** 2026-01-17
**Updated:** 2026-02-01 (release 1.1.493)
**Status:** Draft
**Target release:** 1.1.493+

---

## 1. Проблема
Текущая схема объединяет **два артефакта в один шаг/агент**, из‑за чего:
- ответ может превышать лимит токенов и не доходить до structured output,
- пайплайн `artifact-upsert` не срабатывает, а backup не создаётся,
- правки становятся двусмысленными (непонятно, к какому артефакту относится уточнение).

Это архитектурная причина, а не “ошибка обработки” — нужно убрать сам риск, а не ловить его пост‑фактум.

---

## 2. Цели
1. **Один шаг = один финальный артефакт (source of truth).**
2. Убрать сущность `Idea` из терминологии, шаблонов и путей.
3. Развести `Диаграммы` на два независимых шага.
4. Полностью убрать сущность `runs` и заменить повторные попытки на `Edit Step` (перезапись текущего артефакта).

---

## 3. Новые шаги и агенты (MVP)

| Step (UI) | stageId | Агент | Артефакт | Slot |
|---|---|---|---|---|
| Описание | `description` | Description Agent (one-shot/no-resume) → Reviewer Agent (auto, resume) | `Final_Description.md` | `workspace.description` |
| Virtual Simulation | `virtual_simulation` | Virtual Simulation Agent | `virtual-simulation.md` | `workspace.virtual_simulation` |
| Диаграмма модулей | `diagram_modules` | Module Diagram Agent | `modules-diagram.mmd` | `diagram.modules` |
| Interface Map (Диаграмма фасадов) | `diagram_facades` | Facades Diagram Agent | `facades-graph.mmd` | `diagram.facades` |

Ключевой инвариант: **агент не пытается писать два артефакта в одном ответе**.

UI правило (для всех шагов):
- каждый `Step` в Workflow Tree — раскрываемый узел с веткой “артефакты + сессии”, чтобы прогресс переживал перезапуск (см. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`).
- история диалога сессий хранится в unified-session JSONL и должна восстанавливаться после рестарта Core/PM (см. `doc/SolidWorks-Flow/knowledge/UnifiedSession_History_WorkspaceScoping.md`).

Примечание для `description`:
- `description.md` существует как **черновик** (run output) между Description Agent и Reviewer.
- `Final_Description.md` — **единственный** финальный артефакт, который читают downstream шаги.
- `Description Agent` после финального ответа переходит в terminal/read-only (input не unlock); дальнейшее общение идёт только через `Reviewer`.

UI последствия:
- В дереве разработки Project Manager вместо двух узлов (Описание/Диаграмма) отображаются четыре: Описание, Virtual Simulation, Диаграмма модулей, Диаграмма фасадов.
- В верхнем сайдбаре Project Manager вместо двух иконок появляются четыре, по одной на каждый шаг.

---

## 4. Пути артефактов (без runs)
Каждый шаг имеет собственный корень и **единый** текущий артефакт:
- `.codeai-hub/<workspaceSlug>/description/description.md` (draft; временный файл между Description Agent и Reviewer)
- `.codeai-hub/<workspaceSlug>/description/Final_Description.md`
- `.codeai-hub/<workspaceSlug>/virtual_simulation/virtual-simulation.md`
- `.codeai-hub/<workspaceSlug>/diagram_modules/modules-diagram.mmd`
- `.codeai-hub/<workspaceSlug>/diagram_facades/facades-graph.mmd`

Это убирает смешивание артефактов и упрощает диагностику.

---

## 5. Гейты и порядок шагов
Последовательность фиксируется на уровне workflow‑gates:
`Описание → Virtual Simulation → Диаграмма модулей → Interface Map (Диаграмма фасадов) → Spec → Plan → Execute`.

`Module: Spec` активен **только** после `Workspace: Диаграмма фасадов`.

---

## 6. Template namespace (новый)
Убираем `full-development-flow/idea` и вводим **шаговые namespaces**:

```
~/.codeai-hub/templates/
├── description/
│   ├── description-collector-prompt.md
│   ├── description-template.md
│   └── questionnaire-template.md
├── virtual_simulation/
│   ├── virtual-simulation-prompt.md
│   └── virtual-simulation-template.md
├── diagram_modules/
│   ├── modules-diagram-prompt.md
│   └── modules-diagram-template.mmd
└── diagram_facades/
    ├── facades-graph-prompt.md
    └── facades-graph-template.mmd
```

Старые шаблоны удалены и не используются в новых сессиях.

---

## 7. Миграция и совместимость
- Старые `idea`‑шаблоны не переиспользуются.
- Старые `runs/*` считаются legacy и подлежат миграции/удалению по мере вычистки кода.
- UI и Core обновляются одновременно (gates, контракты, template sync).

---

## 8. Вывод
Разделение шагов и агентов **устраняет первопричину** сбоев сохранения:
- нет длинных “двойных” ответов,
- все артефакты финализируются предсказуемо,
- исправления адресуются к конкретному шагу без двусмысленности.
