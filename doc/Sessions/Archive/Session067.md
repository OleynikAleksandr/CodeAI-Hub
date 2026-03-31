# Session 067 — Main baseline release verification `v1.1.723`

**Date:** 2026-03-13 11:06 (CET)
**Branch:** main
**Version:** 1.1.723

---

# 1. Work Done in This Session

## Work summary
- После жёсткого baseline merge в основной `main` выполнена release-проверка уже из основного репозитория, чтобы подтвердить, что mainline теперь собирается как baseline-first линия.
- Release-facing документы `README.md` и `CHANGELOG.md` синхронизированы под новый verification release `v1.1.723`.
- Успешно выполнен `./scripts/build-all.sh`: unified version поднята с `1.1.722` до `1.1.723`, пересобраны provider modules, Core, UI bundles и CEF launcher.
- Успешно выполнен `./scripts/build-release.sh --use-current-version`: собран VSIX `codeai-hub-1.1.723.vsix`.
- Подтверждено, что основной `main` проходит release cycle без возврата к late PM/workflow-state линии; baseline response-mode fixes теперь доступны напрямую из главного репозитория.

## Verification
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`
- Финальные release gate steps подтверждены в выводе `build-release.sh`:
  - `Verifying SDK exclusions`
  - `Markdown links OK`
  - `Removing dev dependencies before packaging...`
  - `✅ Package created`

## Release artefacts
- VSIX: `codeai-hub-1.1.723.vsix`
- Tarballs: `doc/tmp/releases/`
  - `CodeAIHubLauncher-macos-arm64-1.1.723.tar.bz2`
  - `claude-module-1.1.723.tar.bz2`
  - `codeai-hub-core-darwin-arm64-1.1.723.tar.bz2`
  - `codex-module-1.1.723.tar.bz2`
  - `gemini-module-1.1.723.tar.bz2`
  - `project-manager-1.1.723.tar.bz2`
  - `vscode-webview-1.1.723.tar.bz2`

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через `git show`)
- `9ad7704a docs(release): prepare main baseline verification build`
- `bba59ec5 build(release): verify main baseline promotion build`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `README.md`
2. `CHANGELOG.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/SolidWorks-WorkFlow/Modules/Codex.md`
6. `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`
7. `doc/TODO/todo-plan.md`
8. `doc/Sessions/Archive/Session066.md`
9. `doc/Sessions/Archive/Session067.md` (THIS REPORT)

## Plans for next session
- Продолжать уже в обычном режиме из основного `main`; baseline line теперь является фактической главной веткой.
- Не открывать новых release/hotfix stream без нового воспроизводимого regression-case.
- Если возвращаться к response modes, продолжать по текущему `todo-plan`:
  - `Phase 291 / Stream 2` — raw provider diagnostics contract;
  - `Phase 292` — normalization, fallback progress layer и regression guards.
