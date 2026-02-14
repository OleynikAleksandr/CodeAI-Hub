# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- Каждая микро-задача затрагивает не более **3 файлов**.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро-задачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетные сборки.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
3. `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`
4. `doc/TODO/Archive/todo-plan-phase158-release-1.1.587-2026-02-13.md`

---

## Phase 159 — Dialog UI: Cold Start From JSONL + Hot Live Stream (owner: Oleksandr, updated: 2026-02-13)

**Problem:** После рефакторинга unified Agent Dialog (1 agent = 1 JSONL) UI Project Manager ведёт себя нестабильно:
- После закрытия Project Manager и остановки Core: сессия Reviewer может не появляться в дереве/не открываться.
- Пока Project Manager активен: появляются множественные повторы (replay/reconnect/double subscribe) при мердже history + live.

**Goal:** Полностью пересобрать схему отображения диалогов в UI так, чтобы:
- При cold-start (после рестарта Core/PM) история грузилась из `~/.codeai-hub/sessions/**.jsonl` (SOT для восстановления).
- При hot-mode (PM активен) диалог пополнялся через live stream (Core WS), без дублей, без зависимости от смены provider sessions.
- Переключение history -> live было детерминированным: через курсор/seq/eventId, а не через эвристику.
- Решение работало для всех провайдеров (Claude/Codex/Gemini).

### Stream: Core — Restore Description Sessions On Activate
1. [DONE] Core: учитывать `runSlug` при reuse resume session (чтобы collector/reviewer с одинаковым providerSessionId не схлопывались в одну runtime session) (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `fix(core): include runSlug in resume session reuse matching`)
2. [DONE] Git Commit: `fix(core): include runSlug in resume session reuse matching` (hash: d06aa1e1)
3. [DONE] Core: при workspace activate восстанавливать обе description-сессии из persisted snapshot: `collectorSession` + `reviewerSession` (fallback: legacy `session`) (scope: `packages/core/src/remote-bridge/handlers/workspace-activate-service.ts`; expected commit message: `fix(core): restore description collector+reviewer sessions on workspace activate`)
4. [DONE] Git Commit: `fix(core): restore description collector+reviewer sessions on workspace activate` (hash: bddc2f04)

### Stream: Spec And Invariants (Docs)
1. [TODO] Docs: зафиксировать контракт «History (JSONL) + Tail (Live)»: стабильный `eventId/seq`, курсор, правила reconnect, и правило single subscription на `dialogSessionId` (scope: `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`, `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`; expected commit message: `docs(flow): define history+tail dialog contract`)
2. [TODO] Git Commit: `docs(flow): define history+tail dialog contract` (hash: TBD)

### Stream: Core — Stable Event Identity
1. [TODO] Core: гарантировать стабильный `eventId` (или монотонный `seq`) для записей unified-session JSONL и для live событий, которые UI получает по WS (scope: `packages/core/**`; expected commit message: `fix(core): add stable eventId for dialog records and stream`)
2. [TODO] Git Commit: `fix(core): add stable eventId for dialog records and stream` (hash: TBD)

### Stream: PM/UI — Cold Start Then Tail
1. [TODO] PM/UI: переписать загрузку диалога: сначала load JSONL history + запомнить cursor, затем подписка на live tail (single subscription), apply только events > cursor (scope: `src/client/project-manager/components/sessions/**` ≤3 файла; expected commit message: `fix(pm): cold start from jsonl then tail live stream`)
2. [TODO] Git Commit: `fix(pm): cold start from jsonl then tail live stream` (hash: TBD)

### Stream: PM/UI — Workspace Tree Restore
1. [TODO] PM/UI + Core: обеспечить, что после рестарта Core/PM сессии доступны для клика: tree item -> открывает диалог, даже если live session пока не активна (scope: ≤3 файла; expected commit message: `fix(pm): restore session nodes from persisted dialogSessionId`)
2. [TODO] Git Commit: `fix(pm): restore session nodes from persisted dialogSessionId` (hash: TBD)

### Stream: QA Manual
1. [TODO] QA: сценарии: (1) активный PM: 3-5 rollover/resume без дублей; (2) закрыть PM + стоп Core: после старта видны сессии и полная история; (3) reconnect/network glitch: без дублей (scope: runtime only; expected commit message: `docs(qa): verify dialog restore and dedupe`)
2. [TODO] Git Commit: `docs(qa): verify dialog restore and dedupe` (hash: TBD)

### Stream: Release Build (New Patch Release)
1. [TODO] Gates: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd ...`, `npm run check:links` + таргетные сборки затронутых пакетов (scope: repo; expected commit message: `chore: quality gates before release`)
2. [TODO] Git Commit: `chore: quality gates before release` (hash: TBD)
3. [TODO] Build: `./scripts/build-all.sh` (version bump) (scope: repo build; expected commit message: `chore(release): build-all for next patch`)
4. [TODO] Git Commit: `chore(release): build-all for next patch` (hash: TBD)
5. [TODO] Build: `./scripts/build-release.sh --use-current-version` (VSIX) (scope: repo build; expected commit message: `chore(release): build vsix`)
6. [TODO] Git Commit: `chore(release): build vsix` (hash: TBD)
