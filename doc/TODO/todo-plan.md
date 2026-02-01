# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- TODO Plan состоит из Phase (Фаз). В каждой Phase некоторое количество Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Sessions/Session060.md`
3. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 84 — Claude: align token usage with Claude Code `/context` (owner: Oleksandr, updated: 2026-02-01)

### Stream: bootstrap (docs + plan)
1. [DONE] Docs(todo): заархивировать завершённый Phase 83 план и создать новый Phase 84 — scope: `doc/TODO/Archive/todo-plan-phase83.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): start Phase 84 claude token usage fix`
2. [DONE] Git Commit: `docs(todo): start Phase 84 claude token usage fix` (hash: b1ccd52f)

3. [DONE] Docs(todo): зафиксировать hash bootstrap-коммита — scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record Phase 84 bootstrap hash`
4. [DONE] Git Commit: `docs(todo): record Phase 84 bootstrap hash` (hash: f47152ba)

### Stream: stop using run totals (intermediate fix)
5. [DONE] Fix(claude-module): не перезаписывать token usage snapshot данными из `sdk:result.usage` (это totals по run), использовать только per-turn usage из `stream_event.message_delta.usage` — scope: `packages/Claude_Module/src/messaging/message-processor.ts`; expected commit message: `fix(claude-module): use message_delta usage for context tokens`
6. [DONE] Git Commit: `fix(claude-module): use message_delta usage for context tokens` (hash: 4b085b8a)

7. [DONE] Docs(todo): зафиксировать hash claude-module фикса — scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record Phase 84 claude-module fix hash`
8. [DONE] Git Commit: `docs(todo): record Phase 84 claude-module fix hash` (hash: 6d3cd1db)

9. [DONE] Verification: прогнать гейты + таргетный билд Claude module — scope: scripts; expected commit message: `chore: verify claude token usage fix`
10. [DONE] Git Commit: `chore: verify claude token usage fix` (hash: 9d806de1)

11. [DONE] Docs(todo): зафиксировать hash verification-коммита — scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record Phase 84 verification hash`
12. [DONE] Git Commit: `docs(todo): record Phase 84 verification hash` (hash: 3bd33a9a)

### Stream: parity with Claude Code `/context` (source of truth)
13. [DONE] Spike(claude-module): выяснить, какие данные нужны для `used/limit` как в Claude Code `/context`, и можно ли получать их без API вызова (локально через `claude -p --verbose --output-format stream-json --resume <sessionId> "/context"`) — scope: `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`, `packages/Claude_Module/src/messaging/message-processor.ts`, (new) `packages/Claude_Module/src/sdk/claude-context-usage-reader.ts`; expected commit message: `feat(claude-module): read context usage via /context`
14. [DONE] Git Commit: `feat(claude-module): read context usage via /context` (hash: a2724c16)

15. [DONE] Fix(project-manager): отображать токены строго по tokenUsage (used/limit) из нового источника `/context` и верифицировать на 2 сессиях (например 43.8k и 84.1k) — scope: `src/client/project-manager/components/sessions/token-usage-stream.ts`, `src/client/ui/src/session/status-panel.tsx`, `doc/Project_Docs/TokenUsage/ClaudeTokenUsage_Architecture.md`; expected commit message: `fix(ui): align claude tokens with /context`
16. [DONE] Git Commit: `fix(ui): align claude tokens with /context` (hash: f49c925d)

### Stream: release
17. [DONE] Release: собрать новый релиз через `./scripts/build-all.sh` и VSIX через `./scripts/build-release.sh --use-current-version` — scope: scripts/manifests (auto); expected commit message: `chore(release): build next version`
18. [DONE] Git Commit: `chore(release): build next version` (hash: c2f088bf)

19. [DONE] Docs(session): создать отчёт `doc/Sessions/Session061.md` — scope: `doc/Sessions/Session061.md`; expected commit message: `docs(session): Session061 claude /context parity planning`
20. [DONE] Git Commit: `docs(session): Session061 claude /context parity planning` (hash: 56da59dd)
