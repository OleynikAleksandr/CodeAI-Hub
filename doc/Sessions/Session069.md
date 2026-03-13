# Session 069 — Implementation progress: Description legacy cleanup

**Date:** 2026-03-13 13:20 (CET)
**Branch:** main
**Version:** 1.1.724

---

# 1. Work Done in This Session

## Work summary
- Запущена реальная implementation-линия cleanup-а legacy `Description` architecture на `main` поверх уже зафиксированного архитектурного SSOT.
- Полностью удалён живой PM/UI entry point старого `↻ Restart attempt` рядом с `questionnaire.md`.
- Добавлен regression guard, который не позволяет вернуть PM restart-control через скрытый import/render branch.
- `Phase 298` полностью закрыт: persisted core state, PM consumers и workflow-state boundary теперь везде опираются только на `primarySession`.
- Core-side continuity и workspace activation переведены на приоритет `primarySession`; legacy fallback на continuity уже снят.
- Persisted `description-step` snapshot схлопнут до одного source-of-truth slot `primarySession`; legacy `collectorSession/session/sessionKind` теперь читаются только как read-compat для старых state-файлов.
- PM-side workflow-state client, helpers и auto-select переведены на canonical `primarySession`; временный compat alias на core boundary удалён.
- `Phase 300` полностью закрыт: active path/schema/package/router/UI label хвосты старой description architecture вычищены до ожидаемого compat-слоя runtime/tests.
- Из core удалён неиспользуемый `/api/v1/orchestrator/idea-artifact`; active artifact persistence теперь целиком опирается на `/artifact-upsert`.
- PM больше не показывает пользователю label `description.md`: tree, auto-select и main-area везде используют canonical `Final_Description.md`, даже если открыт compat `draftPath`.
- `Phase 301` полностью закрыт: живые SSOT-документы синхронизированы с фактической single-agent Description architecture и больше не описывают `↻ Restart attempt` как поддерживаемую product-функцию.
- `Phase 302` полностью закрыт: cleanup invariants закреплены source/unit guards, таргетные tests/build/typecheck прошли, дерево снова готово к релизной фазе.
- `Phase 303` доведён до нового release build checkpoint: подготовлены release-facing docs, устранены два release-blocker'а, собран unified `v1.1.724` и выпущен новый VSIX `codeai-hub-1.1.724.vsix`.

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

### Phase 298 — DONE

#### Stream 0 — DONE
- `packages/core/src/workflow/description/description-step-types.ts`
  - `DescriptionStepSnapshot` и `DescriptionStepUpdate` очищены от active `collectorSession` / `session` / `sessionKind`.
- `packages/core/src/workflow/description/description-step-store.ts`
  - parse/read/upsert сведены к canonical `primarySession`.
  - Legacy state-файлы с `collectorSession`/`session` всё ещё читаются, но только как import-compat.
  - Persisted `description-step.json` больше не пишет legacy session slots.
- `packages/core/src/workflow/description/description-step-store.test.ts`
  - Добавлены guards, что store складывает legacy read в `primarySession` и не пишет старые поля.

#### Stream 1 — DONE
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

#### Stream 3 — DONE
- `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`
  - Показ `questionnaire.md` и наличие Description session больше не зависят от `branch.session/sessionKind`.
- `src/client/project-manager/components/layout/workspace-tree-auto-select.ts`
  - Resume Description dialog и auto-select читают только `branch.primarySession`.
- `src/client/project-manager/services/workflow-state-helpers.ts`
  - Пустое workflow-state теперь определяется через canonical `primarySession`.

#### Stream 4 — DONE
- `src/client/project-manager/services/workflow-state-client.ts`
  - Удалены legacy `description.session` / `collectorSession` / `sessionKind` из PM boundary shape.
- `src/client/project-manager/services/workflow-provider-resolver.ts`
  - Provider choice больше не имеет fallback на старые description state aliases.
- `src/client/project-manager/components/layout/use-main-area-workflow-state.test.ts`
  - Guard переписан на инвариант `primarySession`.

#### Stream 5 — DONE
- `packages/core/src/workflow/description/description-step-types.ts`
  - `DescriptionBranchSnapshot` очищен от временного alias `session/sessionKind`.
- `packages/core/src/workflow/description/description-step-store.ts`
  - `buildDescriptionBranchSnapshot(...)` отдаёт только canonical `primarySession`.
- `packages/core/src/remote-bridge/handlers/workspace-activate-service.test.ts`
  - Guard обновлён на resume через `primarySession`.

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

### Phase 300 — DONE

#### Stream 0 — DONE
- `packages/core/src/remote-bridge/handlers/workspace-file-service.ts`
  - Удалён legacy mirroring `questionnaire.md` из `description/runs/*` и `description/idea/*`.
- `src/client/ui/src/services/idea-questionnaire-paths.ts`
  - Canonical resolution анкеты сведён к `.codeai-hub/<workspace>/description/questionnaire.md`.
- `src/client/ui/src/services/idea-questionnaire-paths.test.ts`
  - Добавлен guard на canonical questionnaire-path contract и отсутствие legacy mirroring helpers.

#### Stream 1 — DONE
- `src/client/ui/src/app-host/idea-kickoff-prompt.ts`
  - Save-path copy переведён на `Final_Description.md`.
- `src/client/ui/src/app-host/session-region-idea-paths.ts`
  - UI output paths больше не строят legacy `description.md` / `runs/*`.
- `src/client/ui/src/services/idea-collector-contract.ts`
  - Fallback output contract переведён на canonical Description/Virtual Simulation paths.

#### Stream 2 — DONE
- `packages/agents/idea-collector/src/paths/artifact-paths.ts`
  - Run-scoped legacy output schema удалена; helper возвращает только canonical paths.
- `packages/agents/idea-collector/assets/idea-template.md`
  - Artifact path section синхронизирован с `Final_Description.md` и `virtual-simulation.md`.

#### Stream 3 — DONE
- `src/client/ui/src/services/idea-collector-fallback-schema.ts`
  - Fallback schema переведена на `workspace.description` / `workspace.virtual_simulation`.
- `src/client/ui/src/services/idea-collector-service.ts`
  - Fallback slot hints больше не возвращают `cluster.idea.*`.
- `src/client/ui/src/services/idea-collector-schema-utils.ts`
  - Default template description переведён на `Final_Description.md`.

#### Stream 4 — DONE
- `src/client/ui/src/services/idea-collector-artifact.ts`
  - Legacy structured-output parser теперь маппит fallback artifacts в canonical `workspace.*` slots.
- `packages/core/src/remote-bridge/handlers/http-api-router.ts`
  - Bridge labels и validation cases выровнены под `Final_Description.md`.

#### Stream 5 — DONE
- `packages/agents/idea-collector/assets/idea-collector-prompt.md`
  - Legacy bundled prompt больше не описывает `idea.md` и `cluster.idea.*` как активный финальный контракт.
- `packages/agents/idea-collector/assets/idea-collector-schema.json`
  - Schema enum и assessment wording синхронизированы с `Final_Description.md` и `workspace.*`.

#### Stream 6 — DONE
- `packages/core/src/remote-bridge/handlers/http-api-router.ts`
  - Полностью удалён obsolete `/api/v1/orchestrator/idea-artifact` endpoint вместе с patch/path machinery старой description-era модели.
- `src/client/ui/src/services/idea-collector-service.ts`
  - Virtual Simulation notice больше не просит приложить `description.md`.

#### Stream 7 — DONE
- `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`
  - Description artifact label в tree всегда canonical `Final_Description.md`.
- `src/client/project-manager/components/layout/workspace-tree-auto-select.ts`
  - Auto-select больше не реэкспортирует legacy label `description.md`.

#### Stream 8 — DONE
- `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`
  - Auto-open Description document всегда отдаёт canonical label `Final_Description.md`.
- `src/client/project-manager/components/layout/main-area.tsx`
  - Main-area selection sync больше не рассматривает `description.md` как живой UI label.

### Phase 301 — DONE

#### Stream 0 — DONE
- `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md`
  - Legacy filename сохранён, но restart/recovery semantics убраны из live contract.
- `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
  - UI/product invariants уточнены: `description.md` не product-visible label, manual restart не поддерживается, compat draft остаётся только non-SSOT fallback.
- `doc/SolidWorks-WorkFlow/Contracts/Description_LegacyCleanup_Architecture.md`
  - Добавлен status checkpoint после закрытия code phases и явно описан допустимый внутренний compat-layer для `description/description.md`.

#### Stream 1 — DONE
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - Workflow boundary Description больше не использует формулировки recovery UX и product-visible legacy contract.
- `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
  - Step overview теперь явно отделяет internal compat `description.md` от active SSOT и фиксирует отсутствие ручного restart flow.
- `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `Description_LegacyCleanup_Architecture.md` поднят в active contracts; legacy redirect-docs больше не описываются как источник живой product semantics.

### Phase 302 — DONE

#### Stream 0 — DONE
- `src/client/project-manager/components/layout/workflow-artifact-viewer.description-cleanup.test.ts`
  - Guard усилен до source-level запрета на возврат `submitQuestionnaire` / `Restart attempt` wiring в PM artifact header.
- `packages/core/src/workflow/runtime/workflow-runtime.test.ts`
  - Runtime test file переписан под актуальную single-agent model: questionnaire/final writes, compat `description.md` fallback и игнорирование run-scoped drafts.
- `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`
  - Добавлен source-level guard на отсутствие legacy reset/collector semantics в Description handler path.

#### Stream 1 — DONE
- Таргетные проверки прошли зелёно:
  - `node --test --import tsx src/client/project-manager/components/layout/workflow-artifact-viewer.description-cleanup.test.ts src/client/project-manager/components/layout/use-main-area-workflow-state.test.ts packages/core/src/workflow/runtime/workflow-runtime.test.ts packages/core/src/remote-bridge/handlers/session-request-handler.test.ts packages/core/src/remote-bridge/handlers/workspace-activate-service.test.ts packages/core/src/workflow/description/description-step-store.test.ts src/client/ui/src/services/idea-questionnaire-paths.test.ts`
  - `npm run build --workspace packages/core`
  - `npm run build:webview`
  - `npm run typecheck:webview`
- В ходе validation найден и исправлен один test-only TypeScript issue в `session-request-handler.test.ts`; после правки все команды прошли.

### Phase 303 — IN_PROGRESS

#### Stream 0 — DONE
- Release-facing документы синхронизированы под новый cleanup-релиз:
  - `README.md`
  - `CHANGELOG.md`
- В ходе обязательной release-сборки всплыли два независимых блока:
  - `packages/agents/idea-collector/src/paths/index.ts`
    - Удалён stale export `IDEA_OUTPUT_ROOT`, ломавший `build-all` в `packages/agents/idea-collector`.
  - `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`
    - Исправлен test-only TypeScript guard, который валил `tsc` в `packages/core` уже после version bump.
- После фиксов прошёл полный `./scripts/build-all.sh`:
  - unified version поднята до `1.1.724`;
  - tarball-набор собран и лежит в `doc/tmp/releases/` и `~/.codeai-hub/releases/`;
  - обновлены release manifests для providers/core/UI/launcher;
  - version/manifests состояние зафиксировано commit'ом `d3bd953a chore(release): build description cleanup release`.

#### Stream 1 — IN_PROGRESS
- Финальный `./scripts/build-release.sh --use-current-version` прошёл успешно.
- Получен новый пакет:
  - `codeai-hub-1.1.724.vsix`
- Build script подтвердил ожидаемые release checkpoints:
  - `Verifying SDK exclusions`
  - `Removing dev dependencies...`
  - `✅ Package created`
- Во время package duplication check вышел advisory `3.01%` против порога `3%`, но скрипт не остановил релиз и завершил упаковку успешно.
- Пользовательский smoke-test для `1.1.724` ещё не выполнялся в рамках этой сессии; текущий отчёт фиксирует build/handoff checkpoint.

## Verification
- `node --test --import tsx src/client/project-manager/components/layout/workflow-artifact-viewer.description-cleanup.test.ts`
- `node --test --import tsx --test-name-pattern "primary description dialog session ref" packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`
- `node --test --import tsx --test-name-pattern "legacy run-scoped description drafts" packages/core/src/workflow/runtime/workflow-runtime.test.ts`
- `node --test --import tsx --test-name-pattern "primary description dialog session ref|persists primary description session ref without resetting artifacts" packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`
- `node --test --import tsx packages/core/src/workflow/description/description-step-store.test.ts`
- `node --test --import tsx src/client/ui/src/services/idea-questionnaire-paths.test.ts`
- `node --test --import tsx src/client/project-manager/components/layout/use-main-area-workflow-state.test.ts`
- `node --test --import tsx packages/core/src/remote-bridge/handlers/workspace-activate-service.test.ts`
- `npm run build --workspace packages/core`
- `npm run build:webview`
- `npm run typecheck:webview`
- `npm run build --workspace packages/agents/idea-collector -- --pretty false`
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`
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
- `15f34518 docs(session): record runtime cleanup progress`
- `92829b21 refactor(core): collapse description session slots`
- `6e741b4f docs(session): record session slot cleanup progress`
- `6f32bbcd refactor(pm): use primary session in description consumers`
- `378f35ff refactor(pm): drop legacy description state aliases`
- `a68a1812 refactor(core): drop description session compat alias`
- `800bffd5 refactor(paths): drop legacy description questionnaire fallbacks`
- `869851ad refactor(ui): remove legacy description output paths`
- `df7c652a refactor(agents): drop legacy description artifact schema`
- `7e5028c4 refactor(ui): align description fallback slots`
- `44e75f42 refactor(core): align description artifact bridge labels`
- `dd0914c9 docs(agents): align legacy idea collector assets with description contract`
- `4797aef5 refactor(core): remove legacy description artifact endpoint`
- `2cea566b refactor(pm): hide legacy description draft label`
- `bf3a3f2b refactor(pm): keep canonical description label in main area`
- `2a340990 docs(session): close phase 300 cleanup`
- `1b0ed9ea docs(description): sync cleanup contracts`
- `03b43acb docs(workflow): remove legacy description architecture references`
- `ec319096 docs(session): close phase 301 docs sync`
- `7a80cbc7 test(description): guard cleanup invariants`
- `273bae68 chore(verify): validate description cleanup targets`
- `ca6e181f docs(session): close phase 302 verification`
- `cbc16d06 docs(release): prep description cleanup release notes`
- `14824925 fix(agents): drop stale idea output root export`
- `36578265 fix(core): unblock description cleanup release build`
- `d3bd953a chore(release): build description cleanup release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `README.md`
2. `CHANGELOG.md`
3. `doc/SolidWorks-WorkFlow/Contracts/Description_LegacyCleanup_Architecture.md`
4. `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Session068.md`
7. `doc/Sessions/Session069.md` (THIS REPORT)

## Plans for next session
- Выполнить пользовательский smoke-test для `codeai-hub-1.1.724.vsix` и зафиксировать итоговый release checkpoint.
- Если smoke зелёный, закрыть оставшийся post-release пункт в `Phase 303` и решить, архивировать ли текущий plan перед открытием новой рабочей фазы.
