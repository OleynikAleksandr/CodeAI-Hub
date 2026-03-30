# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стрим), в каждом Стриме некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзадача Stream затрагивает больше 3 файлов — такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
  - Ручной прогон этих команд обычно не нужен (только для диагностики).
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit**: После зелёных гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- Stream завершается после того, как все его задачи закрыты таргетными сборками затронутых пакетов/клиентов и коммитами.
- **Real-time Документация**: Любое изменение архитектуры/логики требует синхронного обновления и `todo-plan.md` и документации **ДО** коммита.
- Phase завершается на чистом дереве: запускаем `./scripts/build-all.sh`, переносим tarball'ы в `doc/tmp/releases/`, фиксируем результаты в `doc/Sessions/`.
- **doc/TODO/todo-plan.md** необходимо постоянно в реалтайме обновлять, после каждой подзадачи обязательный коммит.

---

## Phase 1 — Architecture Gate: raise MAX_LINES to 500 (owner: Oleksandr, updated: 2026-03-30)

Scope: поднять лимит строк с 300 до 500, warning zone с 250 до 400. Пересобрать allowlist только для файлов реально >500. Убрать все записи ≤500 из allowlist.

### Stream: Update architecture gate config
1. [DONE] Обновить `scripts/check-architecture.sh`: `MAX_LINES=500`, `WARNING_LINES=400`. Обновить `scripts/check-architecture-rules/max-lines-debt-allowlist.txt`: оставить только 5 файлов >500, удалить остальные 14 записей. Обновить `AGENTS.md` раздел "Архитектурные принципы": 300→500. Scope: `check-architecture.sh`, `max-lines-debt-allowlist.txt`, `AGENTS.md`. Expected commit: `refactor: raise architecture line limit to 500`
2. [TODO] Git Commit: `refactor: raise architecture line limit to 500` (hash: TBD)

## Phase 2 — Refactor files >500 lines (owner: Oleksandr, updated: 2026-03-30)

Target: привести все 5 файлов >500 строк в лимит. Порядок — от наименьшего к наибольшему.

### Stream 2A: unified-session/storage.ts (506 lines)
3. [TODO] Проанализировать `packages/core/src/unified-session/storage.ts` и выделить логику в отдельные micro-class(ы). Scope: ≤3 файлов. Expected commit: `refactor: split unified-session storage`
4. [TODO] Git Commit: `refactor: split unified-session storage` (hash: TBD)

### Stream 2B: workspace-runtime-facade.test.ts (529 lines)
5. [TODO] Проанализировать `packages/core/src/workspace-runtime/workspace-runtime-facade.test.ts` и разделить test suites на отдельные файлы по concern. Scope: ≤3 файлов. Expected commit: `refactor: split workspace-runtime-facade tests`
6. [TODO] Git Commit: `refactor: split workspace-runtime-facade tests` (hash: TBD)

### Stream 2C: core-supervisor/src/index.ts (585 lines)
7. [TODO] Проанализировать `packages/core-supervisor/src/index.ts` и выделить подсистемы в отдельные micro-class(ы). Scope: ≤3 файлов. Expected commit: `refactor: split core-supervisor entry point`
8. [TODO] Git Commit: `refactor: split core-supervisor entry point` (hash: TBD)

### Stream 2D: session-request-handler.ts (595 lines)
9. [TODO] Проанализировать `packages/core/src/remote-bridge/handlers/session-request-handler.ts` и выделить handler groups в отдельные модули. Scope: ≤3 файлов. Expected commit: `refactor: split session-request-handler`
10. [TODO] Git Commit: `refactor: split session-request-handler` (hash: TBD)

### Stream 2E: session-request-handler.test.ts (633 lines)
11. [TODO] Проанализировать `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts` и разделить test suites по concerns в соответствии с рефакторингом handler. Scope: ≤3 файлов. Expected commit: `refactor: split session-request-handler tests`
12. [TODO] Git Commit: `refactor: split session-request-handler tests` (hash: TBD)

## Phase 3 — Release Build (owner: Oleksandr, updated: 2026-03-30)

### Stream: Release docs and build
13. [TODO] Обновить `README.md` и `CHANGELOG.md`. Expected commit: `docs(release): prepare architecture refactor release`
14. [TODO] Git Commit: `docs(release): prepare architecture refactor release` (hash: TBD)
15. [TODO] Чистое дерево → `./scripts/build-all.sh` → новая версия.
16. [TODO] Git Commit: `chore: prepare v<next> artifacts` (hash: TBD)
17. [TODO] `./scripts/build-release.sh --use-current-version` → VSIX verified.
