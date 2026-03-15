# Session 076 — Usage limits replay hotfix release 1.1.728

**Date:** 2026-03-15 09:39 (CET)
**Branch:** main
**Version:** 1.1.728

---

# 1. Work Done in This Session

## Work summary
- Release-facing docs синхронизированы под hotfix-релиз `1.1.728`: `README.md`, `CHANGELOG.md` и `doc/TODO/todo-plan.md` теперь явно фиксируют websocket replay fix для `usage_limits`.
- Выполнен полный `./scripts/build-all.sh`: unified/workspace version поднята до `1.1.728`, обновлены package versions и локальные manifest pointers для `core`, `launcher`, provider-модулей и UI.
- Выполнен `./scripts/build-release.sh --use-current-version`; собран VSIX `codeai-hub-1.1.728.vsix`.
- Hotfix-релиз покрывает transport-gap, из-за которого `Codex` usage limits могли теряться в `Project Manager` / `Session UI` при позднем websocket/workspace-scope attach.

## Git commits
- `08699bef docs(release): prep usage limits replay hotfix release`
- `b4ea4eef chore(release): build usage limits replay hotfix release`

## Verification
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`
- В финальном release build подтверждены `Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`.
- Advisory duplication check во время `build-release` снова показал `3.12%` при пороге `3%`, но pipeline не прервался и VSIX был собран успешно.

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `doc/SolidWorks-WorkFlow/README.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Session075.md`
7. `doc/Sessions/Session076.md` (THIS REPORT)

> Текущий status: hotfix-релиз `v1.1.728` собран локально. План с usage-limits scope полностью закрыт до `Phase 9`.

## Plans for next session
- Протестировать `v1.1.728` локально в `Project Manager` и подтвердить, что `Codex` usage limits теперь стабильно переживают reconnect / workspace-scope rebind.
- Отдельно разобрать `Claude`-симптом, где context/token usage materialize только после reopen workspace.
- Архивировать завершённый `doc/TODO/todo-plan.md` по правилам процесса и начинать новый planning/execution cycle только после утверждения следующего scope.
