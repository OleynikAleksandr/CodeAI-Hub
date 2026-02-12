# Session 023 — Claude Provider-Home OAuth Bootstrap + Release 1.1.569

**Date:** 2026-02-12 13:03 (CET)
**Branch:** main
**Version:** 1.1.569

---

# 1. Work Done in This Session

## Work summary
- Завершена реализация `Phase 146`:
  - Claude auth layer получил OAuth bootstrap + `CLAUDE_CODE_OAUTH_TOKEN` injection в provider-home runtime env.
  - Добавлен preflight gate перед первой рабочей Claude-сессией (probe + retry после refresh токена, затем явный login hint только при повторном фейле).
  - Исправлен режим preflight-probe: переход на `spawn` с закрытым stdin (`stdio: ["ignore", ...]`), чтобы исключить зависание non-interactive check.
- Подтвержден runtime-контракт provider-home:
  - новые Claude-сессии CodeAI Hub пишутся в `~/.codeai-hub/providers/claude/home/.claude/projects/*`;
  - терминальные Claude-сессии продолжают писаться в `~/.claude/projects/*`.
- Выполнен релизный цикл `1.1.569`:
  - `./scripts/build-all.sh`
  - `./scripts/build-release.sh --use-current-version`
  - собран VSIX `codeai-hub-1.1.569.vsix`.
- Синхронизирована документация под `Phase 146` / `v1.1.569`:
  - `README.md`, `CHANGELOG.md`
  - `doc/SolidWorks-Flow/System/SystemArchitecture.md`
  - `doc/SolidWorks-Flow/Stacks/Claude.md`
  - `doc/SolidWorks-Flow/knowledge/guides/ProviderSetupGuide.md`.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `24f0460b fix(claude): inject oauth token for provider-home sessions`
- `e40ca9cb feat(claude): add provider-home login preflight gate`
- `58d61b9c test(claude): verify provider-home auth bootstrap and session paths`
- `107f184b chore(release): run build-all for phase146`
- `3cc44984 chore(release): build vsix for phase146`
- `28539709 docs(todo): finalize phase146 status`
- `bcf71f37 docs(release): sync claude architecture docs for v1.1.569`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/Stacks/Claude.md`
3. `doc/SolidWorks-Flow/knowledge/guides/ProviderSetupGuide.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Session023.md` (THIS REPORT)

## Plans for next session
- Перейти к реализации `Phase 144`: модуль получения usage limit через ratelimit headers (подход `nsanden/claude-rate-monitor`) для Claude.
- Сохранить текущий UI-контракт `usage_limits` (`session` + `weekly all models` + `Resets ...`) без изменений формата Session ID панели.
- Учесть provider-home auth bootstrap контур `Phase 146` при внедрении нового usage-процесса (без регрессий для first-session preflight).
