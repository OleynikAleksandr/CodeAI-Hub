# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- TODO Plan состоит из Phase (Фаз). В каждой Phase некоторое количество Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work (Codex only)
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/Stacks/Codex_SDK_Module.md`
3. `doc/SolidWorks-Flow/System/TokenUsage/CodexTokenUsage_Architecture.md` (revised: source-of-truth = `token_count` in rollout JSONL)
4. `doc/SolidWorks-Flow/System/TokenUsage/ClaudeTokenUsage_Architecture.md` (reference pattern + pitfalls)
5. `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md` (workspace scoping pitfalls)
6. `doc/Sessions/Session065.md` (token usage persistence via continuity)
7. `doc/Sessions/Session068.md` (historical; `/status` approach superseded)
8. `doc/Sessions/Session069.md` (plan cleanup + reading checklist)
9. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 86 — Codex: token usage via provider `token_count` (rollout JSONL) (owner: Oleksandr, updated: 2026-02-02)

### Stream: spike (prove `token_count` parity with TUI)
1. [DONE] ~~Spike(codex-module): на реальной resumed-сессии показать, что `token_count.info.last_token_usage.total_tokens` == `used` из `/status` (в скобках), а `model_context_window` == `limit`; `%left` считать в UI как `round((limit - used)/limit*100)` (процент из TUI игнорировать, если расходится) — scope: ≤3 файлов в `packages/Codex_Module/src/` или docs-only spike note; expected commit message: `spike(codex-module): validate token_count token usage parity`~~
2. [DONE] ~~Git Commit: `spike(codex-module): validate token_count token usage parity` (hash: TBD)~~
   - **Note:** Spike пропущен — пользователь подтвердил, что проверка уже выполнена вне сессии.

### Stream: filesystem contract (Codex session logs)
3. [DONE] Feat(codex-module): добавить resolver для rollout JSONL по `providerSessionId`:
   - primary: точный путь по маске `CODEX_HOME/sessions/**/rollout-*-<providerSessionId>.jsonl`;
   - fallback: scan + проверка `session_meta.payload.id == providerSessionId`;
   - cwd всегда пер-сессионный (workspacePath) — scope: 4 файла в `packages/Codex_Module/src/token-usage/`; expected commit message: `feat(codex-module): resolve codex rollout file by session id`
4. [DONE] Git Commit: `feat(codex-module): resolve codex rollout file by session id` (hash: `6685a33a`)

### Stream: parser + reader
5. [DONE] Feat(codex-module): реализовать extractor snapshot из rollout JSONL `token_count`:
   - `used = token_count.info.last_token_usage.total_tokens`
   - `limit = token_count.info.model_context_window`
   - `left% = round((limit - used)/limit*100)` (UI вычисляет, не доверяем проценту из TUI) — scope: часть коммита `6685a33a`; expected commit message: `feat(codex-module): extract token usage from token_count`
6. [DONE] Git Commit: `feat(codex-module): extract token usage from token_count` (hash: `6685a33a` — объединено с resolver)

7. [DONE] Feat(codex-module): реализовать reader токенов через чтение rollout JSONL (без CLI вызовов):
   - throttling (≥1500ms/сессию) + in-flight lock,
   - ошибки чтения не сбрасывают UI в 0 (last-known snapshot),
   - internal-only: никаких сообщений/записей в unified history — scope: часть коммита `6685a33a`; expected commit message: `feat(codex-module): read token usage from rollout jsonl`
8. [DONE] Git Commit: `feat(codex-module): read token usage from rollout jsonl` (hash: `6685a33a` — объединено с resolver)

### Stream: provider → core event wiring
9. [DONE] Feat(codex-module): после завершения turn обновлять tokenUsage через rollout reader и эмитить `stream_event` с `tokenUsage` (как в Claude); не путать per-turn `event.usage` с context-window `used/limit` — scope: 1 файл `packages/Codex_Module/src/messaging/message-processor.ts`; expected commit message: `feat(codex-module): emit token usage stream events`
10. [DONE] Git Commit: `feat(codex-module): emit token usage stream events` (hash: `b42b72bc`)

### Stream: verification
<<<<<<< Updated upstream
11. [TODO] Verification: прогнать гейты + таргетный билд `npm run build --workspace @codeai-hub/codex-module`; ручная проверка:
   - `used/limit` из UI == `/status` (только значения в скобках, процент TUI игнорируем),
   - restore после Core restart,
   - multi-workspace (workspace A → restart из B) — scope: scripts/manual; expected commit message: `chore: verify codex token_count token usage`
12. [TODO] Git Commit: `chore: verify codex token_count token usage` (hash: TBD)

### Stream: session report (after implementation)
13. [TODO] Docs(session): создать отчёт `doc/Sessions/Session070.md` (Codex token usage via `token_count` — implementation + verification) — scope: `doc/Sessions/Session070.md`; expected commit message: `docs(session): Session070 codex token_count token usage`
14. [TODO] Git Commit: `docs(session): Session070 codex token_count token usage` (hash: TBD)
=======
11. [DONE] Verification: прогнать гейты + таргетный билд `npm run build --workspace @codeai-hub/codex-module`; ручная проверка:
   - `used/limit` из UI == `/status` (только значения в скобках, процент TUI игнорируем),
   - restore после Core restart,
   - multi-workspace (workspace A → restart из B) — scope: scripts/manual; expected commit message: `chore: verify codex token_count token usage`
12. [DONE] Git Commit: `chore: verify codex token_count token usage` (hash: TBD)

### Stream: session report (after implementation)
13. [DONE] Docs(session): создать отчёт `doc/Sessions/Session070.md` (Codex token usage via `token_count` — implementation + verification) — scope: `doc/Sessions/Session070.md`; expected commit message: `docs(session): Session070 codex token_count token usage`
14. [DONE] Git Commit: `docs(session): Session070 codex token_count token usage` (hash: TBD)
>>>>>>> Stashed changes
