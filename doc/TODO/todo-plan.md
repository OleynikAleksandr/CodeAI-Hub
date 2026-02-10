# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- Каждая микро-задача затрагивает не более **3 файлов**.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро-задачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетные сборки.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/System/SessionUI_Layout_Stability.md`
3. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 132 — Session Header Tokens Formatting (owner: Oleksandr, updated: 2026-02-10)

**Goal:** улучшить читаемость строки `Models | Tokens` в Session UI: убрать отображение максимального окна и увеличить разделитель между Model и Tokens.

### Stream: Session Header
1. [TODO] Обновить отображение Tokens: убрать `/<max>` и оставить `Tokens: <used> (<percent>)`; увеличить пробелы вокруг `|` в 2 раза (scope: `src/client/ui/src/session/...`; expected commit message: `fix(session-ui): simplify tokens label and widen separator`)
2. [TODO] Git Commit: `fix(session-ui): simplify tokens label and widen separator` (hash: TBD)
3. [TODO] Обновить документацию по Session UI (scope: `doc/SolidWorks-Flow/System/SessionUI_Layout_Stability.md`; expected commit message: `docs(session-ui): document models/tokens header formatting`)
4. [TODO] Git Commit: `docs(session-ui): document models/tokens header formatting` (hash: TBD)
