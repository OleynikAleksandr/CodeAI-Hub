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

## Key changes (what to remember)
- Startup lock работает **только** в окне первого turn: lock берётся перед первым `thread.runStreamed(...)` при `session.codexThreadId === null` и освобождается сразу после первого `thread.started` (либо при ошибке/таймауте).
- После bind действует defense-in-depth из предыдущих коммитов: любые попытки перепривязки `thread_id` игнорируются.

## Files changed (high-level)
- Startup lock: `packages/Codex_Module/src/messaging/codex-startup-lock.ts`
- Integration: `packages/Codex_Module/src/messaging/message-processor.ts`
- Docs/plan: `doc/Project_Docs/Codex_ThreadId_StartupLock_Architecture.md`, `doc/TODO/todo-plan.md`
- Release docs: `README.md`, `CHANGELOG.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`

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
(ВАЖНО: этот список нужен для следующей сессии, чтобы восстановить контекст через `git show`)
- `06a72fa fix(codex): lock thread id on first turn`
- `e4075a1 fix(codex): default CODEX_HOME to hub directory`
- `39783cc docs(codex): add lock-on-first-turn architecture`
- `cb85bcf docs(todo): add codex startup lock phase`
- `b25e33c docs(codex): add startup lock thread binding architecture`
- `428cf05 docs(session): add Session050 report`
- `8526891 docs(todo): mark codex startup lock design done`
- `f79feed fix(codex): serialize first turn until thread id bound`
- `2970faa docs: verify codex startup lock`
- `390f3fb chore(release): prepare 1.1.382`
- `7842ffd docs(session): add Session051 report`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/Sessions/Session051.md` (THIS REPORT)
2. `doc/Project_Docs/Codex_ThreadId_StartupLock_Architecture.md`
3. `doc/Project_Docs/Codex_ThreadId_LockOnFirstTurn_Architecture.md`
4. `doc/TODO/todo-plan.md`

## How to restore context (zero-context playbook)
1. Для каждого коммита из списка выше:
   - `git show --stat <hash>`
   - `git show <hash>`
2. Проверить текущие артефакты релиза:
   - `ls -1 codeai-hub-1.1.382.vsix`
   - `ls -1 doc/tmp/releases | rg "1\.1\.382"`

## Plans for next session
- Протестировать VSIX `codeai-hub-1.1.382.vsix` на сценариях параллельного старта нескольких Codex-сессий (подтвердить отсутствие misrouting).
- При необходимости: уточнить таймауты startup lock в `packages/Codex_Module/src/messaging/message-processor.ts` и добавить метрики/логирование аномалий.
