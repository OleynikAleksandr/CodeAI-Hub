# Session 003 — Workflow path-first + remove Core auto-attach (Release 1.1.442)

**Date:** 2026-01-18 17:26 CET
**Branch:** main
**Version:** 1.1.442

---

# 1. Work Done in This Session

## Work summary
- Удалён auto-attach в Core (workspace file auto-attach + pre_read_documents auto-attach): в провайдер уходит ровно текст пользователя.
- Project Manager: prompt pack переведён в path-first формат (короткий промпт с путями к анкете/шаблону/целевому файлу, без инлайна содержимого файлов).
- File-first prompts для workflow стадий упрощены; bundled templates обновлены.
- Документация синхронизирована под релиз 1.1.442 (README/CHANGELOG/SystemArchitecture/Architecture).
- Гейты/сборки: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, `npm run build --workspace @codeai-hub/core`, `npm run build:project-manager`, `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`.
- Релиз: собраны tarball’ы 1.1.442 в `~/.codeai-hub/releases/` и `doc/tmp/releases/`, VSIX `codeai-hub-1.1.442.vsix`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `d9c47519 refactor(workflow): remove core auto-attach + path-first prompt pack`
- `012286d5 feat: v1.1.442 - workflow path-first + remove core auto-attach`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/Workflow/Workflow_CLI_Steps_And_Watcher_Architecture.md`
2. `doc/Architecture/Architecture.md`
3. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session003.md` (THIS REPORT)

## Plans for next session
- Сделать manual verification workflow: description → virtual_simulation → diagram_modules → diagram_facades (Codex + Claude) в path-first режиме и зафиксировать результаты.
