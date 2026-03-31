# Session 188 — Stop Recovery Contract Release 1.1.834

**Date:** 2026-03-29 11:29 (CEST)
**Branch:** main
**Version:** 1.1.834

---

# 1. Work Done in This Session

## Work summary
- Переписан продуктовый контракт `Stop`: UI больше не shutdown-ит Core, bridge использует `session:stop`, а Core останавливает только текущий turn / снимает stuck-state logical session.
- В Core добавлены stop-invalidation и rebind semantics: logical session сохраняется, provider binding переводится в recoverable `pending`, а следующий send поднимает fresh provider session при необходимости.
- Для Gemini добавлены stalled-turn watchdog, recoverable `turn_failed` path и регрессии на timeout, повторную отправку после recoverable failure и отсутствие phantom partial assistant flush.
- Успешно выполнены `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version` для версии `1.1.834`; собран VSIX `codeai-hub-1.1.834.vsix`, а release tarball’ы записаны в `doc/tmp/releases/`.
- Завершённый план перенесён в `doc/TODO/Archive/todo-plan-up-to-phase85-release-1.1.834-2026-03-29.md`; в `doc/TODO/todo-plan.md` создан новый intake-stub под следующий scope.

## Git commits
- `df917787 docs(contract): redefine session stop semantics`
- `c41228d7 feat(core): add session stop bridge command`
- `10bc32e8 feat(core): support stop-invalidated session bindings`
- `83e8e38a feat(core): stop active turn without core shutdown`
- `ad183b46 feat(core): rebind session after stop invalidation`
- `889980e2 fix(ui): route stop to session turn cancel`
- `a355f6d2 test(core): cover session stop and rebind flow`
- `fefa2c97 fix(gemini): recover stalled turn streams`
- `8bdf304b fix(gemini): surface stalled turn recovery`
- `d4517041 test(gemini): guard stalled turn recovery`
- `6f5a8eab chore: release stop recovery contract`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Archive/Session188.md` (THIS REPORT)

> Далее: в зависимости от нового scope открыть нужные документы из `doc/SolidWorks-WorkFlow/Plans/`, `Contracts/`, `Modules/`, `Clusters/`.

## Plans for next session
- Смоук-проверить установленный `codeai-hub-1.1.834.vsix` и release bundle на реальной локальной установке, если нужна пост-релизная валидация.
- Если начинается новый scope, сначала создать или обновить planning-док в `doc/SolidWorks-WorkFlow/Plans/`, затем сформировать новый phase/stream backlog в `doc/TODO/todo-plan.md`.
- Использовать релиз `1.1.834` как новый baseline; восстановление контекста начинать с коммитов этой сессии и архивного плана `doc/TODO/Archive/todo-plan-up-to-phase85-release-1.1.834-2026-03-29.md`.
