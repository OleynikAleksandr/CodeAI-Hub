# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом каждого stream открыть: `AGENTS.md`, `doc/Sessions/Session181.md`, `doc/SolidWorks-WorkFlow/Plans/Settings_SSOT_And_NextTurn_ModelSwitch_Architecture.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Этот `TODO Plan` реализует два согласованных scope: (1) refactor `settings -> Core -> provider runtime -> PM` для единой source of truth по `model` / `reasoning`, (2) carry-over tail декомпозиции `session-request-handler.ts`
- Текущий baseline `1.1.829` считается рабочим; scope ограничен behavior-preserving refactor + runtime config contract cleanup, без нового product feature scope
- Каждая микро-задача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Husky gates не обходить (`--no-verify` запрещён)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Перед закрытием каждого stream выполнять таргетные проверки затронутых файлов/пакетов
- Для Core/config stream-ов таргетная проверка по умолчанию: `npm run build --workspace=@codeai-hub/core`
- Для provider stream-ов таргетная проверка по умолчанию: `npm run build --workspace packages/Codex_Module`, `npm run build --workspace packages/Gemini_Module`, `npm run build --workspace packages/Claude_Module` по затронутому пакету
- Для webview/PM stream-ов таргетная проверка по умолчанию: `npm run build:webview`, `npm run typecheck:webview`
- Новый oversized handwritten source file вне explicit debt allowlist запрещён
- Oversized allowlist должен только уменьшаться; если файл реально опустился до `300` строк или ниже, он должен покинуть allowlist без откладывания

---

## Goal

Критерий завершения этого плана:

- `settings` становятся единственной source of truth для `model` / `reasoning` следующего turn;
- Core централизованно вычисляет applied turn config и передаёт её провайдерам;
- Codex реально переключает модель/`reasoning` на очередном новом turn, а не только в UI label;
- PM показывает applied runtime config, а не независимую локальную догадку;
- Gemini / Claude / Codex приходят к одному контракту next-turn model switching;
- после этого остаточный tail декомпозиции `session-request-handler.ts` закрыт отдельной честной фазой без ложных `IN_PROGRESS` статусов.

---

## Phase 80 — Settings SSOT And Next-Turn Model Switching (owner: Oleksandr, updated: 2026-03-28)

### Stream: Core applied-config resolver
1. [DONE] Ввести единый Core resolver для `model` / `reasoning` следующего turn из persisted Settings snapshot и задокументировать его как единственную source of truth для applied turn config. Scope: `packages/core/src/config/provider-turn-config-resolver.ts`, `packages/core/src/config/index.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `refactor(core): add provider turn config resolver`
2. [DONE] Git Commit: `refactor(core): add provider turn config resolver` (hash: TBD)

### Stream: Remote-bridge applied-config contract
3. [TODO] Протянуть explicit applied turn config через remote-bridge send/switch path, чтобы Core передавал провайдеру уже вычисленную конфигурацию, а не полагался на разрозненные локальные refresh paths. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/types.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `refactor(core): thread applied turn config`
4. [TODO] Git Commit: `refactor(core): thread applied turn config` (hash: TBD)

### Stream: Codex next-turn runtime apply
5. [TODO] Сделать так, чтобы очередной новый Codex turn реально стартовал на Core-provided `model` / `reasoning`: обновить runtime application path и убрать зависимость от ранее зафиксированного thread config для следующего send. Scope: `packages/Codex_Module/src/provider/codex-provider-adapter.ts`, `packages/Codex_Module/src/sdk/codex-sdk-manager.ts`, `packages/Codex_Module/src/messaging/message-processor.ts`. Expected commit: `refactor(codex): apply next-turn model config`
6. [TODO] Git Commit: `refactor(codex): apply next-turn model config` (hash: TBD)

### Stream: Codex local settings-truth removal
7. [TODO] Убрать из Codex provider path самостоятельное принятие решения о текущем `model` / `reasoning` через локальное чтение `settings.json`, оставив только Core-fed applied config и derived cache. Scope: `packages/Codex_Module/src/sdk/codex-sdk-manager.ts`, `packages/Codex_Module/src/types/index.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `refactor(codex): remove local settings truth path`
8. [TODO] Git Commit: `refactor(codex): remove local settings truth path` (hash: TBD)

### Stream: PM applied-config sync
9. [TODO] Перевести нижний PM label модели/`reasoning` с raw settings projection на Core-confirmed applied config events, сохранив live UX без нового split-brain между интерфейсом и runtime. Scope: `src/client/project-manager/components/sessions/use-runtime-model-sync.ts`, `src/client/ui/src/app-host/use-settings-models-sync.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `refactor(pm): sync applied turn config labels`
10. [TODO] Git Commit: `refactor(pm): sync applied turn config labels` (hash: TBD)

### Stream: Gemini and Claude parity
11. [TODO] Привести Gemini и Claude к тому же next-turn config contract, что и Codex: Settings как SSOT, Core-owned applied config, provider без собственного truth-layer для текущего `model` / `reasoning`. Scope: `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`, `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `refactor(providers): align next-turn config contract`
12. [TODO] Git Commit: `refactor(providers): align next-turn config contract` (hash: TBD)

### Stream: Interim release build after model-switch scope
13. [TODO] После закрытия всех stream-ов `Phase 80` выполнить отдельную сборку промежуточного релиза строго по Release Build Checklist: актуализировать release-facing docs, добиться чистого дерева, прогнать `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, зафиксировать артефакты и session report для отдельного пользовательского тестирования model-switch scope. Scope: `README.md`, `CHANGELOG.md`, `doc/Sessions/SessionXXX.md`. Expected commit: `chore: release model-switch verification build`
14. [TODO] Git Commit: `chore: release model-switch verification build` (hash: TBD)

## Phase 81 — SessionRequestHandler Carry-Over Tail (owner: Oleksandr, updated: 2026-03-28)

### Stream: Continuity root carry-over
15. [TODO] Выделить continuity-root resolution и legacy description-root promotion из `session-request-handler.ts` в dedicated helper, сохранив dialog-root reuse и existing chain lookup semantics текущего релиза. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-continuity-root.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `refactor(core): extract session request continuity root`
16. [TODO] Git Commit: `refactor(core): extract session request continuity root` (hash: TBD)

### Stream: Turn arbitration carry-over
17. [TODO] Выделить post-turn continuity arbitration, live threshold settings reload и stale-segment detection из `session-request-handler.ts` в отдельный helper, сохранив `turn_completed` / `token_usage` ordering semantics текущего релиза. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-turn-arbitration.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `refactor(core): extract session request turn arbitration`
18. [TODO] Git Commit: `refactor(core): extract session request turn arbitration` (hash: TBD)

### Stream: Thin façade closure
19. [TODO] Свести `session-request-handler.ts` к thin orchestration surface, синхронно обновить SSOT и снять root file с explicit oversized allowlist, если после предыдущих cuts он реально опустится до `300` строк или ниже. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `scripts/check-architecture-rules/max-lines-debt-allowlist.txt`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `refactor(core): thin session request handler facade`
20. [TODO] Git Commit: `refactor(core): thin session request handler facade` (hash: TBD)

### Stream: Final release build after full plan closure
21. [TODO] После закрытия `Phase 81` выполнить финальную сборку релиза строго по Release Build Checklist: обновить release-facing docs, убедиться в чистом дереве, прогнать `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, проверить артефакты, обновить `todo-plan.md` и оформить новый session report для отдельного полного регрессионного тестирования. Scope: `README.md`, `CHANGELOG.md`, `doc/Sessions/SessionXXX.md`. Expected commit: `chore: release post-plan verification build`
22. [TODO] Git Commit: `chore: release post-plan verification build` (hash: TBD)
