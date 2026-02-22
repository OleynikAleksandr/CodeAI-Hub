# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/Sessions/Session097.md`
  - `doc/BugRegistry.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стрим), в каждом Stream некоторое количество подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `npm test`, `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:tsprune`, `npx ultracite fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase:
  - `npm run build --workspace <package>`
  - `npm run build:webview`
  - `npm run typecheck:webview`
- **Commit**: только после зеленых гейтов. После каждого коммита: обновить статусы и вписать hash.
- **Real-time Документация**: любое изменение архитектуры/логики требует синхронного обновления документов из `doc/` ДО коммита.

---

## Phase 220 — BUG-2026-02-22-01: cold-start lock после sessionId mismatch (owner: Codex, updated: 2026-02-22)

**Goal:** Устранить вечный `Agent is working... Please wait.` после рестарта PM/Core, когда continuity `latestSessionId` расходится с runtime `sessionId`.

**SSOT/Design:**
- `doc/BugRegistry.md` (`BUG-2026-02-22-01`)
- `doc/Sessions/Session097.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`

**Progress note (2026-02-22 08:52 CET):** Stream 1 и Stream 2 реализованы и закоммичены; открыт Stream 3 (документация + закрытие бага).

---

### Stream 1: Core reconciliation (source of truth)
1. [DONE] Добавить reconciliation `latestSessionId` в `dialog:list` по активному `providerSessionId`, чтобы для RuntimeSnapshot использовался актуальный runtime `sessionId` (scope: `packages/core/src/remote-bridge/handlers/dialog-list-service.ts`, `packages/core/src/remote-bridge/index.ts`; expected commit: `fix(core): reconcile latest session id with runtime on dialog list`).
2. [DONE] Git Commit: `fix(core): reconcile latest session id with runtime on dialog list` (hash: `172f7ce8`)
3. [DONE] Добавить/обновить unit-test на mismatch (`continuity latestSessionId != runtime sessionId`) и проверку, что Core возвращает runtime-актуальный id (scope: `packages/core/src/remote-bridge/handlers/dialog-list-service.test.ts`, `packages/core/src/remote-bridge/index.test.ts`; expected commit: `test(core): cover latestSessionId runtime reconciliation`).
4. [DONE] Git Commit: `test(core): cover latestSessionId runtime reconciliation` (hash: `1e107868`)

### Stream 2: PM fallback применения snapshot state
1. [DONE] Добавить fallback в PM: если exact `sessionId` не найден, резолвить snapshot по `providerSessionId`/`dialogId` и применять lock-state к текущей dialog session (scope: `src/client/project-manager/components/sessions/session-stream.ts`, `src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts`, `src/client/project-manager/components/sessions/dialog-runtime-session-resolver.ts`; expected commit: `fix(pm): apply snapshot state via provider fallback when session ids drift`).
2. [DONE] Git Commit: `fix(pm): apply snapshot state via provider fallback when session ids drift` (hash: `1c65a755`)
3. [DONE] Добавить UI/store guard-тест на сценарий cold-start drift: runtime `idle` -> ввод разблокирован без ручного force-unlock (scope: `src/client/project-manager/components/sessions/dialog-session-snapshot-replay.test.ts`, `src/client/project-manager/components/sessions/session-stream-provider-fallback.test.ts`; expected commit: `test(pm): unlock input on cold-start session id drift`).
4. [DONE] Git Commit: `test(pm): unlock input on cold-start session id drift` (hash: `90e94bd5`)

### Stream 3: Документация и завершение бага
1. [TODO] Обновить документацию по маршрутизации continuity/runtime identity и закрыть запись бага после верификации фикса (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/BugRegistry.md`, `doc/Sessions/Session097.md`; expected commit: `docs: document runtime identity reconciliation and close bug 2026-02-22-01`).
2. [TODO] Git Commit: `docs: document runtime identity reconciliation and close bug 2026-02-22-01` (hash: TBD)
