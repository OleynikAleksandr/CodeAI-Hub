# Project Manager — Reviewer auto-resume: workspace validation (Architecture)

**Date:** 2026-02-02
**Scope:** Project Manager (CEF UI) + Core (workflow state / session create)
**Status:** Superseded (see `doc/Project_Docs/ProjectManager/CoreDriven_AutoResume_LastActive_Architecture.md`)

> NOTE: This document describes the earlier UI-driven auto-resume validation. The current direction is Core-driven auto-resume via workflow `lastActive` (see `doc/Project_Docs/ProjectManager/CoreDriven_AutoResume_LastActive_Architecture.md`).


---

## 1) Problem

В Project Manager есть auto-resume механика: при выборе workspace UI автоматически возобновляет reviewer-сессию шага `description`, если в workflow-state присутствует `description.session.providerSessionId`.

Наблюдаемый баг:
- В workspace A (например, `CodeAI-Hub`) пользователь очищает `.codeai-hub/` (оставляя только анкету `questionnaire.md`).
- Без рестарта Core, при выборе workspace A в UI в колонке Sessions неожиданно появляется reviewer-сессия, фактически относящаяся к workspace B (`/Users/oleksandroliinyk/VSCODE/CodeAI-WorkTree/`).
- После остановки Core и повторного запуска проблема исчезает.

Ожидаемое поведение:
- Auto-resume остаётся включён.
- Но auto-resume **никогда** не должен поднимать providerSessionId, который не принадлежит выбранному workspace (workspacePath/workspaceSlug).

---

## 2) Root cause (high-level)

Сейчас resume-цепочка не имеет строгой валидации «providerSessionId принадлежит этому workspace».

Фактический поток:
1. UI регулярно читает workflow state (`GET /api/v1/orchestrator/workflow-state?workspaceSlug=...&workspacePath=...`).
2. Если `state.description.session.providerSessionId` присутствует, UI диспатчит `pm:session:resume` (auto-resume).
3. Core получает `session:create` c `providerSessionId` (resume) и создаёт/резюмирует сессию.

Если `description.session.providerSessionId` по ошибке указывает на сессию другого workspace (из памяти Core или из stale state), UI запустит resume «чужой» сессии.

---

## 3) Proposed fix (design)

### 3.1 Принцип

Auto-resume разрешён **только если** Core может доказать, что `providerSessionId` существует в пределах текущего workspace.

### 3.2 Workspace signature

Для проверки принадлежности сессии workspace используем сигнатуру:
- `workspaceSlug` (канонический key), и
- `workspacePath` (absolute path).

### 3.3 Validation rule (Core)

Перед `adapter.resumeSession(providerSessionId, workspacePath)` Core обязан выполнить pre-check:

- Если запрос содержит `initiativeSlug` (workspaceSlug) и `providerSessionId`:
  - проверить наличие unified session history файла:
    - `~/.codeai-hub/sessions/<workspaceSlug>/<providerId>/<providerSessionId>.jsonl`
  - если файл отсутствует → resume **запрещён** (treat as invalid resume), и **не** создаём сессию.

Это гарантирует:
- providerSessionId из другого workspace не пройдёт проверку (у него будет history в другом `<workspaceSlug>`).
- auto-resume не будет «перетаскивать» сессии между workspace.

### 3.4 Optional hardening (Description step state)

Дополнительно можно расширить `.codeai-hub/<workspaceSlug>/description/description-step.json`:
- добавить `workspacePath` (как часть snapshot),
- при чтении валидировать соответствие `workspacePath` == фактическому workspaceRoot.

Это не заменяет rule 3.3, но помогает отладки/диагностике.

---

## 4) Touchpoints

**UI (Project Manager):**
- Auto-resume триггерится в `useWorkspaceTreeAutoSelect` при наличии `description.session.providerSessionId`.

**Core:**
- `WorkflowStateService` читает snapshot description step из workspace-local `.codeai-hub/<workspaceSlug>/description/description-step.json`.
- `SessionRequestHandler.handleCreate` обрабатывает resume через `providerSessionId`.

---

## 5) Verification checklist

1. Workspace A: удалить `.codeai-hub/<workspaceSlug>/description/description-step.json` (оставив только `questionnaire.md`).
2. Не перезапуская UI: убедиться, что auto-resume **не** создаёт reviewer-сессию.
3. Workspace B: существующая reviewer-сессия продолжает auto-resume работать корректно.
4. Multi-workspace: создать reviewer-сессию в A, затем выбрать B и обратно A — auto-resume должен возобновлять только A.
