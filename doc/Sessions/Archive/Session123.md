# Session 123 — Idea / Idea Collector Legacy Cleanup Release 1.1.762

**Date:** 2026-03-22 14:20 (CET)
**Branch:** main
**Version:** 1.1.762

---

# 1. Work Done in This Session

## Work summary
- Полностью выполнен `Phase 26 — Idea / Idea Collector Legacy Cleanup` от planning baseline до локального релиза `1.1.762`.
- Живой PM `Description` workflow очищен от legacy `Idea / Idea Collector` naming в submit/start flow, session callbacks, provider accessor, provider picker copy и user-facing step semantics.
- Current PM/bootstrap flow больше не зависит от `stage: "idea"` или `/idea-contract` как от активной семантики первого шага.
- Удалены disabled old-flow surfaces, orphaned `packages/agents/idea-collector` package, unused PM wrappers/accessors и stale packaging refs, из-за которых release tooling всё ещё ожидал удалённый пакет.
- Active SSOT/docs синхронизированы: `Idea / Idea Collector` теперь зафиксированы только как compat/deferred legacy layer, а не как product-visible семантика текущего workflow.
- Собран локальный релиз `1.1.762`:
  - `npm run build:webview`
  - `npm run build:core`
  - `./scripts/build-all.sh`
  - `./scripts/build-release.sh --use-current-version`
- Выпущены свежие tarball-артефакты в `doc/tmp/releases/` и VSIX `codeai-hub-1.1.762.vsix` в корне репозитория.

## Release artifacts
- VSIX: `codeai-hub-1.1.762.vsix`
- Tarballs:
  - `doc/tmp/releases/claude-module-1.1.762.tar.bz2`
  - `doc/tmp/releases/codex-module-1.1.762.tar.bz2`
  - `doc/tmp/releases/gemini-module-1.1.762.tar.bz2`
  - `doc/tmp/releases/codeai-hub-core-darwin-arm64-1.1.762.tar.bz2`
  - `doc/tmp/releases/project-manager-1.1.762.tar.bz2`
  - `doc/tmp/releases/vscode-webview-1.1.762.tar.bz2`
  - `doc/tmp/releases/CodeAIHubLauncher-macos-arm64-1.1.762.tar.bz2`

## Remaining legacy zone after Phase 26
- В active PM user-facing surface legacy `Idea / Idea Collector` semantics больше нет.
- Остаточные `idea-*` имена всё ещё существуют только в:
  - internal helper/service aliases внутри `src/client/ui/src/services/`;
  - provider structured-output parsers (`packages/Codex_Module`, `packages/Claude_Module`);
  - disabled old app-host flow remnants;
  - redirect-only runtime compat endpoint `/idea-contract` и архивных/compat docs.
- Эти остатки больше не являются source of truth для текущего workflow, но могут стать следующей cleanup-phase, если нужно дожать naming дальше внутрь runtime/provider слоя.

## Advisory / known non-blocking issue
- `build-release.sh` успешно завершился, но снова выдал advisory по broken markdown links в `doc/Sessions/Session106.md`.
- Это не блокирует локальный релиз `1.1.762`, но остаётся техдолгом, если нужна полностью чистая `check:links` / release-console картина без старых absolute-path drift warnings.

## Working tree status at session end
- После `build-release.sh` дерево было чистым.
- Closing commit этой сессии: `docs(session): record 1.1.762 idea legacy cleanup release`.
- После этого commit дерево должно быть чистым; если нет, сначала проверить только `doc/Sessions/Session123.md` и `doc/TODO/todo-plan.md`.

## Git commits
- `65373d56 docs(plan): start idea collector legacy cleanup scope`
- `d1c9962e refactor(pm): rename description submit service`
- `8ef20445 refactor(pm): rename description provider picker`
- `803fd87c refactor(ui): rename description questionnaire template helpers`
- `0a8ba760 refactor(ui): rename description questionnaire view`
- `de3901ff refactor(ui): rename description questionnaire messaging helpers`
- `21099afb refactor(workflow): switch description bootstrap off idea alias`
- `78aa4866 refactor(core): narrow legacy idea contract bridge`
- `080ae09b refactor(home-view): drop legacy flow commands`
- `ae3c2103 refactor(ui): remove disabled full flow host`
- `ee820f6a refactor(claude): neutralize workflow structured output naming`
- `e616d9a0 refactor(build): drop idea collector workspace references`
- `e048058f refactor(core): remove legacy idea collector package`
- `8e51fe53 fix(build): remove stale idea collector staging refs`
- `9bcf59dd refactor(pm): promote description submit service`
- `97ea1e51 refactor(pm): rename description session callbacks`
- `5f12150d refactor(pm): add description provider accessor`
- `0face257 refactor(pm): switch workflow provider callers to description accessor`
- `480bd5fb refactor(pm): remove idea collector copy from provider picker`
- `8514dcb5 refactor(pm): remove unused idea provider accessor`
- `8aa419c1 refactor(pm): remove unused idea wrappers`
- `2bd86b1c docs(workflow): remove idea legacy semantics from active ssot`
- `b5c2ca04 docs(compat): classify idea legacy redirects`
- `01fab424 chore(release): prepare idea legacy cleanup release`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `README.md`
3. `doc/SolidWorks-WorkFlow/README.md`
4. `doc/SolidWorks-WorkFlow/Docs_Index.md`
5. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
6. `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
7. `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
8. `doc/SolidWorks-WorkFlow/Plans/IdeaCollector_LegacyCleanup_Architecture.md`
9. `doc/TODO/todo-plan.md`
10. `doc/Sessions/Session123.md` (THIS REPORT)

## Git context recovery before coding
- Обязательно просмотреть через `git show --stat <hash>` и `git show <hash>` все commit-ы этой сессии из списка выше.
- Минимальный high-signal subset, если нужен быстрый вход:
  - `21099afb refactor(workflow): switch description bootstrap off idea alias`
  - `e048058f refactor(core): remove legacy idea collector package`
  - `8e51fe53 fix(build): remove stale idea collector staging refs`
  - `9bcf59dd refactor(pm): promote description submit service`
  - `8514dcb5 refactor(pm): remove unused idea provider accessor`
  - `8aa419c1 refactor(pm): remove unused idea wrappers`
  - `2bd86b1c docs(workflow): remove idea legacy semantics from active ssot`
  - `b5c2ca04 docs(compat): classify idea legacy redirects`
  - `01fab424 chore(release): prepare idea legacy cleanup release`
- Цель просмотра: восстановить не только итоговое состояние, но и sequence migration steps, чтобы не вернуть старые compat assumptions.

## Exact baseline after this release
- Current local release baseline: `codeai-hub-1.1.762.vsix`
- Current package/app version in repo: `1.1.762`
- Fresh tarballs are already in `doc/tmp/releases/`
- Tree should быть чистым после финального `docs(session)` commit этой сессии.

## Recommended first task next session
- Провести post-cleanup regression на `1.1.762` по цепочке:
  - `Description`
  - `Virtual Simulation`
  - `Diagram Modules`
  - `Diagram Facades`
- Цель regression:
  - убедиться, что cleanup не вернул drift в help/prompt/runtime surfaces;
  - проверить, что `Description` и downstream agents продолжают работать лучше после prompt/help fixes прошлой серии;
  - убедиться, что отсутствие `Idea / Idea Collector` naming в active PM path не повлияло на bootstrap/start/fix behavior.

## If another cleanup phase is needed
Следующие наиболее вероятные кандидаты на follow-up cleanup:
- `packages/Codex_Module/src/messaging/structured-output-stream-controller.ts`
- `packages/Claude_Module/src/messaging/idea-collector-structured-output.ts`
- `src/client/project-manager/services/description-submit-service.ts` imports from old helper names
- `src/client/project-manager/components/sessions/session-message-sender.ts`
- `src/client/project-manager/services/description-questionnaire-service.ts`
- internal helper layer в `src/client/ui/src/services/idea-collector-*.ts` и `idea-questionnaire-*.ts`
- disabled old app-host flow remnants в `src/client/ui/src/app-host/`

## Optional hygiene task
- Если нужен полностью чистый release-console без advisory, отдельно разобрать broken markdown links в `doc/Sessions/Session106.md`.
