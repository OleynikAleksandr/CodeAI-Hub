# Phase 272 — Standalone Reviewer module (DEFERRED / NOT STARTED)

**Owner:** Oleksandr
**Status:** DEFERRED / NOT STARTED
**Updated:** 2026-03-01

---

## Контекст
Эта фаза вынесена в отдельный файл, чтобы модуль `Standalone Reviewer` не потерялся в roadmap после архивирования старых `todo-plan`.

SSOT/draft архитектуры:
- `doc/SolidWorks-WorkFlow/Contracts/StandaloneReviewer_Module.md`

Граница:
- Reviewer остаётся **manual-only** и **out-of-band** по отношению к workflow 1→6.
- Output reviewer-модуля: `review-report.md`.
- Apply в upstream-артефакт: только по explicit user confirm.

---

## Stream 0: Design Gate (parking)
1. [TODO] При старте фазы провести review/апдейт архитектурного черновика `StandaloneReviewer_Module.md` и подтвердить финальный контракт standalone reviewer (scope: `doc/SolidWorks-WorkFlow/Contracts/StandaloneReviewer_Module.md`; expected commit: `docs(reviewer): approve standalone reviewer module contract`).
2. [TODO] Git Commit: `docs(reviewer): approve standalone reviewer module contract` (hash: TBD)
3. [BLOCKED] После утверждения контракта пользователем синхронизировать SSOT workflow boundary (`WorkflowSteps_Overview.md`, `SystemArchitecture.md`) (scope: `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs(workflow): approve standalone reviewer module boundary`).
4. [BLOCKED] Git Commit: `docs(workflow): approve standalone reviewer module boundary` (hash: TBD)

---

## Stream 1: Execution planning (после Design Gate)
1. [BLOCKED] Раскрыть фазу реализации standalone reviewer на микро-задачи (runtime/core, PM/UI, templates) с лимитом ≤3 файлов на подзадачу и обязательными commit-step пунктами (scope: `doc/TODO/todo-plan.md`; expected commit: `docs(todo): expand standalone reviewer execution streams`).
2. [BLOCKED] Git Commit: `docs(todo): expand standalone reviewer execution streams` (hash: TBD)
