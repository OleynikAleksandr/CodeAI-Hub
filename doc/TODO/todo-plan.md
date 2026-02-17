# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  1) `doc/SolidWorks-WorkFlow/README.md`
  2) `doc/SolidWorks-WorkFlow/Docs_Index.md`
  3) `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзадача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `npm test`, `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:tsprune`, `npx ultracite fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
  - Ручной прогон этих команд обычно не нужен (только для диагностики).
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `doc/TODO/todo-plan.md` (дата, статус, хеш).
- **Real-time Документация**: Любое изменение архитектуры/логики требует синхронного обновления документации из `doc/` ДО коммита.

---

## Phase 211 — PM/UI/Core: recovery UX + корректный lock/unlock при auth/core сбоях (owner: Oleksandr+Codex, updated: 2026-02-17)

**Problem (validated):** при истёкшем Claude OAuth (`401 OAuth token has expired`) возможны неконсистентные состояния Session UI:
- input остаётся заблокированным навсегда (stuck `Agent is working...`), пока пользователь не выполнит ручной recovery (login + restart core).
- после recovery и повторного submit агент может отвечать, но input остаётся разблокированным во время выполнения turn.

**Goal:** любой provider/core сбой переводит UI в recoverable состояние, а во время выполнения turn input всегда корректно заблокирован.

### Stream: Recovery UX (Project Manager)
1. [TODO] UI: добавить явные действия восстановления в Project Manager при `Core unavailable`/ошибках провайдера: `Restart Core` + `Retry/Reconnect` (scope: `src/client/project-manager/**` ≤3 файла; expected commit message: `fix(pm): add recovery actions for core/provider failures`)
2. [TODO] Git Commit: `fix(pm): add recovery actions for core/provider failures` (hash: TBD)

### Stream: Auth failure завершает turn и снимает lock (Core + Provider)
1. [TODO] Core/Claude: на `401 authentication_error` гарантированно эмитить `turn_failed` + rollback `turn_state=idle` и понятный provider error hint (без вечного `working`) (scope: `packages/core/**`, `packages/Claude_Module/**` ≤3 файла; expected commit message: `fix(claude): unlock session on oauth auth failure`)
2. [TODO] Git Commit: `fix(claude): unlock session on oauth auth failure` (hash: TBD)

### Stream: Optimistic lock на submit + ресинхронизация после Core restart
1. [TODO] PM/UI: ввод должен lock-аться сразу после `Send` (optimistic) и оставаться locked до `turn_started/turn_state=running` или явного fail/timeout; при Core restart/rehydration восстановить корректный lock/active session mapping (scope: `src/client/project-manager/components/sessions/**` ≤3 файла; expected commit message: `fix(pm): keep input locked while turn is running`)
2. [TODO] Git Commit: `fix(pm): keep input locked while turn is running` (hash: TBD)
