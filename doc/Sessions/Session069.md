# Session 069 — Implementation progress: Description legacy cleanup

**Date:** 2026-03-13 12:29 (CET)
**Branch:** main
**Version:** 1.1.723

---

# 1. Work Done in This Session

## Work summary
- Запущена реальная implementation-линия cleanup-а legacy `Description` architecture на `main` поверх уже зафиксированного архитектурного SSOT.
- Полностью удалён живой PM/UI entry point старого `↻ Restart attempt` рядом с `questionnaire.md`.
- Добавлен regression guard, который не позволяет вернуть PM restart-control через скрытый import/render branch.
- PM-side workflow state и routing переведены на канонический `primarySession`.
- Core-side continuity и workspace activation переведены на приоритет `primarySession`; legacy fallback пока ещё жив, но перестал быть основным источником для description dialog identity.

## Phase progress

### Phase 296 — DONE
- Заархивирован старый response-mode execution plan.
- Создан новый архитектурный контракт cleanup-а:
  - `doc/SolidWorks-WorkFlow/Contracts/Description_LegacyCleanup_Architecture.md`
- Развёрнут новый `doc/TODO/todo-plan.md` под cleanup `Description`.

### Phase 297 — DONE
- Удалён PM artifact-header legacy restart wiring:
  - `src/client/project-manager/components/layout/workflow-artifact-viewer.tsx`
  - `src/client/project-manager/components/layout/questionnaire-restart-attempt-control.tsx` (удалён)
- Добавлен guard:
  - `src/client/project-manager/components/layout/workflow-artifact-viewer.description-cleanup.test.ts`
- Результат: круговая стрелка `↻` у `questionnaire.md` больше не рендерится, живой PM restart-flow через артефакт отсутствует.

### Phase 298 — IN_PROGRESS

#### Stream 1 — partial DONE
- Core continuity/activation теперь предпочитает `primarySession`:
  - `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
  - `packages/core/src/remote-bridge/handlers/workspace-activate-service.ts`
- Тест обновлён на приоритет `primarySession`:
  - `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`
- Позже fallback на `collectorSession/session` полностью удалён; continuity shape теперь реально использует только `primarySession`.

#### Stream 2 — DONE
- PM client parse shape расширен `primarySession` и использует его как канонический session slot:
  - `src/client/project-manager/services/workflow-state-client.ts`
  - `src/client/project-manager/services/workflow-provider-resolver.ts`
  - `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`

#### Stream 0 — TODO
- Core `description-step` types/store ещё не очищены от `collectorSession` / `session` / `sessionKind`.

### Phase 299 — DONE

#### Stream 0 — DONE
- Из `workflow-runtime.ts` удалены:
  - `DESCRIPTION_DRAFT_RUN_SLUG_RE`
  - `parseDescriptionDraftRunSlug(...)`
  - `resolveCollectorAttemptId(...)`
  - `shouldAcceptDescriptionDraftArtifact(...)`
- Watcher больше не принимает `description/runs/<attempt>/description.md` как нормальный draft path; run-scoped draft writes игнорируются.
- Тест обновлён на новую инвариантную модель:
  - `WorkflowRuntime ignores legacy run-scoped description drafts`

#### Stream 1 — DONE
- Из `session-request-handler.ts` удалена reset-механика `shouldResetDescriptionCollectorArtifacts(...)`.
- Persist `primarySession` больше не обнуляет `draftPath/finalPath` как следствие мнимой “новой попытки”.
- Добавлен guard:
  - `SessionRequestHandler persists primary description session ref without resetting artifacts`

## Verification
- `node --test --import tsx src/client/project-manager/components/layout/workflow-artifact-viewer.description-cleanup.test.ts`
- `node --test --import tsx --test-name-pattern "primary description dialog session ref" packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`
- `node --test --import tsx --test-name-pattern "legacy run-scoped description drafts" packages/core/src/workflow/runtime/workflow-runtime.test.ts`
- `node --test --import tsx --test-name-pattern "primary description dialog session ref|persists primary description session ref without resetting artifacts" packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`
- Все git commits проходили через штатные Husky hooks:
  - `npm test`
  - `./scripts/check-architecture.sh`
  - `npm run lint`
  - `npm run check:tsprune`

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через `git show`)
- `658ee83e docs(description): register legacy cleanup plan`
- `638d1759 fix(pm): remove questionnaire restart attempt control`
- `53942478 test(pm): guard questionnaire header cleanup`
- `de680416 refactor(pm): prefer primary session in description tree`
- `72eee7fc refactor(pm): align description workflow state with primary session`
- `16dbeb22 refactor(core): prefer primary session for description continuity`
- `90571673 docs(session): record description cleanup progress`
- `8cd39e19 refactor(core): use canonical description session slot`
- `cb3f0d91 refactor(core): drop description attempt gating`
- `3bf1abeb refactor(core): remove description attempt reset logic`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/Contracts/Description_LegacyCleanup_Architecture.md`
2. `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session068.md`
5. `doc/Sessions/Session069.md` (THIS REPORT)

## Plans for next session
- Закрыть `Phase 298 / Stream 0`: убрать legacy session slots из `description-step` types/store/tests.
- После этого вычистить path contracts из `Phase 300`.
- Затем синхронизировать docs/guards и дойти до release build из `Phase 303`.
