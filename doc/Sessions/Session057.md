# Session 057 — Fix: dialog token usage hydration (Codex) + Release v1.1.708

**Date:** 2026-03-05 12:50 (CET)
**Branch:** main
**Version:** 1.1.708

---

# 1. Work Done in This Session

## Work summary
- Подтверждён баг: в dialog-mode Codex-сессия могла показывать `0 tokens (100%)` даже при наличии корректного `tokenUsage` в continuity.
- Root cause: Core делал continuity replay token usage при `session:binding`, но `session:stream` event не содержал `providerSessionId`/`threadId`, поэтому Project Manager не мог применить token usage fallback и оставался на default `0 / 200_000`.
- Fix: Core добавляет `providerSessionId` в continuity `token_usage` stream event; добавлен guard-тест в PM.
- Собран релиз `1.1.708` (`build-all` + `build-release --use-current-version`), VSIX: `codeai-hub-1.1.708.vsix`.
- Обновлены `README.md` и `CHANGELOG.md` под `v1.1.708`.
- Пользователь подтвердил исправление и релиз.

## Validation / build
- `node --test --import tsx src/client/project-manager/components/sessions/token-usage-stream.test.ts` — ✅ passed.
- `./scripts/build-all.sh` — ✅ success (1.1.708).
- `./scripts/build-release.sh --use-current-version` — ✅ success (`codeai-hub-1.1.708.vsix`).

## Git commits
(ВАЖНО: список для восстановления контекста в следующей сессии через `git show`)
- `0564920b fix(core): include providerSessionId in continuity token usage`
- `3a61f1d0 chore(release): build-all v1.1.708`
- `63094a7b docs(release): sync README and changelog for v1.1.708`
- `ff959c4b docs(bug): register codex dialog token usage hydration`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/Docs_Index.md`
2. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
3. `doc/BugRegistry.md`
4. `doc/Sessions/Session057.md` (THIS REPORT)

## Notes / risks
- Любой continuity replay event, который должен обновлять Session UI в dialog-mode, обязан содержать идентификатор провайдера (`providerSessionId` и/или `threadId`) для fallback-маршрутизации в Project Manager.
