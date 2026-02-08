# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase — Stream (стрим) с микрозадачами.
- Каждая микрозадача затрагивает **≤ 3 файлов** и **≤ 3 новых классов**.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- После каждой микрозадачи обязательны гейты: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- После зелёных гейтов — Git Commit и немедленный апдейт статусов/хешей в этом файле.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Sessions/Session113.md`
3. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 106 — Backlog Intake (owner: Oleksandr, updated: 2026-02-08)

### Stream: Scope Definition
1. [TODO] Подготовить архитектурный документ для следующего фиче-набора (scope: `doc/Project_Docs/**`; expected commit: `docs(architecture): define phase 106 scope`)
2. [TODO] Git Commit: `docs(architecture): define phase 106 scope` (hash: TBD)
