# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзазача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates**: после выполнения каждой подзадачи прогоняется Гейт Качества -
  - `./scripts/check-architecture.sh`
  - `npx ultracite check`
  - `npx ts-prune`
  - `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`
  - `npm run check:links`
  - затем таргетная сборка (минимально необходимая для затронутого пакета/клиента), например:
    - `npm run build:webview`
    - `npm run typecheck:webview`
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт этого файла (дата, статус, хеш).
- Phase завершается на чистом дереве.

---

## Phase 1 — Flow-first UI session start (owner: Oleksandr, updated: 2026-01-07)

### Stream: Design Doc

1. [DONE] Описать UX и модель состояния для step-first старта (scope: `doc/SolidWorks-Flow/System/UIFlow_EntrySelection_Architecture.md`; expected: цели/ограничения, state model, provider filtering; commit: `docs(ui): document flow-first start picker`) (date: 2026-01-07)
2. [DONE] Git Commit: `docs(ui): document flow-first start picker` (hash: df8e3f8) (date: 2026-01-07)

### Stream: UI — Step selection (5 buttons)

3. [DONE] Расширить Flow wizard до 5 кнопок и включить hover/disabled поддержку (scope: `src/client/ui/src/components/flow-wizard/index.tsx`, `src/client/ui/src/components/flow-wizard/styles.ts`, `src/client/ui/src/components/flow-wizard/flow-stage.tsx`; expected: Simple Chat + Idea/Spec/Plan/Execute, адаптивная сетка; commit: `refactor(ui): extend flow wizard start steps`) (date: 2026-01-07)
4. [DONE] Git Commit: `refactor(ui): extend flow wizard start steps` (hash: ed3fba1) (date: 2026-01-07)

### Stream: UI — Stage-first provider selection

5. [DONE] Переставить UX: сначала выбор шага, затем выбор провайдера; ограничить провайдеры для Flow (scope: `src/client/ui/src/app-host/provider-picker-state.ts`, `src/client/ui/src/app-host/flow-wizard-picker.tsx`, `src/client/ui/src/app-host/session-region.tsx`; expected: stage picker → provider picker, Flow = Codex/Claude only, disabled Flow при отсутствии Codex/Claude; commit: `refactor(ui): stage-first provider selection`) (date: 2026-01-07)
6. [DONE] Git Commit: `refactor(ui): stage-first provider selection` (hash: a16225f) (date: 2026-01-07)

7. [DONE] Добавить “Back” в provider picker и убрать flow-specific текст (scope: `src/client/ui/src/provider-picker.tsx`; expected: Back возвращает к выбору шага; commit: `refactor(ui): add back navigation to provider picker`) (date: 2026-01-07)
8. [DONE] Git Commit: `refactor(ui): add back navigation to provider picker` (hash: 0c567da) (date: 2026-01-07)

9. [DONE] Ограничить kickoff Idea Collector только для Idea stage (scope: `src/client/ui/src/app-host.tsx`; expected: kickoff только когда выбран этап Idea; commit: `fix(ui): gate idea kickoff by stage`) (date: 2026-01-07)
10. [DONE] Git Commit: `fix(ui): gate idea kickoff by stage` (hash: e62ac7a) (date: 2026-01-07)

### Stream: UI — Webview bundle

11. [DONE] Обновить webview bundle под новый UX (scope: `media/react-chat.js`; expected: bundle соответствует UI изменениям; commit: `chore(webview): rebuild bundle`) (date: 2026-01-07)
12. [DONE] Git Commit: `chore(webview): rebuild bundle` (hash: c7a6282) (date: 2026-01-07)

### Stream: TODO hygiene

13. [DONE] Заархивировать предыдущий TODO план Agent Packages (scope: `doc/TODO/Archive/todo-plan-phase4-agent-packages-2026-01-06.md`; expected: перенос из `doc/TODO/todo-plan.md`; commit: `docs(todo): archive agent packages todo plan`) (date: 2026-01-07)
14. [DONE] Git Commit: `docs(todo): archive agent packages todo plan` (hash: 2694230) (date: 2026-01-07)

### Stream: Gates

15. [DONE] Таргетный TypeScript typecheck для webview (scope: `tsconfig.webview.json`; expected: `npm run typecheck:webview` зелёный) (date: 2026-01-07)
16. [DONE] Gate: `./scripts/check-architecture.sh` + `npx ultracite check` + `npx ts-prune` + `npx jscpd ...` + `npm run check:links` + `npm run build:webview` (scope: scripts + UI; expected: зелёный прогон) (date: 2026-01-07)
