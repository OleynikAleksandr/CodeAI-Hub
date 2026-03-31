# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- TODO Plan состоит из Phase (Фаз). В каждой Phase некоторое количество Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/System/TokenUsage/ClaudeTokenUsage_Architecture.md`
3. `doc/Sessions/Archive/Session059.md`
4. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 83 — Claude: real-time token usage + continuity trigger threshold (owner: Oleksandr, updated: 2026-02-01)

### Stream: bootstrap (docs + plan)
1. [DONE] Docs(todo): заархивировать предыдущий `todo-plan.md`, создать новый план Phase 83 и добавить архитектурный документ по token usage — scope: `doc/TODO/Archive/todo-plan-phase82.md`, `doc/TODO/todo-plan.md`, `doc/SolidWorks-Flow/System/TokenUsage/ClaudeTokenUsage_Architecture.md`; expected commit message: `docs(todo): start Phase 83 claude token usage`
2. [DONE] Git Commit: `docs(todo): start Phase 83 claude token usage` (hash: 9bc8e363)

### Stream: token usage pipeline (Claude Agent SDK)
3. [DONE] Feat(claude-module): включить stream events и публиковать token usage snapshots (used/limit) в provider events — scope: `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`, `packages/Claude_Module/src/messaging/message-processor.ts`, `packages/Claude_Module/src/types/index.ts`; expected commit message: `feat(claude-module): stream real-time token usage`
4. [DONE] Git Commit: `feat(claude-module): stream real-time token usage` (hash: 91dd0b71)

5. [DONE] Feat(project-manager): применять `session:stream` token usage events к snapshot.status (used/limit) — scope: `src/client/project-manager/components/sessions/session-stream.ts`, `src/client/project-manager/components/sessions/project-manager-session-view.tsx`, `src/client/project-manager/components/sessions/token-usage-stream.ts`; expected commit message: `feat(project-manager): apply token usage stream updates`
6. [DONE] Git Commit: `feat(project-manager): apply token usage stream updates` (hash: 55dbaa9f)

### Stream: continuity threshold (default 30%, configurable)
7. [DONE] Feat(core): использовать порог continuity из settings (default: 30%) при расчёте shouldHandoff — scope: `packages/core/src/config/index.ts`, `packages/core/src/session-continuity/session-continuity-facade.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `feat(core): configurable continuity remaining% threshold`
8. [DONE] Git Commit: `feat(core): configurable continuity remaining% threshold` (hash: 7807cdb9)

### Stream: UI token label
9. [DONE] Fix(ui): отображать `used / total (remaining%)` в статус-панели сессии — scope: `src/client/ui/src/session/status-panel.tsx`; expected commit message: `fix(ui): show remaining token percent`
10. [DONE] Git Commit: `fix(ui): show remaining token percent` (hash: 68b7ed45)

### Stream: Settings (Claude)
11. [DONE] Feat(settings): добавить и сохранять настройку Claude `remaining% threshold` (default: 30) — scope: `src/extension-module/settings/claude-settings.ts`; expected commit message: `feat(settings): persist claude continuity threshold`
12. [DONE] Git Commit: `feat(settings): persist claude continuity threshold` (hash: 0e3be063)

13. [DONE] Feat(ui): добавить в Settings → Claude UI-контрол для `remaining% threshold` и обновление state/save — scope: `src/client/ui/src/components/settings/settings-state-raw.ts`, `src/client/ui/src/components/settings/settings-state-model.ts`, `src/client/ui/src/components/settings/settings-state-helpers.ts`; expected commit message: `feat(ui): add claude continuity threshold control`
14. [DONE] Git Commit: `feat(ui): add claude continuity threshold control` (hash: 58d984b6)

15. [DONE] Feat(ui): подключить control в Settings View (Claude section) и добавить handler в state hook — scope: `src/client/ui/src/components/settings/use-settings-state.ts`, `src/client/ui/src/components/settings-view.tsx`, `src/client/ui/src/components/settings/settings-card.tsx`; expected commit message: `feat(ui): wire claude continuity threshold setting`
16. [DONE] Git Commit: `feat(ui): wire claude continuity threshold setting` (hash: b9a8d3f5)

### Stream: verification
17. [DONE] Verification: прогнать гейты + таргетные сборки затронутых пакетов (`npm run build --workspace @codeai-hub/claude-module`, `npm run build --workspace @codeai-hub/core`, `npm run build:project-manager`, `npm run build:webview`) — scope: scripts; expected commit message: `chore: verify claude token usage + continuity threshold`
18. [DONE] Git Commit: `chore: verify claude token usage + continuity threshold` (hash: b6f11c16)

### Stream: release
19. [DONE] Release: обновить `README.md`, `CHANGELOG.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md` под новую версию — scope: docs; expected commit message: `docs: update release notes`
20. [DONE] Git Commit: `docs: update release notes` (hash: 6888ef27)

21. [DONE] Release: собрать unified релиз через `./scripts/build-all.sh` и VSIX через `./scripts/build-release.sh --use-current-version` (артефакты в `doc/tmp/releases/`) — scope: scripts/manifests (auto); expected commit message: `chore(release): build next version`
22. [DONE] Git Commit: `chore(release): build next version` (hash: 6af2e938)

23. [DONE] Docs(session): создать отчёт `doc/Sessions/Archive/Session060.md` — scope: `doc/Sessions/Archive/Session060.md`; expected commit message: `docs(session): Session060 release`
24. [DONE] Git Commit: `docs(session): Session060 release` (hash: 777eb396)
