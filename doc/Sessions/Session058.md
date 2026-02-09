# Session 058 — Release 1.1.480 (Cleanup + docs sync)

**Date:** 2026-02-01 09:31 (CET)
**Branch:** main
**Version:** 1.1.480

---

# 1. Work Done in This Session

## Work summary
- Проведён cleanup после аудита: удалён мёртвый код (в т.ч. неиспользуемый Session Todo UI), обновлены ссылки/документация.
- Актуализированы документы в `doc/SolidWorks-Flow/` и `doc/SolidWorks-Flow/` под текущее состояние UI/инсталляторов.
- Собран unified релиз `1.1.480` через `./scripts/build-all.sh`.
- Обновлены `README.md`, `CHANGELOG.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md` под версию `1.1.480`.
- Собран VSIX через `./scripts/build-release.sh --use-current-version`, артефакты скопированы в `doc/tmp/releases/`.

## Release artifacts
- VSIX: `codeai-hub-1.1.480.vsix` (также `doc/tmp/releases/codeai-hub-1.1.480.vsix`)
- Tarballs: `doc/tmp/releases/claude-module-1.1.480.tar.bz2`, `doc/tmp/releases/codex-module-1.1.480.tar.bz2`, `doc/tmp/releases/gemini-module-1.1.480.tar.bz2`, `doc/tmp/releases/codeai-hub-core-darwin-arm64-1.1.480.tar.bz2`, `doc/tmp/releases/CodeAIHubLauncher-macos-arm64-1.1.480.tar.bz2`, `doc/tmp/releases/vscode-webview-1.1.480.tar.bz2`, `doc/tmp/releases/project-manager-1.1.480.tar.bz2`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `4a1f69be chore(release): build next version`
- `2ce8ba3e docs: sync workflow docs with current UI`
- `7dbfc823 chore(types): remove unused codex registry metadata`
- `b3c2e2e5 chore(extension): prune unused runtime registry exports`
- `3ef33c49 chore(extension): remove unused cef launcher APIs`
- `5af4bd6c chore(extension): remove unused runtime helpers`
- `06cfe5ab chore(extension): remove unused provider module installers`
- `4b36f313 chore(ui): remove unused todo snapshot toggling`
- `f211fe99 chore(ui): remove unused todo toggle plumbing`
- `5306f4f8 chore(webview): remove unused todo panel`
- `1a16f938 chore(webview): remove unused app-host helpers`
- `66c5e47d fix(docs): fix provider setup guide link`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `README.md`
2. `CHANGELOG.md`
3. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
4. `doc/SolidWorks-Flow/README.md`
5. `doc/Sessions/Session058.md` (THIS REPORT)

## Plans for next session
- При необходимости — manual smoke-test VSIX `codeai-hub-1.1.480.vsix`.
- Push в `origin/main`.
