# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- TODO Plan состоит из Phase (Фаз). В каждой Phase некоторое количество Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work (Codex only)
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Project_Docs/Stacks/Codex_SDK_Module.md`
3. `doc/Project_Docs/TokenUsage/ClaudeTokenUsage_Architecture.md` (reference pattern)
4. `doc/Sessions/Session065.md` (token usage persistence via continuity)
5. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 86 — Codex: token usage via CLI `/status` (owner: Oleksandr, updated: 2026-02-01)

### Stream: bootstrap (archive + new plan)
1. [IN_PROGRESS] Docs(todo): заархивировать завершённый Phase 85 план и создать новый Phase 86 (Codex token usage) — scope: `doc/TODO/Archive/todo-plan-phase85-release-1.1.493-docs-github-sync-2026-02-01.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): start Phase 86 codex token usage via status`
2. [TODO] Git Commit: `docs(todo): start Phase 86 codex token usage via status` (hash: TBD)

### Stream: design (architecture first)
3. [TODO] Docs(architecture): добавить архитектурный документ Codex token usage (source-of-truth: `/status` строка `Context window: 82% left (55.3K used / 258K)`) + требования к throttling/persistence/restore — scope: `doc/Project_Docs/TokenUsage/CodexTokenUsage_Architecture.md`; expected commit message: `docs: add Codex token usage architecture`
4. [TODO] Git Commit: `docs: add Codex token usage architecture` (hash: TBD)
5. [BLOCKED] Approval: согласовать `doc/Project_Docs/TokenUsage/CodexTokenUsage_Architecture.md` до начала реализации — scope: docs; expected commit message: N/A

### Stream: spike (prove `/status` can be read safely)
6. [TODO] Spike(codex-module): проверить, как программно получать `/status` для существующей сессии (resume) в JSON режиме и где именно в event-stream появляется строка `Context window: ...` — scope: ≤3 файлов в `packages/Codex_Module/src/`; expected commit message: `spike(codex-module): validate status token usage source`
7. [TODO] Git Commit: `spike(codex-module): validate status token usage source` (hash: TBD)

### Stream: filesystem contract (Codex session logs)
8. [TODO] Feat(codex-module): добавить resolver, который по `providerSessionId` (thread id) находит rollout JSONL файл Codex в `CODEX_HOME/sessions/YYYY/MM/DD/rollout-*-<id>.jsonl` (fallback: scan) — scope: ≤3 файлов в `packages/Codex_Module/src/`; expected commit message: `feat(codex-module): resolve codex rollout file by session id`
9. [TODO] Git Commit: `feat(codex-module): resolve codex rollout file by session id` (hash: TBD)

### Stream: parser + reader
10. [TODO] Feat(codex-module): реализовать парсер snapshot из `/status` (K/M suffix, decimals) → `{ used, limit }` (аналог `claude-context-usage-snapshot.ts`) — scope: ≤3 файлов в `packages/Codex_Module/src/`; expected commit message: `feat(codex-module): parse /status context window tokens`
11. [TODO] Git Commit: `feat(codex-module): parse /status context window tokens` (hash: TBD)

12. [TODO] Feat(codex-module): реализовать reader `/status` с throttling (не чаще X мс/сессию) и без загрязнения UI истории (internal-only) — scope: ≤3 файлов в `packages/Codex_Module/src/`; expected commit message: `feat(codex-module): read token usage via /status`
13. [TODO] Git Commit: `feat(codex-module): read token usage via /status` (hash: TBD)

### Stream: provider → core event wiring
14. [TODO] Feat(codex-module): после завершения turn обновлять tokenUsage через `/status` и эмитить `stream_event` с `tokenUsage` (как в Claude) — scope: ≤3 файлов в `packages/Codex_Module/src/`; expected commit message: `feat(codex-module): emit token usage stream events`
15. [TODO] Git Commit: `feat(codex-module): emit token usage stream events` (hash: TBD)

### Stream: verification
16. [TODO] Verification: прогнать гейты + таргетный билд `npm run build --workspace @codeai-hub/codex-module` — scope: scripts; expected commit message: `chore: verify codex /status token usage`
17. [TODO] Git Commit: `chore: verify codex /status token usage` (hash: TBD)

### Stream: session report
18. [TODO] Docs(session): создать отчёт `doc/Sessions/Session068.md` (Codex token usage via /status — design + implementation) — scope: `doc/Sessions/Session068.md`; expected commit message: `docs(session): Session068 codex /status token usage`
19. [TODO] Git Commit: `docs(session): Session068 codex /status token usage` (hash: TBD)
