# Session 29 — Полный релиз v1.1.332

**Date:** 2025-12-22 15:20 (CET)
**Branch:** main
**Version:** 1.1.332

---

# 1. Work Done in This Session

## Work summary
- Синхронизировал README/CHANGELOG и архитектурные документы со сборкой v1.1.332, чтобы релизная страница VSIX показывала правильное описание Codex reasoning override и соответствующие артефакты.
- Пересобрал релиз: `./scripts/build-all.sh` поднял версии провайдеров, ядра и UI до 1.1.332, а `./scripts/build-release.sh --use-current-version` упаковал свежий VSIX и прогнал архитектурный чек, ts-prune, jscpd, typecheck и дополнительные гейты.
- Результат: `codeai-hub-1.1.332.vsix`, `CodeAIHubLauncher-macos-arm64-1.1.332.tar.bz2`, 1.1.332-артефакты для Claude/Codex/Gemini и UI лежат в `~/.codeai-hub/releases/` и будут включены в следующий релизный бандл.

## Git commits
- `d578e7c feat: v1.1.332 - release docs & packaging`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session029.md` (THIS REPORT)

## Plans for next session
- Установить свежий `codeai-hub-1.1.332.vsix` в чистую VS Code (или релизную среду) и проверить, что на странице расширения отображается актуальное описание и список артефактов.
- Переключиться к следующей фазе `todo-plan.md`, проверив, какие стримы готовы к запуску после завершения 1.1.332 (например, подготовка новых задач или архитектурных артефактов).
