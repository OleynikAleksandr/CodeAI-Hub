# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase — Stream (стрим) с микрозадачами.
- Каждая микрозадача затрагивает **≤ 3 файлов**.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- **Gates после каждой микрозадачи**: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка затронутого пакета/клиента.
- После зелёных гейтов — Git Commit, затем сразу обновляем статусы/хеши в `doc/TODO/todo-plan.md`.
- Любые изменения логики/архитектуры синхронно отражаются в документации (`doc/Project_Docs/**`) в том же коммите.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Project_Docs/Stacks/Claude.md`
3. `doc/Project_Docs/Stacks/Codex_SDK_Module.md`
4. `doc/Project_Docs/SessionContinuity/Claude_OneShot_Session_Architecture.md`
5. `doc/Project_Docs/SessionContinuity/SessionContinuity_Architecture.md`
6. `doc/Project_Docs/SessionContinuity/VirtualConversation_SeamlessContinuity_Architecture.md`
7. `doc/SolidWorks-Flow/SessionContinuity/NodeSessionContinuity_Architecture.md`
8. `doc/SolidWorks-Flow/SessionContinuity/ContinuityReport_Contracts.md`
9. `doc/Sessions/Session094.md`
10. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 98 — Claude One-Shot Session Model (Codex parity + Continuity compatibility) (owner: Oleksandr, updated: 2026-02-06)

### MVP Definition (must)
- Перевести `Claude_Module` с streaming input mode на **one-shot turn model** (один turn = один `query`), с FIFO очередью turn-ов.
- Сохранить все флаги полного доступа (`bypassPermissions`, `allowDangerouslySkipPermissions`, `additionalDirectories`, `settingSources`, `environment`, `pathToClaudeCodeExecutable`, `includePartialMessages`, model/thinking/output schema).
- Сохранить Core/UI event contract (`turn_started`, `turn_completed`, `turn_failed`, `assistant`, `dialog_message(thinking)`, `stream_event(token_usage)`), без регрессии Session Continuity.
- Resume не должен создавать новый provider session jsonl; продолжение должно идти в текущий session history (no fork).
- Все текущие Claude-логи продолжают писаться; resume/rebind не должен обнулять лог-файл.

### Stream: design sync + docs freeze
1. [DONE] Docs(arch): согласовать и зафиксировать архитектуру one-shot Claude на базе `Claude_OneShot_Session_Architecture.md` (scope: `doc/Project_Docs/SessionContinuity/Claude_OneShot_Session_Architecture.md`; expected commit message: `docs(arch): approve claude one-shot session architecture`)
2. [DONE] Git Commit: `docs(arch): approve claude one-shot session architecture` (hash: 5a4efdd5)
3. [DONE] Docs(system): синхронизировать SystemArchitecture с новым Claude one-shot контрактом и continuity-инвариантами (scope: `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`, `doc/Project_Docs/SessionContinuity/SessionContinuity_Architecture.md`; expected commit message: `docs(system): align continuity contract for claude one-shot`)
4. [DONE] Git Commit: `docs(system): align continuity contract for claude one-shot` (hash: 02c0e518)
5. [DONE] Docs(stack): обновить стек Claude с описанием one-shot session lifecycle и resume semantics (scope: `doc/Project_Docs/Stacks/Claude.md`; expected commit message: `docs(stack): document claude one-shot session lifecycle`)
6. [DONE] Git Commit: `docs(stack): document claude one-shot session lifecycle` (hash: eb8a92b6)

### Stream: Claude session scaffold (queue-ready)
7. [DONE] Refactor(claude-session): расширить session types под one-shot queue state (`inFlight/internalTurn/lifecycle`) без breaking изменений контракта (scope: `packages/Claude_Module/src/session/types.ts`; expected commit message: `refactor(claude): extend session types for one-shot queue`)
8. [DONE] Git Commit: `refactor(claude): extend session types for one-shot queue` (hash: 21695d17)
9. [DONE] Refactor(claude-session): адаптировать session manager под queue-driven модель создания/резюма сессий (scope: `packages/Claude_Module/src/session/session-manager.ts`, `packages/Claude_Module/src/session/session-lifecycle.ts`; expected commit message: `refactor(claude): align session manager with one-shot queue`)
10. [DONE] Git Commit: `refactor(claude): align session manager with one-shot queue` (hash: c342f951)
11. [DONE] Refactor(claude-session): убрать зависимость закрытия от long-lived query generator и ввести корректный shutdown pending turns (scope: `packages/Claude_Module/src/session/session-lifecycle.ts`, `packages/Claude_Module/src/session/types.ts`; expected commit message: `refactor(claude): harden one-shot session shutdown`)
12. [DONE] Git Commit: `refactor(claude): harden one-shot session shutdown` (hash: 7f936f57)

### Stream: Claude SDK manager one-shot orchestration
13. [DONE] Refactor(claude-sdk): удалить long-lived `ensureSessionStarted/queryInstance` bootstrap и маршрутизировать send в очередь процессора turn-ов (scope: `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`, `packages/Claude_Module/src/session/types.ts`; expected commit message: `refactor(claude): switch sdk manager to one-shot dispatch`)
14. [DONE] Git Commit: `refactor(claude): switch sdk manager to one-shot dispatch` (hash: bcccb0de)
15. [DONE] Refactor(claude-sdk): выделить детерминированный билдер query options и сохранить все full-access флаги + output schema/thinking/model (scope: `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`; expected commit message: `refactor(claude): preserve full-access query options in one-shot mode`)
16. [DONE] Git Commit: `refactor(claude): preserve full-access query options in one-shot mode` (hash: 58af0acd)
17. [DONE] Fix(claude-sdk): жёстко зафиксировать resume semantics `resume=<providerSessionId>` без fork и без file-discovery зависимости (scope: `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`, `packages/Claude_Module/src/messaging/session-file-discovery.ts`; expected commit message: `fix(claude): use sdk session id as resume source of truth`)
18. [DONE] Git Commit: `fix(claude): use sdk session id as resume source of truth` (hash: ffad6ae5)

### Stream: Claude message processor one-shot engine
19. [DONE] Refactor(claude-messaging): внедрить FIFO queue + consume/process turn loop (аналог Codex orchestration) (scope: `packages/Claude_Module/src/messaging/message-processor.ts`, `packages/Claude_Module/src/session/types.ts`; expected commit message: `refactor(claude): add one-shot turn queue processor`)
20. [DONE] Git Commit: `refactor(claude): add one-shot turn queue processor` (hash: ce0074d2)
21. [DONE] Fix(claude-messaging): обеспечить lifecycle state machine 1x `turn_started` и 1x completion/failure на user turn (scope: `packages/Claude_Module/src/messaging/message-processor.ts`; expected commit message: `fix(claude): enforce deterministic turn lifecycle events`)
22. [DONE] Git Commit: `fix(claude): enforce deterministic turn lifecycle events` (hash: 81e73f09)
23. [DONE] Refactor(claude-messaging): перенести текущую обработку assistant/thinking/structured-output без регрессий на one-shot loop (scope: `packages/Claude_Module/src/messaging/message-processor.ts`, `packages/Claude_Module/src/messaging/idea-collector-structured-output.ts`, `packages/Claude_Module/src/messaging/structured-output-utils.ts`; expected commit message: `refactor(claude): keep structured and thinking pipeline in one-shot mode`)
24. [DONE] Git Commit: `refactor(claude): keep structured and thinking pipeline in one-shot mode` (hash: 5a61d582)
25. [DONE] Fix(claude-messaging): сохранить token usage refresh после `result` с текущим throttling и event shape `token_usage` (scope: `packages/Claude_Module/src/messaging/message-processor.ts`, `packages/Claude_Module/src/sdk/claude-context-usage-reader.ts`; expected commit message: `fix(claude): preserve token usage stream in one-shot mode`)
26. [DONE] Git Commit: `fix(claude): preserve token usage stream in one-shot mode` (hash: f88046a7)

### Stream: logging parity (no truncation on resume)
27. [DONE] Fix(claude-logging): сделать logger append-safe для resume/rebind в тот же `providerSessionId` (без truncate существующего файла) (scope: `packages/Claude_Module/src/logging/sdk-session-logger.ts`; expected commit message: `fix(claude): append logs on resume without truncation`)
28. [DONE] Git Commit: `fix(claude): append logs on resume without truncation` (hash: 8687ea20)
29. [DONE] Fix(claude-logging): стабилизировать rename/promotion path temp->real без потери buffered entries (scope: `packages/Claude_Module/src/logging/sdk-session-logger.ts`; expected commit message: `fix(claude): preserve buffered logs during session promotion`)
30. [DONE] Git Commit: `fix(claude): preserve buffered logs during session promotion` (hash: 2f420558)

### Stream: provider adapter compatibility
31. [DONE] Refactor(claude-provider): проверить и закрепить routing listener-ов/alias-ов под one-shot promotion path (`sessionIdChanged`/`realSessionId`) (scope: `packages/Claude_Module/src/provider/claude-provider-adapter.ts`; expected commit message: `refactor(claude): stabilize provider listener routing in one-shot mode`)
32. [DONE] Git Commit: `refactor(claude): stabilize provider listener routing in one-shot mode` (hash: 0a6a6911)

### Stream: tests (targeted regression)
33. [DONE] Test(claude): добавить unit tests на очередь turn-ов и lifecycle (`started/completed/failed`) (scope: `packages/Claude_Module/src/messaging/message-processor.test.ts`, `packages/Claude_Module/package.json`; expected commit message: `test(claude): cover one-shot queue lifecycle`)
34. [TODO] Git Commit: `test(claude): cover one-shot queue lifecycle` (hash: TBD)
35. [TODO] Test(claude): добавить unit tests для logger resume/append semantics (scope: `packages/Claude_Module/src/logging/sdk-session-logger.test.ts`, `packages/Claude_Module/package.json`; expected commit message: `test(claude): cover logger append semantics`)
36. [TODO] Git Commit: `test(claude): cover logger append semantics` (hash: TBD)
37. [TODO] Test(core-bridge): добавить regression tests на совместимость Claude one-shot с continuity/turn-state контрактом (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`, `packages/core/package.json`; expected commit message: `test(core): guard continuity contract for claude one-shot`)
38. [TODO] Git Commit: `test(core): guard continuity contract for claude one-shot` (hash: TBD)

### Stream: verification + build
39. [TODO] Verify: прогнать обязательные Gates + таргетные сборки затронутых пакетов (`Claude_Module`, `core`, `build:webview`, `typecheck:webview`) и зафиксировать результаты в session report (scope: repo-wide commands + docs; expected commit message: `chore(qa): verify claude one-shot migration gates`)
40. [TODO] Git Commit: `chore(qa): verify claude one-shot migration gates` (hash: TBD)
41. [TODO] Release: собрать QA релиз (`./scripts/build-all.sh` -> `./scripts/build-release.sh --use-current-version`) после зелёных гейтов (scope: repo-wide automated release files; expected commit message: `chore(release): build artifacts for claude one-shot qa`)
42. [TODO] Git Commit: `chore(release): build artifacts for claude one-shot qa` (hash: TBD)

### Stream: session wrap-up
43. [TODO] Docs(session): подготовить новый session report с timeline, списком commit hash и статусом continuity совместимости (scope: `doc/Sessions/Session095.md`; expected commit message: `docs(session): add Session095 claude one-shot report`)
44. [TODO] Git Commit: `docs(session): add Session095 claude one-shot report` (hash: TBD)
