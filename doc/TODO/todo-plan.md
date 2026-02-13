# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- Каждая микро-задача затрагивает не более **3 файлов**.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микро-задачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетные сборки.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.

## Required documents to review before work
1. `doc/Sessions/Session041.md`
2. `doc/SolidWorks-Flow/Stacks/CoreOrchestrator.md`
3. `doc/TODO/Archive/todo-plan-phase156-release-1.1.585-2026-02-13.md`

---

## Phase 157 — Post-Release Verification (owner: Oleksandr, updated: 2026-02-13)

**Goal:** После релиза 1.1.585 подтвердить, что unified Agent Dialog JSONL переживает рестарты Core и отображается в UI как единый диалог.

### Stream: Manual Tests
1. [TODO] QA: создать 2-3 rollover/resume сегмента для Reviewer Codex, перезапустить Core, убедиться что UI показывает полный диалог и что `description-step.json.session.dialogSessionId` заполнен (scope: runtime files; expected commit message: `docs(qa): verify unified dialog jsonl on core restart`)
2. [TODO] Git Commit: `docs(qa): verify unified dialog jsonl on core restart` (hash: TBD)
