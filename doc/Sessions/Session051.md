# Session 051 — Codex: Startup Lock + релиз 1.1.382 для тестов

**Date:** 2026-01-05 08:57 (CET)
**Branch:** main
**Version:** 1.1.382

---

# 1. Work Done in This Session

## Work summary
- Реализован **global startup lock** для Codex: сериализация первого `thread.runStreamed` до получения первого `thread.started` и bind `thread_id`.
- Обновлён `doc/TODO/todo-plan.md`: Phase 3 / Stream закрыт (включая запись hash).
- Подготовлены релизные документы под 1.1.382: `README.md`, `CHANGELOG.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`.
- Собран релиз 1.1.382 для тестирования (build-all + build-release).

## Verification
- `./scripts/check-architecture.sh`
- `npx ultracite check`
- `npx ts-prune`
- `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`
- `npm run check:links`
- `npm run build --workspace @codeai-hub/codex-module`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`

## Artifacts (1.1.382)
- VSIX: `codeai-hub-1.1.382.vsix` (repo root)
- Tarballs (local cache): `~/.codeai-hub/releases/*-1.1.382.tar.bz2`
- Tarballs (workspace copy): `doc/tmp/releases/*-1.1.382.tar.bz2`

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через git show)
- `8526891 docs(todo): mark codex startup lock design done`
- `f79feed fix(codex): serialize first turn until thread id bound`
- `2970faa docs: verify codex startup lock`
- `390f3fb chore(release): prepare 1.1.382`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Sessions/Session051.md` (THIS REPORT)
2. `doc/TODO/todo-plan.md`
3. `doc/Project_Docs/Codex_ThreadId_StartupLock_Architecture.md`

## Plans for next session
- Протестировать VSIX `codeai-hub-1.1.382.vsix` на сценариях параллельного старта нескольких Codex-сессий (подтвердить отсутствие misrouting).
- При необходимости: уточнить таймауты startup lock (`STARTUP_LOCK_*_TIMEOUT_MS`) и добавить метрики/логирование аномалий.
