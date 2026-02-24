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
2. [DONE] Git Commit: `docs(todo): mark Phase 240 complete` (hash: `7fec6921`)

---

## Phase 241 — Release 1.1.666: Restart attempt confirm UX (owner: Codex, updated: 2026-02-24)

### Stream 0: Restart attempt confirm UX
1. [DONE] Session UI: заменить 2-step arm/confirm на явную плашку Apply/Cancel для ↻ Restart attempt (scope: `src/client/ui/src/session/input-play-stop-button.tsx`, `media/session-view.css`; expected commit: `fix(ui): add apply/cancel confirm for description restart`).
2. [DONE] Git Commit: `fix(ui): add apply/cancel confirm for description restart` (hash: `79f23933`)
3. [DONE] PM `questionnaire.md` header: Apply/Cancel confirm (scope: `src/client/project-manager/components/layout/workflow-artifact-viewer.tsx`, `src/client/project-manager/components/layout/questionnaire-restart-attempt-control.tsx`; expected commit: `fix(pm/ui): confirm restart attempt with apply/cancel`).
4. [DONE] Git Commit: `fix(pm/ui): confirm restart attempt with apply/cancel` (hash: `a5b66487`)
5. [DONE] Rebuild webview bundle (scope: `media/react-chat.js`; expected commit: `chore(build): rebuild webview for restart confirm bar`).
6. [DONE] Git Commit: `chore(build): rebuild webview for restart confirm bar` (hash: `b837584b`)

### Stream 1: Release build
1. [DONE] `./scripts/build-all.sh` → `1.1.666` (scope: manifests + package versions; expected commit: `chore(release): build-all v1.1.666`).
2. [DONE] Git Commit: `chore(release): build-all v1.1.666` (hash: `30cc64a6`)
3. [DONE] Update release notes (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs(release): update release notes for v1.1.666`).
4. [DONE] Git Commit: `docs(release): update release notes for v1.1.666` (hash: `a252061c`)
5. [DONE] `./scripts/build-release.sh --use-current-version` → `codeai-hub-1.1.666.vsix` (sha256: `d6b168f62233dde6a57317effb1c3c8c1222aebcd1442a8c191459dfaae15786`) (scope: none; no git commit).

### Stream 2: Session report
1. [DONE] Создать `doc/Sessions/Session021.md` по релизу `1.1.666` (scope: `doc/Sessions/Session021.md`; expected commit: `docs: session 021 report`).
2. [DONE] Git Commit: `docs: session 021 report` (hash: `0ce475aa`)

### Stream 3: TODO bookkeeping
1. [DONE] Обновить `doc/TODO/todo-plan.md`: отметить DONE для Stream 2/3 Phase 241 и вписать hash (scope: `doc/TODO/todo-plan.md`; expected commit: `docs(todo): mark Phase 241 complete`).
2. [DONE] Git Commit: `docs(todo): mark Phase 241 complete` (hash: `ab3208f6`)

---

## Phase 242 — Release 1.1.667: rebuild to avoid 666 (owner: Codex, updated: 2026-02-24)

### Stream 0: Release build
1. [DONE] `./scripts/build-all.sh` → `1.1.667` (scope: manifests + package versions; expected commit: `chore(release): build-all v1.1.667`).
2. [DONE] Git Commit: `chore(release): build-all v1.1.667` (hash: `c81dd129`)
3. [DONE] Update release notes (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs(release): update release notes for v1.1.667`).
4. [DONE] Git Commit: `docs(release): update release notes for v1.1.667` (hash: `722cb591`)
5. [DONE] `./scripts/build-release.sh --use-current-version` → `codeai-hub-1.1.667.vsix` (sha256: `8a93b1c68c7e3eb922e999986ef5d07c9381e2b0d94329761ca0b0864f85c406`) (scope: none; no git commit).

### Stream 1: Session report
1. [TODO] Создать `doc/Sessions/Session022.md` по релизу `1.1.667` (scope: `doc/Sessions/Session022.md`; expected commit: `docs: session 022 report`).
2. [TODO] Git Commit: `docs: session 022 report` (hash: TBD)

### Stream 2: TODO bookkeeping
1. [TODO] Обновить `doc/TODO/todo-plan.md`: отметить DONE для Phase 242 (Stream 1/2) и вписать hash (scope: `doc/TODO/todo-plan.md`; expected commit: `docs(todo): mark Phase 242 complete`).
2. [TODO] Git Commit: `docs(todo): mark Phase 242 complete` (hash: TBD)
