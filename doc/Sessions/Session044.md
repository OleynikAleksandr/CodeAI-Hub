# Session 044 — Codex app-server startup hotfix for CLI 0.128

**Date:** 2026-05-03 08:51 (CEST)
**Branch:** `main`
**Version:** `1.2.131`
**Execution Scope Status:** ACTIVE

---

# 1. Work Done in This Session

## Work summary

- Новый scope этой сессии был переключён пользователем с восстановления `Session043` на расследование live blocker: в reopened Codex session следующий user turn завершался системным сообщением `Provider codexCli unavailable`.
- Диагностика по screenshot `2026-05-03 08:36 CEST`, Core log и локальному repro показала: `codex-cli 0.128.0` запускается, binary найден, managed `CODEX_HOME` clean, но `codex app-server` падает на startup overrides `-c mcp_servers.codex.enabled=false` / `-c mcp_servers.playwright.enabled=false` с `invalid transport in mcp_servers.codex`.
- Hotfix: из Codex app-server process profile удалены legacy partial `mcp_servers.*.enabled=false` overrides; verified feature disables `multi_agent`, `browser_use`, `in_app_browser`, `computer_use`, `image_generation`, `plugins`, `apps`, `tool_search` сохранены.
- Обновлены regression test и Codex SSOT: `Codex.md`, `Codex_ProviderInvocationFlags.md`, `BugRegistry.md`, `todo-plan.md`.
- Targeted verification прошла: `npx tsx --test packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.test.ts`, `npm run build --workspace @codeai-hub/codex-app-server-module`, direct built-process smoke `CodexAppServerProcess.start()` -> `codex-process-start-ok`.
- Release prep выполнен для `1.2.131`: README/CHANGELOG обновлены до будущей версии до release scripts.
- `./scripts/build-all.sh` успешно поднял unified version до `1.2.131`, пересобрал provider/core/UI/launcher tarball'ы и положил fresh artifacts в `~/.codeai-hub/releases/` и `doc/tmp/releases/`.
- `./scripts/build-release.sh --use-current-version` успешно прошёл architecture, type-check, compile, Step 7 SDK exclusions, Step 7.5 artefact validation including bundled Gemini module, markdown links, duplication, production dependency prune and VSIX runtime package surface verification.
- Создан `codeai-hub-1.2.131.vsix` (2.8M). Scope остаётся ACTIVE до пользовательского visual retest: установить `1.2.131`, перезапустить runtime и подтвердить, что reopened Codex session принимает следующий turn без `Provider codexCli unavailable`.

## Git commits

(ВАЖНО: при `Execution Scope Status: ACTIVE` следующая сессия обязана просмотреть каждый коммит через `git show --stat <hash>` и `git show <hash>`.)

- `2b48db841 fix: start codex app-server with 0.128 config schema`
- `c96e99410 docs: record codex startup hotfix hash`
- `2b1924c20 docs: prepare codex app-server startup hotfix release`
- `fabdce274 docs: record codex startup hotfix release prep hash`
- `04d681354 chore: bump release manifests for codex startup hotfix`
- `c88a95c04 docs: record codex startup hotfix build-all hash`
- `ef5081a40 docs: record codex startup hotfix release build`

---

# 2. Instructions for Next Session

**Recovery Owner:** `doc/TODO/todo-plan.md`

## Plans for next session

- Продолжать активный execution scope по `doc/TODO/todo-plan.md`.
- Список документов для восстановления контекста находится только в активном `doc/TODO/todo-plan.md`.
- Сначала получить пользовательский retest релиза `1.2.131`: установить `codeai-hub-1.2.131.vsix`, открыть тот же workspace/step `Virtual Simulation Codex`, отправить следующий user turn в reopened Codex session и проверить, что больше нет `Provider codexCli unavailable`.
- После retest проверить Core log: не должно быть `invalid transport in mcp_servers.codex`; Codex provider должен initialize-иться через app-server.
- Если retest принят, записать результат в `doc/TODO/todo-plan.md`, `doc/BugRegistry.md` при необходимости и текущий session report. Scope всё ещё не закрывать/архивировать без explicit user acceptance по общему active planning scope.
