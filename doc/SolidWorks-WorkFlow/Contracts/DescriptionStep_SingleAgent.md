# Description Step — Single Agent Final Artifact (Contract / SSOT)

## Scope
Этот документ описывает **канонический контракт** шага Workflow `description`:
- какие артефакты создаются;
- какая сессия запускается;
- какие инварианты должны соблюдаться для корректного перехода к `virtual_simulation`.

Цель шага: получить **достаточно качественное описание продукта**, чтобы следующий шаг (Virtual Simulation) мог строить сценарии использования без догадок и без преждевременной технической детализации.

---

## Legacy (с чем сейчас живём)
Исторически узел `description` работал как связка:
1) пользователь заполняет `questionnaire.md`;
2) one-shot агент пишет `description.md`;
3) Core **авто-стартует** Reviewer;
4) Reviewer в диалоге доводит до `Final_Description.md`.

Это создаёт лишний внутренний подшаг, дублирует шаблоны, усложняет recovery и оставляет «хвосты» автоматизации (`description.md written → auto-reviewer`).

---

## Target Flow (vNext)
Шаг `description` становится **одним агентом** с бесконечной (resume) сессией.

1) Пользователь заполняет анкету.
2) Project Manager запускает **Description Agent** с контекстом (`workspaceSlug`, пути к артефактам).
3) Агент читает `questionnaire.md` и (если указано) документы из `pre_read_documents`.
4) Агент задаёт уточняющие вопросы в чате и итеративно уточняет понимание продукта.
5) После явного подтверждения пользователя (`ОК/утверждаю/approve`) агент записывает финальный артефакт:
   - `.codeai-hub/<workspaceSlug>/description/Final_Description.md`

**Важно:** auto-start Reviewer в рамках шага `description` отсутствует. Standalone Reviewer рассматривается как отдельный будущий архитектурный модуль (см. backlog).

---

## Artifacts (SSOT)
- Анкета:
  - `.codeai-hub/<workspaceSlug>/description/questionnaire.md`
- Финальное описание:
  - `.codeai-hub/<workspaceSlug>/description/Final_Description.md`

### Legacy artifacts (compat only)
- Draft `description.md` (включая варианты в `runs/`) может существовать в старых workspace.
- Он **не является** upstream-источником истины для следующих шагов в новой модели.

---

## Invariants (must-not-break)
1) **Stable final path**: `Final_Description.md` пишется в стабильный путь без `runs/`.
2) **Resume model**: сессия Description должна быть `resume_in_place` (не one-shot).
3) **No auto-reviewer**: запись артефактов не должна триггерить скрытый запуск reviewer-сессии.
4) **Upstream SSOT**: следующий шаг (`virtual_simulation`) читает **только** `Final_Description.md` как upstream (не `description.md`).
5) **No invented facts**: агент опирается на анкету и реально прочитанные файлы; неизвестное фиксирует как вопрос.
6) **Language**: все сообщения и артефакт `Final_Description.md` на русском.
7) **Outdated propagation**: любое изменение `Final_Description.md` должно помечать downstream стадии как `OUTDATED` (используем существующий механизм событий `workflow.artifact.written`).

---

## Description Agent Role (контракт поведения)
Агент должен понять **тип продукта** и сам выбрать структуру описания.

### Минимальные обязательные элементы (для перехода к Virtual Simulation)
`Final_Description.md` должен содержать, в свободной форме (структура адаптивна):
- что это за продукт и какую проблему решает;
- для кого продукт (целевые пользователи);
- 2–4 ключевых сценария использования (человеческим языком);
- ограничения и допущения (например: локальное хранение, офлайн-режим, поддерживаемые ОС);
- явный `out of scope` (что точно не делаем);
- список открытых вопросов, которые надо закрыть на следующих шагах.

### Принцип прогрессии
Шаг 1 допускает «сырое» описание. Нельзя превращать его в спецификацию. Детализация (security/auth/recovery/observability) появляется на поздних шагах.

---

## PM/UI Expectations
- До старта сессии показывается редактор анкеты.
- После старта сессии пользователь видит runtime session UI и может продолжать диалог после перезапуска PM/Core.
- В артефактах узла `description` предпочтительно показывать:
  - `Final_Description.md`, если файл существует;
  - иначе `questionnaire.md`.
- Тексты в UI не должны упоминать `description.md` и auto-reviewer.

---

## Migration / Compatibility Rules
- Отключить auto-start reviewer в Core runtime.
- Перевести Description session на `resume_in_place`.
- Обновить все промпты downstream шагов, которые сейчас требуют `description.md`:
  - Virtual Simulation
  - Diagram Modules
  - Diagram Facades
- Core allowlist/paths/validation для workflow-артефакта Description должны считать каноном `Final_Description.md`.

### Пофайловый migration plan (execution baseline)
1. Core runtime/session lifecycle:
   - `packages/core/src/workflow/runtime/workflow-runtime.ts` — убрать `description.md -> auto reviewer`, оставить watcher-совместимость с legacy draft.
   - `packages/core/src/workflow/runtime/workflow-runtime.test.ts` — удалить/переписать сценарии auto-reviewer, добавить сценарии single-agent resume.
   - `packages/core/src/remote-bridge/handlers/session-request-handler.ts` — `description` по умолчанию в `resume_in_place`, убрать reviewer-only ветвления как обязательные.
2. Artifact path contract (Core):
   - `packages/core/src/workflow/paths/workflow-paths-types.ts`
   - `packages/core/src/workflow/paths/workflow-artifact-paths.ts`
   - `packages/core/src/remote-bridge/handlers/http-api-router.ts`
   - Цель: `description` stage canonical file = `Final_Description.md`; `description.md` только для чтения legacy/workspace migration.
3. PM/UI wiring:
   - `src/client/project-manager/services/prompt-pack-builder.ts`
   - `src/client/project-manager/services/idea-collector-submit-service.ts`
   - `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`
   - Цель: запись сразу в `.codeai-hub/<workspaceSlug>/description/Final_Description.md` без `runs/` и без reviewer-phase UX.
4. Downstream prompts/templates:
   - `packages/core/src/templates/source/virtual-simulation-prompt.md`
   - `packages/core/src/templates/source/modules-diagram-prompt.md`
   - `packages/core/src/templates/source/facades-graph-prompt.md`
   - Цель: upstream source of truth только `Final_Description.md`.
5. Legacy guardrails (обязательная обратная совместимость):
   - Старые workspace с `description.md`/`runs/*` не должны ломать gating, continuity и чтение history.
   - Late-write legacy draft не должен понижать шаг относительно уже существующего `Final_Description.md`.

---

## Related SSOT
- `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md` (шаги 1–6)
- `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md` (legacy, подлежит обновлению)
- `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
- `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
