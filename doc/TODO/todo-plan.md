# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase — Stream (стрим) с микрозадачами.
- Каждая микрозадача затрагивает **≤ 3 файлов**.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- **Gates после каждой микрозадачи**: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка затронутого пакета.
- После зелёных гейтов — Git Commit, затем сразу обновляем статусы/хеши в `doc/TODO/todo-plan.md` отдельным коммитом.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Project_Docs/Stacks/UI_Modules.md`
3. `doc/SolidWorks-Flow/SessionContinuity/NodeSessionContinuity_Architecture.md`
4. `doc/SolidWorks-Flow/SessionContinuity/ContinuityReport_Contracts.md`
5. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
6. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 96 — FLOW: Node Infinite Session (Continuity) MVP (owner: Oleksandr, updated: 2026-02-03)

### MVP Definition (must)
- **Scope:** только “user-facing” сессии узлов (т.е. те, что показываются в ветках Workflow Tree).
- **MVP node:** `Описание → Reviewer`.
- **Filter (MVP):** `stage=description` + `runSlug=reviewer`.
- **Providers:** модуль провайдер‑agnostic, но auto‑rollover “по порогу” работает только там, где есть `tokenUsage.used/limit`.
- **Report IO:** Core ничего не пишет; continuity‑отчёт создаёт и читает агент по пути, который задаёт Core.
- **UX:** во время rollover UI показывает “готовлю продолжение…” (spinner) и блокирует отправку сообщений.

### Stream: docs sync
1. [DONE] Docs(flow): добавить `SessionContinuity/` в `doc/SolidWorks-Flow/README.md` — scope: `doc/SolidWorks-Flow/README.md`; expected commit message: `docs(flow): document node session continuity`
2. [DONE] Git Commit: `docs(flow): document node session continuity` (hash: 2fb022d8)

### Stream: templates (continuity prompts)
3. [DONE] Docs(flow): зафиксировать контракт шаблонов промтов (IDs, placeholders, default path `~/.codeai-hub/templates/`) — scope: `doc/SolidWorks-Flow/SessionContinuity/NodeSessionContinuity_Architecture.md`, `doc/SolidWorks-Flow/SessionContinuity/ContinuityReport_Contracts.md`; expected commit message: `docs(flow): define continuity prompt templates contract`
4. [DONE] Git Commit: `docs(flow): define continuity prompt templates contract` (hash: 9fe16266)
5. [DONE] Feat(core): добавить `templatesDir` (default `~/.codeai-hub/templates`) + loader с fallback на встроенные шаблоны — scope: `packages/core/src/config/index.ts`, `packages/core/src/flow-node-continuity/template-loader.ts`, `packages/core/src/flow-node-continuity/flow-node-continuity-facade.ts`; expected commit message: `feat(core): add continuity prompt template loader`
6. [DONE] Git Commit: `feat(core): add continuity prompt template loader` (hash: 5c57cf2e)

### Stream: core safety (disable legacy auto-handoff)
7. [DONE] Feat(core): отключить legacy auto-handoff (оставить persistence tokenUsage/continuity chain для UI) — scope: `packages/core/src/session-continuity/session-continuity-facade.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `feat(core): disable legacy handoff automation`
8. [DONE] Git Commit: `feat(core): disable legacy handoff automation` (hash: 1a424b58)

### Stream: core module (FlowNodeContinuity)
9. [DONE] Feat(core): создать модуль `FlowNodeContinuity` (facade + types, без интеграции) — scope: `packages/core/src/flow-node-continuity/flow-node-continuity-facade.ts`, `packages/core/src/flow-node-continuity/flow-node-continuity-types.ts`, `packages/core/src/flow-node-continuity/index.ts`; expected commit message: `feat(core): add flow node continuity module skeleton`
10. [DONE] Git Commit: `feat(core): add flow node continuity module skeleton` (hash: 4acb101a)
11. [DONE] Feat(core): добавить генерацию `reportPath` + ожидание финального файла отчёта (`.tmp` → `rename`) — scope: `packages/core/src/flow-node-continuity/report-path.ts`, `packages/core/src/flow-node-continuity/report-waiter.ts`, `packages/core/src/flow-node-continuity/flow-node-continuity-facade.ts`; expected commit message: `feat(core): add continuity report waiting`
12. [DONE] Git Commit: `feat(core): add continuity report waiting` (hash: 713d99fc)
13. [DONE] Feat(core): интегрировать rollover (tokenUsage → request report → wait → new segment → instruct read report) — scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/flow-node-continuity/flow-node-continuity-facade.ts`, `packages/core/src/session-continuity/token-usage.ts`; expected commit message: `feat(core): wire flow node continuity rollover`
14. [DONE] Git Commit: `feat(core): wire flow node continuity rollover` (hash: 1b0199f1)
15. [DONE] Feat(core): ограничить rollout на MVP-фильтр (`stage=description` + `runSlug=reviewer`) — scope: `packages/core/src/flow-node-continuity/flow-node-continuity-facade.ts`, `packages/core/src/flow-node-continuity/flow-node-continuity-types.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `feat(core): limit flow continuity to reviewer sessions`
16. [DONE] Git Commit: `feat(core): limit flow continuity to reviewer sessions` (hash: 29d9f503)

### Stream: UI (Project Manager) — баннер + блок ввода
17. [DONE] Feat(ui): показывать “готовлю продолжение…” и блокировать send при `connectionState="blocked"` — scope: `src/client/project-manager/components/sessions/token-usage-stream.ts`, `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/input-panel.tsx`; expected commit message: `feat(ui): show continuity rollover banner and disable send`
18. [DONE] Git Commit: `feat(ui): show continuity rollover banner and disable send` (hash: 75984e44)

### Stream: release build (for tests)
19. [DONE] Release: на чистом дереве запустить `./scripts/build-all.sh` и перенести tarball’ы в `doc/tmp/releases/` — scope: scripts + generated manifests/lockfiles; expected commit message: `chore(release): build-all next version`
20. [DONE] Git Commit: `chore(release): build-all next version` (hash: 59d2dcbf)
21. [DONE] Release: на чистом дереве запустить `./scripts/build-release.sh --use-current-version` и собрать `codeai-hub-<version>.vsix` — scope: release artifacts only; expected commit message: `chore(release): build VSIX for current version` (hash: N/A - VSIX in .gitignore)

### Stream: verification (target)
22. [TODO] Verification: вручную проверить MVP на узле `Описание → Reviewer` (rollover по порогу, отчёт создаёт агент, UI показывает баннер/блок ввода, новая сессия читает отчёт) — scope: manual; expected commit message: `chore: verify flow node continuity MVP`
23. [TODO] Git Commit: `chore: verify flow node continuity MVP` (hash: TBD)
### Stream: rollover stability (single report)
24. [DONE] Fix(core): предотвратить повторные rollover для одного provider-segment (1 отчёт на сегмент) — scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `fix(core): prevent repeated flow node rollovers`
25. [DONE] Git Commit: `fix(core): prevent repeated flow node rollovers` (hash: 061eb1f9)

### Stream: continuation index in UI header
26. [DONE] Feat(core): экспортировать `continuationParentId` (prev segment id) в serialized session для UI — scope: `packages/core/src/session-manager/index.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/types.ts`; expected commit message: `feat(core): expose flow continuation parent id`
27. [DONE] Git Commit: `feat(core): expose flow continuation parent id` (hash: 26f7c4cd)
28. [DONE] Feat(ui): прокинуть `continuationParentId` в `SessionRecord` — scope: `src/types/session.ts`, `src/client/ui/src/core-bridge/types.ts`, `src/client/ui/src/core-bridge/normalizers.ts`; expected commit message: `feat(ui): propagate continuation parent id`
29. [DONE] Git Commit: `feat(ui): propagate continuation parent id` (hash: a3211548)
30. [DONE] Feat(ui): показывать заголовок `Продолжение #N  Session ID: <id>` (N>=2) — scope: `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/info-panel.tsx`; expected commit message: `feat(ui): show continuation index in session header`
31. [DONE] Git Commit: `feat(ui): show continuation index in session header` (hash: b626d81b)

### Stream: rollover UX messages
32. [DONE] Feat(ui): улучшить текст баннера rollover (фазы + до ~6 минут) и показывать “агент восстанавливает контекст…” в новой сессии до первого ответа — scope: `src/client/ui/src/session/session-view.tsx`; expected commit message: `feat(ui): improve rollover status messaging`
33. [DONE] Git Commit: `feat(ui): improve rollover status messaging` (hash: d56ecd6d)

### Stream: settings hot reload (threshold)
34. [DONE] Fix(core): применять `remainingPercentThreshold` без перезапуска Core (перечитывать settings.json / кеш по mtime) — scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `fix(core): live reload continuity threshold`
35. [DONE] Git Commit: `fix(core): live reload continuity threshold` (hash: 996eeb32)
36. [DONE] Docs(todo): зафиксировать хеш (Stream settings hot reload) — scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record Phase 96 live threshold reload hash`
37. [DONE] Git Commit: `docs(todo): record Phase 96 live threshold reload hash` (hash: a43d423a)

### Stream: docs + session report (wrap-up)
38. [DONE] Docs(flow): задокументировать live reload порога `remainingPercentThreshold` + дедуп rollover (1 отчёт на сегмент) — scope: `doc/SolidWorks-Flow/SessionContinuity/NodeSessionContinuity_Architecture.md`, `doc/Project_Docs/SessionContinuity/CodexSessionContinuity_Settings_Architecture.md`; expected commit message: `docs(flow): document live continuity threshold reload`
39. [DONE] Git Commit: `docs(flow): document live continuity threshold reload` (hash: 5fe9394d)
40. [DONE] Report: создать `doc/Sessions/Session081.md` (итоги Phase 96 + коммиты) — scope: `doc/Sessions/Session081.md`; expected commit message: `docs(session): add Session081 report`
41. [DONE] Git Commit: `docs(session): add Session081 report` (hash: 059d4c7a)

### Stream: rollover UX parity + continuation index (post-verification)
42. [DONE] Fix(core): добавить `continuationIndex` (variant A, 1-based) в serialized session, рассчитывать по `continuationParentId` chain — scope: `packages/core/src/session-manager/index.ts`, `packages/core/src/remote-bridge/types.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `fix(core): compute continuation index`
43. [DONE] Git Commit: `fix(core): compute continuation index` (hash: 31353b82)
44. [DONE] Fix(core): отправлять UI явные события rollover lifecycle (start/create-report/wait/new-session/resume) с `remaining%` и threshold — scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/types.ts`; expected commit message: `fix(core): emit rollover notifications`
45. [DONE] Git Commit: `fix(core): emit rollover notifications` (hash: 53483e3e)
46. [DONE] Feat(ui): прокинуть `continuationIndex` (из Core) в `SessionRecord` — scope: `src/types/session.ts`, `src/client/ui/src/core-bridge/types.ts`, `src/client/ui/src/core-bridge/normalizers.ts`; expected commit message: `feat(ui): propagate continuation index`
47. [DONE] Git Commit: `feat(ui): propagate continuation index` (hash: ee6d7f31)
48. [DONE] Fix(ui): использовать `continuationIndex` из Core в заголовке (и для restoring-banner) — scope: `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/info-panel.tsx`; expected commit message: `fix(ui): use core continuation index`
49. [DONE] Git Commit: `fix(ui): use core continuation index` (hash: 8a86f8dc)
50. [DONE] Fix(ui): убрать hardcode 30% и драйвить блокировку/баннер от Core rollover notifications (`kind=flow_node_rollover`) — scope: `src/types/session.ts`, `src/client/project-manager/components/sessions/token-usage-stream.ts`, `src/client/ui/src/session/session-view.tsx`; expected commit message: `fix(ui): drive rollover UX from notifications`
51. [DONE] Git Commit: `fix(ui): drive rollover UX from notifications` (hash: 98c58f67)

### Stream: session UI — agent activity indicators + English copy (MVP)
52. [TODO] Feat(ui): добавить индикатор "agent working" при тишине 10s (без thinking/assistant output) + анимацию для "Thinking" плашки — scope: `src/client/ui/src/session/dialog-panel.tsx`, `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/status-panel.tsx`; expected commit message: `feat(ui): add agent working indicator`
53. [TODO] Git Commit: `feat(ui): add agent working indicator` (hash: TBD)
54. [TODO] Chore(ui): перевести UI-копирайтинг сессии на EN (MVP, без i18n) — scope: `src/client/ui/src/session/dialog-panel.tsx`, `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/info-panel.tsx`; expected commit message: `chore(ui): translate session UI copy to English`
55. [TODO] Git Commit: `chore(ui): translate session UI copy to English` (hash: TBD)

### Stream: release — build VSIX + tarballs (Phase 96 wrap-up)
56. [TODO] Release: завершить все TODO в Phase 96 (42–55) + прогнать обязательные Gates и таргетные сборки затронутых пакетов — scope: repo-wide (commands only); expected commit message: `chore(release): verify gates for Phase 96`
57. [TODO] Git Commit: `chore(release): verify gates for Phase 96` (hash: TBD)
58. [TODO] Release: выполнить `./scripts/build-all.sh` (авто bump версий + tarball’ы в `~/.codeai-hub/releases/` и `doc/tmp/releases/`) — scope: repo-wide (automated version bump/manifests); expected commit message: `chore(release): build-all next version`
59. [TODO] Git Commit: `chore(release): build-all next version` (hash: TBD)
60. [TODO] Release: выполнить `./scripts/build-release.sh --use-current-version` и проверить, что VSIX создан в корне — scope: repo root artifact (`codeai-hub-<version>.vsix`); expected commit message: `chore(release): build vsix`
61. [TODO] Git Commit: `chore(release): build vsix` (hash: TBD)
62. [TODO] Docs(session): создать `doc/Sessions/Session083.md` (итоги + артефакты релиза) — scope: `doc/Sessions/Session083.md`; expected commit message: `docs(session): add Session083 report`
63. [TODO] Git Commit: `docs(session): add Session083 report` (hash: TBD)
