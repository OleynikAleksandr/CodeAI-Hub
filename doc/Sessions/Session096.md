# Session 096 — Claude provider-home auth fix + отмена snapshot-plan

**Date:** 2026-02-21 18:08 (CET)
**Branch:** main
**Version:** 1.1.644

---

# 1. Work Done in This Session

## Work summary
- Найдена и подтверждена причина "Claude provider-home authentication required" после чистой переустановки: Claude Code CLI хранит OAuth в macOS Keychain (`~/Library/Keychains`), а при sandbox'е `HOME=~/.codeai-hub/providers/claude/home` Keychain становится недоступен, из-за чего CLI считает, что пользователь не залогинен.
- Реализован авто-bridge Keychain для provider-home на macOS: создается symlink `~/.codeai-hub/providers/claude/home/Library/Keychains -> ~/Library/Keychains` перед auth bootstrap/probe, чтобы CLI видел Keychain в изолированном HOME.
- Улучшены recovery hints для Claude (сначала `claude /login`, затем fallback `HOME=... claude /login`).
- Собран релиз 1.1.644 (`codeai-hub-1.1.644.vsix`), пользователь подтвердил что Claude снова доступен после clean reinstall.
- Проведен e2e тест восстановления "зависшего" turn: после рестарта Core и разблокировки ввода отправка "Продолжай" корректно продолжает сессию. Из-за этого план Phase 219 по snapshot engine/backup HOME признан не нужным и заархивирован как cancelled/obsolete; создан новый пустой `doc/TODO/todo-plan.md` шаблон.

## Build / verification
- `./scripts/build-all.sh` → артефакты в `~/.codeai-hub/releases/` и `doc/tmp/releases/` (OK)
- `./scripts/build-release.sh --use-current-version` → `codeai-hub-1.1.644.vsix` (OK)

## Created/updated docs
- `doc/TODO/Archive/todo-plan-phase219-cancelled-obsolete-2026-02-21.md`
- `doc/TODO/todo-plan.md` (новая болванка)

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `d345e8b6 fix: claude provider-home auth on macOS`
- `fca104e3 chore: bump version to 1.1.644`
- `503a541d docs(todo): archive cancelled plan`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session096.md` (THIS REPORT)

## Plans for next session
- Новых обязательных задач по Phase 219 нет (план отменен, резюмэ работает). Дальнейшие работы фиксировать через новый `doc/TODO/todo-plan.md`.
