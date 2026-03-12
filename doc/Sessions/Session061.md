# Session 061 — Baseline Codex gpt-5.4 release rebuild

**Date:** 2026-03-12 20:00 (CET)  
**Branch:** codex/baseline-gpt54-release  
**Version:** 1.1.720

---

# 1. Work Done in This Session

## Work summary
- На стабильной baseline-линии выполнен прямой swap `gpt-5.2 -> gpt-5.4` без подтягивания поздних PM/workflow-state рефакторингов из основной ветки.
- User-facing Codex model list и persisted settings snapshot сужены до двух моделей: `gpt-5.3-codex` и `gpt-5.4`.
- Синхронизированы release-facing документы и SSOT модуля Codex под baseline release `v1.1.720`.
- Локальная version line baseline-дерева вручную поднята до `1.1.719`, чтобы `./scripts/build-all.sh` выпустил новый baseline-релиз `1.1.720`, а не занял историческую версию `1.1.713`.
- Выполнен полный релизный цикл: `build-all` собрал tarball-артефакты, `build-release --use-current-version` собрал VSIX `codeai-hub-1.1.720.vsix`.

## Validation / checks
- `npm run compile` — ✅ passed после прямого swap `gpt-5.2 -> gpt-5.4`.
- `./scripts/build-all.sh` — ✅ success (version bump до `1.1.720`, provider/core/ui/launcher tarballs собраны).
- `./scripts/build-release.sh --use-current-version` — ✅ success (`codeai-hub-1.1.720.vsix`), подтверждены строки `Verifying SDK exclusions`, `Removing dev dependencies before packaging...`, `✅ Package created`.
- Внутри `build-release` duplication-check показал `3.03%` при лимите `3%`; в этой baseline-ветке шаг сработал как advisory и упаковка VSIX была успешно завершена.
- Husky pre-commit gates на коммитах baseline-линии — ✅ passed.

## Release artifacts
- VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub-pre-gpt54-v1.1.712/codeai-hub-1.1.720.vsix`
- Tarballs: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub-pre-gpt54-v1.1.712/doc/tmp/releases`

## Git commits
(ВАЖНО: список для восстановления контекста в следующей сессии через `git show`)
- `2978ba51 feat(codex): switch baseline general model to gpt-5.4`
- `b4a38d48 docs(todo): capture baseline gpt-5.4 prep progress`
- `0a5de467 chore(release): seed baseline version line to v1.1.719`
- `56f86371 chore(release): build-all v1.1.720`
- `8b8f1677 docs(session): record baseline gpt-5.4 release build`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `README.md`
2. `CHANGELOG.md`
3. `doc/SolidWorks-WorkFlow/Modules/Codex.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session061.md` (THIS REPORT)

## Plans for next session
- Установить и прогнать пользовательский smoke для `codeai-hub-1.1.720.vsix` на очищенной инсталляции.
- Проверить, что baseline-линия с прямой заменой `gpt-5.2 -> gpt-5.4` сохраняет корректное поведение PM/workflow без регрессий `1.1.719`.
- Если появятся расхождения в ответах/ивентах Codex SDK для `gpt-5.4`, снимать сырой поток провайдера и локализовать проблему без подтягивания позднего rollout-кода.
