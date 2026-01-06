# Session 062 — Hotfix: Core runtime bundles Agent Packages & Release 1.1.389

**Date:** 2026-01-06 19:43 (CET)
**Branch:** main
**Version:** 1.1.389

---

# 1. Work Done in This Session

## Work summary
- Найдена причина падения запуска Core после рефакторинга Agent Packages: в собранном Core runtime отсутствовали agent‑пакеты, а workspace `file:` зависимости превращались в битые symlink’и → `MODULE_NOT_FOUND` и health-check `/api/v1/health` не проходил.
- Исправлен `scripts/build-core.sh`: при сборке core runtime теперь включаются `packages/agents/shared` и `packages/agents/idea-collector` в `$INSTALL_ROOT/agents/` + создаются валидные ссылки для резолва зависимостей.
- Зафиксировано правило в системной архитектуре: любые новые модули обязаны быть подключены к pipeline сборки (`build-*.sh`/`build-all.sh`), особенно если используются workspace `file:` зависимости.
- Собран релиз 1.1.389: `./scripts/build-all.sh` (providers/core/ui/launcher) + `./scripts/build-release.sh --use-current-version` (VSIX).

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `8dc92fb fix(build): include agent packages in core runtime`
- `58b7cec chore(release): bump versions to 1.1.389`
- `3bf8747 docs(release): add 1.1.389 hotfix notes`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/Project_Docs/AgentPackages_Architecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session062.md` (THIS REPORT)

## Plans for next session
- Проверить установку/старт на “чистой” среде (fresh VSIX): Core должен стартовать и отвечать на `GET /api/v1/health`.
- Рассмотреть упаковку остальных Agent Packages (например, `spec-creator`) в core runtime по мере включения их в Core dependencies.
- При необходимости: завести Phase 5 (Spec Creator implementation / UI integration) через дизайн-док в `doc/Project_Docs/` → новый `doc/TODO/todo-plan.md`.

---

# Release artifacts
- VSIX: `codeai-hub-1.1.389.vsix`
- Launcher: `CodeAIHubLauncher-macos-arm64-1.1.389.tar.bz2`
- Core: `codeai-hub-core-darwin-arm64-1.1.389.tar.bz2`
- Providers: `claude-module-1.1.389.tar.bz2`, `codex-module-1.1.389.tar.bz2`, `gemini-module-1.1.389.tar.bz2`
- UI: `vscode-webview-1.1.389.tar.bz2`, `web-client-1.1.389.tar.bz2`, `project-manager-1.1.389.tar.bz2`
