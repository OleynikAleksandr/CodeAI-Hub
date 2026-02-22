# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
  - `doc/BugRegistry.md`
  - `doc/Sessions/Session002.md`
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

## Phase 222 — Session UI: task execution timer (owner: Codex, updated: 2026-02-22)

**Goal:** Добавить в UI сессий счётчик времени выполнения задач агентом:
- Во время работы агента: показывать анимированный таймер рядом с lock/wait UX (чтобы было видно, что что-то происходит).
- После завершения turn: показывать накопленное время рядом с подсказкой ввода (и не скрывать его во время следующей работы агента).
- Накопление: суммировать время всех turn’ов в рамках одного workflow-агента (stage + kind) даже при смене сессий (continuity/rollover).
- Persist: счётчик не должен пропадать при перезагрузке ядра.
- Формат: только `HH:MM:SS` (без миллисекунд).

### Stream 0: Design contract
1. [TODO] Зафиксировать контракт поведения таймера (старт/стоп, ключ накопления, persist, placement) (scope: `doc/SolidWorks-WorkFlow/Contracts/SessionTaskTimer_UI.md`; expected commit: `docs(contracts): define session task timer behavior`).
2. [TODO] Git Commit: `docs(contracts): define session task timer behavior` (hash: TBD)

### Stream 1: UI implementation (flip timer + persist)
1. [TODO] Реализовать `TaskTimer` (storage: localStorage; формат `HH:MM:SS`; 3D flip digits) (scope: `src/client/ui/src/session/task-timer.tsx`, `media/session-view.css`; expected commit: `feat(ui): add persistent task timer with flip digits`).
2. [TODO] Git Commit: `feat(ui): add persistent task timer with flip digits` (hash: TBD)

3. [TODO] Встроить таймер в `InputPanel` (overlay при lock + footer при idle; таймер не скрывать) (scope: `src/client/ui/src/session/input-panel.tsx`, `src/client/ui/src/session/input-textarea.tsx`; expected commit: `feat(ui): render task timer in session input`).
4. [TODO] Git Commit: `feat(ui): render task timer in session input` (hash: TBD)

5. [TODO] Добавить стабильный ключ накопления (stage+kind+runSlug+workspace) и пробросить в `InputPanel` (scope: `src/client/ui/src/session/session-view.tsx`; expected commit: `feat(ui): accumulate task timer per workflow agent`).
6. [TODO] Git Commit: `feat(ui): accumulate task timer per workflow agent` (hash: TBD)

### Stream 2: Verification (target builds)
1. [TODO] Прогнать `npm run typecheck:webview` и `npm run build:webview` (scope: `scripts/build-webview.js`; expected commit: `chore(build): rebuild webview after task timer`).
2. [TODO] Git Commit: `chore(build): rebuild webview after task timer` (hash: TBD)
