# Session 076 — Usage limits replay hotfix release 1.1.728

**Date:** 2026-03-15 09:39 (CET)
**Branch:** main
**Version:** 1.1.728

---

# 1. Work Done in This Session

## Work summary
- Release-facing docs синхронизированы под hotfix-релиз `1.1.728`: `README.md`, `CHANGELOG.md` и `doc/TODO/todo-plan.md` теперь явно фиксируют websocket replay fix для `usage_limits`.
- Выполнен полный `./scripts/build-all.sh`: unified/workspace version поднята до `1.1.728`, обновлены package versions и локальные manifest pointers для `core`, `launcher`, provider-модулей и UI.
- Выполнен `./scripts/build-release.sh --use-current-version`; собран VSIX `codeai-hub-1.1.728.vsix`.
- Hotfix-релиз покрывает transport-gap, из-за которого `Codex` usage limits могли теряться в `Project Manager` / `Session UI` при позднем websocket/workspace-scope attach.
- По итогам post-release проверки подтверждено, что основной функционал universal usage-limits module работает для всех трёх провайдеров: `Claude`, `Codex` и `Gemini` отдают лимиты в интерфейс сессии через общий shared pipeline.
- Проведён отдельный анализ Gemini dialog output: подтверждено, что отдельные assistant-replies из raw SDK feedback схлопываются в один финальный блок не в UI, а внутри `Gemini_Module`.
- Root cause зафиксирован в planning-доке `doc/SolidWorks-WorkFlow/Plans/Gemini_DialogSegmentation_Architecture.md`: `content` chunks в `packages/Gemini_Module/src/messaging/message-processor.ts` только накапливаются до конца turn-а, а `packages/Gemini_Module/src/session/gemini-session-manager.ts` публикует один общий `assistant` message после полного `processTurns()`.
- Завершённый usage-limits execution-plan архивирован в `doc/TODO/Archive/todo-plan-phase9-universal-usage-limits-release-2026-03-15.md`, создан новый execution-plan `doc/TODO/todo-plan.md` под следующий scope — Gemini dialog segmentation fix.

## Git commits
- `08699bef docs(release): prep usage limits replay hotfix release`
- `b4ea4eef chore(release): build usage limits replay hotfix release`

## Verification
- `./scripts/build-all.sh`
- `./scripts/build-release.sh --use-current-version`
- В финальном release build подтверждены `Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`.
- Advisory duplication check во время `build-release` снова показал `3.12%` при пороге `3%`, но pipeline не прервался и VSIX был собран успешно.
- Дополнительная ручная post-release проверка подтвердила live delivery usage limits в Session UI для `Claude`, `Codex` и `Gemini`.
- Сопоставлены raw SDK log `~/.codeai-hub/logs/gemini/sdk-gemini-04519f8d-7c0f-4f91-8ce9-24f44e0b775e.jsonl` и unified session log `~/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-gemini/geminiCli/gemini-061f230f-f52d-402c-b655-0203f6c2ddae-description.jsonl`.
- Подтверждено, что raw SDK log содержит несколько отдельных циклов `content -> finished`, тогда как unified session log уже хранит один агрегированный `assistant` block на turn.
- Для следующей сессии подготовлены planning/doc basis: `doc/SolidWorks-WorkFlow/Plans/Gemini_DialogSegmentation_Architecture.md` и новый `doc/TODO/todo-plan.md`.

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `doc/SolidWorks-WorkFlow/README.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/SolidWorks-WorkFlow/Plans/Gemini_DialogSegmentation_Architecture.md`
6. `doc/TODO/todo-plan.md`
7. `doc/Sessions/Session075.md`
8. `doc/Sessions/Session076.md` (THIS REPORT)

> Текущий status: hotfix-релиз `v1.1.728` собран локально. План с usage-limits scope полностью закрыт до `Phase 9` и заархивирован. Следующий утверждённый scope уже подготовлен: Gemini dialog segmentation fix по planning-доку `Gemini_DialogSegmentation_Architecture.md`.

## Plans for next session
- Протестировать `v1.1.728` локально в `Project Manager` и подтвердить, что `Codex` usage limits теперь стабильно переживают reconnect / workspace-scope rebind.
- Отдельно разобрать `Claude`-симптом, где context/token usage materialize только после reopen workspace.
- Начать реализацию Gemini dialog segmentation fix по новому execution-plan: сохранить границы assistant-replies так, как они реально приходят в raw SDK feedback, без схлопывания в один final block.
- При реализации не трогать transport/websocket path и UI renderer, пока не будет подтверждена необходимость: текущий root cause локализован внутри `packages/Gemini_Module/src/messaging/message-processor.ts` и `packages/Gemini_Module/src/session/gemini-session-manager.ts`.
