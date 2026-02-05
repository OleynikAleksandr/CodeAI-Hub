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
52. [DONE] Feat(ui): добавить индикатор "agent working" при тишине 10s (без thinking/assistant output) + анимацию для "Thinking" плашки — scope: `src/client/ui/src/session/dialog-panel.tsx`, `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/status-panel.tsx`; expected commit message: `feat(ui): add agent working indicator`
53. [DONE] Git Commit: `feat(ui): add agent working indicator` (hash: 70b6c227)
54. [DONE] Chore(ui): перевести UI-копирайтинг сессии на EN (MVP, без i18n) — scope: `src/client/ui/src/session/dialog-panel.tsx`, `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/info-panel.tsx`; expected commit message: `chore(ui): translate session UI copy to English`
55. [DONE] Git Commit: `chore(ui): translate session UI copy to English` (hash: 17363ecb)

### Stream: release — build VSIX + tarballs (Phase 96 wrap-up)
56. [DONE] Release: завершить все TODO в Phase 96 (42–55) + прогнать обязательные Gates и таргетные сборки затронутых пакетов — scope: repo-wide (commands only); expected commit message: `chore(release): verify gates for Phase 96`
57. [DONE] Git Commit: `chore(release): verify gates for Phase 96` (hash: ec694daf)
58. [DONE] Release: выполнить `./scripts/build-all.sh` (авто bump версий + tarball’ы в `~/.codeai-hub/releases/` и `doc/tmp/releases/`) — scope: repo-wide (automated version bump/manifests); expected commit message: `chore(release): build-all next version`
59. [DONE] Git Commit: `chore(release): build-all next version` (hash: c2dd3543)
60. [DONE] Release: выполнить `./scripts/build-release.sh --use-current-version` и проверить, что VSIX создан в корне — scope: repo root artifact (`codeai-hub-<version>.vsix`); expected commit message: `chore(release): build vsix`
61. [DONE] Git Commit: `chore(release): build vsix` (hash: c1444f4e)
62. [DONE] Docs(session): создать `doc/Sessions/Session083.md` (итоги + артефакты релиза) — scope: `doc/Sessions/Session083.md`; expected commit message: `docs(session): add Session083 report`
63. [DONE] Git Commit: `docs(session): add Session083 report` (hash: 0c78d281)

## Phase 97 — Session UX: Seamless Continuity (virtual conversation) + Input Lock (owner: Oleksandr, updated: 2026-02-04)

### Stream: design (approve before execute)
64. [DONE] Docs(arch): описать целевую модель «виртуальная беседа» (одна UI-лента сообщений) + «физические сегменты» (continuation под капотом) + правила UX (без упоминаний времени; `Agent is working…` — единственная индикация ожидания; поведение при Send до готовности background rollover) — scope: `doc/Project_Docs/SessionContinuity/VirtualConversation_SeamlessContinuity_Architecture.md`; expected commit message: `docs(arch): define virtual conversation continuity`
65. [DONE] Git Commit: `docs(arch): define virtual conversation continuity` (hash: 06857c2e)

### Stream: provider turn lifecycle (foundation)
66. [DONE] Feat(claude): эмитить turn lifecycle на каждый user-turn: `turn_started` (после принятия user prompt) и `turn_completed` (на `type="result"` из SDK), строго 1× `turn_completed` на turn — scope: `packages/Claude_Module/src/messaging/message-processor.ts`; expected commit message: `feat(claude): emit turn lifecycle events`
67. [DONE] Git Commit: `feat(claude): emit turn lifecycle events` (hash: 5351390a)
68. [DONE] Feat(gemini): эмитить `turn_started`/`turn_completed` на каждый user-turn (аналогично Claude; `turn_completed` только после финального assistant response и cleanup) — scope: `packages/Gemini_Module/src/session/gemini-session-manager.ts`; expected commit message: `feat(gemini): emit turn lifecycle events`
69. [DONE] Git Commit: `feat(gemini): emit turn lifecycle events` (hash: ab27e6a3)
70. [DONE] Chore(codex): выровнять turn lifecycle contract: гарантировать `turn_started` и `turn_completed` на каждый user-turn (без дубликатов; payload стабилен) — scope: `packages/Codex_Module/src/messaging/message-processor.ts`; expected commit message: `chore(codex): align turn lifecycle events`
71. [DONE] Git Commit: `chore(codex): align turn lifecycle events` (hash: 681c7fb9)

### Stream: core → UI turn state (single source of truth)
72. [DONE] Feat(core): нормализовать provider turn lifecycle в единый `session:stream` event (`data.kind="turn_state"`, `data.state="running"|"idle"`, опц. `data.providerId`); приоритет статусов: `blocked` (rollover) > `running` > `idle` — scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/types.ts`; expected commit message: `feat(core): stream turn state events`
73. [DONE] Git Commit: `feat(core): stream turn state events` (hash: bd8ed670)

### Stream: UI input lock (no queue baseline)
74. [DONE] Fix(ui): сделать один in-flight запрос: блокировать ввод (textarea) и отправку, пока `connectionState !== "idle"` (`running` или `blocked`), разблокировать строго по `turn_state=idle` (без эвристик); убрать эвристику `lastMessageRole=user` для баннера `Agent is working…` — scope: `src/client/project-manager/components/sessions/token-usage-stream.ts`, `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/input-panel.tsx`; expected commit message: `fix(ui): lock input while turn in-flight`
75. [DONE] Git Commit: `fix(ui): lock input while turn in-flight` (hash: e8e448e9)

### Stream: waiting indicators (V2)
76. [DONE] Feat(ui): добавить `AnimatedDots` (крупнее/контрастнее, fading, цвет провайдера) и переиспользовать в местах ожидания — scope: `src/client/ui/src/session/animated-dots.tsx`, `media/session-view.css`, `src/client/ui/src/session/dialog-panel.tsx`; expected commit message: `feat(ui): add prominent animated dots indicator`
77. [DONE] Git Commit: `feat(ui): add prominent animated dots indicator` (hash: 6ff52283)
78. [DONE] Fix(ui): анимировать dots только у последнего “Thinking”, который ещё не “закрыт” появлением любого `assistant` ПОСЛЕ него; для остальных Thinking анимация выключена — scope: `src/client/ui/src/session/dialog-panel.tsx`, `src/client/ui/src/session/dialog-panel-pending-thinking.ts`; expected commit message: `fix(ui): animate only pending thinking`
79. [DONE] Git Commit: `fix(ui): animate only pending thinking` (hash: 128123d1)
80. [DONE] Fix(ui): баннер `Agent is working…` показывать, если `connectionState="running"` и 10s нет новых `thinking`/`assistant`; сбрасывать таймер на каждое новое `thinking`/`assistant`; скрывать при `turn_completed`; при `blocked` показывать только rollover баннер; баннер всегда с `AnimatedDots` и цветом провайдера — scope: `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/animated-dots.tsx`; expected commit message: `fix(ui): improve agent working indicator`
81. [DONE] Git Commit: `fix(ui): improve agent working indicator` (hash: cf3cb891)

### Stream: rollover UX polish (current approach)
82. [DONE] Fix(ui): rollover-уведомления — цвет провайдера + шрифт меньше (~в 1.5 раза) + убрать упоминания времени ("1–6 минут") и лишние детали; текст короткий и спокойный — scope: `src/client/ui/src/session/session-view.tsx`, `media/session-view.css`; expected commit message: `fix(ui): polish rollover banner copy`
83. [DONE] Git Commit: `fix(ui): polish rollover banner copy` (hash: e6168415)
84. [DONE] Fix(ui): `Continuation #N` не должен быть обязательным “шумом” — по умолчанию скрыть, оставить в debug/деталях (tooltip/копирование) — scope: `src/client/ui/src/session/info-panel.tsx`; expected commit message: `fix(ui): hide continuation numbering by default`
85. [DONE] Git Commit: `fix(ui): hide continuation numbering by default` (hash: 3b564c9d)

### Stream: silent preemptive rollover (behind flag)
86. [DONE] Feat(core): добавить preempt порог (default 50% remaining) `continuity.preemptRemainingPercentThreshold` и запускать background rollover только ПОСЛЕ `turn_completed`, если `remaining<=preempt` (без UI/без user-facing сообщений; дедуп in-flight) — scope: `packages/core/src/config/index.ts`, `packages/core/src/flow-node-continuity/flow-node-continuity-facade.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `feat(core): add silent preemptive rollover`
87. [DONE] Git Commit: `feat(core): add silent preemptive rollover` (hash: d32031fc)
88. [DONE] Fix(ui): если пользователь нажал Send до готовности background rollover — не показывать “создаю новую сессию/проценты/время”, удержать сообщение и отправить автоматически после готовности; пока сообщение не отправлено — input заблокирован (без очереди); UI использует стандартный `Agent is working…` — scope: `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/input-panel.tsx`, `src/client/ui/src/session/session-view-helpers.tsx`; expected commit message: `fix(ui): queue send behind rollover`
89. [DONE] Git Commit: `fix(ui): queue send behind rollover` (hash: 6087efa3)

### Stream: verification + release
90. [DONE] Release: прогнать обязательные Gates + таргетные сборки `project-manager` и `build:webview` — scope: repo-wide (commands only); expected commit message: `chore(release): verify seamless continuity UX`
91. [DONE] Git Commit: `chore(release): verify seamless continuity UX` (hash: 190daca6)

### Stream: virtual conversation feed (one UI ribbon)
92. [DONE] Feat(ui): сделать одну сквозную ленту сообщений (агрегация сообщений по continuation chain, включая скрытые сегменты); отправка — в active segment — scope: `src/client/project-manager/components/sessions/project-manager-session-view.tsx`, `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/virtual-conversation.tsx`; expected commit message: `feat(ui): render virtual conversation feed`
93. [DONE] Git Commit: `feat(ui): render virtual conversation feed` (hash: 7419e6b8)
94. [DONE] Feat(ui): показать debug токены по реальным сегментам (active + summary по chain) — scope: `src/client/ui/src/session/status-panel.tsx`, `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/virtual-conversation.tsx`; expected commit message: `feat(ui): show per-segment token debug list`
95. [DONE] Git Commit: `feat(ui): show per-segment token debug list` (hash: 305f12f9)

## Phase 98 — Release build for local verification (owner: Oleksandr, updated: 2026-02-04)

### Stream: build artifacts (local)
96. [DONE] Release: run `./scripts/build-all.sh` (bump versions + tarballs) — scope: repo-wide (commands + version bumps); expected commit message: `chore(release): build-all next version`
97. [DONE] Git Commit: `chore(release): build-all next version` (hash: 5d40eedb)
98. [DONE] Release: run `./scripts/build-release.sh --use-current-version` (VSIX) — scope: repo-wide (commands only); expected commit message: `chore(release): build vsix`
99. [DONE] Git Commit: `chore(release): build vsix` (hash: bf28f2e3)
100. [DONE] Docs(session): создать `doc/Sessions/Session086.md` (release artifacts + commands) — scope: `doc/Sessions/Session086.md`; expected commit message: `docs(session): add Session086 report`
101. [DONE] Git Commit: `docs(session): add Session086 report` (hash: fb73d17e)

## Phase 99 — UI refactor after QA feedback (owner: Oleksandr, updated: 2026-02-04)

### Stream: agent working indicator (AnimatedDots + correct lifecycle)
102. [DONE] Fix(ui): вернуть/починить `AnimatedDots` в плашке `Agent is working…` (видимо и анимировано; цвет соответствует провайдеру) — scope: `src/client/ui/src/session/animated-dots.tsx`, `src/client/ui/src/session/session-view-helpers.tsx`, `media/session-view.css`; expected commit message: `fix(ui): restore animated dots in agent working banner`
103. [DONE] Git Commit: `fix(ui): restore animated dots in agent working banner` (hash: 399aac93)
104. [DONE] Fix(ui): починить lifecycle плашки `Agent is working…` (не появляется после `turn_completed`; показывать только при `running`/`blocked` или queued-send) — scope: `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/session-view-helpers.tsx`, `src/client/project-manager/components/sessions/token-usage-stream.ts`; expected commit message: `fix(ui): align agent working banner with turn state`
105. [DONE] Git Commit: `fix(ui): align agent working banner with turn state` (hash: de57c234)

### Stream: waiting indicators (Thinking + fallback animation)
106. [DONE] Fix(ui): сделать `AnimatedDots` самодостаточным (JS fallback/inline цвета), чтобы точки были видимы/анимированы даже если CSS не подгрузился (покрывает и `Thinking`, и `Agent is working…`) — scope: `src/client/ui/src/session/animated-dots.tsx`, `src/client/ui/src/session/helpers.ts`, `media/session-view.css`; expected commit message: `fix(ui): make animated dots resilient to missing css`
107. [DONE] Git Commit: `fix(ui): make animated dots resilient to missing css` (hash: 399aac93)
108. [DONE] Fix(ui): унифицировать “ожидание без ответа” — если есть `Thinking` до assistant ответа, всегда показывать индикатор (либо на `Thinking`, либо в `Agent is working…`, без дублирования) — scope: `src/client/ui/src/session/dialog-panel-pending-thinking.ts`, `src/client/ui/src/session/dialog-panel.tsx`, `src/client/ui/src/session/session-view.tsx`; expected commit message: `fix(ui): unify waiting indicator for pending thinking`
109. [DONE] Git Commit: `fix(ui): unify waiting indicator for pending thinking` (hash: 47217651)
110. [DONE] Feat(ui): увеличить `AnimatedDots` до 6 точек + настроить staggered задержки (2..6), чтобы анимация была заметнее и “богаче” — scope: `src/client/ui/src/session/animated-dots.tsx`, `media/session-view.css`; expected commit message: `feat(ui): expand animated dots to six`
111. [DONE] Git Commit: `feat(ui): expand animated dots to six` (hash: 574cd268)

### Stream: status panel cleanup (remove noisy debug copy)
112. [DONE] Fix(ui): оставить `Segments` только как dev-debug, но привести формат к короткому виду `#1 45% | #2 65%` (remaining%) — scope: `src/client/ui/src/session/virtual-conversation.tsx`, `src/client/ui/src/session/status-panel.tsx`; expected commit message: `fix(ui): compact segments token summary`
113. [DONE] Git Commit: `fix(ui): compact segments token summary` (hash: 4217920c)

## Phase 100 — Release build for QA verification (owner: Oleksandr, updated: 2026-02-04)

### Stream: build artifacts (local)
114. [DONE] Release: run `./scripts/build-all.sh` (bump versions + tarballs) — scope: repo-wide (commands + version bumps); expected commit message: `chore(release): build-all next version`
115. [DONE] Git Commit: `chore(release): build-all next version` (hash: 777e7c23)
116. [DONE] Release: run `./scripts/build-release.sh --use-current-version` (VSIX) — scope: repo-wide (commands only); expected commit message: `chore(release): build vsix`
117. [DONE] Git Commit: `chore(release): build vsix` (hash: c7a96d3d)
118. [DONE] Docs(session): создать `doc/Sessions/Session087.md` (Phase 99 fixes + release artifacts) — scope: `doc/Sessions/Session087.md`; expected commit message: `docs(session): add Session087 report`
119. [DONE] Git Commit: `docs(session): add Session087 report` (hash: 06d50d90)

---

## Phase 101 — UI seamless session UX (working strip + silent continuity) (owner: Oleksandr, updated: 2026-02-05)

### Stream: persistent working strip + seamless continuity
120. [DONE] Feat(ui): сделать “working”-плашку постоянной (всегда присутствует в UI), но показывать текст “Агент работает…” только в 2 случаях (pending Thinking без ответа assistant; silence-after-assistant) + сократить silence trigger до 5s — scope: `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/working-strip.tsx`, `media/session-view.css`; expected commit message: `feat(ui): add persistent working strip`
121. [DONE] Git Commit: `feat(ui): add persistent working strip` (hash: e6b1c6d6)

### Stream: working strip fixed height (no layout jump)
122. [DONE] Fix(ui): зафиксировать высоту working‑плашки (одинаковая с/без текста), чтобы при появлении “Agent is working…” не менялась высота rails и не «пряталась» последняя плашка в диалоге — scope: `src/client/ui/src/session/working-strip.tsx`, `media/session-view.css`; expected commit message: `fix(ui): lock working strip height`
123. [DONE] Git Commit: `fix(ui): lock working strip height` (hash: dd8728cc)
124. [DONE] Docs(todo): отметить статус/хеш для working strip fixed height — scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record working strip height fix hash`
125. [DONE] Git Commit: `docs(todo): record working strip height fix hash` (hash: b06e5546)
126. [DONE] Release: run `./scripts/build-all.sh` (bump versions + tarballs) — scope: repo-wide; expected commit message: `chore(release): build-all next version`
127. [DONE] Git Commit: `chore(release): build-all next version` (hash: 84204ea0)
128. [DONE] Release: run `./scripts/build-release.sh --use-current-version` (VSIX) — scope: repo-wide; expected commit message: `chore(release): build vsix`
129. [DONE] Git Commit: `chore(release): build vsix` (hash: 4eabf8aa)
122. [DONE] Fix(ui): убрать анимацию точек из `Thinking` (единственный user-facing индикатор ожидания — working‑плашка) — scope: `src/client/ui/src/session/dialog-panel.tsx`; expected commit message: `fix(ui): remove thinking dots indicator`
123. [DONE] Git Commit: `fix(ui): remove thinking dots indicator` (hash: ab95f712)
124. [DONE] Fix(ui): убрать текст статусов под полем ввода при blocked/running/queued и переносить статус в placeholder инпута — scope: `src/client/ui/src/session/input-panel.tsx`; expected commit message: `fix(ui): move blocked copy into input placeholder`
125. [DONE] Git Commit: `fix(ui): move blocked copy into input placeholder` (hash: 049921c0)
126. [DONE] Feat(ui): изменить анимацию точек (6 точек, не “волна”: последовательное плавное появление; каждая следующая −5% размер и тусклее; цикл 1→6; цвет — provider) — scope: `src/client/ui/src/session/animated-dots.tsx`, `media/session-view.css`; expected commit message: `feat(ui): redesign provider dots animation`
127. [DONE] Git Commit: `feat(ui): redesign provider dots animation` (hash: 9140165b)
128. [DONE] Fix(core): изменить continuity prompt templates так, чтобы агент не писал служебные сообщения в чат пользователю при rollover/start session (silent execution + machine-readable ACK) — scope: `packages/core/src/flow-node-continuity/template-loader.ts`; expected commit message: `fix(core): silence continuity prompts`
129. [DONE] Git Commit: `fix(core): silence continuity prompts` (hash: 8cadb229)
130. [DONE] Fix(ui): подавлять/скрывать внутренние служебные ACK сообщения continuity (если они всё же попадают в историю) — scope: `src/client/ui/src/session/virtual-conversation.tsx`, `src/client/ui/src/session/session-view.tsx`; expected commit message: `fix(ui): hide continuity internal messages`
131. [DONE] Git Commit: `fix(ui): hide continuity internal messages` (hash: 888934ad)
132. [DONE] Release: собрать новый релиз для QA (`./scripts/build-all.sh` → `./scripts/build-release.sh --use-current-version`) — scope: repo-wide (commands + version bumps + VSIX); expected commit message: `chore(release): build-all next version` (hash: 300631bd) + `chore(release): build vsix` (hash: 4b6222b1)

### Stream: working strip polish (post-release QA)
133. [DONE] Fix(ui): уменьшить шрифт текста в `Agent is working. Please wait.` — scope: `media/session-view.css`; expected commit message: `fix(ui): reduce working strip copy size`
134. [DONE] Git Commit: `fix(ui): reduce working strip copy size` (hash: 83f927cf)
135. [DONE] Docs(todo): отметить статус/хеш для уменьшения шрифта — scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record working strip font tweak hash`
136. [DONE] Git Commit: `docs(todo): record working strip font tweak hash` (hash: a744f3c0)
137. [DONE] Fix(ui): показывать working‑надпись сразу после отправки запроса пользователя и скрывать при первом assistant ответе (дальше — текущая логика 5s silence) — scope: `src/client/ui/src/session/session-view.tsx`; expected commit message: `fix(ui): show working strip while awaiting first reply`
138. [DONE] Git Commit: `fix(ui): show working strip while awaiting first reply` (hash: 08af3025)
139. [DONE] Docs(todo): отметить статус/хеш для “awaiting first reply” — scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record working strip immediate show hash`
140. [DONE] Git Commit: `docs(todo): record working strip immediate show hash` (hash: 0707f6e3)

### Stream: continuity seamlessness (ban banners + overwrite templates + hide segment preface)
141. [DONE] Fix(ui): полностью убрать баннеры между сессиями (`Preparing a continuation…`, `Restoring context…`) — оставить только working‑плашку и placeholder у инпута — scope: `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/session-view-helpers.tsx`; expected commit message: `fix(ui): remove continuation banners`
142. [DONE] Git Commit: `fix(ui): remove continuation banners` (hash: fc872a8f)
143. [DONE] Docs(todo): отметить статус/хеш для удаления continuation баннеров — scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record continuation banner removal hash`
144. [DONE] Git Commit: `docs(todo): record continuation banner removal hash` (hash: b04cb0c2)
145. [DONE] Fix(core): новый релиз всегда синхронизирует (перезаписывает при изменениях) continuity templates в `~/.codeai-hub/templates` и приводит их к новым “silent+ACK” правилам (сократить инструкции для экономии токенов) — scope: `packages/core/src/flow-node-continuity/template-loader.ts`; expected commit message: `fix(core): sync bundled continuity templates to disk`
146. [DONE] Git Commit: `fix(core): sync bundled continuity templates to disk` (hash: deebe9f7)
147. [DONE] Docs(todo): отметить статус/хеш для синхронизации continuity templates — scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record continuity template sync hash`
148. [DONE] Git Commit: `docs(todo): record continuity template sync hash` (hash: d9d78c47)
149. [DONE] Fix(ui): UX‑щит — не показывать assistant/thinking сообщения нового сегмента continuity до первого user сообщения в этом сегменте — scope: `src/client/ui/src/session/virtual-conversation.tsx`; expected commit message: `fix(ui): hide continuity segment preface messages`
150. [DONE] Git Commit: `fix(ui): hide continuity segment preface messages` (hash: db415be2)
151. [DONE] Docs(todo): отметить статус/хеш для фильтра continuity segment preface — scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record continuity segment filter hash`
152. [DONE] Git Commit: `docs(todo): record continuity segment filter hash` (hash: 963db942)
153. [DONE] Feat(ui): увеличить индикатор до 12 точек (та же прогрессия масштаба и яркости, sequential reveal, provider color) — scope: `src/client/ui/src/session/animated-dots.tsx`, `media/session-view.css`; expected commit message: `feat(ui): expand animated dots to twelve`
154. [DONE] Git Commit: `feat(ui): expand animated dots to twelve` (hash: 08c8a2fc)
155. [DONE] Docs(todo): отметить статус/хеш для 12-точечного индикатора — scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record 12-dot indicator hash`
156. [DONE] Git Commit: `docs(todo): record 12-dot indicator hash` (hash: cb45743b)
157. [DONE] Release: собрать новый релиз для тестов (`./scripts/build-all.sh` → `./scripts/build-release.sh --use-current-version`) — scope: repo-wide; expected commit message: `chore(release): build-all next version` + `chore(release): build vsix` (hash: 18db6fe2 + 8b451376)

### Stream: continuity templates overwrite (bundled assets)
158. [DONE] Fix(templates): обновить continuity templates в `assets/flow/continuity/` под “silent+ACK” правила (чтобы VSIX при активации реально перезаписывал `~/.codeai-hub/templates/...`) — scope: `assets/flow/continuity/resume.md`, `assets/flow/continuity/create-report-doc.md`, `assets/flow/continuity/create-report-code.md`; expected commit message: `fix(templates): update continuity prompt templates`
159. [DONE] Git Commit: `fix(templates): update continuity prompt templates` (hash: f727922a)
160. [DONE] Release: собрать новый релиз для тестов (`./scripts/build-all.sh` → `./scripts/build-release.sh --use-current-version`) — scope: repo-wide; expected commit message: `chore(release): build-all next version` + `chore(release): build vsix` (hash: 4ac2808b + d642a263)

### Stream: dialog shadow clearance
161. [DONE] Fix(ui): увеличить нижний зазор в ленте сообщений, чтобы тень у последней “плашки” (assistant/user) не срезалась у нижнего края диалога (padding-bottom = shadowSize + 10px) — scope: `media/session-view.css`; expected commit message: `fix(ui): add dialog bottom padding for message shadow`
162. [DONE] Git Commit: `fix(ui): add dialog bottom padding for message shadow` (hash: 19754dab)

### Stream: rollover UX polish
163. [DONE] Fix(ui): не показывать continuity‑служебный `Thinking` в конце старой сессии (создание report/resume) — scope: `src/client/ui/src/session/virtual-conversation.tsx`; expected commit message: `fix(ui): suppress continuity rollover thinking`
164. [DONE] Git Commit: `fix(ui): suppress continuity rollover thinking` (hash: 76bde88e)
165. [DONE] Fix(ui): при смене сессии не держать “Agent is working…” бесконечно — показывать только когда `connectionState` = `running/blocked` (снимается на `idle`) — scope: `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/session-view-helpers.tsx`; expected commit message: `fix(ui): hide working strip when idle`
166. [DONE] Git Commit: `fix(ui): hide working strip when idle` (hash: d77e75f9)

### Stream: rollover thinking suppression (chain=1 + history)
167. [DONE] Fix(ui): не показывать continuity‑служебный `thinking` в текущем сегменте во время rollover (когда chain ещё = 1) и не показывать `thinking` в parent‑сегментах (чтобы не “всплывал” в истории после rollover) — scope: `src/client/ui/src/session/session-view-helpers.tsx`, `src/client/ui/src/session/virtual-conversation.tsx`; expected commit message: `fix(ui): suppress rollover thinking messages`
168. [DONE] Git Commit: `fix(ui): suppress rollover thinking messages` (hash: fd6698f3)
169. [DONE] Docs(todo): отметить статус/хеш для suppress rollover thinking — scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record rollover thinking suppression hash`
170. [DONE] Git Commit: `docs(todo): record rollover thinking suppression hash` (hash: 89e04a07)
171. [DONE] Release: run `./scripts/build-all.sh` (bump versions + tarballs) — scope: repo-wide; expected commit message: `chore(release): build-all next version`
172. [DONE] Git Commit: `chore(release): build-all next version` (hash: 265d514b)
173. [DONE] Release: run `./scripts/build-release.sh --use-current-version` (VSIX) — scope: repo-wide; expected commit message: `chore(release): build vsix`
174. [DONE] Git Commit: `chore(release): build vsix` (hash: 85d84beb)

### Stream: turn idle markers (Claude/Codex/Gemini) + seamless handoff lock
175. [TODO] Fix(ui): считать `turn_state=idle` (provider → Core: `turn_completed`) каноничным маркером ‘агент ждёт пользователя’ и ВСЕГДА снимать `Agent is working. Please wait.` на idle, даже если UI ранее вошёл в `connectionState=blocked` (blocked не должен переопределять idle) — scope: `src/client/project-manager/components/sessions/token-usage-stream.ts`, `src/client/ui/src/session/session-view-helpers.tsx`; expected commit message: `fix(ui): clear working banner on turn idle`
176. [TODO] Git Commit: `fix(ui): clear working banner on turn idle` (hash: TBD)
177. [TODO] Feat(core): добавить явные события handoff как `session:stream` (не user-facing чат): `handoff:start` (Core начинает rollover / отправляет внутренние промпты) и `handoff:ready` (новая сессия создана/активна, можно принимать ввод) — scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/types.ts`; expected commit message: `feat(core): stream continuity handoff state`
178. [TODO] Git Commit: `feat(core): stream continuity handoff state` (hash: TBD)
179. [TODO] Fix(ui): блокировать ввод + отправку ТОЛЬКО на время handoff (`handoff:start` → lock, `handoff:ready` → unlock) и показывать только привычный working‑strip (без новых баннеров/копирайтов); ожидание пользователя (`turn_state=idle`) НЕ блокирует ввод — scope: `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/input-panel.tsx`, `src/client/ui/src/session/session-view-helpers.tsx`; expected commit message: `fix(ui): lock input during continuity handoff`
180. [TODO] Git Commit: `fix(ui): lock input during continuity handoff` (hash: TBD)
181. [TODO] Release: build a new release for tests (`./scripts/build-all.sh` → `./scripts/build-release.sh --use-current-version`) — scope: repo-wide; expected commit message: `chore(release): build-all next version` + `chore(release): build vsix`

### Stream: stuck working banner after final assistant message (root-cause hardening)
182. [DONE] Analyze(logs): зафиксировать эталонную последовательность событий по проблемному кейсу (Claude задаёт вопрос и ждёт пользователя) и выписать таймлайн `assistant final` -> `sdk:result` -> `turn_completed` -> `turn_state=idle` с привязкой к timestamp/line — scope: `/Users/oleksandroliinyk/.codeai-hub/logs/claude/sdk-claude-03af35ce-30a0-4f6c-95e6-270b2a5fca65.jsonl`, `doc/Sessions/Session093.md`; expected commit message: `docs(analysis): capture claude turn-finish timeline`
183. [DONE] Git Commit: `docs(analysis): capture claude turn-finish timeline` (hash: TBD)
184. [TODO] Design(core+ui): утвердить единый контракт завершения turn для UI (приоритет: `turn_state=idle` > `connectionState=blocked`; handoff lock отдельно), зафиксировать state-table и инварианты в архитектурной доке — scope: `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(architecture): define turn-finish and working-strip invariants`
185. [TODO] Git Commit: `docs(architecture): define turn-finish and working-strip invariants` (hash: TBD)
186. [TODO] Fix(core): гарантировать отправку handoff lifecycle событий как stream-only (`handoff:start`, `handoff:ready`) в continuity-потоке, без user-facing сообщений, и с явным завершением handoff — scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/types.ts`; expected commit message: `fix(core): emit deterministic handoff lifecycle events`
187. [TODO] Git Commit: `fix(core): emit deterministic handoff lifecycle events` (hash: TBD)
188. [TODO] Fix(ui): внедрить детерминированный вычислитель состояния working-strip (show/hide text + dots) от каноничных маркеров (`turn_state`, `handoff`, queued-send) и убрать зависимость от залипшего `blocked` — scope: `src/client/ui/src/session/session-view-helpers.tsx`, `src/client/ui/src/session/session-view.tsx`, `src/client/project-manager/components/sessions/token-usage-stream.ts`; expected commit message: `fix(ui): derive working strip from canonical turn markers`
189. [TODO] Git Commit: `fix(ui): derive working strip from canonical turn markers` (hash: TBD)
190. [TODO] Fix(ui): синхронизировать блокировку input/send только по handoff lifecycle; при `turn_state=idle` ввод всегда доступен и working-copy снята — scope: `src/client/ui/src/session/input-panel.tsx`, `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/session-view-helpers.tsx`; expected commit message: `fix(ui): gate input lock by handoff lifecycle only`
191. [TODO] Git Commit: `fix(ui): gate input lock by handoff lifecycle only` (hash: TBD)
192. [TODO] Test(ui/core): добавить целевые тесты на сценарий "assistant задал вопрос и ждёт" + сценарий rollover handoff (no stuck banner, correct unlock), включая защиту от регрессии "idle after blocked" — scope: `src/client/ui/src/session/session-view-helpers.test.ts`, `src/client/project-manager/components/sessions/token-usage-stream.test.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; expected commit message: `test(ui-core): cover turn idle and handoff banner lifecycle`
193. [TODO] Git Commit: `test(ui-core): cover turn idle and handoff banner lifecycle` (hash: TBD)
194. [TODO] Verify: прогнать обязательные Gates + таргетные сборки затронутых пакетов (`project-manager`, `core`, `build:webview`, `typecheck:webview`) и зафиксировать результаты в session report — scope: repo-wide (commands + docs); expected commit message: `chore(qa): verify working-strip lifecycle fixes`
195. [TODO] Git Commit: `chore(qa): verify working-strip lifecycle fixes` (hash: TBD)
196. [TODO] Release: собрать новый релиз для QA (`./scripts/build-all.sh` -> `./scripts/build-release.sh --use-current-version`) и описать артефакты в session report — scope: repo-wide; expected commit message: `chore(release): build-all next version` + `chore(release): build vsix`
