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
3. `doc/Project_Docs/TokenUsage/CodexTokenUsage_Architecture.md` (APPROVED DESIGN)
4. `doc/Project_Docs/TokenUsage/ClaudeTokenUsage_Architecture.md` (reference pattern + pitfalls)
5. `doc/SolidWorks-Flow/knowledge/UnifiedSession_History_WorkspaceScoping.md` (workspace scoping pitfalls)
6. `doc/Sessions/Session065.md` (token usage persistence via continuity)
7. `doc/Sessions/Session068.md` (design + Phase 86 plan)
8. `doc/Sessions/Session069.md` (plan cleanup + reading checklist)
9. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 86 — Codex: token usage via CLI `/status` (owner: Oleksandr, updated: 2026-02-02)

### Stream: spike (prove `/status` can be read safely)
1. [TODO] Spike(codex-module): проверить, как программно получать `/status` для существующей сессии (resume) в JSON режиме и где именно в event-stream появляется строка `Context window: ...`; убедиться, что `/status` не попадает в unified history и UI chat — scope: ≤3 файлов в `packages/Codex_Module/src/`; expected commit message: `spike(codex-module): validate status token usage source`
2. [TODO] Git Commit: `spike(codex-module): validate status token usage source` (hash: TBD)

### Stream: filesystem contract (Codex session logs)
3. [TODO] Feat(codex-module): добавить resolver, который по `providerSessionId` (thread id) находит rollout JSONL файл Codex в `CODEX_HOME/sessions/YYYY/MM/DD/rollout-*-<id>.jsonl` (fallback: scan); cwd всегда пер-сессионный (workspacePath) — scope: ≤3 файлов в `packages/Codex_Module/src/`; expected commit message: `feat(codex-module): resolve codex rollout file by session id`
4. [TODO] Git Commit: `feat(codex-module): resolve codex rollout file by session id` (hash: TBD)

### Stream: parser + reader
5. [TODO] Feat(codex-module): реализовать парсер snapshot из `/status` (K/M suffix, decimals) → `{ used, limit }` (аналог `claude-context-usage-snapshot.ts`) — scope: ≤3 файлов в `packages/Codex_Module/src/`; expected commit message: `feat(codex-module): parse /status context window tokens`
6. [TODO] Git Commit: `feat(codex-module): parse /status context window tokens` (hash: TBD)

7. [TODO] Feat(codex-module): реализовать reader `/status` с throttling (не чаще X мс/сессию) и без загрязнения UI/UnifiedSession history (internal-only) — scope: ≤3 файлов в `packages/Codex_Module/src/`; expected commit message: `feat(codex-module): read token usage via /status`
8. [TODO] Git Commit: `feat(codex-module): read token usage via /status` (hash: TBD)

### Stream: provider → core event wiring
9. [TODO] Feat(codex-module): после завершения turn обновлять tokenUsage через `/status` и эмитить `stream_event` с `tokenUsage` (как в Claude); не путать per-turn `event.usage` с context-window `used/limit` — scope: ≤3 файлов в `packages/Codex_Module/src/`; expected commit message: `feat(codex-module): emit token usage stream events`
10. [TODO] Git Commit: `feat(codex-module): emit token usage stream events` (hash: TBD)

### Stream: verification
11. [TODO] Verification: прогнать гейты + таргетный билд `npm run build --workspace @codeai-hub/codex-module`; ручная проверка: `/status` parity, restore после Core restart, multi-workspace (workspace A → restart из B) — scope: scripts/manual; expected commit message: `chore: verify codex /status token usage`
12. [TODO] Git Commit: `chore: verify codex /status token usage` (hash: TBD)

### Stream: session report (after implementation)
13. [TODO] Docs(session): создать отчёт `doc/Sessions/Session070.md` (Codex token usage via /status — implementation + verification) — scope: `doc/Sessions/Session070.md`; expected commit message: `docs(session): Session070 codex /status token usage`
14. [TODO] Git Commit: `docs(session): Session070 codex /status token usage` (hash: TBD)
