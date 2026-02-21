# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
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

## Phase TBD — <описание> (owner: <имя>, updated: 2026-02-21)

**Goal:** <кратко>

**SSOT/Design:**
- <ссылка на doc/...>

---

### Stream 1: <Короткое название>
1. [TODO] <задача 1 — scope: ≤3 файлов/пакетов; ожидаемый commit message>
2. [TODO] Git Commit: `<commit_message>` (hash: TBD)
3. [TODO] <задача 2 — scope: ≤3 файлов/пакетов; ожидаемый commit message>
4. [TODO] Git Commit: `<commit_message>` (hash: TBD)
