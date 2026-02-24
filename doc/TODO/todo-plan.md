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

## Phase 240 — Release notes + docs sync (owner: Codex, updated: 2026-02-24)

### Stream 0: Release notes
1. [DONE] Обновить `README.md` (Current Release) до `v1.1.665` + кратко описать hotfix ↻ Restart attempt; обновить `CHANGELOG.md` (добавить `1.1.664` и `1.1.665`) (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs(release): update README + CHANGELOG for v1.1.665`).
2. [DONE] Git Commit: `docs(release): update README + CHANGELOG for v1.1.665` (hash: `e0b773b0`)

### Stream 1: Session report
1. [DONE] Создать `doc/Sessions/Session020.md` с итогами док-букинга после хотфикса `1.1.665` (scope: `doc/Sessions/Session020.md`; expected commit: `docs: session 020 report`).
2. [DONE] Git Commit: `docs: session 020 report` (hash: `a39ede28`)

### Stream 2: TODO bookkeeping
1. [DONE] Обновить `doc/TODO/todo-plan.md`: отметить пункты как DONE и вписать hash коммитов Phase 240 (scope: `doc/TODO/todo-plan.md`; expected commit: `docs(todo): mark Phase 240 complete`).
2. [DONE] Git Commit: `docs(todo): mark Phase 240 complete` (hash: TBD)
