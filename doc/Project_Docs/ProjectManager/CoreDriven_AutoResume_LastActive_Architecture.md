# Project Manager — Core-driven auto-resume from workflow state (Last Active) — Architecture

**Date:** 2026-02-02
**Scope:** Core (workflow state + session management) + Project Manager (CEF UI)
**Status:** Approved (implemented in release 1.1.497)

---

## 1) Problem

Требуемое UX поведение:
- При открытии Project Manager и выборе workspace пользователь должен **автоматически** попадать в «последний активный контекст»:
  - последний узел/шаг в Workflow Tree,
  - соответствующая последняя сессия (Reviewer/Collector),
  - и соответствующие каноничные артефакты (current-only).

Наблюдаемые проблемы текущей схемы:
- После рестарта Core список `sessions` пустой (Core не восстанавливает сессии сам), и UI полагается на auto-resume через `description-step.json`.
- Введение workspace validation для resume (правильно) выявило несогласованность workspace keys: разные части системы используют `workspaceSlug` и `workspaceKey` (derived from `workspacePath`) по-разному.
- В результате auto-resume может быть заблокирован, а сессии «не подгружаются», хотя continuity `chain.json` и workflow tree видны.

---

## 2) Non-goals

- Не превращаем `continuity/chain.json` в универсальный источник истины для всего workflow state.
- Не запускаем «безусловный» resume провайдеров при старте Core без контекста выбранного workspace.

---

## 3) Source of truth (разделение ответственности)

### 3.1 Workflow state — product truth

Единственный источник истины для:
- стадий/статусов workflow,
- каноничных артефактов (current-only),
- «последнего активного узла» (lastActive).

Хранение:
- `.codeai-hub/<workspaceSlug>/workflow/state.json` (Core-owned)

### 3.2 Continuity chain — session continuity truth

Источник истины для:
- сегментов continuity (rootSessionId → segments[]),
- tokenUsage (last-known),
- handoff/rollover данных.

Хранение:
- `.codeai-hub/<workspaceSlug>/continuity/<stage>/<rootSessionId>/chain.json`

---

## 4) Workspace identity (critical)

В системе есть два разных понятия:
- `workspaceSlug` — каноничный key для workspace-local артефактов/continuity (`.codeai-hub/<workspaceSlug>/...`).
- `workspaceKey` — key для unified session history bucket под `~/.codeai-hub/sessions/<workspaceKey>/...`.

Требование:
- Любая логика resume/validation должна явно знать, какой key используется, и не смешивать их.

Практическое правило:
- Для workflow/continuity используем `workspaceSlug`.
- Для unified-session history и её проверки — используем тот же ключ, который использует `UnifiedSessionStorage` (с fallback scan).

---

## 5) Proposed behavior: Core-driven resume on workspace selection

### 5.1 New concept: `lastActive` in workflow state

В `workflow/state.json` добавляется snapshot, например:

- `lastActive.stage` (например: `description`)
- `lastActive.artifactPath` (например: `.codeai-hub/<workspaceSlug>/description/Final_Description.md`)

Примечание:
- `lastActive` используется как UX-навигация (какой артефакт/ветку открыть).
- Данные для resume сессии (`providerId/providerSessionId/sessionKind`) хранятся в stage snapshot (`.codeai-hub/<workspaceSlug>/description/description-step.json`).

Core обновляет `lastActive`:
- при кликах/выборе узла в UI (через Core API),
- при записи каноничного артефакта,
- при создании/резюме сессии для stage.

### 5.2 Core initiates resume for selected workspace

При выборе workspace в Project Manager UI отправляет в Core «workspace activated» (новый endpoint или расширение существующего).

Core:
1) читает workflow state (`lastActive`) и stage snapshot (например, `description-step.json`) для выбранного workspace,
2) валидирует, что `providerSessionId` принадлежит выбранному workspace (через unified session history check + fallback scan),
3) если валидно — создаёт/резюмирует сессию и бродкастит `session:created`/`session:binding` в UI,
4) UI открывает артефакт согласно `lastActive.artifactPath` (current-only).

---

## 6) Validation rules

- Resume разрешён только если:
  - `providerSessionId` существует в unified history bucket для текущего workspaceKey (derived from workspacePath) или найден через fallback scan,
  - и `description-step.json` содержит `workspacePath`, совпадающий с активным workspacePath (anti cross-workspace).

На fail:
- не резюмить;
- оставить UI на анкете/артефакте (без Sessions).

---

## 7) Verification checklist

- После рестарта Core, при открытии Project Manager и выборе workspace:
  - автоматически открывается lastActive артефакт,
  - автоматически поднимается lastActive session (если валидна),
  - cross-workspace resume невозможен.
- Если workspace-local `.codeai-hub/**` очищен (кроме анкеты):
  - workflow state/lastActive корректно становится пустым,
  - Sessions не поднимаются.
