# Session 018 — Project Manager Release Rebuild 1.1.913

**Date:** 2026-04-08 14:45 (CEST)
**Branch:** main
**Version:** 1.1.913
**Execution Scope Status:** COMPLETED

---

# 1. Work Done in This Session

## Work summary
- Открыт и выполнен release-only scope после пользовательского сигнала о том, что локальный `Project Manager` не обновился на предыдущем релизе `1.1.912`.
- Подготовлены planning-doc, execution `todo-plan`, session report и release-facing документы для перевыпуска без новых product-logic изменений.
- Пройдены таргетные проверки `npm run build:webview` и `npm run typecheck:webview`.
- Выполнен `./scripts/build-all.sh`, который поднял версию до `1.1.913` и пересобрал provider/core/UI/launcher tarball-артефакты, включая `project-manager-1.1.913.tar.bz2`.
- Выполнен `./scripts/build-release.sh --use-current-version`, собран `codeai-hub-1.1.913.vsix`, затем planning-doc и `todo-plan` заархивированы, а `Docs_Index.md` возвращён в no-active-scope состояние.

## Git commits
(REFERENCE ONLY: этот список сохраняется для исторической трассировки и расследования регрессий; следующая сессия не обязана читать все коммиты по умолчанию.)
- `b30107a48 docs(plan): open project manager release rebuild scope`
- `ecfc6799d docs(index): register project manager release rebuild scope`
- `b016823c0 docs(release): prepare project manager rebuild release`
- `b0890fab9 build(release): verify project manager rebuild prerequisites`
- `74ae9f761 build(release): capture project manager rebuild version bump`
- `193054f26 build(release): package project manager rebuild release`
- `a46a431ec docs(closeout): archive project manager release rebuild scope`

---

# 2. Instructions for Next Session

**Base SSOT:** `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
**Scope Discovery Index:** `doc/SolidWorks-WorkFlow/Docs_Index.md`

## Plans for next session
- Активный execution scope отсутствует.
- Следующий агент обязан сначала прочитать `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` как базовый SSOT.
- Затем агент обязан согласовать с пользователем новый scope.
- После этого агент обязан открыть `doc/SolidWorks-WorkFlow/Docs_Index.md`, выбрать релевантные документы для нового scope и только потом формировать новый planning-doc.
- До появления нового planning-doc и нового `doc/TODO/todo-plan.md` навигационной опорой служит `doc/SolidWorks-WorkFlow/Docs_Index.md`.
