# Session 176 — Gemini Runtime Integrity Hotfix

**Date:** 2026-03-28 14:35 (CET)
**Branch:** main
**Version:** 1.1.825

---

# 1. Work Done in This Session

## Work summary
- Исследован новый крэш Core на Gemini после установки релиза 1.1.824 с включённой диагностикой. `core-fatal.log` показал не штатный provider-flow баг, а `SyntaxError: Invalid or unexpected token` внутри глобального `@google/gemini-cli-core`.
- Подтверждено, что падение вызывал повреждённый runtime dependency `fast-uri` в отдельной глобальной установке `@google/gemini-cli-core`: файл `fast-uri/lib/schemes.js` был усечён и напрямую воспроизводил исключение через `require(...)`.
- Выяснено, что обычный bridge smoke-test этого не ловил, потому что `@google/gemini-cli` использовал свою здоровую вложенную копию `fast-uri`, а падал другой top-level install path.
- В Gemini runtime добавлена защита целостности установленного глобального CLI/Core: bridge теперь валидирует dependency graph, а installer перед загрузкой проверяет top-level `@google/gemini-cli-core`, автоматически переустанавливает Gemini CLI/Core при broken runtime и очищает stale npm temp-directories вида `.gemini-cli-core-*`.
- Добавлены regression tests для broken runtime graph и automatic repair path.
- Локально подтвержден self-healing сценарий: после repair top-level `fast-uri` снова стал валидным, скрытые временные директории npm были удалены, а installer завершился на `READY 0.35.3 0.35.3`.
- Обновлены release notes под `1.1.825`, выполнены `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`, собран VSIX `codeai-hub-1.1.825.vsix`.

## Git commits
- `70f6685e fix: repair broken gemini runtime installs`
- `524c5cbb docs: prepare 1.1.825 release notes`
- `f44040a8 chore: release 1.1.825`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Archive/Session176.md` (THIS REPORT)

> Далее: в зависимости от задачи открыть нужные документы из `doc/SolidWorks-WorkFlow/Clusters/`, `doc/SolidWorks-WorkFlow/Modules/`, `doc/SolidWorks-WorkFlow/Contracts/`.

## Plans for next session
- Установить и перепроверить релиз `1.1.825` на чистом Gemini workspace, чтобы убедиться, что broken global install действительно автоматически чинится в реальном UI-флоу.
- Если крэш повторится, первым делом снять новые `core-fatal.log`, `bridge-observer.log` и состояние глобальных путей `@google/gemini-cli` / `@google/gemini-cli-core`, чтобы отделить runtime corruption от логической ошибки интеграции.
- Отдельно оценить, нужно ли ослабить policy auto-update Gemini CLI/Core или добавить более явную телеметрию о repair/reinstall path для пользователя.
