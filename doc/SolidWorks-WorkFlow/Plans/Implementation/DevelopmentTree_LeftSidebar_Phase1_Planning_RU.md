# Development Tree Left Sidebar Phase 1 Planning

**Status:** Active planning source
**Created:** 2026-05-20
**Owner:** Oleksandr + Codex
**Scope:** спроектировать первую фазу изменений левого sidebar Project Manager для отображения Development Tree implementation lifecycle: `Module / Facade Specification`, вложенный `Implementation`, worker child nodes и Integration node.

## 1. Цель документа

Этот planning-документ должен описать первую реализационную фазу UI-изменений в левом sidebar Project Manager.

Фокус Phase 1:

- структура отображения Development Tree после `Quality Gates Baseline`;
- правила вложенности узлов;
- правила подсветки ободком только для узлов с детьми;
- читаемость длинных имен без обрезки;
- отсутствие дублирования соседних шагов в `Sessions` и `Artifacts`;
- минимальный Core/read-model contract, который нужен sidebar для отображения принятой схемы;
- нарезка будущей implementation work на микро-задачи.

## 2. Принятый baseline

Baseline взят из принятого planning source:

- `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_Implementation_Lifecycle_Planning_RU.md`

Ключевая принятая иерархия:

```text
Product Part
└─ Cluster
   └─ Module
      └─ Module / Facade Specification
         └─ Implementation
            ├─ Worker Task / Agent Run 1
            ├─ Worker Task / Agent Run 2
            ├─ Worker Task / Agent Run 3
            └─ Integration
```

## 3. Вопросы для детализации

- Какие поля Core должен добавить в Development Tree snapshot, чтобы sidebar не вычислял lifecycle truth локально?
- Как sidebar отличает structural nodes от operation nodes?
- Как sidebar получает дочерние worker nodes после acceptance `implementation-todo-plan.md`?
- Нужно ли в Phase 1 показывать worker nodes как placeholders до фактического старта worker sessions?
- Какой минимальный visual state нужен для accepted/available/locked без текстовых badges поверх названий?
- Какой responsive width должен получить sidebar, чтобы длинные имена не обрезались?

## 4. Черновая структура будущего плана

1. Current PM sidebar behavior.
2. Target Development Tree node model.
3. Sidebar visual rules.
4. Session/artifact routing rules.
5. Core snapshot/read-model additions.
6. Implementation slicing by files/modules.
7. Verification and user acceptance checklist.

## 5. Не входит в Phase 1

- создание worker orchestration runtime;
- JSON schema `codeai-implementation-plan-v1`;
- execution of parallel agents;
- отдельный review/test workflow;
- release build.
