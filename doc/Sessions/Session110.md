# Session 110 — Phase 104: workspace-scoped isolation, handshake и release prep

**Date:** 2026-02-07 16:26 (CET)
**Branch:** main
**Version:** 1.1.522

---

# 1. Work Done in This Session

## Work summary
- Реализована строгая workspace-изоляция PM/Core по ключу `workspacePath` (absolute path) для `session:*` событий.
- Введён явный handshake `workspace:scope:set -> workspace:scope:ack` и ordering перед `workspace-activate`/resume/create.
- Добавлены PM/UI guard'ы (no auto-focus/render/send в out-of-scope session) и deterministic reconciliation `activeSessionId`.
- Реализована scoped delivery логика в Core bridge для PM клиентов.
- Добавлены targeted regression тесты (PM/Core bridge + restart reopen/resume non-regression).
- `doc/TODO/todo-plan.md` обновлялся в реальном времени; закрыты stream'ы реализации/тестов Phase 104 (пункты 1-20).
- Начата подготовка release stream (синхронизация release-доков под v1.1.523).

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

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session110.md` (THIS REPORT)

## Plans for next session
- Закрыть release stream Phase 104: `docs(release)` -> `build-all` -> `build-release --use-current-version`.
- Проверить и зафиксировать артефакты (`doc/tmp/releases/*`, `codeai-hub-<version>.vsix`) в session report.
- После релиза выполнить smoke-check установки VSIX и зафиксировать результаты отдельным session report.
