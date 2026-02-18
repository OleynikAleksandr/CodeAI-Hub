# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  1) `doc/SolidWorks-WorkFlow/README.md`
  2) `doc/SolidWorks-WorkFlow/Docs_Index.md`
  3) `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `npm test`, `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:tsprune`, `npx ultracite fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `doc/TODO/todo-plan.md` (дата, статус, хеш).
- **Real-time Документация**: Любое изменение архитектуры/логики требует синхронного обновления документации из `doc/` ДО коммита.

---

## Phase 214 — Session UI: Lock workflow sessions immediately on open (owner: Oleksandr+Claude, updated: 2026-02-18)

**Проблема (BUG-2026-02-18-01):** Reviewer-сессия открывается с `connectionState="idle"`.
Пользователь мог вводить текст до первого workspace snapshot от Core.

**Goal:** Любая workflow-сессия (stage != null && sessionKind != null) открывается с `connectionState="running"`.

---

### Stream 1: Фикс — мгновенная блокировка для всех workflow-сессий

1. [DONE] В `helpers.ts` обновлён `createInitialSnapshot()`:
   Условие `stage === "description" && sessionKind === "collector"` заменено на
   `stage != null && sessionKind != null`.
   Добавлен комментарий об исключениях для будущих implementation/planning стадий.
   Тест `helpers.initial-snapshot.test.ts` обновлён: reviewer → `"running"`;
   добавлен тест для non-workflow сессий → `"idle"`.
   Scope: `helpers.ts` + `helpers.initial-snapshot.test.ts` (2 файла).

2. [DONE] Git Commit: `fix(ui): lock all workflow sessions immediately on open` (hash: 63ab37d1)

---

### Stream 2: Таргетная сборка + Release

1. [DONE] `npm run build:webview` + `npm run typecheck:webview` — зелёные.

2. [DONE] Git Commit: `chore(build): verify webview after workflow session lock fix` (hash: 262fd87e)

3. [DONE] `./scripts/build-all.sh` — v1.1.629. Session079.md создан.

4. [DONE] Git Commit: `feat(release): v1.1.629 - lock workflow sessions immediately` (hash: cb7b33cc)

**Phase 214 COMPLETED — 2026-02-18**

---

## Phase 215 — Reviewer unlock fix (owner: Oleksandr+Claude, updated: 2026-02-18)

**Проблема (BUG-2026-02-18-04):** Reviewer Agent не разблокирует input после завершения своего первого turn (задал вопросы пользователю). Пользователь не может ответить без ручного форс-анлока.

**Root cause:**
- Core: `handleFlowNodeContinuityProviderEvent` делал ранний `return` при `!usage` (нет token usage в turn_completed) без записи `contextDecision`. Следствие: `handleTurnCompletedEvent` не мог разблокировать UI.
- UI: `applyTurnStateStreamDataToSnapshot` игнорировал `turn_state:idle` если `connectionState === "blocked"`, даже когда `continuityLock.active = false`.

---

### Stream 1: Core + UI фикс разблокировки

1. [DONE] Core: в `handleFlowNodeContinuityProviderEvent` при `!usage` → `registerPostTurnNoRolloverDecision(sessionId)` вместо пустого return.
   UI: в `applyTurnStateStreamDataToSnapshot` — разрешить idle event разблокировать "blocked" если `continuityLock.active !== true`.
   Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts` + `src/client/ui/src/app-host/session-stream-snapshot-sync.ts` (2 файла).

2. [DONE] Git Commit: `fix(core/ui): unlock reviewer input after turn completion` (hash: d449725d)

---

### Stream 2: Release

1. [TODO] `npm run build --workspace packages/core` + `npm run build:webview` — зелёные (уже выполнены выше).
2. [TODO] `./scripts/build-all.sh` — v1.1.632.
3. [TODO] Git Commit: `feat(release): v1.1.632 - fix reviewer unlock after turn`

**Phase 215 IN PROGRESS — 2026-02-18**

---

## Phase 216 — Reviewer UX: placeholder при смене/привязке сессии + manual verify template (owner: Oleksandr+Codex, updated: 2026-02-18)

### Stream 1: Docs — зафиксировать manual verify для BUG-2026-02-18-06
1. [DONE] Обновить `doc/BugRegistry.md`: добавить `Verified (manual)` для `BUG-2026-02-18-06`.
   Scope: `doc/BugRegistry.md` (1 файл); ожидаемый commit message: `docs(bug-registry): verify reviewer template sync`
2. [DONE] Git Commit: `docs(bug-registry): verify reviewer template sync` (hash: 0b4687a6)

### Stream 2: UI — вернуть вторую надпись блокировки при смене сессии
1. [DONE] UI: при `binding.status=pending` и `connectionState=running` показывать placeholder “resuming session…”, а не “agent working…”.
   Scope: `src/client/ui/src/session/session-view.tsx` (1 файл); ожидаемый commit message: `fix(ui): show resuming copy during session binding`
2. [DONE] Git Commit: `fix(ui): show resuming copy during session binding` (hash: b23d2d45)

### Stream 3: Release
1. [DONE] `./scripts/build-all.sh` → next version; собрать tarball’ы и обновить манифесты.
2. [TODO] Git Commit: `feat(release): v<next> - reviewer ux placeholder` (hash: TBD)
3. [TODO] `./scripts/build-release.sh --use-current-version` → VSIX.
