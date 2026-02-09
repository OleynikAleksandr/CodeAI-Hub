# Session 004 — Release 1.1.442: подготовка к верификации workflow

**Date:** 2026-01-18 17:33 (CET)
**Branch:** main
**Version:** 1.1.442

---

# 1. Work Done in This Session

## Work summary
- Полностью вычищен Core auto-attach (убраны авто-подстановки `pre_read_documents`/инлайн-вложения), чтобы не ломать поведение file-first агентов.
- Переведён Project Manager prompt-pack в path-first: Core/PM передаёт агенту короткий промпт от имени пользователя с путями к анкете/шаблону/выходному файлу.
- Упрощены file-first промпты агентов (без упоминаний `structured output`), перепакованы bundled templates.
- Собран релиз `1.1.442` и зафиксированы артефакты (VSIX + tarball’ы).
- Пройдены гейты качества и таргетные сборки:
  - `./scripts/check-architecture.sh`
  - `npx ultracite check`
  - `npx ts-prune`
  - `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`
  - `npm run check:links`
  - `npm run build --workspace @codeai-hub/core`
  - `npm run build:project-manager`
  - `./scripts/build-all.sh`
  - `./scripts/build-release.sh --use-current-version`

## Git commits
(ВАЖНО: этот список нужен для следующей сессии, чтобы восстановить контекст через `git show`)
- `d9c47519 refactor(workflow): remove core auto-attach + path-first prompt pack`
- `012286d5 feat: v1.1.442 - workflow path-first + remove core auto-attach`
- `561050dd docs: document release 1.1.442 session`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session004.md` (THIS REPORT)

## Plans for next session
- Установить/протестировать `codeai-hub-1.1.442.vsix` и повторить сценарий, который ранее давал “пустой ответ только с `pre_read_documents`”.
- Проверить цепочку workflow: `description → virtual_simulation → diagram_modules → diagram_facades` в режиме path-first.
- Сохранить/сравнить JSONL логи (валидный объём/содержимое, наличие вопросов и артефактов) и задокументировать результат отдельным коммитом.
