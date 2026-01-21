# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- TODO Plan состоит из Phase (Фаз). В каждой Phase несколько Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work
1. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
2. `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`
3. `doc/Project_Docs/SessionContinuity/SessionContinuity_Architecture.md`
4. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
5. `doc/Sessions/Session027.md`
6. `doc/TODO/Archive/todo-plan-phase63-2026-01-21.md` (архив предыдущего плана)
7. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 64 — Project Manager: Resume Session = Focus + History (owner: Oleksandr, updated: 2026-01-21)

### Stream: Design — UX контракт “Resume без дублей”
1. [DONE] Docs: зафиксировать контракт клика по `Session` в дереве: (а) если сессия с тем же `providerId + providerSessionId` уже существует в списке — НЕ создавать новую, а фокус/активация; (б) если не существует — создать/resume и сразу подгрузить историю из JSONL (unified-session). Дополнительно: “закрыть сессию” в UI = скрыть локально (не удалять session record в Core) — scope: `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`; expected commit message: `docs(project-manager): define resume focus + history rules`
2. [DONE] Git Commit: `docs(project-manager): define resume focus + history rules` (hash: 1afae7f5)

### Stream: Fix — фокус на существующую сессию (не создавать новую)
1. [DONE] Fix(project-manager): клик по `Session` в дереве должен диспатчить intent “focus/resume by providerId+providerSessionId”, а не напрямую вызывать `session:create` — scope: `src/client/project-manager/components/layout/workspace-tree.tsx`; expected commit message: `fix(project-manager): request focus/resume from tree click`
2. [DONE] Git Commit: `fix(project-manager): request focus/resume from tree click` (hash: da6a9f14)

3. [DONE] Fix(project-manager): обработать intent “focus/resume”: если сессия с тем же `providerId+providerSessionId` уже есть в списке — активировать её (фокус) и показать; иначе — вызвать `session:create` и после создания активировать новую (resume) — scope: `src/client/project-manager/components/sessions/project-manager-session-view.tsx`; expected commit message: `fix(project-manager): focus existing session by providerSessionId`
4. [DONE] Git Commit: `fix(project-manager): focus existing session by providerSessionId` (hash: 5feb9a82)

### Stream: Fix — “закрыть” = скрыть (не удалять session record в Core)
1. [DONE] Fix(project-manager): кнопка close у сессии должна скрывать её локально (и не вызывать `session:delete`), чтобы повторный клик по дереву мог вернуть ТУ ЖЕ сессию с тем же `session.id` — scope: `src/client/project-manager/components/sessions/project-manager-session-view.tsx`; expected commit message: `fix(project-manager): close hides session (no delete)`
2. [DONE] Git Commit: `fix(project-manager): close hides session (no delete)` (hash: 84b94441)

### Stream: Fix — подгрузка истории для вновь созданной/resume сессии
1. [DONE] Fix(project-manager): при `session:created` обязательно подгружать историю из unified-session (JSONL), чтобы resume открывал полный диалог, а не пустое окно — scope: `src/client/project-manager/components/sessions/project-manager-session-view.tsx`, `src/client/project-manager/components/sessions/status-hydrator.ts`; expected commit message: `fix(project-manager): load history for newly created sessions`
2. [DONE] Git Commit: `fix(project-manager): load history for newly created sessions` (hash: 130ff166)

### Stream: Verification
1. [TODO] Verify(manual): клик по строке `Session · <provider>` (Reviewer) не создаёт дубль; если сессия уже есть — только фокус; если скрыта — показывается снова; если это первый resume после перезапуска — открывается с полной историей (из JSONL), не пустая — scope: no files; expected commit message: `docs: record resume focus + history verification`
2. [TODO] Git Commit: `docs: record resume focus + history verification` (hash: TBD)
