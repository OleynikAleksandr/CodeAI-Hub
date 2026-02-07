# Session 110 — Phase 104 release: workspace-scoped session isolation (v1.1.523)

**Date:** 2026-02-07 16:32 (CET)
**Branch:** main
**Version:** 1.1.523

---

# 1. Work Done in This Session

## Work summary
- Реализована и зафиксирована архитектура strict workspace-scoped изоляции PM/Core (`workspacePath` как единственный ключ scope).
- Добавлен handshake `workspace:scope:set -> workspace:scope:ack` с ordering-гарантией перед `workspace-activate` и resume/create.
- В PM добавлены hard-guards против out-of-scope автофокуса/рендера/send; в Core включена scoped delivery фильтрация `session:*` событий.
- Добавлены regression/non-regression тесты для bridge delivery и restart reopen/resume path.
- Подготовлены release docs (`README`, `CHANGELOG`, session report) под релиз `v1.1.523`.
- Выполнен `./scripts/build-all.sh` (patch bump `1.1.522 -> 1.1.523`, сборка модулей/бандлов/launcher, копирование tarball в `doc/tmp/releases/`).
- Выполнен `./scripts/build-release.sh --use-current-version`:
  - подтверждены маркеры `Verifying SDK exclusions`, `Removing dev dependencies...`, `✅ Package created`;
  - собран VSIX: `codeai-hub-1.1.523.vsix`.
- Обновления `doc/TODO/todo-plan.md` выполнены в реальном времени, release stream пункты 21-26 закрыты.

## Release artifacts
- VSIX: `codeai-hub-1.1.523.vsix`
- Tarballs: `doc/tmp/releases/CodeAIHubLauncher-macos-arm64-1.1.523.tar.bz2`, `doc/tmp/releases/codeai-hub-core-darwin-arm64-1.1.523.tar.bz2`, `doc/tmp/releases/claude-module-1.1.523.tar.bz2`, `doc/tmp/releases/codex-module-1.1.523.tar.bz2`, `doc/tmp/releases/gemini-module-1.1.523.tar.bz2`, `doc/tmp/releases/vscode-webview-1.1.523.tar.bz2`, `doc/tmp/releases/project-manager-1.1.523.tar.bz2`

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `438d063c docs(session): add Session110 handoff for phase104 workspace isolation`
- `5ae2d255 docs(architecture): define workspace-scoped session isolation contract for project manager`
- `9cb9b650 fix(pm): prevent cross-workspace auto-focus on foreign session-created events`
- `02b4ef57 fix(pm): enforce active-session scope reconciliation and out-of-scope guards`
- `38f89788 test(pm): cover cross-workspace ghost-session prevention on stream events`
- `3745f892 feat(bridge): add workspace scope message contract for project manager clients`
- `1952b667 fix(core): scope session event delivery by selected workspace for pm clients`
- `c12afc43 feat(pm): sync selected workspace scope to core bridge`
- `59eeaa34 docs(plan): sync phase104 progress after workspace scope sync`
- `f6120a0b fix(non-regression): keep restart resume compatibility with scoped workspace isolation`
- `55fd62f0 docs(todo): record workspace-scope resume handshake commit hash`
- `fdfb039f test(core): validate workspace-scoped bridge delivery under concurrent sessions`
- `dfc60328 docs(todo): record core scoped-delivery test commit hash`
- `56473a09 test(non-regression): preserve workspace-tree reopen and reviewer resume after restart`
- `d42b5639 docs(todo): record non-regression test commit hash`
- `0de83e53 docs(release): prepare notes for workspace-scoped session isolation release`
- `465503a0 docs(todo): record release-docs commit hash`
- `af9fea48 chore(release): build-all after workspace-scoped session isolation`
- `d0eb6d36 docs(todo): record build-all release commit hash`
- `baea5036 chore(release): sync core and ui manifests for 1.1.523`
- `27f50d0a chore(release): sync launcher manifest for 1.1.523`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session110.md` (THIS REPORT)

## Plans for next session
- Провести manual smoke-check установки/запуска `codeai-hub-1.1.523.vsix` в VS Code.
- После подтверждения стабильности релиза заархивировать текущий `todo-plan` и открыть новый план следующей фазы.
- При выявлении регрессий оформить hotfix-stream в новом `todo-plan` и сразу синхронизировать docs/changelog.
