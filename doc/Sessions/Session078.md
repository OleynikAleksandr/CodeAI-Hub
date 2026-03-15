# Session 078 — Flow-node continuity one-shot boundary analysis

**Date:** 2026-03-15 14:47 (CET)
**Branch:** main
**Version:** 1.1.729

---

# 1. Work Done in This Session

## Work summary
- Пользователь подтвердил live smoke для локального релиза `v1.1.729`: Gemini dialog segmentation fix работает корректно в реальном сценарии.
- Пользователь воспроизвёл новый continuity-сценарий для document node: при искусственно высоком threshold (`80%`) Core запустил flow-node rollover до завершения текущего user one-shot turn в Gemini `description` session.
- По unified session JSONL и continuity reports подтверждено, что первичная проблема не в бедности continuity report, а в premature Core arbitration boundary: `handleFlowNodeContinuityProviderEvent()` может стартовать rollover по первому `token_usage` event до `turn_completed`.
- Подтвержден provider-order mismatch: `Gemini` эмитит `token_usage` раньше `turn_completed`, тогда как `Claude` и `Codex` обычно завершают turn раньше и только потом отдают trailing token usage; из-за этого один и тот же Core race ранее был скрыт.
- Подготовлен planning-док `doc/SolidWorks-WorkFlow/Plans/FlowNodeContinuity_OneShotBoundary_Architecture.md` под новый scope.
- Завершённый execution-plan Gemini segmentation release архивирован в `doc/TODO/Archive/todo-plan-phase2-gemini-dialog-segmentation-release-2026-03-15.md`; создан новый `doc/TODO/todo-plan.md` под фикс Core continuity arbitration.
- Реализован Core fix в `packages/core/src/remote-bridge/handlers/session-request-handler.ts`: pre-turn `token_usage` теперь только кеширует usage snapshot, а threshold-driven flow-node rollover оценивается только после `turn_completed` или по trailing `token_usage` уже в pending post-turn arbitration.
- Добавлены regression tests на production path: подтверждены оба provider order-а (`Gemini`: `token_usage -> turn_completed`, `Claude/Codex`: `turn_completed -> token_usage`) и очистка cached token-usage snapshot при старте нового outbound turn-а.
- Continuity SSOT и session docs синхронизированы под новый инвариант post-turn arbitration; execution-plan обновлён отдельной release-phase под следующий локальный релиз continuity boundary fix.

## Git commits
- `13a8092b fix(core): defer continuity rollover until turn completion`
- `e171e6a0 test(core): guard flow-node rollover turn boundary`

## Verification
- Сопоставлены runtime artifacts:
  - `/Users/oleksandroliinyk/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-gemini/geminiCli/gemini-b40688e0-dd5d-4fe3-91e4-5bc2258e91cd-description.jsonl`
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub gemini/.codeai-hub/codeai-hub-gemini/flow/nodes/description/continuity/reports/2026-03-15T12-52-27-905Z-Agent-geminiCli.md`
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub gemini/.codeai-hub/codeai-hub-gemini/flow/nodes/description/continuity/reports/2026-03-15T13-01-19-051Z-Agent-geminiCli.md`
- Подтверждено по коду, что flow-node rollover сейчас может стартовать на первом `token_usage` event до завершения current turn:
  - `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
- Подтверждено provider-specific event order:
  - `Gemini`: `token_usage -> turn_completed`
  - `Claude/Codex`: обычно `turn_completed -> token_usage`
- Подтверждено, что flow-node continuity rollover в текущем контуре создаёт новую provider session (`providerSessionId: null`) и не делает native resume старой provider thread при threshold-trigger continuity.
- `npm run build --workspace @codeai-hub/core`
- `node --test packages/core/dist/remote-bridge/handlers/session-request-handler.test.js`
- `npx ultracite check packages/core/src/remote-bridge/handlers/session-request-handler.ts packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`
- Regression подтверждает:
  - `Gemini` path: rollover больше не стартует на pre-turn `token_usage`; запуск возможен только после `turn_completed`.
  - `Claude/Codex` path: `turn_completed` без usage оставляет session в pending-arbitration, а trailing `token_usage` завершает решение `no_rollover`.
  - Cached `flowNodeTokenUsageSnapshots` очищается при старте нового outbound turn-а.

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `doc/SolidWorks-WorkFlow/README.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
6. `doc/SolidWorks-WorkFlow/Plans/FlowNodeContinuity_OneShotBoundary_Architecture.md`
7. `doc/TODO/todo-plan.md`
8. `doc/Sessions/Session077.md`
9. `doc/Sessions/Session078.md` (THIS REPORT)

> Текущий status: локальный релиз `v1.1.729` подтверждён пользователем. Core fix для flow-node continuity turn boundary реализован, regression tests зелёные, continuity SSOT синхронизирован. Открыты живой smoke document node после фикса и последующий локальный release cycle.

## Plans for next session
- Выполнить живой smoke для document node на `Gemini`, чтобы подтвердить: agent finish текущего one-shot завершается до continuity report prompt.
- После smoke пройти release-stream: `README.md` / `CHANGELOG.md` -> `./scripts/build-all.sh` -> `./scripts/build-release.sh --use-current-version` -> финальная синхронизация `Session078.md` и `doc/TODO/todo-plan.md`.
