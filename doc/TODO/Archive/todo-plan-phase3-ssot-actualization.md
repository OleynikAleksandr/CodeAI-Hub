# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Planning source:** docs-only audit без отдельного `Plans/` planning-doc; цель — синхронизировать SSOT под `doc/SolidWorks-WorkFlow/` с фактическим состоянием кода после релизов `1.2.104` (four-chip status split) и `1.2.105` (tokens chip color tone-down), а также по ходу чтения зафиксировать любые другие найденные неточности.
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/README.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
  - `doc/SolidWorks-WorkFlow/Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`
  - `media/session-view.css`, `src/client/ui/src/session/status-panel.tsx`, `assets/localization/source/en/messages_for_the_user.json`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **Gates (автоматически через Husky hooks):** `pre-commit` → architecture / lint / knip / format; `pre-push` → `check:dup` / `check:links`.
- Каждая подзадача затрагивает ≤ 3 файлов и оформляется парой пунктов: реализация + Git Commit.
- Plan / Archive файлы под `doc/SolidWorks-WorkFlow/Plans/Archive/` — frozen, не редактируем.
- Если по ходу чтения встречается неточность по коду вне scope status-panel — создаём отдельную микрозадачу и фиксируем правкой в том же или следующем коммите.

## Phase 1 — SSOT docs audit (owner: agent, updated: 2026-04-29)

### Stream 1.1: Direct status-panel SSOT sync

1. [IN_PROGRESS] Точечно обновить документы, явно описывающие старую single-line статусную плашку и `Core Supervisor: starting…` fallback: `System/SystemArchitecture.md`, `Modules/Session_UI/SessionStatusPanel.md`, `Modules/Session_UI/README.md`. Оставить consistent описание 4-chip разметки и `null` поведения not-ready.
   - scope: 3 файла.
   - commit message: `docs: sync session status panel SSOT under four-chip layout`.
2. [IN_PROGRESS] Git Commit: `docs: sync session status panel SSOT under four-chip layout` (hash: TBD).

### Stream 1.2: Indirect status-panel mentions

1. [TODO] Обновить остальные активные документы, ссылающиеся на StatusPanel: `Contracts/SessionUI_Behavior.md`, `Contracts/ProviderFailure_Recovery_And_ProviderSwitch.md`. Привести описания к 4-chip разметке.
   - scope: 2 файла.
   - commit message: `docs: align session UI contracts with four-chip status panel`.
2. [TODO] Git Commit: `docs: align session UI contracts with four-chip status panel` (hash: TBD).

### Stream 1.3: Broad audit pass (Modules / Clusters / Contracts / System / Plans active)

1. [TODO] Последовательно прочитать оставшиеся активные SSOT документы (Modules, Clusters, Contracts, System, Plans active, Checklists) и внести точечные правки на любые неточности, обнаруженные по ходу чтения. Логически связанные правки группируются в один коммит ≤ 3 файлов.
   - scope: variable; ожидается 0–N коммитов в зависимости от находок.
   - commit message pattern: `docs: <scope> SSOT actualization`.
2. [TODO] Git Commit(s): `docs: <scope> SSOT actualization` (hash: TBD).

### Stream 1.4: Closeout

1. [TODO] Заархивировать `doc/TODO/todo-plan.md` в `doc/TODO/Archive/todo-plan-phase3-ssot-actualization.md`, создать новый no-active-scope shell, обновить `doc/SolidWorks-WorkFlow/Docs_Index.md` короткой заметкой об audit pass.
2. [TODO] Git Commit: `docs: archive ssot actualization scope` (hash: TBD).
