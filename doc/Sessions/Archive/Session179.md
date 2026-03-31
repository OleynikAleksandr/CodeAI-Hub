# Session 179 — PM Model Label Refresh and Release 1.1.827

**Date:** 2026-03-28 16:44 (CET)
**Branch:** main
**Version:** 1.1.827

---

# 1. Work Done in This Session

## Work summary
- На baseline-релизе `1.1.826` продолжен ручной smoke Gemini workflow: шаг `Diagram Modules` завершился штатно, Core не упал, а в workspace были сгенерированы `product-parts.index.md` и product-part документы для `core-runtime`, `ai-providers-runtime`, `project-manager-app`, `vscode-extension`.
- Разобран дефект PM session status bar: нижняя панель показывала stale provider model label после смены модели в Settings, хотя реальный Gemini runtime уже запускался на актуальной модели (`gemini-3-flash-preview`). Причина оказалась в том, что Project Manager держал устаревший settings snapshot и не перечитывал его при продолжении live session.
- Внесён PM-side hotfix без изменения provider runtime contract: runtime и dialog session flows теперь перечитывают settings snapshot при активации session и непосредственно перед каждым user send, чтобы label модели и reasoning/thinking состояния синхронизировались с текущими Settings без перезапуска Core.
- Фикс сделан provider-agnostic и распространяется на все provider labels, которые строятся из общего settings snapshot: Claude, Codex и Gemini.
- Обновлены release notes под `1.1.827` в `README.md` и `CHANGELOG.md`.
- По release checklist выполнены `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`; собраны свежие tarball-артефакты `1.1.827` в `~/.codeai-hub/releases` и `doc/tmp/releases`, а также VSIX `codeai-hub-1.1.827.vsix`.
- Таргетная верификация фикса: `npm run build:webview`, `npm run typecheck:webview`; финальная release-сборка прошла зелёно, включая architecture gate, type-check, compile, SDK exclusions, artefact validation и VSIX packaging.

## Git commits
- `ea28d0ec fix(pm): refresh session model labels`
- `4b31f5e1 docs: prepare 1.1.827 release notes`
- `42449c43 chore: release 1.1.827`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session179.md` (THIS REPORT)

> Далее: в зависимости от задачи открыть нужные документы из `doc/SolidWorks-WorkFlow/Clusters/`, `doc/SolidWorks-WorkFlow/Modules/`, `doc/SolidWorks-WorkFlow/Contracts/`.

## Plans for next session
- Проверить релиз `1.1.827` на live-switch сценарии: смена provider model/thinking в Settings во время открытой session без перезапуска Core и корректное обновление нижней session status bar.
- Если smoke по `1.1.827` зелёный, вернуться к активному `Phase 79` из `doc/TODO/todo-plan.md` и продолжить extraction `session-request-handler-continuity-root.ts`, затем `session-request-handler-turn-arbitration.ts`.
- Если в ходе релизного теста обнаружатся дополнительные PM/Core regressions после большого refactor wave, зафиксировать их отдельным session report и только затем продолжать oversized debt closure.
