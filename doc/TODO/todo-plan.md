# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/CommitMessage_ClaudeCoAuthor_Guard_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `scripts/README.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream, в каждом Stream - некоторое количество подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзадача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Stream переписывается.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
  - `git commit` → `.husky/commit-msg`: `./scripts/check-commit-message.sh`
- **Таргетная проверка для этого scope:** локальный прогон `./scripts/check-commit-message.sh <temp-file>` и проверка clean fixture.
- **Real-time Документация:** изменение developer workflow hooks требует синхронного обновления `scripts/README.md` и `todo-plan.md` в том же execution cycle.
- **Commit:** после зелёных гейтов и таргетной проверки.

## Phase 1 — Commit Message Guard (owner: Codex, updated: 2026-04-20)
### Stream: Claude Co-Author Protection
1. [DONE] Добавить Husky `commit-msg` hook и repo script для автоматического удаления `Co-Authored-By: Claude ... <noreply@anthropic.com>` из commit message (scope: `.husky/commit-msg`, `scripts/check-commit-message.sh`; expected commit: `fix: add commit message Claude co-author guard`)
2. [DONE] Git Commit: `fix: add commit message Claude co-author guard` (hash: `a1c66e381`)
3. [IN_PROGRESS] Обновить документацию по quality gates и описать новый `commit-msg` guard (scope: `scripts/README.md`; expected commit: `docs: document commit message guard`)
4. [TODO] Git Commit: `docs: document commit message guard` (hash: TBD)
5. [TODO] Закрыть scope: архивировать active plan, вернуть placeholder в `doc/TODO/todo-plan.md`, перенести planning-doc в `doc/SolidWorks-WorkFlow/Plans/Archive/` (scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Plans/Archive/`; expected commit: `docs: close commit message guard scope`)
6. [TODO] Git Commit: `docs: close commit message guard scope` (hash: TBD)
