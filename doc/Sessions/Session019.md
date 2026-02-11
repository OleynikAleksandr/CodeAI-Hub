# Session 019 — Codex Model 5.3 + Claude Default=Sonnet + Release 1.1.563

**Date:** 2026-02-11 16:29 (CET)
**Branch:** main
**Version:** 1.1.563

---

# 1. Work Done in This Session

## Work summary
- Codex: обновлен список моделей и дефолты на `gpt-5.3-codex` (с сохранением legacy `gpt-5.2-codex` как succeeded-by).
- Session UI: исправлено отображение Claude default модели (больше не показываем `Default` как модель).
- Claude settings: убран persist значения `default` в `~/.codeai-hub/settings/settings.json`; теперь дефолт и запись только `sonnet`, плюс миграция `default -> sonnet` на load.
- Выполнены `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`; собран `codeai-hub-1.1.563.vsix` и обновлены tarball в `~/.codeai-hub/releases/` и `doc/tmp/releases/`.
- Синхронизированы release-документы под `1.1.563`: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `6b5a8fea feat(codex): default gpt-5.3-codex`
- `6306b5ba fix(ui): show Sonnet for Claude default model`
- `9f3f53cc fix(ui): codex default fallback uses registry`
- `b4465069 docs: update codex model to gpt-5.3-codex`
- `14f4b5f6 chore(webview): rebuild bundle`
- `9f922a78 chore(release): run build-all for v1.1.562`
- `6475a73d docs(release): sync notes and system architecture for v1.1.562`
- `6d906d60 fix(claude): persist sonnet default model`
- `a3c29f68 chore(webview): rebuild bundle`
- `da48b838 chore(release): run build-all for v1.1.563`
- `ad9eb2f4 docs(release): sync notes and system architecture for v1.1.563`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session019.md` (THIS REPORT)

## Plans for next session
- При необходимости: добавить отдельную фазу по runtime template governance (whitelist активных template roots).
- Проверить чистую установку VSIX `1.1.563` на новом окружении и подтвердить, что settings snapshot создается с `claude.defaultModel=sonnet` и `codex.defaultModel=gpt-5.3-codex`.
