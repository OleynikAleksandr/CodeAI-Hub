# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзазача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates**: после выполнения каждой подзадачи прогоняется Гейт Качества -
`scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем выполняем таргетную сборку (`npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`).
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- Stream завершается после того, как все его задачи закрыты таргетными сборками затронутых пакетов/клиентов и коммитами. Для серийных задач допускается диагностический прогон `npm run build --workspace <package>` по цепочке (например, Claude → Codex → core), чтобы локализовать ошибки без запуска `build-all`.
- **Real-time Документация**:
Любое изменение архитектуры/логики требует синхронного обновления и todo-plan.md и документации (`doc/Architecture/Architecture.md` и др.) **ДО** коммита - чтоб измененные документы также попали в Git Commit.
- Phase завершается на чистом дереве:
запускаем `./scripts/build-all.sh` (он повышает версии и вызывает `./scripts/build-release.sh --use-current-version`), переносим tarball’ы в `doc/tmp/releases/`, фиксируем результаты в `doc/Sessions/`.
- **doc/TODO/todo-plan.md** необходимо постоянно в риалтайме обновлять, после каждой подзадачи обязательный коммит, после каждого коммита его номер и наименование заносить, статус задачи тут же менять.

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session086.md`

## Phase 16 — Run-bound resume + release 1.1.403 (owner: Oleksandr, updated: 2026-01-11)
### Stream: Provider session binding for existing runs
1. [DONE] Привязать RUNS к provider sessions (providerId/providerSessionId + resume) — scope: `packages/core`, `packages/initiatives`, `packages/*_Module`, `src/client/ui`; ожидаемый commit message: `feat(resume): bind runs to provider sessions`
2. [DONE] Git Commit: `feat(resume): bind runs to provider sessions` (hash: 5ecc02ae)
3. [DONE] Обновить fallback webview bundle под изменения UI — scope: `media/react-chat.js`; ожидаемый commit message: `chore(ui): refresh webview fallback bundle`
4. [DONE] Git Commit: `chore(ui): refresh webview fallback bundle` (hash: 8693f508)
5. [DONE] Собрать артефакты и поднять версию до 1.1.403 (build-all) — scope: manifests + package.json; ожидаемый commit message: `chore(release): bump 1.1.403`
6. [DONE] Git Commit: `chore(release): bump 1.1.403` (hash: a6f43bf3)
7. [DONE] Обновить релизные документы (README/CHANGELOG/Architecture/SystemArchitecture/Project docs) — scope: `README.md`, `CHANGELOG.md`, `doc/**`; ожидаемый commit message: `docs: update 1.1.403 release notes`
8. [DONE] Git Commit: `docs: update 1.1.403 release notes` (hash: 955af64d)
9. [DONE] Синхронизировать архитектурные документы под 1.1.403 — scope: `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; ожидаемый commit message: `docs: update architecture for 1.1.403`
10. [DONE] Git Commit: `docs: update architecture for 1.1.403` (hash: d8c657b4)
11. [DONE] Уточнить описание Runs-архитектуры (provider binding) — scope: `doc/SolidWorks-Flow/System/Initiative_Description_Runs_Architecture.md`; ожидаемый commit message: `docs: record run provider session binding`
12. [DONE] Git Commit: `docs: record run provider session binding` (hash: 9c92e00f)
13. [DONE] Собрать VSIX (build-release) — scope: `scripts/build-release.sh`; ожидаемый commit message: `docs: add session 87 report`
14. [DONE] Git Commit: `docs: add session 87 report` (hash: f1c9b7db)

## Phase 17 — Release 1.1.404 (owner: Oleksandr, updated: 2026-01-11)
### Stream: 1.1.404 release
1. [DONE] Build artifacts and bump version to 1.1.404 (build-all) — scope: manifests + package.json; expected commit message: `chore(release): bump 1.1.404`
2. [DONE] Git Commit: `chore(release): bump 1.1.404` (hash: 6f0634fc)
3. [DONE] Update release notes (README + CHANGELOG + todo-plan) — scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: update 1.1.404 release notes`
4. [DONE] Git Commit: `docs: update 1.1.404 release notes` (hash: f05db65a)
5. [DONE] Update architecture docs for 1.1.404 — scope: `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs: update architecture for 1.1.404`
6. [DONE] Git Commit: `docs: update architecture for 1.1.404` (hash: 060a28f9)
7. [DONE] Build VSIX (build-release) — scope: `scripts/build-release.sh`; expected commit message: `docs: add session 89 report`
8. [DONE] Git Commit: `docs: add session 89 report` (hash: 76eecd0a)

## Phase 18 — Preserve Codex home + release 1.1.405 (owner: Oleksandr, updated: 2026-01-11)
### Stream: Preserve Codex home on release build
1. [DONE] Preserve Codex CLI home during build cleanup + document rule — scope: `scripts/build-all.sh`, `scripts/build-codex-module.sh`, `.codeai-hub/WORKFLOW_ARCHITECTURE.md`; expected commit message: `fix(build): preserve codex home`
2. [DONE] Git Commit: `fix(build): preserve codex home` (hash: 85f6addd)
3. [DONE] Build artifacts and bump version to 1.1.405 (build-all) — scope: manifests + package.json; expected commit message: `chore(release): bump 1.1.405`
4. [DONE] Git Commit: `chore(release): bump 1.1.405` (hash: 5d2c1346)
5. [DONE] Update release notes (README + CHANGELOG + todo-plan) — scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: update 1.1.405 release notes`
6. [DONE] Git Commit: `docs: update 1.1.405 release notes` (hash: f5f2142e)
7. [DONE] Update architecture docs for 1.1.405 — scope: `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs: update architecture for 1.1.405`
8. [DONE] Git Commit: `docs: update architecture for 1.1.405` (hash: db28f6c5)
9. [DONE] Build VSIX (build-release) — scope: `scripts/build-release.sh`; expected commit message: `docs: add session 90 report`
10. [DONE] Git Commit: `docs: add session 90 report` (hash: 1dd1bc52)

## Phase 19 — Questionnaire resume fix + release 1.1.406 (owner: Oleksandr, updated: 2026-01-12)
### Stream: Questionnaire resume fix + 1.1.406 release
1. [DONE] Fix Idea questionnaire resume (reload from disk; avoid stale template cache; soften `<...>` placeholder heuristic) — scope: `src/client/ui/src/app-host/idea-questionnaire-panel.tsx`, `src/client/ui/src/services/idea-collector-service.ts`, `src/client/ui/src/services/idea-questionnaire-template.ts`; expected commit message: `fix(ui): preserve questionnaire answers on resume`
2. [DONE] Git Commit: `fix(ui): preserve questionnaire answers on resume` (hash: 641b5263)
3. [DONE] Adjust bundled questionnaire template hints (move guidance out of answer fields) — scope: `packages/agents/idea-collector/assets/questionnaire-template.md`; expected commit message: `fix(idea): adjust questionnaire template hints`
4. [DONE] Git Commit: `fix(idea): adjust questionnaire template hints` (hash: 6c290850)
5. [DONE] Refresh fallback webview bundle — scope: `media/react-chat.js`; expected commit message: `chore(ui): refresh webview fallback bundle`
6. [DONE] Git Commit: `chore(ui): refresh webview fallback bundle` (hash: bd8fcca6)
7. [DONE] Build artifacts and bump version to 1.1.406 (build-all) — scope: manifests + package.json; expected commit message: `chore(release): bump 1.1.406`
8. [DONE] Git Commit: `chore(release): bump 1.1.406` (hash: 3d714331)
9. [DONE] Update release notes (README/CHANGELOG/Architecture/SystemArchitecture) — scope: `README.md`, `CHANGELOG.md`, `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs: update 1.1.406 release notes`
10. [DONE] Git Commit: `docs: update 1.1.406 release notes` (hash: f3a9ae0b)
11. [DONE] Build VSIX (build-release) — scope: `scripts/build-release.sh`; expected commit message: `docs: add session 91 report`
12. [DONE] Git Commit: `docs: add session 91 report` (hash: dee13aeb)

## Phase 20 — Questionnaire hints UX + disk load reliability + release 1.1.407 (owner: Oleksandr, updated: 2026-01-12)
### Stream: Questionnaire reliability + 1.1.407 release
1. [DONE] Move questionnaire hints into headings (no placeholders inside answer fields) — scope: `packages/agents/idea-collector/assets/questionnaire-template.md`; expected commit message: `fix(idea): move questionnaire hints into headings`
2. [DONE] Git Commit: `fix(idea): move questionnaire hints into headings` (hash: 5ef5ce8e)
3. [DONE] Render heading hints in UI + relax answer heuristics — scope: `src/client/ui/src/services/idea-questionnaire-template.ts`, `src/client/ui/src/components/idea-questionnaire/question-block.tsx`, `src/client/ui/src/components/idea-questionnaire/styles.ts`; expected commit message: `fix(ui): render questionnaire hints in headings`
4. [DONE] Git Commit: `fix(ui): render questionnaire hints in headings` (hash: 75272194)
5. [DONE] Reload questionnaire answers from disk (remove contract cache; avoid overwriting existing file; increase read limit) — scope: `src/client/ui/src/services/idea-collector-service.ts`, `src/client/ui/src/services/idea-questionnaire-service.ts`, `src/client/ui/src/services/workspace-file-service.ts`; expected commit message: `fix(ui): reload questionnaire content from disk`
6. [DONE] Git Commit: `fix(ui): reload questionnaire content from disk` (hash: daf2f155)
7. [DONE] Refresh fallback webview bundle — scope: `media/react-chat.js`; expected commit message: `chore(ui): refresh webview fallback bundle`
8. [DONE] Git Commit: `chore(ui): refresh webview fallback bundle` (hash: f7a0fed7)
9. [DONE] Build artifacts and bump version to 1.1.407 (build-all) — scope: manifests + package.json; expected commit message: `chore(release): bump 1.1.407`
10. [DONE] Git Commit: `chore(release): bump 1.1.407` (hash: 705c1452)
11. [DONE] Update release notes (README/CHANGELOG) — scope: `README.md`, `CHANGELOG.md`; expected commit message: `docs: update 1.1.407 release notes`
12. [DONE] Git Commit: `docs: update 1.1.407 release notes` (hash: d4842eee)
13. [DONE] Update architecture docs for 1.1.407 — scope: `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs: update architecture for 1.1.407`
14. [DONE] Git Commit: `docs: update architecture for 1.1.407` (hash: 8cf7a60d)
15. [DONE] Build VSIX (build-release) — scope: `scripts/build-release.sh`; expected commit message: `docs: add session 92 report`
16. [DONE] Git Commit: `docs: add session 92 report` (hash: da21792f)

## Phase 21 — Questionnaire placeholder hotfix + release 1.1.408 (owner: Oleksandr, updated: 2026-01-12)
### Stream: 1.1.408 hotfix release
1. [DONE] Keep non-hint placeholder answers in UI — scope: `src/client/ui/src/services/idea-questionnaire-template.ts`; expected commit message: `fix(ui): keep non-hint placeholder answers`
2. [DONE] Git Commit: `fix(ui): keep non-hint placeholder answers` (hash: d6eb09b4)
3. [DONE] Bundle updated questionnaire template in Core — scope: `packages/core/src/templates/bundled-templates.ts`; expected commit message: `fix(core): bundle updated questionnaire template`
4. [DONE] Git Commit: `fix(core): bundle updated questionnaire template` (hash: b419aee5)
5. [DONE] Refresh fallback webview bundle — scope: `media/react-chat.js`; expected commit message: `chore(ui): refresh webview fallback bundle`
6. [DONE] Git Commit: `chore(ui): refresh webview fallback bundle` (hash: a38fc65d)
7. [DONE] Build artifacts and bump version to 1.1.408 (build-all) — scope: manifests + package.json; expected commit message: `chore(release): bump 1.1.408`
8. [DONE] Git Commit: `chore(release): bump 1.1.408` (hash: 3753e4ab)
9. [DONE] Update release notes (README/CHANGELOG) — scope: `README.md`, `CHANGELOG.md`; expected commit message: `docs: update 1.1.408 release notes`
10. [DONE] Git Commit: `docs: update 1.1.408 release notes` (hash: a6034f0b)
11. [DONE] Update architecture docs for 1.1.408 — scope: `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs: update architecture for 1.1.408`
12. [DONE] Git Commit: `docs: update architecture for 1.1.408` (hash: 47823009)
13. [DONE] Build VSIX (build-release) — scope: `scripts/build-release.sh`; expected commit message: `docs: add session 93 report`
14. [DONE] Git Commit: `docs: add session 93 report` (hash: d1ecbbc7)
15. [DONE] Update Session093 report (final commit list + next session focus) — scope: `doc/Sessions/Session093.md`; expected commit message: `docs: update session 93 report`
16. [DONE] Git Commit: `docs: update session 93 report` (hash: d01e2ff8)

## Phase 22 — Idea artifacts persistence fix + release 1.1.409 (owner: Oleksandr, updated: 2026-01-12)
### Stream: 1.1.409 hotfix release
1. [DONE] Persist Idea artifacts using run-aware paths (ignore agent paths) — scope: `src/client/ui/src/services/idea-collector-service.ts`, `src/client/ui/src/services/idea-artifact-persistence.ts`; expected commit message: `fix(ui): persist idea artifacts to run paths`
2. [DONE] Git Commit: `fix(ui): persist idea artifacts to run paths` (hash: 00d9c3ca)
3. [DONE] Refresh fallback webview bundle — scope: `media/react-chat.js`; expected commit message: `chore(ui): refresh webview fallback bundle`
4. [DONE] Git Commit: `chore(ui): refresh webview fallback bundle` (hash: aab6fd9a)
5. [DONE] Build artifacts and bump version to 1.1.409 (build-all) — scope: manifests + package.json; expected commit message: `chore(release): bump 1.1.409`
6. [DONE] Git Commit: `chore(release): bump 1.1.409` (hash: 0c50386f)
7. [DONE] Update release notes (README/CHANGELOG) — scope: `README.md`, `CHANGELOG.md`; expected commit message: `docs: update 1.1.409 release notes`
8. [DONE] Git Commit: `docs: update 1.1.409 release notes` (hash: 3e095e19)
9. [DONE] Update architecture docs for 1.1.409 — scope: `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs: update architecture for 1.1.409`
10. [DONE] Git Commit: `docs: update architecture for 1.1.409` (hash: f7756b6b)
11. [DONE] Build VSIX (build-release) — scope: `scripts/build-release.sh`; expected commit message: `docs: add session 94 report`
12. [DONE] Git Commit: `docs: add session 94 report` (hash: 323b40ea)

## Phase 23 — Idea refine existing run questionnaire fix + release 1.1.410 (owner: Oleksandr, updated: 2026-01-12)
### Stream: 1.1.410 hotfix release
1. [DONE] Open questionnaire for Idea refine existing runs — scope: `src/client/ui/src/app-host.tsx`, `src/client/ui/src/app-host/idea-questionnaire-panel.tsx`; expected commit message: `fix(ui): open questionnaire for refine runs`
2. [DONE] Git Commit: `fix(ui): open questionnaire for refine runs` (hash: e5b687fa)
3. [DONE] Refresh fallback webview bundle — scope: `media/react-chat.js`; expected commit message: `chore(ui): refresh webview fallback bundle`
4. [DONE] Git Commit: `chore(ui): refresh webview fallback bundle` (hash: c098d57e)
5. [DONE] Build artifacts and bump version to 1.1.410 (build-all) — scope: manifests + package.json; expected commit message: `chore(release): bump 1.1.410`
6. [DONE] Git Commit: `chore(release): bump 1.1.410` (hash: 6dad1c38)
7. [DONE] Update release notes (README/CHANGELOG/Architecture/SystemArchitecture) — scope: `README.md`, `CHANGELOG.md`, `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs: update 1.1.410 release notes`
8. [DONE] Git Commit: `docs: update 1.1.410 release notes` (hash: c0d3d68f)
9. [DONE] Build VSIX (build-release) — scope: `scripts/build-release.sh`; expected commit message: `docs: add session 95 report`
10. [DONE] Git Commit: `docs: add session 95 report` (hash: 1a477e9a)

## Phase 24 — Refine existing provider guard + questionnaire mirror (owner: Oleksandr, updated: 2026-01-12)
### Stream: Idea refine existing hardening
1. [DONE] Fail-fast on provider mismatch for refine existing run — scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `fix(core): fail-fast on refine provider mismatch`
2. [DONE] Git Commit: `fix(core): fail-fast on refine provider mismatch` (hash: 31ae4865)
3. [DONE] Mirror run questionnaire to initiative copy on each save/append — scope: `packages/core/src/remote-bridge/handlers/workspace-file-service.ts`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `fix(core): mirror run questionnaire to initiative copy`
4. [DONE] Git Commit: `fix(core): mirror run questionnaire to initiative copy` (hash: b41126ea)
5. [DONE] Add session 96 report — scope: `doc/Sessions/Session096.md`; expected commit message: `docs: add session 96 report`
6. [DONE] Git Commit: `docs: add session 96 report` (hash: 8db7a1e3)

## Phase 25 — Idea questionnaire: Agent Q/A persistence (owner: Oleksandr, updated: 2026-01-12)
### Stream: Agent clarifications persistence
1. [DONE] Add template section for agent Q/A (`system.agent_qna`) — scope: `packages/agents/idea-collector/assets/questionnaire-template.md`, `packages/core/src/templates/bundled-templates.ts`; expected commit message: `fix(templates): add agent Q/A section to questionnaire`
2. [DONE] Git Commit: `fix(templates): add agent Q/A section to questionnaire` (hash: 41c36077)
3. [DONE] Persist agent Q/A in questionnaire field + migrate legacy clarifications — scope: `src/client/ui/src/services/idea-questionnaire-service.ts`, `src/client/ui/src/services/idea-questionnaire-template.ts`, `src/client/ui/src/services/idea-questionnaire-agent-qna.ts`; expected commit message: `fix(ui): persist agent Q/A in questionnaire`
4. [DONE] Git Commit: `fix(ui): persist agent Q/A in questionnaire` (hash: df1690de)
5. [DONE] Add session 97 report — scope: `doc/Sessions/Session097.md`; expected commit message: `docs: add session 97 report`
6. [DONE] Git Commit: `docs: add session 97 report` (hash: 2665917d)

## Phase 26 — Safe idea artifact revisions (owner: Oleksandr, updated: 2026-01-12)
### Stream: Revise artifacts flow
1. [DONE] Contract: добавить `revise_artifacts` и `artifact.patch` — scope: `packages/agents/idea-collector/assets/idea-collector-schema.json`, `src/client/ui/src/services/idea-collector-fallback-schema.ts`, `doc/SolidWorks-Flow/System/IdeaCollector_Slim_Structured_Output.md`; ожидаемый commit message: `feat(idea): add revise_artifacts to structured output contract`
2. [DONE] Git Commit: `feat(idea): add revise_artifacts to structured output contract` (hash: 1cd18df8)
3. [DONE] Prompt: добавить строгие правила ревизии — scope: `packages/agents/idea-collector/assets/idea-collector-prompt.md`, `src/client/ui/src/app-host/idea-kickoff-prompt.ts`; ожидаемый commit message: `docs(idea): clarify artifact revision rules`
4. [DONE] Git Commit: `docs(idea): clarify artifact revision rules` (hash: a1532f64)
5. [DONE] UI: сохранять артефакты на `revise_artifacts` + поддержка patch/full markdown — scope: `src/client/ui/src/services/idea-collector-artifact.ts`, `src/client/ui/src/services/idea-collector-service.ts`, `src/client/ui/src/services/idea-artifact-persistence.ts`; ожидаемый commit message: `feat(ui): persist idea artifacts on revise_artifacts`
6. [DONE] Git Commit: `feat(ui): persist idea artifacts on revise_artifacts` (hash: 7733d850)
7. [DONE] Core: backup + валидация + patch apply — scope: `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; ожидаемый commit message: `feat(core): safe idea artifact overwrite (backup+validation)`
8. [DONE] Git Commit: `feat(core): safe idea artifact overwrite (backup+validation)` (hash: 587fb6d9)
9. [DONE] Обновить fallback webview bundle — scope: `media/react-chat.js`; ожидаемый commit message: `chore(ui): refresh webview fallback bundle`
10. [DONE] Git Commit: `chore(ui): refresh webview fallback bundle` (hash: b139b060)
11. [DONE] Gates + targeted builds для затронутых пакетов — scope: scripts/commands; ожидаемый commit message: `docs: update todo plan status`
12. [DONE] Git Commit: `docs: update todo plan status` (hash: 69fa2185)

## Phase 27 — Release 1.1.412 (owner: Oleksandr, updated: 2026-01-12)
### Stream: 1.1.412 release
1. [DONE] Build artifacts and bump version to 1.1.412 (build-all) — scope: manifests + package.json; expected commit message: `chore(release): bump 1.1.412`
2. [DONE] Git Commit: `chore(release): bump 1.1.412` (hash: c15b035c)
3. [DONE] Update release notes (README/CHANGELOG/Architecture/SystemArchitecture) — scope: `README.md`, `CHANGELOG.md`, `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs: update 1.1.412 release notes`
4. [DONE] Git Commit: `docs: update 1.1.412 release notes` (hash: e0ee7c86)
5. [DONE] Build VSIX (build-release) — scope: `scripts/build-release.sh`; expected commit message: `docs: add session 100 report`
6. [DONE] Git Commit: `docs: add session 100 report` (hash: aa4571db)
