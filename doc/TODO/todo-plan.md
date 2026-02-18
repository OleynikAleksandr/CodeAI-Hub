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

**Проблема (BUG-2026-02-18-01):** Reviewer-сессия (и все будущие workflow-узлы документации)
открывается с `connectionState="idle"`, хотя Core сразу шлёт первый промпт и начинается turn.
Пользователь может вводить текст в этот промежуток до первого workspace snapshot.

**Root cause:** `createInitialSnapshot()` выставляет `connectionState="running"` только для
`stage="description" && sessionKind="collector"`. Все остальные workflow-сессии стартуют с `"idle"`.

**Goal:** Любая workflow-сессия (stage != null && sessionKind != null) открывается с
`connectionState="running"` — блокировка мгновенная.
Для будущих стадий (имплементация, планирование), где пользователь инициирует первый turn,
добавлять явное исключение в этом же месте (с комментарием).

**Затронутые файлы:**
- `src/client/ui/src/session/helpers.ts` — `createInitialSnapshot()`
- `src/client/ui/src/session/helpers.initial-snapshot.test.ts` — обновить тест для reviewer

---

### Stream 1: Фикс — мгновенная блокировка для всех workflow-сессий

1. [TODO] В `helpers.ts` обновить `createInitialSnapshot()`:
   Заменить условие `stage === "description" && sessionKind === "collector"`
   на `stage != null && sessionKind != null`.
   Добавить комментарий об исключениях для будущих implementation/planning стадий.
   Обновить тест в `helpers.initial-snapshot.test.ts`:
   `"keeps reviewer sessions idle"` → `"locks reviewer sessions immediately"` (ожидание: `"running"`).
   Scope: `src/client/ui/src/session/helpers.ts` + `helpers.initial-snapshot.test.ts` (2 файла).

2. [TODO] Git Commit: `fix(ui): lock all workflow sessions immediately on open` (hash: TBD)

---

### Stream 2: Таргетная сборка + Release

1. [TODO] `npm run build:webview` + `npm run typecheck:webview`.
   Устранить ошибки сборки.

2. [TODO] Git Commit: `chore(build): verify webview after workflow session lock fix` (hash: TBD)

3. [TODO] `./scripts/build-all.sh` — полный релизный build.
   Переложить tarballs в `doc/tmp/releases/`.
   Создать `doc/Sessions/Session079.md`.

4. [TODO] Git Commit: `feat(release): vX.X.XXX - lock workflow sessions immediately` (hash: TBD)

