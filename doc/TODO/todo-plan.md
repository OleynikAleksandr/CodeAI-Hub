# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- Каждая микро-задача затрагивает не более **3 файлов**.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро-задачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетные сборки.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.

## Required documents to review before work
1. `doc/Sessions/Session039.md`
2. `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`
3. `doc/SolidWorks-Flow/Stacks/CoreOrchestrator.md`
4. `doc/SolidWorks-Flow/System/SystemArchitecture.md`

---

## Phase 154 — Next (owner: Oleksandr, updated: 2026-02-13)

### Stream: TBD
1. [TODO] <описание> (scope: <≤3 files>; expected commit message: `<type>: <message>`)
2. [TODO] Git Commit: `<type>: <message>` (hash: TBD)
