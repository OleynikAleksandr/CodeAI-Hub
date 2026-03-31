# Session 087 — Diagram Visual Shell Release

**Date:** 2026-03-16 19:27 (CET)
**Branch:** main
**Version:** 1.1.734

---

# 1. Work Done in This Session

## Work summary
- Зафиксирован deferred blocker после corrective release `1.1.733`: bootstrap новой toolbar session для `Diagram Modules` / `Diagram Facades` по-прежнему не стартует, поэтому дальнейшая работа по этой сессии была перенаправлена в `Phase 2` visual shell без повторной диагностики запуска.
- Закрыт stream `Graph adapters`: добавлены stage-aware projection adapters `domainModelToReactFlow()` для `module-map.md` и `facade-map.md`.
- Закрыт stream `Editor shell and layout facade`: подключены `@xyflow/react` и `elkjs`, добавлены `DiagramEditorFacade`, `DiagramLayoutFacade`, read-only `DiagramEditorShell`, `Auto-layout` control и `SaveStatusIndicator`.
- Закрыт stream `Flow sidecar persistence and panels`: добавлены `module-map.flow.json` / `facade-map.flow.json` loader/persistence hooks, PM панели `Diagram Modules` и `Diagram Facades` переведены с raw Markdown view на visual shell.
- Закрыт browser-safe parser seam для Project Manager bundle: visual shell теперь может парсить canonical diagram DSL artifacts без статического `node:crypto` import в webview bundle, переиспользуя уже записанный `Revision` field в браузерном пути.
- Release-facing docs синхронизированы под visual shell release `1.1.734`: обновлены `README.md`, `CHANGELOG.md`, `SystemArchitecture.md` и `todo-plan.md`.
- Выполнен Phase 2 release cycle:
  - `./scripts/build-all.sh` поднял unified version до `1.1.734` и пересобрал provider/core/ui/launcher artifacts;
  - `./scripts/build-release.sh --use-current-version` завершился успешно;
  - VSIX собран: `codeai-hub-1.1.734.vsix`;
  - tarball artifacts присутствуют в `~/.codeai-hub/releases/` и `doc/tmp/releases/`.

## Manual verification checklist for 1.1.734
- Установить `codeai-hub-1.1.734.vsix` и полностью перезапустить VS Code / Project Manager.
- Открыть workspace, где уже существуют `.codeai-hub/<workspace>/diagram_modules/module-map.md` и `.codeai-hub/<workspace>/diagram_facades/facade-map.md`.
- Проверить, что `Diagram Modules` рендерится в visual shell, а не в raw Markdown-only view.
- Проверить, что `Diagram Facades` рендерится в visual shell, а не в raw Markdown-only view.
- Нажать `Auto-layout` в обоих шагах и убедиться, что рядом появляется статус сохранения layout.
- Проверить, что создаются sidecar файлы:
  - `.codeai-hub/<workspace>/diagram_modules/module-map.flow.json`
  - `.codeai-hub/<workspace>/diagram_facades/facade-map.flow.json`
- Перезапустить VS Code / переоткрыть workspace и убедиться, что visual layout восстановился из `*.flow.json`.
- Не ожидать в этом релизе починки deferred blocker: старт новой toolbar session для `Diagram Modules` / `Diagram Facades` всё ещё остаётся отдельной follow-up задачей.

## Git commits
- `63346662 docs(session): record deferred diagram bootstrap blocker`
- `11a937a3 feat(ui): add module graph adapter`
- `23937761 feat(ui): add facade graph adapter`
- `9f11087a build(ui): add diagram editor dependencies`
- `57941a08 feat(ui): add shared diagram editor facade`
- `b72d72b9 feat(ui): add diagram editor visual shell`
- `2d9439e9 feat(ui): persist diagram flow sidecar state`
- `a2ca1a02 feat(ui): render diagram stages via visual shell`
- `4e54ec48 docs(release): prep diagram visual shell release`
- `05184368 chore(release): build diagram visual shell release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `doc/SolidWorks-WorkFlow/README.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Archive/Session087.md` (THIS REPORT)
7. `doc/SolidWorks-WorkFlow/Plans/DiagramSteps_InteractiveDSL_Architecture.md`

## Plans for next session
- Получить ручной feedback по `1.1.734` именно на visual shell surface: render, `Auto-layout`, `*.flow.json`, reopen persistence.
- Отдельно завести и синхронизировать список багов/недоработок по diagram workflow, включая отложенный toolbar bootstrap blocker для новых agent sessions.
- Перейти к `Phase 3 — semantic editing for Diagram Modules`:
  - `Module semantic patch pipeline`
  - `Module UI semantic editing`
  - `Module conflict handling`
