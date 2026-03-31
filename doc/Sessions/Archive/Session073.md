# Session 073 — Release build 1.1.726

**Date:** 2026-03-14 16:46 (CET)
**Branch:** main
**Version:** 1.1.726

---

# 1. Work Done in This Session

## Work summary
- Подтверждён и локализован баг stale Codex model selection: saved `gpt-5.4` из `~/.codeai-hub/settings/settings.json` пересиливался stale `CODEX_DEFAULT_MODEL=gpt-5.3-codex` в long-lived runtime process.
- В `packages/core` и `packages/Codex_Module` изменён приоритет выбора модели на `settings snapshot -> env fallback -> hardcoded/workspace fallback`; добавлены regression tests.
- Синхронизированы release-facing документы `README.md`, `CHANGELOG.md` и `doc/BugRegistry.md` под релиз `v1.1.726`.
- Выполнен полный локальный релизный цикл: `./scripts/build-all.sh` поднял unified version до `1.1.726`, пересобрал provider/core/ui/launcher tarball-набор и синхронизировал version/manifests.
- Выполнен `./scripts/build-release.sh --use-current-version`; собран VSIX `codeai-hub-1.1.726.vsix`.

## Git commits
- `8f2d9197 fix(codex): prefer saved model over stale env`
- `4fed6a44 docs(release): prep 1.1.726 notes`
- `684075de chore(release): build 1.1.726`
- `dea1f4f4 docs(session): record 1.1.726 release build`

## Verification
- Targeted verification:
  - `npm run build --workspace=@codeai-hub/core`
  - `npm run build --workspace=@codeai-hub/codex-module`
  - `node --test packages/core/dist/config/index.test.js`
  - `node --test packages/Codex_Module/dist/sdk/codex-sdk-manager.test.js`
- `git commit` hooks:
  - `npm test`
  - `./scripts/check-architecture.sh`
  - `npm run lint`
  - `npm run check:tsprune`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`
- `npm run check:links`
- `git push origin main`
- Release artifacts:
  - `codeai-hub-1.1.726.vsix`
  - `doc/tmp/releases/claude-module-1.1.726.tar.bz2`
  - `doc/tmp/releases/codex-module-1.1.726.tar.bz2`
  - `doc/tmp/releases/gemini-module-1.1.726.tar.bz2`
  - `doc/tmp/releases/codeai-hub-core-darwin-arm64-1.1.726.tar.bz2`
  - `doc/tmp/releases/CodeAIHubLauncher-macos-arm64-1.1.726.tar.bz2`
  - `doc/tmp/releases/vscode-webview-1.1.726.tar.bz2`
  - `doc/tmp/releases/project-manager-1.1.726.tar.bz2`
- Push в `origin/main` выполнен успешно.

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `doc/SolidWorks-WorkFlow/README.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Archive/Session073.md` (THIS REPORT)

> Далее: если начинается новый scope, сначала создать planning-док в `doc/SolidWorks-WorkFlow/Plans/`, утвердить его, и только потом разворачивать phase/stream execution plan.

## Plans for next session
- Провести smoke-check, что новый Codex turn с сохранённым `gpt-5.4` больше не стартует как `gpt-5.3-codex` в provider rollout.
- Если smoke зелёный, продолжать уже от опубликованного baseline `v1.1.726`.
- Если следующая работа не релизная, начинать уже от baseline `v1.1.726`.
