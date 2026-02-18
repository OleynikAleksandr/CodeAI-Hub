# Session 080 — Claude Auth Fix (v1.1.631) + Bug Registry

**Date:** 2026-02-18 09:30 (CET)
**Branch:** main
**Version:** 1.1.631

---

# 1. Work Done in This Session

## Work summary

### Блок 1 — Phase 214: Lock workflow sessions immediately (v1.1.629)
- Зафиксирован BUG-2026-02-18-01: Reviewer-сессия открывалась с unlocked input.
- Root cause: `createInitialSnapshot()` лочила только `sessionKind="collector"`.
- Fix (Вариант C по решению пользователя): расширили условие до `stage != null && sessionKind != null`.
- Добавлен комментарий для будущих исключений (implementation/planning стадии).
- Тест обновлён: reviewer ожидает `"running"`, добавлен тест для non-workflow сессий.
- Релиз v1.1.629.

### Блок 2 — Claude Auth Investigation (v1.1.630 → v1.1.631)
- Пользователь сообщил: Claude НЕДОСТУПЕН после установки нового релиза.
- **Первая гипотеза (CLAUDECODE):** `getAuthEnvironment()` передавал переменную `CLAUDECODE` в auth probe, что приводило к ошибке "nested session". Fix: убрали `CLAUDECODE` из destructuring. Релиз v1.1.630.
- **Вторая гипотеза (Keychain, root cause):** Из debug-лога выяснено, что `CLAUDECODE` уже не проблема. Новая ошибка: `AxiosError 401`. Core читал `accessToken` из macOS Keychain и передавал его как `CLAUDE_CODE_OAUTH_TOKEN` env var — **без механизма refresh**. Истёкший токен → 401.
- Fix (v1.1.631): убрали передачу `CLAUDE_CODE_OAUTH_TOKEN` из Keychain-токена. Теперь Claude CLI читает Keychain нативно (он системный, не зависит от HOME) и сам обновляет токен при необходимости.
- Параллельно зафиксирован косметический BUG-2026-02-18-03: macOS диалог "Keychain Not Found" при запуске VSCode — Claude пытается записать обновлённый токен в Keychain из subprocess Extension Host, у которого нет прав на запись. Действие пользователя: нажать Cancel. Работе не мешает.

## Technical notes
- Файл фикса auth: `packages/Claude_Module/src/auth/sdk-auth-manager.ts` — метод `getAuthEnvironment()`.
- Удалён метод `resolveOAuthTokenFromCacheOrEnvironment()` (стал unused).
- `bootstrapOAuthToken()` остался, но `cachedOAuthToken` больше не читается снаружи.
- Keychain read: `/usr/bin/security find-generic-password -s "Claude Code-credentials" -w` — системный, не зависит от HOME. Claude CLI сам умеет refresh через этот вызов.
- Условие передачи `CLAUDE_CODE_OAUTH_TOKEN`: только если задан пользователем явно (`process.env[CLAUDE_OAUTH_ENV_KEY]`).

## Artefacts
- VSIX: `codeai-hub-1.1.629.vsix`, `codeai-hub-1.1.630.vsix`, `codeai-hub-1.1.631.vsix`
- Tarballs: `~/.codeai-hub/releases/*-1.1.631.tar.bz2`

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `63ab37d1 fix(ui): lock all workflow sessions immediately on open`
- `262fd87e chore(build): verify webview after workflow session lock fix`
- `cb7b33cc feat(release): v1.1.629 - lock workflow sessions immediately`
- `ce115323 docs(release): record v1.1.629 build`
- `3ffdf560 fix(claude): strip CLAUDECODE from auth env to prevent nested session error`
- `2e6f48a8 docs(bugs): register BUG-2026-02-18-02 claude nested session auth fix`
- `7c31de5f feat(release): v1.1.630 - fix claude nested session auth`
- `79f8fde7 fix(claude): let CLI handle Keychain auth natively, skip OAUTH token env forwarding`
- `c3a0406c feat(release): v1.1.631 - fix claude keychain auth refresh`
- `a1a37db7 docs(bugs): register BUG-2026-02-18-03 keychain not found cosmetic dialog`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
2. `doc/BugRegistry.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session080.md` (THIS REPORT)

## Plans for next session
- BUG-2026-02-18-01 (OPEN): workflow-сессия открывается с unlocked — закрыть после верификации v1.1.629.
- BUG-2026-02-18-03 (OPEN, cosmetic): macOS "Keychain Not Found" диалог — исследовать варианты fix:
  1. Записывать credentials в provider-home `.credentials.json` после успешного auth probe.
  2. Сделать `.credentials.json` симлинком на нативный `~/.claude/.credentials.json`.
  3. Найти env var Claude CLI для подавления Keychain write.
- Закрыть/актуализировать BUG-2026-02-17-04/05/06 (Claude auth проблемы, частично решены).
- Следующая функциональная задача по TODO.

