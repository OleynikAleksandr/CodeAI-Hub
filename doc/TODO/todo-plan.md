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
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
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
9. [DONE] Синхронизировать архитектурные документы под 1.1.403 — scope: `doc/Architecture/Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; ожидаемый commit message: `docs: update architecture for 1.1.403`
10. [DONE] Git Commit: `docs: update architecture for 1.1.403` (hash: d8c657b4)
11. [DONE] Уточнить описание Runs-архитектуры (provider binding) — scope: `doc/Project_Docs/Initiative_Description_Runs_Architecture.md`; ожидаемый commit message: `docs: record run provider session binding`
12. [DONE] Git Commit: `docs: record run provider session binding` (hash: 9c92e00f)
13. [DONE] Собрать VSIX (build-release) — scope: `scripts/build-release.sh`; ожидаемый commit message: `docs: add session 87 report`
14. [DONE] Git Commit: `docs: add session 87 report` (hash: f1c9b7db)

## Phase 17 — Release 1.1.404 (owner: Oleksandr, updated: 2026-01-11)
### Stream: 1.1.404 release
1. [DONE] Build artifacts and bump version to 1.1.404 (build-all) — scope: manifests + package.json; expected commit message: `chore(release): bump 1.1.404`
2. [DONE] Git Commit: `chore(release): bump 1.1.404` (hash: 6f0634fc)
3. [DONE] Update release notes (README + CHANGELOG + todo-plan) — scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: update 1.1.404 release notes`
4. [DONE] Git Commit: `docs: update 1.1.404 release notes` (hash: f05db65a)
5. [DONE] Update architecture docs for 1.1.404 — scope: `doc/Architecture/Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit message: `docs: update architecture for 1.1.404`
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
7. [DONE] Update architecture docs for 1.1.405 — scope: `doc/Architecture/Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit message: `docs: update architecture for 1.1.405`
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
9. [DONE] Update release notes (README/CHANGELOG/Architecture/SystemArchitecture) — scope: `README.md`, `CHANGELOG.md`, `doc/Architecture/Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit message: `docs: update 1.1.406 release notes`
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
13. [DONE] Update architecture docs for 1.1.407 — scope: `doc/Architecture/Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit message: `docs: update architecture for 1.1.407`
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
11. [DONE] Update architecture docs for 1.1.408 — scope: `doc/Architecture/Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit message: `docs: update architecture for 1.1.408`
12. [DONE] Git Commit: `docs: update architecture for 1.1.408` (hash: 47823009)
13. [DONE] Build VSIX (build-release) — scope: `scripts/build-release.sh`; expected commit message: `docs: add session 93 report`
14. [DONE] Git Commit: `docs: add session 93 report` (hash: d1ecbbc7)
15. [DONE] Update Session093 report (final commit list + next session focus) — scope: `doc/Sessions/Session093.md`; expected commit message: `docs: update session 93 report`
16. [DONE] Git Commit: `docs: update session 93 report` (hash: d01e2ff8)
