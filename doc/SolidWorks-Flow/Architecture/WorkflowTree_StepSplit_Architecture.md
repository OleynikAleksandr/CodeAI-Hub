# Архитектура: Split шагов Workflow Tree и раздельные агенты

**Date:** 2026-01-17
**Status:** Draft
**Target release:** TBD

---

## 1. Проблема
Текущая схема объединяет **два артефакта в один шаг/агент**, из‑за чего:
- ответ может превышать лимит токенов и не доходить до structured output,
- пайплайн `artifact-upsert` не срабатывает, а backup не создаётся,
- правки становятся двусмысленными (непонятно, к какому артефакту относится уточнение).

Это архитектурная причина, а не “ошибка обработки” — нужно убрать сам риск, а не ловить его пост‑фактум.

---

## 2. Цели
1. **Один шаг = один артефакт = один агент.**
2. Убрать сущность `Idea` из терминологии, шаблонов и путей.
3. Развести `Диаграммы` на два независимых шага.
4. Развести runs по шагам и привести структуру `.codeai-hub/` к строгой и прозрачной.

---

## 3. Новые шаги и агенты (MVP)

| Step (UI) | stageId | Агент | Артефакт | Slot |
|---|---|---|---|---|
| Описание | `description` | Description Agent | `description.md` | `workspace.description` |
| Virtual Simulation | `virtual_simulation` | Virtual Simulation Agent | `virtual-simulation.md` | `workspace.virtual_simulation` |
| Диаграмма модулей | `diagram_modules` | Module Diagram Agent | `modules-diagram.mmd` | `diagram.modules` |
| Диаграмма фасадов | `diagram_facades` | Facades Diagram Agent | `facades-graph.mmd` | `diagram.facades` |

Ключевой инвариант: **агент не пытается писать два артефакта в одном ответе**.

---

## 4. Runs и пути артефактов
Каждый шаг имеет собственный корень и историю runs:
- `.codeai-hub/<workspaceSlug>/description/runs/<runSlug>/description.md`
- `.codeai-hub/<workspaceSlug>/virtual_simulation/runs/<runSlug>/virtual-simulation.md`
- `.codeai-hub/<workspaceSlug>/diagram_modules/runs/<runSlug>/modules-diagram.mmd`
- `.codeai-hub/<workspaceSlug>/diagram_facades/runs/<runSlug>/facades-graph.mmd`

Это убирает смешивание артефактов и упрощает диагностику.

---

## 5. Гейты и порядок шагов
Последовательность фиксируется на уровне workflow‑gates:
`Описание → Virtual Simulation → Диаграмма модулей → Диаграмма фасадов → Spec → Plan → Execute`.

`Module: Spec` активен **только** после `Workspace: Диаграмма фасадов`.

---

## 6. Template namespace (новый)
Убираем `full-development-flow/idea` и вводим **шаговые namespaces**:

```
~/.codeai-hub/templates/
├── description/
│   ├── description-collector-prompt.md
│   ├── description-collector-schema.json
│   ├── description-template.md
│   └── questionnaire-template.md
├── virtual_simulation/
│   ├── virtual-simulation-prompt.md
│   ├── virtual-simulation-schema.json
│   └── virtual-simulation-template.md
├── diagram_modules/
│   ├── modules-diagram-prompt.md
│   ├── modules-diagram-schema.json
│   └── modules-diagram-template.mmd
└── diagram_facades/
    ├── facades-graph-prompt.md
    ├── facades-graph-schema.json
    └── facades-graph-template.mmd
```

Старые шаблоны сохраняются как legacy (например `~/.codeai-hub/templates/_legacy/idea-<timestamp>/`) и не используются в новых сессиях.

---

## 7. Миграция и совместимость
- Старые `idea`‑шаблоны не переиспользуются, но сохраняются как legacy.
- Старые runs остаются на диске, но новые сессии используют новые директории.
- UI и Core обновляются одновременно (gates, контракты, template sync).

---

## 8. Вывод
Разделение шагов и агентов **устраняет первопричину** сбоев сохранения:
- нет длинных “двойных” ответов,
- все артефакты финализируются предсказуемо,
- исправления адресуются к конкретному шагу без двусмысленности.
