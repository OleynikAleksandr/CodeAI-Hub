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
4. `doc/TODO/Archive/todo-plan-phase159-dialog-ui-2026-02-14.md`

---

## Phase 160 — PM Session Dialog: Reliable Restore + No Bootstrap Repeats (owner: Oleksandr, updated: 2026-02-14)

**Problem:** После изменений “unified agent dialog (1 agent = 1 JSONL)” поведение PM/UI стало нестабильным:
- После закрытия Project Manager и остановки Core: сессия Reviewer может не появляться/не открываться в дереве.
- При hot-run или после reopen PM: появляются повторы (в т.ч. `System Prompt — Reviewer Agent` и блоки `Я прочитал ...`), хотя в persisted JSONL дублей нет.

**Goal:**
- После рестарта Core/PM сессии всегда доступны и открываются (cold start восстановление).
- В UI нет повторов bootstrap-сообщений при смене provider sessions (continuity segments).
- Механизм универсален для любых провайдеров.

### Stream: Report (Session)
1. [DONE] Docs: создать отчет сессии с описанием проблемы/причин/решения (scope: `doc/Sessions/Session044.md`; expected commit message: `docs(sessions): start Session044 (pm dialog restore + dedupe plan)`)
2. [DONE] Git Commit: `docs(sessions): start Session044 (pm dialog restore + dedupe plan)` (hash: 41e7d84b)

### Stream: PM — Reconnect Must Activate Workspace
1. [DONE] PM: на reconnect после рестарта Core обязательно дергать `workspace-activate`, чтобы восстановить runtime session registry и дерево (scope: `src/client/project-manager/components/layout/workspace-scope-sync.ts`, `doc/TODO/todo-plan.md`; expected commit message: `fix(pm): activate workspace after core reconnect`)
2. [DONE] Git Commit: `fix(pm): activate workspace after core reconnect` (hash: 4bba2724)

### Stream: UI — Remove Continuity Segment Bootstrap Repeats
1. [TODO] UI: при построении “virtual conversation” для continuity chain скрывать повторяющиеся bootstrap сообщения для segmentIndex>0 (system prompt + первичный ack), не трогая основной диалог (scope: `src/client/ui/src/session/virtual-conversation.tsx`, `doc/TODO/todo-plan.md`; expected commit message: `fix(ui): suppress continuity bootstrap repeats in virtual conversation`)
2. [TODO] Git Commit: `fix(ui): suppress continuity bootstrap repeats in virtual conversation` (hash: TBD)

### Stream: Docs — Contract For Cold Start + Hot Tail
1. [TODO] Docs: описать контракт: cold-start из JSONL + hot-tail из live stream, правила dedupe и reconnect, а также что bootstrap повторы сегментов скрываются в UI (scope: `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`, `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`; expected commit message: `docs(flow): document cold-start+tail contract and bootstrap suppression`)
2. [TODO] Git Commit: `docs(flow): document cold-start+tail contract and bootstrap suppression` (hash: TBD)

### Stream: Release Build (New Patch Release)
1. [TODO] Gates: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd ...`, `npm run check:links` + таргетные сборки затронутых пакетов (scope: repo; expected commit message: `chore: quality gates before release`)
2. [TODO] Git Commit: `chore: quality gates before release` (hash: N/A — без изменений в tracked files)
3. [TODO] Build: `./scripts/build-all.sh` (version bump -> next patch) (scope: repo build; expected commit message: `chore(release): build-all for next patch`)
4. [TODO] Git Commit: `chore(release): build-all for next patch` (hash: TBD)
5. [TODO] Build: `./scripts/build-release.sh --use-current-version` (VSIX: `codeai-hub-<version>.vsix`) (scope: repo build; expected commit message: `chore(release): build vsix`)
6. [TODO] Git Commit: `chore(release): build vsix` (hash: N/A — VSIX artifact only)
