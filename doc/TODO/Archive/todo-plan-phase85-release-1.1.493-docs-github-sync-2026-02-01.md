# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- TODO Plan состоит из Phase (Фаз). В каждой Phase некоторое количество Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
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

15. [DONE] Fix(project-manager): отображать токены строго по tokenUsage (used/limit) из нового источника `/context` и верифицировать на 2 сессиях (например 43.8k и 84.1k) — scope: `src/client/project-manager/components/sessions/token-usage-stream.ts`, `src/client/ui/src/session/status-panel.tsx`, `doc/SolidWorks-Flow/System/TokenUsage/ClaudeTokenUsage_Architecture.md`; expected commit message: `fix(ui): align claude tokens with /context`
16. [DONE] Git Commit: `fix(ui): align claude tokens with /context` (hash: f49c925d)

### Stream: release
17. [DONE] Release: собрать новый релиз через `./scripts/build-all.sh` и VSIX через `./scripts/build-release.sh --use-current-version` — scope: scripts/manifests (auto); expected commit message: `chore(release): build next version`
18. [DONE] Git Commit: `chore(release): build next version` (hash: c2f088bf)

19. [DONE] Docs(session): создать отчёт `doc/Sessions/Session061.md` — scope: `doc/Sessions/Session061.md`; expected commit message: `docs(session): Session061 claude /context parity planning`
20. [DONE] Git Commit: `docs(session): Session061 claude /context parity planning` (hash: 56da59dd)

### Stream: fix /context cwd (hotfix)
21. [DONE] Fix(claude-module): для `/context` резюма важно запускать CLI в cwd того же проекта; резолвить `cwd` по `~/.claude/projects/*/sessions-index.json` (поле `projectPath`) — scope: `packages/Claude_Module/src/sdk/claude-context-usage-reader.ts`; expected commit message: `fix(claude-module): resolve /context cwd via sessions-index`
22. [DONE] Git Commit: `fix(claude-module): resolve /context cwd via sessions-index` (hash: 51197299)

### Stream: release (hotfix)
23. [DONE] Release: собрать новый релиз через `./scripts/build-all.sh` и VSIX через `./scripts/build-release.sh --use-current-version` — scope: scripts/manifests (auto); expected commit message: `chore(release): build next version`
24. [DONE] Git Commit: `chore(release): build next version` (hash: dc67cab9)

### Stream: fix /context invocation (PATH / node) (hotfix)
25. [DONE] Fix(claude-module): запускать Claude Code CLI через `process.execPath` (node) чтобы не зависеть от PATH GUI-процесса (в VS Code часто нет `/usr/local/bin`, из-за чего `#!/usr/bin/env node` падает) — scope: `packages/Claude_Module/src/sdk/claude-context-usage-reader.ts`; expected commit message: `fix(claude-module): run claude via node to avoid PATH issues`
26. [DONE] Git Commit: `fix(claude-module): run claude via node to avoid PATH issues` (hash: 38c2e546)

### Stream: release (hotfix 2)
27. [DONE] Release: собрать новый релиз через `./scripts/build-all.sh` и VSIX через `./scripts/build-release.sh --use-current-version` — scope: scripts/manifests (auto); expected commit message: `chore(release): build next version`
28. [DONE] Git Commit: `chore(release): build next version` (hash: 2d21d32d)

### Stream: session report (close Session 62)
29. [DONE] Docs(session): создать отчёт `doc/Sessions/Session062.md` с описанием проблемы (UI показывает `0 / 200,000 (100%)`, `/context` reader падает) — scope: `doc/Sessions/Session062.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(session): Session062 claude tokens stuck at 0`
30. [DONE] Git Commit: `docs(session): Session062 claude tokens stuck at 0` (hash: 5f114376)

### Stream: debug `/context` runtime (next session)
31. [DONE] Fix(claude-module): сделать `/context` reader устойчивым (убрать/увеличить timeout, перейти на `spawn` + ранний выход при нахождении `Tokens:`) — scope: `packages/Claude_Module/src/sdk/claude-context-usage-reader.ts`; expected commit message: `fix(claude-module): make /context reader resilient`
32. [DONE] Git Commit: `fix(claude-module): make /context reader resilient` (hash: f04cd9dd)

33. [TODO] Fix(ui): не показывать `0` при отсутствии snapshot; показывать `N/A` или last-known snapshot — scope: `src/client/project-manager/components/sessions/token-usage-stream.ts`, `src/client/ui/src/session/status-panel.tsx`; expected commit message: `fix(ui): avoid zero tokens when /context fails`
34. [TODO] Git Commit: `fix(ui): avoid zero tokens when /context fails` (hash: TBD)

35. [DONE] Release: собрать новый релиз через `./scripts/build-all.sh` и VSIX через `./scripts/build-release.sh --use-current-version` — scope: scripts/manifests (auto); expected commit message: `chore(release): build next version`
36. [DONE] Git Commit: `chore(release): build next version` (hash: b886ed43)

### Stream: release (verification 1.1.486)
37. [DONE] Release: собрать новый релиз (проверка /context reader) через `./scripts/build-all.sh` и VSIX через `./scripts/build-release.sh --use-current-version` (VSIX перемещён в `doc/tmp/releases/`) — scope: scripts/manifests (auto); expected commit message: `chore(release): build next version`
38. [DONE] Git Commit: `chore(release): build next version` (hash: 43db0f86)

### Stream: fix /context parser (markdown Tokens)
39. [DONE] Fix(claude-module): поддержать формат вывода `/context` с Markdown `**Tokens:**` (парсинг used/limit) — scope: `packages/Claude_Module/src/sdk/claude-context-usage-snapshot.ts`; expected commit message: `fix(claude-module): parse markdown /context tokens`
40. [DONE] Git Commit: `fix(claude-module): parse markdown /context tokens` (hash: 8d3d4eb7)

### Stream: release (verification 1.1.488)
41. [DONE] Release: собрать новый релиз (фикс парсинга `**Tokens:**` из `/context`) через `./scripts/build-all.sh` и VSIX через `./scripts/build-release.sh --use-current-version` — scope: scripts/manifests (auto); expected commit message: `chore(release): build next version`
42. [DONE] Git Commit: `chore(release): build next version` (hash: 1fb4fbb0)

### Stream: ui token percent (remaining)
43. [DONE] Fix(ui): показывать remaining% (100 - used%) вместо used% в панели статуса — scope: `src/client/ui/src/session/status-panel.tsx`; expected commit message: `fix(ui): show remaining token percent`
44. [DONE] Git Commit: `fix(ui): show remaining token percent` (hash: 021bfbab)

### Stream: ui token usage persistence
45. [DONE] Fix(ui): сохранять last-known tokenUsage в localStorage и восстанавливать при загрузке сессий после рестарта PM — scope: `src/client/ui/src/session/helpers.ts`, `src/client/ui/src/session/token-usage-cache.ts`, `src/client/project-manager/components/sessions/token-usage-stream.ts`; expected commit message: `fix(ui): persist last token usage snapshot`
46. [DONE] Git Commit: `fix(ui): persist last token usage snapshot` (hash: fe20d89b)

### Stream: release (verification 1.1.489)
47. [DONE] Release: собрать новый релиз (UI remaining% + tokenUsage cache) через `./scripts/build-all.sh` и VSIX через `./scripts/build-release.sh --use-current-version` — scope: scripts/manifests (auto); expected commit message: `chore(release): build next version`
48. [DONE] Git Commit: `chore(release): build next version` (hash: f5c1d9a7)

### Stream: core token usage replay (PM reopen)
49. [DONE] Fix(core): запоминать последний tokenUsage и отправлять replay при новом WebSocket подключении (чтобы при закрытии/открытии Project Manager токены не сбрасывались в `0 / 200,000`) — scope: `packages/core/src/remote-bridge/handlers/websocket-manager.ts`; expected commit message: `fix(core): replay token usage on ws connect`
50. [DONE] Git Commit: `fix(core): replay token usage on ws connect` (hash: 3cdbaa61)

### Stream: release (verification)
51. [DONE] Release: собрать новый релиз (Core tokenUsage replay) через `./scripts/build-all.sh` и VSIX через `./scripts/build-release.sh --use-current-version` — scope: scripts/manifests (auto); expected commit message: `chore(release): build next version`
52. [DONE] Git Commit: `chore(release): build next version` (hash: 1f359a9c)

### Stream: core token usage persistence (Core restart)
53. [DONE] Fix(core): сохранять last-known tokenUsage на диск и восстанавливать после рестарта Core (хранение в `~/.codeai-hub/state/token-usage-cache.json`, гидрация при WS connect по `providerSessionId`) — scope: `packages/core/src/remote-bridge/handlers/websocket-manager.ts`, `packages/core/src/remote-bridge/handlers/token-usage-cache.ts`; expected commit message: `fix(core): persist token usage across restarts`
54. [DONE] Git Commit: `fix(core): persist token usage across restarts` (hash: c05c28fe)

### Stream: release (verification)
55. [DONE] Release: собрать новый релиз (Core tokenUsage disk persistence) через `./scripts/build-all.sh` и VSIX через `./scripts/build-release.sh --use-current-version` — scope: scripts/manifests (auto); expected commit message: `chore(release): build next version`
56. [DONE] Git Commit: `chore(release): build next version` (hash: 6a94bd98)

### Stream: core token usage persistence (via continuity chain.json)
57. [DONE] Fix(core): хранить tokenUsage в `chain.json` (continuity) и пушить snapshot в UI при `session:binding` — scope: `packages/core/src/session-continuity/continuity-types.ts`, `packages/core/src/session-continuity/session-continuity-facade.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `fix(core): persist token usage in continuity chain`
58. [DONE] Git Commit: `fix(core): persist token usage in continuity chain` (hash: 0a0ad46b)

59. [DONE] Fix(core): удалить временный state-file/persistence (`token-usage-cache.json` под `~/.codeai-hub/state`) и оставить только replay при reopen PM (данные приходят из continuity на binding) — scope: `packages/core/src/remote-bridge/handlers/websocket-manager.ts`; expected commit message: `fix(core): drop token usage state file`
60. [DONE] Git Commit: `fix(core): drop token usage state file` (hash: c83d436f)

### Stream: release (verification)
61. [DONE] Release: собрать новый релиз (tokenUsage persistence via continuity chain.json) через `./scripts/build-all.sh` и VSIX через `./scripts/build-release.sh --use-current-version` — scope: scripts/manifests (auto); expected commit message: `chore(release): build next version`
62. [DONE] Git Commit: `chore(release): build next version` (hash: 5c4004de)

### Stream: core session history restore (Core restart)
63. [DONE] Fix(core): читать unified-session history по `session.workspacePath` (а не по текущему `config.*Slug`) + fallback поиск по всем workspace roots в `~/.codeai-hub/sessions/*` — scope: `packages/core/src/unified-session/storage.ts`, `packages/core/src/unified-session/workspace-slugs.ts`; expected commit message: `fix(core): restore session history across workspaces`
64. [DONE] Git Commit: `fix(core): restore session history across workspaces` (hash: 26c4b83e)

### Stream: release (verification 1.1.493)
65. [DONE] Release: собрать новый релиз (unified-session history restore across workspaces) через `./scripts/build-all.sh` и VSIX через `./scripts/build-release.sh --use-current-version` — scope: scripts/manifests (auto); expected commit message: `chore(release): build next version`
66. [DONE] Git Commit: `chore(release): build next version` (hash: ac7aa183)

---

## Phase 85 — Release 1.1.493 docs + GitHub sync (owner: Oleksandr, updated: 2026-02-01)

### Stream: SolidWorks-Flow knowledge (history persistence)
1. [DONE] Docs(flow): добавить KB по unified-session history и workspace scoping (чтобы диалог не терялся после рестартов Core/PM и при multi-workspace) — scope: `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`; expected commit message: `docs(flow): add unified session history workspace scoping guide`
2. [DONE] Git Commit: `docs(flow): add unified session history workspace scoping guide` (hash: 2932738c)

### Stream: docs alignment (Project_Docs + SolidWorks-Flow + README/CHANGELOG)
3. [DONE] Docs: актуализировать релизные и архитектурные документы, связанные с unified-session history и multi-workspace — scope: ≤3 файлов за микрозадачу; expected commit message: `docs: align unified session history docs`
4. [DONE] Git Commit: `docs: align unified session history docs` (hash: d5108a00)
5. [DONE] Docs: обновить `README.md` и `CHANGELOG.md` под релиз `1.1.493` — scope: `README.md`, `CHANGELOG.md`; expected commit message: `docs: update README and changelog for 1.1.493`
6. [DONE] Git Commit: `docs: update README and changelog for 1.1.493` (hash: 3abdc340)

### Stream: session report + push
7. [DONE] Docs: синхронизировать `SystemArchitecture`/индексы доков и уточнить WorkflowTree resume контракт под `1.1.493` — scope: `doc/SolidWorks-Flow/System/SystemArchitecture.md`, `doc/SolidWorks-Flow/System/README.md`, `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`; expected commit message: `docs: sync Project_Docs and SolidWorks-Flow for 1.1.493`
8. [DONE] Git Commit: `docs: sync Project_Docs and SolidWorks-Flow for 1.1.493` (hash: 8e007210)
9. [DONE] Docs(flow): актуализировать оставшиеся SolidWorks-Flow документы, чтобы все ссылки/anti-regression заметки по session history были согласованы — scope: `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`, `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`; expected commit message: `docs(flow): sync SolidWorks-Flow session persistence notes`
10. [DONE] Git Commit: `docs(flow): sync SolidWorks-Flow session persistence notes` (hash: 7cb53c94)
11. [DONE] Docs(session): создать отчёт `doc/Sessions/Session067.md` по итоговому решению (history + docs) — scope: `doc/Sessions/Session067.md`; expected commit message: `docs(session): Session067 1.1.493 docs + github sync`
12. [DONE] Git Commit: `docs(session): Session067 1.1.493 docs + github sync` (hash: 559f7269)
13. [DONE] GitHub: push `main` (релиз `1.1.493` + docs) — pushed: 2026-02-01; head: `1ce6cf4f`
14. [DONE] Docs(session): уточнить в `Session067` список required docs для следующей сессии (подготовка нового `todo-plan.md` для token usage по другим провайдерам) — scope: `doc/Sessions/Session067.md`; expected commit message: `docs(session): add token tracking prerequisites to Session067`
15. [DONE] Git Commit: `docs(session): add token tracking prerequisites to Session067` (hash: 7495ad55)
