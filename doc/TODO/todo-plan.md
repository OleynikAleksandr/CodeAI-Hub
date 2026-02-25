# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
  - `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
  - `doc/BugRegistry.md`
- **Ограничение:** каждая подзадача должна затрагивать **≤ 3 файлов**.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `npm test`, `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:tsprune`, `npx ultracite fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **НИКОГДА** не обходить гейты (`--no-verify`).

---

## Phase 247 — Virtual Simulation step (SSOT + UX contract) (owner: Oleksandr, updated: 2026-02-25)

### Stream 0: SSOT docs
1. [DONE] Создать SSOT контракт шага Virtual Simulation (manual start: кнопка `VIRTUAL SIMULATION` в тулбаре PM; inputs/outputs, DoD, OUTDATED, bundled templates) (scope: `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`; expected commit: `docs(workflow): define Virtual Simulation step contract`).
2. [DONE] Git Commit: `docs(workflow): define Virtual Simulation step contract` (hash: `102bd6f4`)
3. [DONE] Расширить `Workflow_CLI` как SSOT по шагам: порядок, gating, watcher-события, OUTDATED propagation + ссылки на подробные контракты шагов (scope: `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`; expected commit: `docs(workflow): expand Workflow_CLI step contract`).
4. [DONE] Git Commit: `docs(workflow): expand Workflow_CLI step contract` (hash: `78fafb14`)
5. [DONE] Обновить SSOT навигацию: добавить ссылки на `Workflow_CLI` и `VirtualSimulation_Step` (scope: `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs(ssot): link workflow step contracts`).
6. [DONE] Git Commit: `docs(ssot): link workflow step contracts` (hash: `d606d29b`)

### Stream 1: TODO bookkeeping (выполняется ПОСЛЕ завершения Stream 0)
1. [DONE] Заархивировать предыдущий `doc/TODO/todo-plan.md` и создать новый план (scope: `doc/TODO/Archive/todo-plan-up-to-phase246-2026-02-25.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(todo): reset todo plan after Phase 246`).
2. [DONE] Git Commit: `docs(todo): reset todo plan after Phase 246` (hash: `fe24a48d`)
3. [DONE] После док‑коммитов Stream 0: обновить `doc/TODO/todo-plan.md` (Phase 247) — отметить `DONE` + проставить hash (scope: `doc/TODO/todo-plan.md`; expected commit: `docs(todo): record Phase 247 hashes`).
4. [DONE] Git Commit: `docs(todo): record Phase 247 hashes` (hash: `b5f26ba9`)

---

## Phase 248 — Virtual Simulation templates + prompt-pack inputs (owner: Oleksandr, updated: 2026-02-25)

### Stream 0: Bundled templates (Core)
1. [DONE] Обновить bundled templates для `virtual_simulation`: prompt+template должны требовать чтение `Final_Description.md`, задавать до 3 вопросов и поддерживать «бесконечную» сессию (scope: `packages/core/src/templates/bundled-templates.ts`; expected commit: `feat(core): add virtual simulation bundled templates`).
2. [DONE] Git Commit: `feat(core): add virtual simulation bundled templates` (hash: `7f2644aa`)

### Stream 1: Prompt-pack builder (PM → Agent)
1. [DONE] Расширить `buildWorkflowPromptPack`: для шага `virtual_simulation` инструкции должны включать input `Final_Description.md` (relative+absolute) как обязательный вход (а не `questionnaire.md`) (scope: `src/client/project-manager/services/prompt-pack-builder.ts`; expected commit: `feat(pm): support Final_Description input for virtual simulation`).
2. [DONE] Git Commit: `feat(pm): support Final_Description input for virtual simulation` (hash: `16f8a909`)

---

## Phase 249 — PM UI: manual tool + right-side hint + infinite agent session (owner: Oleksandr, updated: 2026-02-25)

### Stream 0: Manual start wiring (кнопка → stage)
1. [DONE] PM: по нажатию кнопки `VIRTUAL SIMULATION` в верхнем тулбаре стартовать шаг `virtual_simulation` (create/resume session + отправка prompt-pack); без hint/валидаторов (scope: `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/components/layout/use-workflow-tool-select.ts`, `src/client/project-manager/services/workflow-step-start-service.ts`; expected commit: `feat(pm): start virtual simulation step from toolbar`).
2. [DONE] Git Commit: `feat(pm): start virtual simulation step from toolbar` (hash: `a9fe916c`)

### Stream 1: Right-side hint (до появления артефакта)
1. [DONE] PM UI: показывать информационный блок справа от UI сессии, пока `virtual-simulation.md` отсутствует; блок не должен блокировать старт сессии (scope: `src/client/project-manager/components/virtual-simulation/virtual-simulation-panel.tsx`, `src/client/project-manager/components/layout/main-area.tsx`; expected commit: `feat(pm/ui): show virtual simulation hint panel`).
2. [DONE] Git Commit: `feat(pm/ui): show virtual simulation hint panel` (hash: `d0d9ddb4`)

### Stream 2: Infinite session semantics (как Reviewer)
1. [DONE] PM/Core wiring: обеспечить «бесконечную» сессию Virtual Simulation (возврат в диалог, повторный upsert артефакта, без одноразового закрытия шага) (scope: `src/client/project-manager/services/workflow-step-start-service.ts`; expected commit: `feat(workflow): make virtual simulation session infinite`).
2. [DONE] Git Commit: `feat(workflow): make virtual simulation session infinite` (hash: `64e84a03`)

---

## Phase 250 — Watcher events + OUTDATED propagation (owner: Oleksandr, updated: 2026-02-25)

### Stream 0: Watcher events (FS → workflow.events)
1. [DONE] Подключить watcher‑события (в т.ч. `Final_Description.md` и `virtual-simulation.md`) к `workflow-state` (чтобы статусы/OUTDATED вычислялись детерминированно по событиям) (scope: `packages/core/src/remote-bridge/index.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.ts`; expected commit: `feat(workflow): record watcher events in workflow state`).
2. [DONE] Git Commit: `feat(workflow): record watcher events in workflow state` (hash: `5548d6cf`)

### Stream 1: Backend gating + OUTDATED
1. [DONE] Реализовать gating/статусы: Virtual Simulation доступен только после `Final_Description.md`; downstream BLOCKED вычисляется детерминированно и отдаётся в `workflow-state` (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `src/client/project-manager/services/workflow-gating-client.ts`, `src/client/project-manager/services/workflow-state-client.ts`; expected commit: `feat(workflow): virtual simulation gating and outdated`).
2. [DONE] Git Commit: `feat(workflow): virtual simulation gating and outdated` (hash: `b04e1981`)

### Stream 2: UI отображение OUTDATED/BLOCKED
1. [DONE] UI: отобразить `OUTDATED`/`BLOCKED` статусы в Workflow Tree (badge/tooltip), чтобы пользователь понимал причину и следующий шаг (scope: `src/client/project-manager/components/layout/workspace-tree-model.ts`, `src/client/project-manager/components/layout/workspace-tree.tsx`; expected commit: `feat(pm/ui): show workflow outdated and blocked statuses`).
2. [DONE] Git Commit: `feat(pm/ui): show workflow outdated and blocked statuses` (hash: `8304c9e0`)

---

## Phase 251 — DoD validation + ERROR UX (owner: Oleksandr, updated: 2026-02-25)

### Stream 0: Детерминированная валидация артефакта
1. [DONE] Добавить минимальную детерминированную валидацию `virtual-simulation.md` (заголовок + 2–4 сценария) для вычисления `DONE/ERROR` и корректного `BLOCKED` downstream (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `packages/core/src/workflow/validation/virtual-simulation-validator.ts`; expected commit: `feat(workflow): validate virtual simulation artifact`).
2. [DONE] Git Commit: `feat(workflow): validate virtual simulation artifact` (hash: `01c3937b`)

### Stream 1: ERROR UI + CTA «Исправить с агентом»
1. [DONE] PM UI: если `virtual-simulation.md` не проходит минимальную валидацию, показать CTA «Исправить с агентом» (возобновляет бесконечную сессию шага) (scope: `src/client/project-manager/components/virtual-simulation/virtual-simulation-panel.tsx`, `src/client/project-manager/services/workflow-step-start-service.ts`; expected commit: `feat(pm/ui): add fix-with-agent CTA for virtual simulation`).
2. [DONE] Git Commit: `feat(pm/ui): add fix-with-agent CTA for virtual simulation` (hash: `5f74344f`)

---

## Phase 252 — Release build (owner: Oleksandr, updated: 2026-02-25)

> Примечание: релизные скрипты (`build-all.sh`, `build-release.sh`) могут менять **много** файлов автоматически (version bumps, manifests).
> Это единственное запланированное исключение из правила «≤ 3 файлов» — изменения детерминированы и создаются скриптом.

### Stream 0: Build All (versions + tarballs)
1. [DONE] Release: выполнить `./scripts/build-all.sh` на чистом дереве; убедиться что tarball’ы появились в `~/.codeai-hub/releases` и `doc/tmp/releases/` (scope: `scripts/build-all.sh` (run); expected commit: `chore(release): build-all`).
2. [DONE] Git Commit: `chore(release): build-all` (hash: `bda88859`)

### Stream 1: Build Release (VSIX)
1. [DONE] Release: выполнить `./scripts/build-release.sh --use-current-version`; проверить `✅ Package created`; сохранить `codeai-hub-<version>.vsix` и артефакты в `doc/tmp/releases/`; зафиксировать результаты в `doc/Sessions/SessionXXX.md` (scope: `scripts/build-release.sh` (run), `doc/Sessions/SessionXXX.md`; expected commit: `chore(release): package vsix`).
2. [DONE] Git Commit: `chore(release): package vsix` (hash: `96f1cc5d`)

---

## Phase 253 — Virtual Simulation toolbar hotfix + Release build v1.1.671 (owner: Oleksandr, updated: 2026-02-25)

### Stream 0: PM hotfix (Virtual Simulation start)
1. [DONE] PM: нормализовать bridge config URLs (`wsUrl`/`httpUrl`) для корректного HTTP доступа к workflow endpoints (scope: `src/client/project-manager/api.ts`, `src/client/project-manager/services/bridge-config.ts`; expected commit: `fix(pm): normalize bridge config urls`).
2. [DONE] Git Commit: `fix(pm): normalize bridge config urls` (hash: `64f7d363`)
3. [DONE] PM UI: при клике `VIRTUAL SIMULATION` открыть диалог агента стадии + показать hint справа (scope: `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/components/layout/use-workflow-tool-select.ts`; expected commit: `fix(pm/ui): open Virtual Simulation session from toolbar`).
4. [DONE] Git Commit: `fix(pm/ui): open Virtual Simulation session from toolbar` (hash: `aa465255`)

### Stream 1: Release build (versions + VSIX)
1. [DONE] Release: выполнить `./scripts/build-all.sh` на чистом дереве; убедиться что tarball’ы появились в `~/.codeai-hub/releases` и `doc/tmp/releases/` (scope: `scripts/build-all.sh` (run); expected commit: `chore(release): build-all`).
2. [DONE] Git Commit: `chore(release): build-all` (hash: `1726e5a9`)
3. [DONE] Release: выполнить `./scripts/build-release.sh --use-current-version`; проверить `✅ Package created`; сохранить `codeai-hub-<version>.vsix` и артефакты в `doc/tmp/releases/`; зафиксировать результаты в `doc/Sessions/Session029.md` (scope: `scripts/build-release.sh` (run), `doc/Sessions/Session029.md`; expected commit: `chore(release): package vsix`).
4. [DONE] Git Commit: `chore(release): package vsix` (hash: `7bf5b2d5`)

---

## Phase 254 — Virtual Simulation start UX + Release build v1.1.672 (owner: Oleksandr, updated: 2026-02-25)

### Stream 0: PM UX fixes (Virtual Simulation start)
1. [DONE] PM UI: при выборе Virtual Simulation сразу показывать pending state в Sessions и ретраить dialog:list до появления стадии (scope: `src/client/project-manager/components/layout/use-workflow-tool-select.ts`, `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`, `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx`; expected commit: `fix(pm/ui): pending dialog during workflow start`).
2. [DONE] Git Commit: `fix(pm/ui): pending dialog during workflow start` (hash: `67dd0381`)
3. [DONE] PM UI: показать Virtual Simulation как раскрываемый узел с сессией в Workspace Tree (scope: `src/client/project-manager/components/layout/workspace-tree.tsx`, `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`; expected commit: `fix(pm/ui): show Virtual Simulation session in tree`).
4. [DONE] Git Commit: `fix(pm/ui): show Virtual Simulation session in tree` (hash: `11f96501`)

### Stream 1: Release build (versions + VSIX)
1. [DONE] Release: выполнить `./scripts/build-all.sh` на чистом дереве; убедиться что tarball’ы появились в `~/.codeai-hub/releases` и `doc/tmp/releases/` (scope: `scripts/build-all.sh` (run); expected commit: `chore(release): build-all`).
2. [DONE] Git Commit: `chore(release): build-all` (hash: `0df30b55`)
3. [DONE] Release: выполнить `./scripts/build-release.sh --use-current-version`; проверить `✅ Package created`; сохранить `codeai-hub-<version>.vsix` и артефакты в `doc/tmp/releases/`; зафиксировать результаты в `doc/Sessions/Session030.md` (scope: `scripts/build-release.sh` (run), `doc/Sessions/Session030.md`; expected commit: `chore(release): package vsix`).
4. [DONE] Git Commit: `chore(release): package vsix` (hash: `22f4923b`)

---

## Phase 255 — Virtual Simulation provider continuity + Release build v1.1.673 (owner: Oleksandr, updated: 2026-02-25)

### Stream 0: PM UX fixes (provider + labels + tree)
1. [DONE] PM UI: выбирать provider для `virtual_simulation` из Description (и использовать его также в “Fix with agent”) (scope: `src/client/project-manager/components/layout/use-workflow-tool-select.ts`, `src/client/project-manager/components/virtual-simulation/virtual-simulation-panel.tsx`, `src/client/project-manager/services/workflow-provider-resolver.ts`; expected commit: `fix(pm): keep workflow provider consistent`).
2. [DONE] Git Commit: `fix(pm): keep workflow provider consistent` (hash: `7ff46546`)
3. [DONE] Session UI: workflow tabs должны показывать label по stage для non-description (e.g. `Virtual Simulation`) (scope: `src/client/ui/src/session/session-tabs.tsx`; expected commit: `fix(ui): label workflow sessions by stage`).
4. [DONE] Git Commit: `fix(ui): label workflow sessions by stage` (hash: `7f41dcba`)
5. [DONE] PM UI: Virtual Simulation должен показывать `virtual-simulation.md` как саб-узел в Workspace Tree (scope: `src/client/project-manager/components/layout/workspace-tree.tsx`, `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`; expected commit: `fix(pm/ui): show virtual simulation artifact in tree`).
6. [DONE] Git Commit: `fix(pm/ui): show virtual simulation artifact in tree` (hash: `b16bb466`)

### Stream 1: Release build (versions + VSIX)
1. [DONE] Release: выполнить `./scripts/build-all.sh` на чистом дереве; убедиться что tarball’ы появились в `~/.codeai-hub/releases` и `doc/tmp/releases/` (scope: `scripts/build-all.sh` (run); expected commit: `chore(release): build-all`).
2. [DONE] Git Commit: `chore(release): build-all` (hash: `2190a699`)
3. [DONE] Release: выполнить `./scripts/build-release.sh --use-current-version`; проверить `✅ Package created`; сохранить `codeai-hub-<version>.vsix` в `doc/tmp/releases/`; зафиксировать результаты в `doc/Sessions/Session031.md` (scope: `scripts/build-release.sh` (run), `doc/Sessions/Session031.md`; expected commit: `chore(release): package vsix`).
4. [TODO] Git Commit: `chore(release): package vsix` (hash: `TBD`)
