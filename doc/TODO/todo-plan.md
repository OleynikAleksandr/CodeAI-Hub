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

## Phase 238 — Description: ↻ Restart attempt (one-shot recovery) (owner: Codex, updated: 2026-02-24)

**Goal:** Для one-shot сессии `Description` убрать бесполезный `Stop/Play`-флоу и добавить аварийный **↻ Restart attempt** (с подтверждением) в двух местах:
1) в интерфейсе самой description-сессии (если она создана, но зависла/сломалась),
2) рядом с заголовком артефакта `Questionary.md` (если анкета уже стала артефактом, но сессия не создалась или умерла).

**Contract:**
- `Description` остаётся **job/no-resume**, а не чат.
- ↻ **не перезапускает Core** (чтобы не снести другие активные сессии).
- ↻ делает **новую попытку** (new attempt): отменяет/дискардит текущую попытку и повторно отправляет стартовый prompt-pack из артефакта анкеты.
- Результаты старых попыток **не должны** случайно дописать артефакты/триггернуть downstream (принимаем только текущий `attemptId`).

### Stream 0: Contract + UX spec
1. [TODO] Обновить SSOT контракт: `Description` = job; кнопки: только ↻ Restart attempt (с confirm), без доп.сообщений; добавить правило “accept only latest attemptId” (scope: `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`, `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md`, `doc/BugRegistry.md`; expected commit: `docs(contracts): description restart attempt contract`).
2. [TODO] Git Commit: `docs(contracts): description restart attempt contract` (hash: TBD)

### Stream 1: Core — attemptId gating
1. [TODO] Добавить attemptId для запуска `Description` и фильтрацию/игнор late events от старых попыток (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/workflow/runtime/workflow-runtime.ts`, `packages/core/src/workflow/state/workflow-state-store.ts`; expected commit: `feat(core): gate description by attemptId`).
2. [TODO] Git Commit: `feat(core): gate description by attemptId` (hash: TBD)

### Stream 2: Project Manager — ↻ рядом с `Questionary.md`
1. [TODO] Добавить ↻ кнопку в хедер артефакта `Questionary.md` + confirm; по клику: повторная отправка анкеты (new attempt) (scope: `src/client/project-manager/components/description/description-questionnaire-panel.tsx`, `src/client/project-manager/services/idea-collector-submit-service.ts`, `src/client/project-manager/services/prompt-pack-builder.ts`; expected commit: `feat(pm): restart description attempt from questionnaire artifact`).
2. [TODO] Git Commit: `feat(pm): restart description attempt from questionnaire artifact` (hash: TBD)

### Stream 3: Session UI — ↻ вместо Stop/Play (Description only)
1. [TODO] В UI сессии заменить `Stop/Play` на ↻ Restart attempt (confirm), только для one-shot `Description`; иконка ↻ — **белая**, по размеру как текущая кнопка Stop (включая плашку под кнопкой) (scope: `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/input-panel.tsx`, `media/session-view.css`; expected commit: `feat(ui): restart attempt control for description`).
2. [TODO] Git Commit: `feat(ui): restart attempt control for description` (hash: TBD)

### Stream 4: Webview rebuild
1. [TODO] Пересобрать webview bundle после UI изменений (scope: `media/react-chat.js`; expected commit: `chore(build): rebuild webview after description restart attempt`).
2. [TODO] Git Commit: `chore(build): rebuild webview after description restart attempt` (hash: TBD)
