# Session 025 — Claude OAuth Store Parsing Hotfix + Release 1.1.571

**Date:** 2026-02-12 14:45 (Europe/Warsaw)
**Branch:** main
**Version:** 1.1.571

---

# 1. Work Done in This Session

## Work summary
- Диагностирован регресс после рефакторинга Phase 144: provider-home preflight падал с `401 Invalid bearer token`, из-за чего Claude становился `UNAVAILABLE`.
- Исправлен `claude-oauth-token-reader`: теперь payload из platform store сначала парсится как JSON (извлекается `accessToken`), и только затем применяется raw-token fallback.
- Выполнен релизный цикл: `./scripts/build-all.sh` (version bump до `1.1.571`) и `./scripts/build-release.sh --use-current-version`.
- Обновлены релизные документы (`CHANGELOG.md`, `README.md`, `SystemArchitecture.md`, `Stacks/Claude.md`) под `1.1.571`.
- Собран VSIX: `codeai-hub-1.1.571.vsix`.

## Git commits
- `b27c90ed fix(claude): parse oauth store JSON before raw token fallback`
- `e3f2f10a chore(release): run build-all for v1.1.571`
- `7a7e781a docs(release): sync docs for v1.1.571`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md`
3. `doc/Sessions/Session025.md` (THIS REPORT)

## Plans for next session
- Проверить в runtime/UI, что Claude provider стабильно активен после Restart Core без ручного `claude login`.
- При необходимости добавить targeted regression test для OAuth store JSON parsing path (macOS keychain shape `claudeAiOauth.accessToken`).
- Продолжить выполнение следующей активной Phase из `doc/TODO/todo-plan.md`.
