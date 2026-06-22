# Plan Orchestrator Tracked State Simplification

**Status:** Active implementation plan  
**Owner:** Codex  
**Date:** 2026-06-21  
**Scope owner:** `doc/TODO/todo-plan.md`

## Цель

Сделать скриптовый Plan Orchestrator проще для агента и пользователя:

- каждый meaningful шаг кода или документации остается видимым в Git;
- tracked `doc/TODO/todo-plan.md` не получает фоновых post-commit переписываний;
- агент без контекста восстанавливает реальные hashes/diffs через Git по точным commit messages из плана;
- rollback оборванного `plan:commit` чинится локальным `.git/codeai-plan-debt`, а не tracked debt-состоянием.

## Решение

1. Active `todo-plan.md` остается tracked ledger.
2. `plan:commit` перед созданием Git commit записывает в tracked markdown финальное состояние шага: task `DONE`, paired `Git Commit` `DONE`, `hash: self`, следующий task `IN_PROGRESS`.
3. `.git/codeai-plan-debt` хранит только локальный rollback snapshot до завершения transaction.
4. `post-commit` только чистит локальный debt и не меняет tracked files.
5. `AGENTS.md` фиксирует короткий операционный контракт, чтобы агент не читал скрипты перед обычной работой.

## Recovery Contract

- `hash: self` означает: строка закрыта тем commit, где она записана.
- Реальный hash: `git log --oneline --grep='<точный commit message>'`.
- Diff: `git show <hash>`.
- Если commit не создан и есть debt: `npm run plan:repair` восстанавливает pre-commit markdown из локального snapshot.
- Если commit уже создан и его нужно отменить: это обычный Git rollback/revert по явному решению пользователя плюс отдельный tracked plan update.

## Verification

- `node --test scripts/plan-orchestrator/*.test.mjs`
- `npm run plan:validate`
- штатный dogfood через `npm run plan:commit -- "fix: keep plan advancement inside managed commit"`
