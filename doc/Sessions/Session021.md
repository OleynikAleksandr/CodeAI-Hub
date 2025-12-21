# Session 21 — Release v1.1.327 (Codex defaults & reasoning)

**Date:** 2025-12-21 11:33 (CET)
**Branch:** main
**Version:** 1.1.327

---

# 1. Work Done in This Session

## Work summary
- Проверена реализация Codex-изменений: реестр моделей, дефолтная модель и reasoning в Settings UI, сохранение в `settings.json`.
- Исправлены тип-гуарды Codex настроек (TS) для чистого build-release.
- Собран релиз v1.1.327 по чеклисту: `build-all.sh` + `build-release.sh --use-current-version`, артефакты перенесены в `doc/tmp/releases/`.
- Документация обновлена под релиз (README, CHANGELOG, Architecture, SystemArchitecture).
- Пересобраны UI-бандлы через `build-ui-bundle.sh`, обновлён `assets/ui/manifest.json`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `1413685 chore: refresh ui manifest for v1.1.327`
- `5081ddc docs: add session 21 report`
- `93239b7 feat: v1.1.327 - codex defaults`
- `5dcd35d fix: loosen codex settings guards`
- `200b351 fix: codex settings reasoning guard`
- `d1a3b59 chore: bump version to 1.1.327`

## Release Artifacts (v1.1.327)
- **VSIX**: `codeai-hub-1.1.327.vsix` (426K)
- **Provider Modules**:
  - `claude-module-1.1.327.tar.bz2` (18K)
  - `codex-module-1.1.327.tar.bz2` (19K)
  - `gemini-module-1.1.327.tar.bz2` (14K)
- **Core**: `codeai-hub-core-darwin-arm64-1.1.327.tar.bz2` (35M)
- **CEF Launcher**: `CodeAIHubLauncher-macos-arm64-1.1.327.tar.bz2` (230M)
- **UI Bundles**:
  - `vscode-webview-1.1.327.tar.bz2` (137K)
  - `web-client-1.1.327.tar.bz2` (144K)
  - `project-manager-1.1.327.tar.bz2` (49K)

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session021.md` (THIS REPORT)

## Plans for next session
- Провести ручной e2e прогон Codex: выбор дефолтной модели, настройка reasoning, создание новой сессии.
- Проверить, что `settings.json` и `config.toml` синхронизируются при старте Codex SDK.
