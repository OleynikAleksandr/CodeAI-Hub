# Session 068 — Audit: full cleanup scope for legacy Description architecture

**Date:** 2026-03-13 11:36 (CET)
**Branch:** main
**Version:** 1.1.723

---

# 1. Work Done in This Session

## Work summary
- Выполнен целевой аудит legacy-механики шага `description`, которая осталась после перехода на single-agent file-first flow.
- Подтверждено, что круговая стрелка рядом с `questionnaire.md` в PM является не отдельной UI-декорацией, а входом в старый recovery-flow `↻ Restart attempt`.
- Найдены не только PM/UI-хвосты, но и глубинные compat-слои в Core/runtime/state-модели: dual-slot session refs (`primarySession` / `collectorSession` / `session`), accept-only-latest gating по `runs/<attempt>`, reset draft/final при смене collector session и legacy path fallbacks.
- Подготовлен полный список живых файлов и документов, которые формируют старую `Description`-архитектуру и должны быть очищены, если задача ставится как именно **полный cleanup**, а не только удаление кнопки.

## Detailed findings

### A. Прямая UI-точка входа: стрелка у `questionnaire.md`

1. Кнопка стрелки рендерится только в PM artifact viewer:
   - `src/client/project-manager/components/layout/workflow-artifact-viewer.tsx:5`
   - `src/client/project-manager/components/layout/workflow-artifact-viewer.tsx:17`
   - `src/client/project-manager/components/layout/workflow-artifact-viewer.tsx:71-86`
- `WorkflowArtifactViewer` импортирует `QuestionnaireRestartAttemptControl`, заводит локальный `restartError` и показывает control строго по условию `props.label === "questionnaire.md"`.
- Это означает, что убрать стрелку визуально без удаления legacy-flow можно одной строкой, но такой шаг будет неполным и оставит весь restart-механизм в коде.

2. Сам control полностью изолирован в:
   - `src/client/project-manager/components/layout/questionnaire-restart-attempt-control.tsx:1-262`
- Этот файл содержит весь UX legacy recovery:
  - arm/apply/cancel confirm popup (`:22-60`, `:168-230`);
  - кнопку `↻` (`:232-259`);
  - main restart handler (`:95-142`).

### B. Что реально делает `↻ Restart attempt`

1. Кнопка не рестартит Core и не использует отдельный restart endpoint.
- В `questionnaire-restart-attempt-control.tsx:103-121` control:
  - читает `workflow-state`,
  - пытается вычислить provider из `description.collectorSession`, затем `description.session`,
  - повторно вызывает обычный `submitQuestionnaire(...)`.

2. Повторная отправка идёт через общий submit flow:
   - `src/client/project-manager/services/idea-collector-submit-service.ts:244-297`
- `submitQuestionnaire(...)` создаёт новую description session (`:264-270`), ждёт binding (`:277-288`) и отправляет prompt (`:289`).
- Следовательно, restart attempt по сути создаёт новую обычную description session поверх старой архитектуры попыток.

3. После повторной отправки UI форсированно переоткрывает dialog view:
   - `src/client/project-manager/components/layout/questionnaire-restart-attempt-control.tsx:122-136`
   - `src/client/project-manager/components/sessions/project-manager-session-view.tsx:120-139`
- Dispatch события `pm:dialog:open` с `providerSessionId: null` был добавлен как отдельный legacy hotfix, чтобы PM выбрал latest dialog вместо старого подвисшего intent.

### C. PM/UI уже частично очищен, но не до конца

1. Session UI restart branch уже удалён и защищён тестом:
   - `src/client/ui/src/session/input-play-stop-button.description-runtime.test.ts:16-28`
- Тест подтверждает, что в runtime input больше нет:
  - `pm:description:restart-attempt`,
  - `RestartAttemptButton`,
  - `descriptionRestartAttempt`.

2. Но PM artifact header всё ещё сохраняет ту же legacy recovery-функцию:
   - `src/client/project-manager/components/layout/workflow-artifact-viewer.tsx:71-86`
   - `src/client/project-manager/components/layout/questionnaire-restart-attempt-control.tsx:95-142`

### D. Глубокий legacy в Core/runtime: попытки, draft runs, accept-only-latest

1. Runtime всё ещё распознаёт старую run-scoped draft модель:
   - `packages/core/src/workflow/runtime/workflow-runtime.ts:16-18`
   - `packages/core/src/workflow/runtime/workflow-runtime.ts:34-58`
- Здесь есть:
  - regex для `description/runs/<attempt>/description.md`,
  - `resolveCollectorAttemptId(...)`,
  - `shouldAcceptDescriptionDraftArtifact(...)`.

2. При обработке workflow watcher events runtime продолжает особым образом фильтровать draft artifacts:
   - `packages/core/src/workflow/runtime/workflow-runtime.ts:198-227`
- Логика:
  - принимает `description/description.md` и `description/runs/*/description.md`,
  - игнорирует stale draft run, если `runSlug !== current collectorAttemptId`,
  - пишет `draftPath` только для актуальной попытки.

3. На эту legacy-семантику завязан живой тест:
   - `packages/core/src/workflow/runtime/workflow-runtime.test.ts:283-368`
- Тест прямо называется `ignores stale description draft runs when collector attempt changes`.

4. Отдельный compat-след есть и в reviewer path handling:
   - `packages/core/src/workflow/runtime/workflow-runtime.test.ts:218-246`
- Reviewer prompt до сих пор умеет использовать run-scoped draft path `.codeai-hub/<workspaceSlug>/description/runs/<attempt>/description.md`.

### E. Глубокий legacy в SessionRequestHandler: reset и continuity вокруг collector session

1. При любой description session handler продолжает опираться на `collectorSession`:
   - `packages/core/src/remote-bridge/handlers/session-request-handler.ts:3752-3803`
   - `packages/core/src/remote-bridge/handlers/session-request-handler.ts:3862-3920`

2. В `resolveDescriptionDialogSessionId(...)` код берёт `snapshot.collectorSession`, а затем fallback на legacy `snapshot.session`:
   - `packages/core/src/remote-bridge/handlers/session-request-handler.ts:3773-3799`

3. В `updateDescriptionSessionRef(...)` при новой collector session вызывается `shouldResetDescriptionCollectorArtifacts(...)`:
   - `packages/core/src/remote-bridge/handlers/session-request-handler.ts:3881-3919`
- При `true` этот код обнуляет `draftPath` и `finalPath`, что выглядит как наследие логики “новая попытка = новый актуальный черновик”.

4. Сам reset-критерий сейчас очень грубый:
   - `packages/core/src/remote-bridge/handlers/session-request-handler.ts:3929-3951`
- Если snapshot отсутствует, возвращается `true`.
- Если `finalPath` отсутствует, тоже возвращается `true`.
- Это уместно для recovery/retry модели, но сомнительно для чистого single-session flow.

5. Backfill unified history тоже содержит явную description-specific legacy continuity:
   - `packages/core/src/remote-bridge/handlers/session-request-handler.ts:3805-3845`
- Код собирает provider session ids по chain и backfill’ит историю для единого dialog.
- Это не обязательно нужно удалять, но надо отдельно проверить, зависит ли current single-agent continuity от этой ветки или это хвост restart-era.

### F. Legacy session model всё ещё зашит в state/store/types

1. Типы шага `description` до сих пор содержат сразу три session slots:
   - `packages/core/src/workflow/description/description-step-types.ts:14-33`
   - `packages/core/src/workflow/description/description-step-types.ts:36-62`
- Одновременно присутствуют:
  - `primarySession`,
  - `collectorSession`,
  - `session`,
  - `sessionKind: "collector"`.
- В комментариях прямо написано, что `collectorSession` и `session` хранятся для backward compatibility.

2. Store продолжает мёрджить и переносить эти legacy slots:
   - `packages/core/src/workflow/description/description-step-store.ts:54-64`
   - `packages/core/src/workflow/description/description-step-store.ts:101-135`
   - `packages/core/src/workflow/description/description-step-store.ts:241-262`
- `resolvePrimarySessionUpdate(...)` строит `primarySession` из `collectorSession` или `session`, то есть новый state-layer пока официально не очищен.

3. Workspace activation также держит compat-ветку:
   - `packages/core/src/remote-bridge/handlers/workspace-activate-service.ts:90-121`
- При старте workspace код:
  - сначала берёт `collectorSession ?? primarySession`,
  - если их нет, fallback’ится на legacy `session`.

4. Клиент workflow-state в PM парсит и отдаёт legacy shape:
   - `src/client/project-manager/services/workflow-state-client.ts:39-53`
   - `src/client/project-manager/services/workflow-state-client.ts:172-214`
- Там до сих пор есть `collectorSession`, `session`, `sessionKind`.

5. Provider resolver тоже использует обе legacy ветки:
   - `src/client/project-manager/services/workflow-provider-resolver.ts:7-20`
- Приоритеты: `description.session.providerId`, затем `description.collectorSession.providerId`.

6. PM tree по-прежнему работает через `branch.session`, а не через единую каноническую slot-модель:
   - `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts:33-40`
   - `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts:53-64`
   - `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts:146-162`

### G. Legacy path compatibility всё ещё жива в codepaths

1. Core workspace file service поддерживает старый путь анкеты внутри run:
   - `packages/core/src/remote-bridge/handlers/workspace-file-service.ts:16`
   - `packages/core/src/remote-bridge/handlers/workspace-file-service.ts:49-63`
- Здесь есть `LEGACY_RUN_QUESTIONNAIRE_SUFFIX = "/idea/questionnaire.md"` и canonical remap в `description/questionnaire.md`.

2. UI-side questionnaire paths также сохраняют fallback для старых description paths:
   - `src/client/ui/src/services/idea-questionnaire-paths.ts:1-112`
- Поддерживаются:
  - `.codeai-hub/<workspaceSlug>/description/description.md`
  - `.codeai-hub/<workspaceSlug>/description/runs/<runSlug>/description.md`
  - `.codeai-hub/<workspaceSlug>/description/idea/idea.md`
  - `.codeai-hub/<workspaceSlug>/description/runs/<runSlug>/idea/idea.md`
- Из них выводятся canonical questionnaire path + legacy read fallbacks.

3. В UI и контрактах ещё остались прямые упоминания устаревшего description output path:
   - `src/client/ui/src/app-host/idea-kickoff-prompt.ts:16`
   - `src/client/ui/src/app-host/session-region-idea-paths.ts:19-22`
   - `src/client/ui/src/services/idea-collector-contract.ts:42-46`
- Это уже не про кнопку restart, а про старую artifact-модель `description.md` / `runs/<runSlug>/description.md`.

4. Agent assets для old idea-collector path schema тоже ещё содержат run-scoped description outputs:
   - `packages/agents/idea-collector/src/paths/artifact-paths.ts:31`
   - `packages/agents/idea-collector/src/paths/artifact-paths.ts:54`
   - `packages/agents/idea-collector/assets/idea-template.md:189-190`

### H. Живые документы ещё содержат legacy-контракт recovery/restart

1. Самый явный живой legacy contract:
   - `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md:36-44`
- Там ещё зафиксирован раздел `Recovery: ↻ Restart attempt (Description)` с описанием новой попытки и late-results gating.

2. При этом канонические SSOT документы уже говорят обратное:
   - `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md:45-53`
   - `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md:97-126`
   - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md:64-76`
   - `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md:72-81`
- То есть в живой документации уже есть расслоение:
  - новый SSOT говорит “single-agent + `Final_Description.md`”;
  - legacy filename contract всё ещё описывает `↻ Restart attempt`.

3. `doc/BugRegistry.md:264-335` сохраняет исторический след всех hotfix вокруг restart attempt.
- Этот файл лучше оставить как исторический журнал, а не пытаться “зачищать” историю.

### I. Исторический след, который полезно сохранить, но не вычищать

- Архивные session reports:
  - `doc/Sessions/Archive/Session017.md`
  - `doc/Sessions/Archive/Session019.md`
  - `doc/Sessions/Archive/Session021.md`
  - `doc/Sessions/Archive/Session023.md`
  - `doc/Sessions/Archive/Session024.md`
- Архивный план:
  - `doc/TODO/Archive/todo-plan-phase238-description-restart-attempt-2026-02-24.md`
- Исторические записи в `doc/BugRegistry.md`.

Эти файлы описывают, как legacy recovery появился и как фиксился. Для полноты истории их лучше оставить, а cleanup делать только по живому коду и активным SSOT/compat-docs.

## Cleanup scope recommendation

Если задача формулируется как **полный cleanup старой architecture вокруг Description**, то объём не должен ограничиваться удалением стрелки. Реальный объём состоит из следующих слоёв:

1. PM/UI cleanup
- Удалить `QuestionnaireRestartAttemptControl`.
- Убрать `restartError` и conditional render из `WorkflowArtifactViewer`.
- Добавить guard, что рядом с `questionnaire.md` больше не рендерится restart control.

2. Workflow state / session model cleanup
- Определить единый канонический slot для description session.
- Удалить `collectorSession` / `session` fallback-ветки там, где они нужны только legacy restart flow.
- Привести PM tree / provider resolver / workspace activation к одной модели.

3. Runtime draft-attempt cleanup
- Удалить accept-only-latest gating для `description/runs/<attempt>/description.md`, если он больше не нужен текущему single-agent flow.
- Проверить reviewer prompt path handling и все тесты, завязанные на run-scoped draft.

4. Session handler cleanup
- Перепроверить необходимость `shouldResetDescriptionCollectorArtifacts(...)`.
- Убрать reset/fallback/backfill ветки, которые были нужны именно для restart-attempt continuity.

5. Path contract cleanup
- Свести active codepaths к canonical:
  - `description/questionnaire.md`
  - `description/Final_Description.md`
- Убрать legacy fallbacks для `description/description.md`, `description/runs/*`, `description/idea/*`, если совместимость со старыми workspace больше не нужна.

6. Documentation cleanup
- Убрать `↻ Restart attempt` из живых контрактов.
- Синхронизировать active docs с фактическим single-agent SSOT.
- Исторические session reports / bug registry не переписывать.

## Risk assessment before cleanup

- Главный риск: удалить только UI-кнопку и оставить глубинную legacy-семантику, из-за чего кодовая база станет менее очевидной, но не реально чище.
- Второй риск: слишком агрессивно удалить compat-paths и сломать чтение старых workspace, если такая совместимость ещё нужна продукту.
- Третий риск: затронуть continuity/dialog history поведение `description`, не отделив полезный single-session backfill от restart-era logic.

Итог: cleanup нужно выполнять поэтапно, с явным решением пользователя по границе совместимости:
- либо “убираем только restart-flow и UI”;
- либо “полностью выбрасываем compat со старым `description.md` / `runs/*`”.

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через `git show`)
- В этой сессии коммитов не создавалось: выполнен audit и подготовлен отчёт по cleanup scope.

## Historical legacy commits to inspect before cleanup
- `0f11f66a docs(contracts): description restart attempt contract`
- `00fce612 feat(core): gate description by attemptId`
- `19629d9e feat(pm): write description draft to runs`
- `b0735af5 feat(pm): restart description attempt from questionnaire artifact`
- `835aedea feat(ui): restart attempt control for description`
- `f3d2021e feat(pm): restart description attempt from session UI`
- `94abfd82 fix(pm/ui): avoid native confirm for description restart`
- `a5b66487 fix(pm/ui): confirm restart attempt with apply/cancel`
- `3ec74197 fix(pm/ui): auto-focus description session after restart attempt`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
2. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
3. `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
4. `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md`
5. `doc/BugRegistry.md`
6. `doc/TODO/Archive/todo-plan-phase238-description-restart-attempt-2026-02-24.md`
7. `doc/Sessions/Archive/Session017.md`
8. `doc/Sessions/Archive/Session019.md`
9. `doc/Sessions/Archive/Session021.md`
10. `doc/Sessions/Archive/Session023.md`
11. `doc/Sessions/Archive/Session024.md`
12. `doc/Sessions/Archive/Session068.md` (THIS REPORT)

## Plans for next session
- Зафиксировать границу cleanup:
  - только удаление `↻ Restart attempt` и его UI/runtime wiring;
  - или полный отказ от compat-модели `description.md` / `runs/*`.
- Если идём в полный cleanup, начинать с PM/UI и state-shape, а затем переходить к runtime/path compatibility.
- До первого кода отдельно проверить, какие legacy fallbacks реально нужны для чтения старых workspace, а какие уже можно удалить без миграционного слоя.
