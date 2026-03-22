# Session 126 — Workflow Glossary Regression Handoff

**Date:** 2026-03-22 16:41 (CET)
**Branch:** main
**Version:** 1.1.763

---

# 1. Work Done in This Session

## Work summary
- Продолжено live regression-тестирование уже на релизе `1.1.763`, но без новых code changes.
- Зафиксирован новый testing-driven scope: словарь workflow и diagram vocabulary сами стали accepted system-level finding, а не только побочным UX-наблюдением.
- Создан новый planning-doc `doc/SolidWorks-WorkFlow/Plans/WorkflowGlossary_TestingFeedback_Architecture.md`.
- Завершённый план `Phase 27` заархивирован в `doc/TODO/Archive/todo-plan-up-to-phase27-2026-03-22.md`.
- Активный `doc/TODO/todo-plan.md` заменён новым `Phase 28 — Workflow Glossary Regression Follow-Up`.
- В новый план добавлены не только glossary fixes, но и два дополнительных stream:
  - `Role field simplification / DSL redesign`
  - `Explicit Module labeling in diagram UI`

## Accepted findings captured in planning

### 1. Product Part vocabulary drift
- В user-facing glossary используется длинный и неканонический термин `самостоятельная часть продукта`.
- В diagram DSL каноническая сущность уже называется `Product Part`.
- Пользователю не объяснено, что `Product Part` — это верхний уровень модели.

### 2. Product Part role explanation drift
- Пользователю не объяснено, что `shell`, `application`, `runtime`, `provider`, `external` — это роли `Product Part`, а не отдельные уровни архитектуры.
- В коде DSL роль `application` уже поддерживается, но user-facing reference всё ещё её не перечисляет.

### 3. Role field may be over-engineering
- Возник системный вопрос: делает ли обязательное поле `Role` продукт лучше, или это лишняя жёсткость DSL.
- Текущий прагматический вывод: `Product Part / Cluster / Module / Relations` важнее, чем `Role`, поэтому поле `Role` теперь выделено как кандидат на redesign (optional/remove), а не на очередное латание enum.

### 4. Module identity lost in diagram UI
- В diagram UI `Product Part` подписан явно.
- `Cluster` подписан явно.
- `Module` как сущность визуально потерян: пользователь видит только `service` / `store` / `library`, то есть `Kind`, а не сам `Module`.
- Это зафиксировано как отдельный user-facing diagram finding.

## Live testing insights captured for next work
- Пользовательский принцип, который теперь считается guiding rule для этого scope:
  - если термин, поле, алгоритм или контракт не делает продукт лучше, это кандидат на упрощение/удаление;
  - нельзя бесконечно расширять словарь только потому, что очередному конкретному продукту не хватает ещё одной роли.
- Для честного greenfield regression agreed principle:
  - не подсказывать агенту структуру только потому, что она уже известна по реальному CodeAI Hub;
  - оценивать diagram/result через structural smells, понятные пользователю без знания кода.

## Important live clarification from the ongoing test
- Во время текущего живого теста пользователь ответил агенту `Diagram Modules`, что:
  - `VS Code Extension` — это в первую очередь дистрибуция/установка + `Settings`;
  - `Standalone Project Manager` — это `Application`, а не `service`;
  - `artifact-template-library` не должен смешиваться с `project-artifact-store`;
  - `project-artifact-store` — это workspace-specific source of truth проекта;
  - `artifact-template-library` — shared runtime-owned system template layer;
  - в MVP сейчас только три provider-а, но архитектура должна масштабироваться на будущие provider modules.
- Эти разъяснения важны как часть текущего regression dialogue, но пока не оформлены как code/doc fix в репозитории.

## Current uncommitted workspace state
- ВАЖНО: на момент завершения этой сессии рабочее дерево НЕ чистое. Есть только документные изменения:
  - `doc/TODO/todo-plan.md`
  - `doc/SolidWorks-WorkFlow/Plans/WorkflowGlossary_TestingFeedback_Architecture.md`
  - `doc/TODO/Archive/todo-plan-up-to-phase27-2026-03-22.md`
  - `doc/Sessions/Session126.md` (THIS REPORT)
- Никаких code changes в этой сессии не вносилось.

## Git commits
- В этой сессии новых commit-ов НЕ было.
- Для восстановления последнего подтверждённого baseline обязательно просмотреть через `git show --stat` и `git show`:
  - `b4374dd4 docs(session): record 1.1.763 regression feedback release`
  - `705808b2 chore(release): prepare next regression feedback release`
  - `3beba43e docs(plan): sync diagram hotfix progress`
  - `f8332a5c fix(diagram-ui): align source pending-state copy with workflow`
  - `cf934bdd fix(diagram-prompts): dedupe prompt appendix sources`
  - `a98409dc docs(plan): sync description help copy progress`
  - `a83448bd fix(description): align help copy with provider picker flow`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `README.md`
3. `doc/SolidWorks-WorkFlow/README.md`
4. `doc/SolidWorks-WorkFlow/Docs_Index.md`
5. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
6. `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
7. `doc/SolidWorks-WorkFlow/Plans/WorkflowGlossary_TestingFeedback_Architecture.md`
8. `doc/TODO/todo-plan.md`
9. `doc/Sessions/Session125.md`
10. `doc/Sessions/Session126.md` (THIS REPORT)

## Git context recovery before coding
- Обязательно просмотреть через `git show --stat <hash>` и `git show <hash>`:
  - `b4374dd4`
  - `705808b2`
  - `3beba43e`
  - `f8332a5c`
  - `cf934bdd`
  - `a83448bd`
- Смысл: восстановить не только glossary scope, но и то, на каком зафиксированном release baseline (`1.1.763`) строится этот новый planning turn.

## First required sanity check
- Сразу после старта следующей сессии проверить `git status --short`.
- Ожидаемое состояние:
  - `M doc/TODO/todo-plan.md`
  - `?? doc/SolidWorks-WorkFlow/Plans/WorkflowGlossary_TestingFeedback_Architecture.md`
  - `?? doc/TODO/Archive/todo-plan-up-to-phase27-2026-03-22.md`
  - `?? doc/Sessions/Session126.md`
- Если дерево отличается, сначала понять причину, потом продолжать.

## Exact next step
- Первый рабочий шаг следующей сессии:
  - зафиксировать planning baseline commit для `Phase 28`.
- Целевой commit message:
  - `docs(plan): start workflow glossary regression scope`

## Scope to continue from
- Активный scope больше не ограничивается только glossary drift.
- На старте следующей сессии уже согласованы 4 направления:
  1. `Product Part` как канонический верхний уровень вместо `самостоятельная часть продукта`
  2. объяснение ролей `Product Part`
  3. пересмотр обязательного поля `Role` как кандидата на simplification/removal
  4. возврат явного `Module` в diagram UI

## Plans for next session
- Закоммитить planning baseline `Phase 28`.
- Начать первый stream `Product Part glossary alignment`.
- Затем перейти к stream `Product Part role vocabulary expansion`.
- После этого решить, является ли `Role`:
  - обязательным полезным полем,
  - optional field,
  - или кандидатом на полное удаление из user-facing inventory.
- Отдельно не забыть про diagram UI finding:
  - `Module` должен снова читаться как сущность,
  - `Kind` должен стать только вторичной подписью.
