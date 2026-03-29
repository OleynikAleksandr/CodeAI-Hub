# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом каждого stream открыть: `AGENTS.md`, `doc/BugRegistry.md`, `doc/SolidWorks-WorkFlow/Plans/SessionTurnStop_And_Core_Independence_Architecture.md`, `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Этот `TODO Plan` реализует согласованный scope: `Stop` в Session UI больше не shutdown-ит Core, а останавливает только текущий turn / снимает stuck-state текущей logical session; следующий send rebinding-ит fresh provider session только если старый binding испорчен или принудительно остановлен.
- Текущий baseline `1.1.833` считается входной точкой; scope ограничен stop/turn-abort semantics, session rebind и Gemini stalled-turn recovery без расширения продукта за пределы этих границ.
- Каждая микро-задача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещён).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.
- Перед закрытием каждого stream выполнять таргетные проверки затронутых файлов/пакетов.
- Для Core/bridge stream-ов таргетная проверка по умолчанию: `npm run build --workspace=@codeai-hub/core`.
- Для Gemini stream-ов таргетная проверка по умолчанию: `npm run build --workspace=@codeai-hub/gemini-module`.
- Для UI/webview stream-ов таргетная проверка по умолчанию: `npm run build:webview`, `npm run typecheck:webview`.
- Новый oversized handwritten source file вне explicit debt allowlist запрещён.
- В конце связанного блока фаз обязателен отдельный release-stream по Release Build Checklist с актуализацией release-facing docs до финальной сборки.

---

## Goal

Критерий завершения этого плана:

- `Stop` в Session UI больше не вызывает shutdown Core runtime;
- Core получает session-scoped stop command и умеет остановить только текущий turn / снять stuck-state текущей logical session;
- logical session остаётся живой после `Stop`;
- следующий send либо продолжает существующий binding, либо создаёт fresh provider session и ребиндит её к той же logical session;
- Gemini silent stall больше не оставляет dialog в бесконечном `Agent is working... Please wait.`;
- после закрытия связанных фаз собран новый релиз по полной release checklist с обновлёнными документами.

---

## Phase 82 — Session Stop Contract And UI/Bridge Reframing (owner: Oleksandr, updated: 2026-03-29)

### Stream: Contract reset for Stop semantics
1. [DONE] Зафиксировать баг и переписать продуктовый контракт `Stop`: больше не `shutdown Core`, а `stop current turn / unlock stuck session`, с явной привязкой к logical session и MVP-оговоркой про fresh provider session при испорченном transcript. Scope: `doc/BugRegistry.md`, `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`, `doc/SolidWorks-WorkFlow/Plans/SessionTurnStop_And_Core_Independence_Architecture.md`. Expected commit: `docs(contract): redefine session stop semantics`
2. [DONE] Git Commit: `docs(contract): redefine session stop semantics` (hash: `df917787`)

### Stream: Session-scoped stop bridge command
3. [DONE] Добавить в remote-bridge отдельную команду `session:stop`, чтобы transport слой различал stop текущей session и global runtime shutdown. Scope: `packages/core/src/remote-bridge/session-stream-contracts.ts`, `packages/core/src/remote-bridge/remote-bridge-message-router.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `feat(core): add session stop bridge command`
4. [DONE] Git Commit: `feat(core): add session stop bridge command` (hash: `c41228d7`)

### Stream: UI stop path without core shutdown
5. [TODO] Перевести Session UI на session-scoped stop path: убрать stop-core смысл из action-кнопки, заменить copy и больше не использовать `core-shutdown` helper из input action flow. Scope: `src/client/ui/src/core-bridge/core-bridge.ts`, `src/client/ui/src/session/input-panel.tsx`, `src/client/ui/src/session/input-play-stop-button.tsx`. Expected commit: `fix(ui): route stop to session turn cancel`
6. [TODO] Git Commit: `fix(ui): route stop to session turn cancel` (hash: `TBD`)

## Phase 83 — Core Session Stop And Rebind Semantics (owner: Oleksandr, updated: 2026-03-29)

### Stream: Binding invalidation without session deletion
7. [DONE] Ввести Core-side primitive для invalidation текущего provider binding без удаления logical session, чтобы stop-path мог честно перевести session в recoverable state. Scope: `packages/core/src/session-manager/index.ts`, `packages/core/src/remote-bridge/handlers/session-provider-binding-service.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `feat(core): support stop-invalidated session bindings`
8. [DONE] Git Commit: `feat(core): support stop-invalidated session bindings` (hash: `TBD`)

### Stream: Session stop action handler
9. [TODO] Реализовать `handleStop(sessionId)` в session request path: закрывать текущую provider session, не трогать Core runtime, переводить logical session в unlock/retryable state и не удалять dialog history. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.ts`, `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`. Expected commit: `feat(core): stop active turn without core shutdown`
10. [TODO] Git Commit: `feat(core): stop active turn without core shutdown` (hash: `TBD`)

### Stream: Rebind on next send after stop
11. [TODO] На следующем send научить Core поднимать fresh provider session и rebinding-ить её к той же logical session, если предыдущий binding был stop-invalidated или признан непригодным. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-session-bootstrap.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `feat(core): rebind session after stop invalidation`
12. [TODO] Git Commit: `feat(core): rebind session after stop invalidation` (hash: `TBD`)

### Stream: Core regression coverage
13. [TODO] Добавить регрессионные Core tests на два сценария: `Stop` mid-turn не удаляет logical session и не гасит runtime, а следующий send rebinding-ит рабочую provider session; `Stop` после stuck-state снимает lock и возвращает send path. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.create-resume.test.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.rollover.test.ts`. Expected commit: `test(core): cover session stop and rebind flow`
14. [TODO] Git Commit: `test(core): cover session stop and rebind flow` (hash: `TBD`)

## Phase 84 — Gemini Stalled-Turn Recovery (owner: Oleksandr, updated: 2026-03-29)

### Stream: Gemini stalled-stream watchdog
15. [TODO] Добавить stalled-turn watchdog для Gemini stream path, чтобы зависание после `model_info` / partial progress переводилось в controlled recoverable outcome, а не в вечное ожидание terminal event. Scope: `packages/Gemini_Module/src/session/gemini-turn-runner.ts`, `packages/Gemini_Module/src/session/gemini-session-lifecycle.ts`, `doc/SolidWorks-WorkFlow/Modules/Gemini.md`. Expected commit: `fix(gemini): recover stalled turn streams`
16. [TODO] Git Commit: `fix(gemini): recover stalled turn streams` (hash: `TBD`)

### Stream: Gemini recoverable idle reset
17. [TODO] Перевести stalled-turn outcome в recoverable session state внутри Gemini manager/adapter: session должна уходить в `idle`, а Core/UI получать управляемый failure surface вместо зависшего `working`. Scope: `packages/Gemini_Module/src/session/gemini-session-manager.ts`, `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `fix(gemini): surface stalled turn recovery`
18. [TODO] Git Commit: `fix(gemini): surface stalled turn recovery` (hash: `TBD`)

### Stream: Gemini regression coverage
19. [TODO] Добавить regression tests на silent stall и на восстановление session после forced stop/recoverable stall outcome. Scope: `packages/Gemini_Module/src/session/gemini-turn-runner.test.ts`, `packages/Gemini_Module/src/session/gemini-session-manager.test.ts`, `packages/Gemini_Module/src/messaging/message-processor.test.ts`. Expected commit: `test(gemini): guard stalled turn recovery`
20. [TODO] Git Commit: `test(gemini): guard stalled turn recovery` (hash: `TBD`)

## Phase 85 — Release Build After Stop/Recovery Closure (owner: Oleksandr, updated: 2026-03-29)

### Stream: Final release build after phases 82–84
21. [TODO] После закрытия `Phase 82`–`Phase 84` выполнить финальную сборку релиза строго по Release Build Checklist: сначала актуализировать release-facing docs и session report под новый stop/recovery contract, затем добиться чистого дерева, прогнать `./scripts/build-all.sh`, после этого `./scripts/build-release.sh --use-current-version`, проверить артефакты и зафиксировать их в отчёте новой сессии. Scope: `README.md`, `CHANGELOG.md`, `doc/Sessions/SessionXXX.md`. Expected commit: `chore: release stop recovery contract`
22. [TODO] Git Commit: `chore: release stop recovery contract` (hash: `TBD`)
