# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
  - `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md`
  - `doc/BugRegistry.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стрим), в каждом Stream некоторое количество подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `npm test`, `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:tsprune`, `npx ultracite fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Commit**: только после зелёных гейтов. После каждого коммита: обновить статусы и вписать hash.

---

## Phase 239 — Release 1.1.664: docs + report (owner: Codex, updated: 2026-02-24)

### Stream 0: Release docs
1. [DONE] Обновить `doc/BugRegistry.md`: BUG-2026-02-24-01 → Release `1.1.664` + указать commits; создать `doc/Sessions/Session018.md` (scope: `doc/BugRegistry.md`, `doc/Sessions/Session018.md`; expected commit: `chore(release): package vsix v1.1.664`).
2. [DONE] Git Commit: `chore(release): package vsix v1.1.664` (hash: `a4e52890`)

### Stream 1: TODO bookkeeping
1. [DONE] Обновить `doc/TODO/todo-plan.md`: отметить DONE и прописать hash коммита упаковки (scope: `doc/TODO/todo-plan.md`; expected commit: `docs(todo): mark vsix packaged v1.1.664`).
2. [DONE] Git Commit: `docs(todo): mark vsix packaged v1.1.664` (hash: TBD)
