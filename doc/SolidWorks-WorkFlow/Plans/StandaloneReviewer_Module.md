# Standalone Reviewer Module — Architecture Contract (Draft / SSOT candidate)

**Status:** Draft (awaiting user approval)
**Updated:** 2026-02-28
**Owner:** Oleksandr + Codex

---

## 1) Назначение модуля

`Standalone Reviewer` — отдельный, вручную запускаемый модуль рецензирования, который работает поверх уже существующих workflow-артефактов.

Ключевая цель: дать пользователю инструмент глубокой проверки и улучшения артефактов без возврата к legacy-модели, где reviewer был обязательной внутренней фазой шага `description`.

---

## 2) Проблема, которую решает модуль

После перехода на `Description (single-agent)` в базовом workflow больше нет встроенного reviewer-шага. Это упростило основной поток, но оставило потребность в дополнительной экспертной проверке:

- когда нужно критически проверить `Final_Description.md` перед переходом дальше;
- когда нужно провести quality-review уже готового `virtual-simulation.md` или диаграмм;
- когда нужен review «по запросу», а не как обязательный этап для всех.

---

## 3) Позиция в workflow (boundary)

### 3.1 Базовый workflow не меняется

Каноническая цепочка 1→6 остаётся прежней:

1. Description
2. Virtual Simulation
3. Diagram Modules
4. Diagram Facades
5. Module Specifications
6. TODO + Implementation

### 3.2 Reviewer как надстройка

`Standalone Reviewer` — это **out-of-band модуль**:

- не является обязательным шагом chain 1→6;
- не стартует автоматически от записи артефакта;
- запускается только вручную пользователем;
- может быть применён к любому stage-артефакту.

---

## 4) Контракт запуска (manual trigger)

### 4.1 Обязательные входы запуска

- `workspaceSlug`
- `targetStage` (например: `description`, `virtual_simulation`, `diagram_modules`, `diagram_facades`)
- `targetArtifactPath` (абсолютный и относительный путь)
- `providerId` (Claude/Codex/Gemini)

### 4.2 Опциональные входы

- `reviewGoal` (что именно проверить: полнота, согласованность, риски, тестопригодность и т.д.)
- `constraints` (например: не менять структуру документа, фокус только на рисках)

### 4.3 Инвариант запуска

- Запуск всегда manual.
- Событие записи исходного артефакта само по себе reviewer-сессию не запускает.

---

## 5) Артефакты reviewer-модуля

Для каждого target stage модуль создаёт собственный каталог:

- `.codeai-hub/<workspaceSlug>/reviewer/<targetStage>/`

Канонический output:

- `.codeai-hub/<workspaceSlug>/reviewer/<targetStage>/review-report.md`

Содержимое `review-report.md` (минимум):

- краткое резюме;
- список найденных проблем/рисков (приоритет, impact);
- конкретные рекомендации;
- секция `Open Questions`;
- секция `Approval/Next Action`.

Исходный артефакт (`targetArtifactPath`) по умолчанию read-only.

---

## 6) Сессионная модель

- Reviewer-сессия должна быть `resume_in_place`.
- Для каждого `targetStage + providerId` модуль может переиспользовать существующую reviewer-сессию (reopen), если она уже есть.
- При отсутствии сессии создаётся новая.

Инвариант:

- Late responses от старых reviewer-сессий не должны перезаписывать более новый `review-report.md`.

---

## 7) Применение правок (apply semantics)

По умолчанию reviewer выдаёт рекомендации и не изменяет upstream-артефакт автоматически.

Изменение `targetArtifactPath` допускается только по явному подтверждению пользователя (`apply/update target artifact`).

Инварианты:

1. Без явного user confirm — только `review-report.md`.
2. При apply изменения исходного артефакта должны идти через существующие механизмы записи stage-артефактов, чтобы корректно срабатывал `OUTDATED` downstream.

---

## 8) PM/UI контракт (минимальный)

UI должен поддерживать:

- кнопку/действие `Start Reviewer` на уровне выбранного stage;
- повторное открытие активной reviewer-сессии;
- быстрый переход к `review-report.md`;
- явное разделение действий:
  - `Review only` (без изменения upstream)
  - `Apply to target artifact` (только после confirm)

---

## 9) Core/runtime контракт (минимальный)

Core должен гарантировать:

- корректную маршрутизацию reviewer-сессий независимо от live `sessionId` (через существующую dialog routing модель);
- отдельный контур хранения артефактов reviewer (`.codeai-hub/.../reviewer/...`);
- отсутствие auto-trigger reviewer при обычной записи workflow-артефактов.

---

## 10) Совместимость

- Legacy reviewer-цепочка внутри шага `description` остаётся только в режиме совместимости старых workspace.
- Новый `Standalone Reviewer` не должен ломать текущий single-agent поток `questionnaire.md -> Final_Description.md`.

---

## 11) Non-goals текущей фазы

В этом документе не фиксируются:

- детальный UI дизайн reviewer-панели;
- финальные prompt-файлы reviewer-агентов;
- runtime-реализация и миграция snapshot схем.

Это будет раскрыто после утверждения архитектурной границы.

---

## 12) Связанные SSOT документы

- `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
- `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md`
- `doc/TODO/todo-plan.md`

---

## 13) Критерии утверждения архитектуры (Design Gate)

Архитектура считается утверждённой, когда пользователь явно подтверждает:

1. Reviewer остаётся manual-only и не возвращается как обязательная внутренняя фаза `description`.
2. `review-report.md` принимается как канонический output reviewer-модуля.
3. Apply в upstream-артефакт выполняется только по explicit user confirm.
4. После apply сохраняется существующий контракт `OUTDATED` propagation.
