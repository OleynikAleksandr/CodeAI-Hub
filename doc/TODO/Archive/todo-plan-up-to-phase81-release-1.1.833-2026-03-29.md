# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом каждого stream открыть: `AGENTS.md`, `doc/Sessions/Archive/Session181.md`, `doc/SolidWorks-WorkFlow/Plans/Archive/Settings_SSOT_And_NextTurn_ModelSwitch_Architecture.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Этот `TODO Plan` реализует три согласованных scope: (1) refactor `settings -> Core -> provider runtime -> PM` для единой source of truth по `model` / `reasoning`, (2) provider-neutral generalization этого контракта без branch-per-provider hotfix path, (3) carry-over tail декомпозиции `session-request-handler.ts`
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
- новый provider подключается к model-sync pipeline через одну provider-neutral integration point, без отдельных патчей в PM sync и remote-bridge glue code;
- после этого остаточный tail декомпозиции `session-request-handler.ts` закрыт отдельной честной фазой без ложных `IN_PROGRESS` статусов.

---

## Phase 80 — Settings SSOT And Next-Turn Model Switching (owner: Oleksandr, updated: 2026-03-28)

### Stream: Core applied-config resolver
1. [DONE] Ввести единый Core resolver для `model` / `reasoning` следующего turn из persisted Settings snapshot и задокументировать его как единственную source of truth для applied turn config. Scope: `packages/core/src/config/provider-turn-config-resolver.ts`, `packages/core/src/config/index.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `refactor(core): add provider turn config resolver`
2. [DONE] Git Commit: `refactor(core): add provider turn config resolver` (hash: `9ef3dc2a`)

### Stream: Remote-bridge applied-config contract
3. [DONE] Протянуть explicit applied turn config через remote-bridge send/switch path, чтобы Core передавал провайдеру уже вычисленную конфигурацию, а не полагался на разрозненные локальные refresh paths. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts`, `packages/core/src/remote-bridge/types.ts`. Expected commit: `refactor(core): thread applied turn config`
4. [DONE] Git Commit: `refactor(core): thread applied turn config` (hash: `32bc0f7d`)

### Stream: Codex next-turn runtime apply
5. [DONE] Сделать так, чтобы очередной новый Codex turn реально стартовал на Core-provided `model` / `reasoning`: обновить runtime application path и убрать зависимость от ранее зафиксированного thread config для следующего send. Scope: `packages/Codex_Module/src/messaging/codex-applied-turn-config.ts`, `packages/Codex_Module/src/messaging/message-processor.ts`, `packages/Codex_Module/src/messaging/message-processor.test.ts`. Expected commit: `refactor(codex): apply next-turn model config`
6. [DONE] Git Commit: `refactor(codex): apply next-turn model config` (hash: `4d6226ad`)

### Stream: Codex local settings-truth removal
7. [DONE] Убрать из Codex provider path самостоятельное принятие решения о текущем `model` / `reasoning` через локальное чтение `settings.json`, оставив только Core-fed applied config и derived cache. Scope: `packages/Codex_Module/src/sdk/codex-sdk-manager.ts`, `packages/Codex_Module/src/types/index.ts`, `packages/Codex_Module/src/messaging/codex-applied-turn-config.ts`. Expected commit: `refactor(codex): remove local settings truth path`
8. [DONE] Git Commit: `refactor(codex): remove local settings truth path` (hash: `a4ac21c7`)

### Stream: PM applied-config sync
9. [DONE] Перевести нижний PM label модели/`reasoning` с raw settings projection на Core-confirmed applied config events, сохранив live UX без нового split-brain между интерфейсом и runtime. Scope: `src/client/project-manager/components/sessions/use-runtime-model-sync.ts`, `src/client/ui/src/app-host/use-settings-models-sync.ts`. Expected commit: `refactor(pm): sync applied turn config labels`
10. [DONE] Git Commit: `refactor(pm): sync applied turn config labels` (hash: `df23290d`)

### Stream: Gemini and Claude parity
11. [DONE] Привести Gemini и Claude к тому же next-turn config contract, что и Codex: Settings как SSOT, Core-owned applied config, provider без собственного truth-layer для текущего `model` / `reasoning`. Scope: `packages/Gemini_Module/src/provider/gemini-applied-turn-config.ts`, `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`, `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`. Expected commit: `refactor(providers): align next-turn config contract`
12. [DONE] Git Commit: `refactor(providers): align next-turn config contract` (hash: `9f243183`)

### Stream: Interim release build after model-switch scope
13. [DONE] После закрытия всех stream-ов `Phase 80` выполнить отдельную сборку промежуточного релиза строго по Release Build Checklist: актуализировать release-facing docs, добиться чистого дерева, прогнать `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, зафиксировать артефакты и session report для отдельного пользовательского тестирования model-switch scope. Scope: `README.md`, `CHANGELOG.md`, `doc/Sessions/SessionXXX.md`. Expected commit: `chore: release 1.1.830`
14. [DONE] Git Commit: `chore: release 1.1.830` (hash: `2b831e8a`)

## Phase 80A — Provider-Neutral Applied Config Generalization (owner: Oleksandr, updated: 2026-03-28)

### Stream: Core provider turn-config registry
15. [DONE] Убрать branch-per-provider вычисление applied config из bridge helper path и свести `settings -> applied turn config` к единому registry/resolver contract, который покрывает Claude/Codex/Gemini и масштабируется на новые provider ids без новых `if (providerId === ...)` в runtime bridge. Scope: `packages/core/src/config/provider-turn-config-resolver.ts`, `packages/core/src/config/provider-settings-snapshot.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `refactor(core): centralize provider turn config registry`
16. [DONE] Git Commit: `refactor(core): centralize provider turn config registry` (hash: `8507fea2`)

### Stream: Provider-neutral outbound bridge contract
17. [DONE] Свести attachment outbound applied config и `session:model:update` broadcast к одному provider-neutral helper, чтобы send/switch/UI sync path работал через единый envelope и не знал деталей отдельных провайдеров. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts`, `packages/core/src/remote-bridge/types.ts`. Expected commit: `refactor(core): unify applied config bridge contract`
18. [DONE] Git Commit: `refactor(core): unify applied config bridge contract` (hash: `16951a36`)

### Stream: Provider capability registration
19. [DONE] Ввести в provider registry явный capability/contract для runtime model apply и label-sync eligibility, чтобы новый provider подключался через регистрацию возможностей, а не через разрозненные hardcoded checks по `providerId`. Scope: `packages/core/src/provider-registry/provider-module-loader.types.ts`, `packages/core/src/provider-registry/provider-descriptor-factory.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `refactor(core): register provider model sync capabilities`
20. [DONE] Git Commit: `refactor(core): register provider model sync capabilities` (hash: `498cfa62`)

### Stream: Provider adoption parity sweep
21. [DONE] Закрыть provider-side parity поверх общего applied-config envelope: Codex и Claude продолжают читать Core-fed runtime config без локального model truth-layer, а Gemini переводится на shared model/thinking override path для fresh/existing sessions и перестаёт перекрывать Core defaults snapshot-ом `settings.json`. Scope: `packages/Gemini_Module/src/provider/gemini-applied-turn-config.ts`, `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`, `packages/Gemini_Module/src/session/gemini-session-{bootstrapper,lifecycle,manager,settings-resolver}.ts`, `packages/Gemini_Module/src/session/types.ts`. Expected commit: `refactor(providers): adopt shared applied config contract`
22. [DONE] Git Commit: `refactor(providers): adopt shared applied config contract` (hash: `5b78ce2d`)

### Stream: Verification release after provider-neutral generalization
23. [DONE] После закрытия `Phase 80A` выполнить отдельную verification-сборку и регрессионную проверку model-switch matrix для Claude/Codex/Gemini на fresh-session и existing-session путях, затем зафиксировать артефакты и session report. Scope: `README.md`, `CHANGELOG.md`, `doc/Sessions/SessionXXX.md`. Expected commit: `chore: release 1.1.832`
24. [DONE] Git Commit: `chore: release 1.1.832` (hash: `97a95e3b`)

## Phase 81 — SessionRequestHandler Carry-Over Tail (owner: Oleksandr, updated: 2026-03-29)

### Stream: Continuity root carry-over
25. [DONE] Выделить continuity-root resolution и legacy description-root promotion из `session-request-handler.ts` в dedicated helper, сохранив dialog-root reuse и existing chain lookup semantics текущего релиза. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-continuity-root.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `refactor(core): extract session request continuity root`
26. [DONE] Git Commit: `refactor(core): extract session request continuity root` (hash: `a6853cbb`)

### Stream: Turn arbitration carry-over
27. [DONE] Выделить post-turn continuity arbitration, live threshold settings reload и stale-segment detection из `session-request-handler.ts` в dedicated helper cluster, сохранив `turn_completed` / `token_usage` ordering semantics текущего релиза. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-turn-{arbitration,completion,threshold-resolver}.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `refactor(core): extract session request turn arbitration`
28. [DONE] Git Commit: `refactor(core): extract session request turn arbitration` (hash: `89000d13`)

### Stream: Thin façade closure
29. [DONE] Вынести constructor/service-graph wiring из `session-request-handler.ts` в dedicated runtime builder cluster, сохранив текущий callback contract между resume, continuity, binding и outbound dispatch service graph. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-runtime*.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `refactor(core): extract session request runtime graph`
30. [DONE] Git Commit: `refactor(core): extract session request runtime graph` (hash: `c2e10c0a`)
31. [DONE] Вынести switch/message/delete orchestration и локальные guard/logging решения из `session-request-handler.ts` в dedicated actions helper, синхронно обновить SSOT и повторно проверить oversized debt. Результат: root handler стал orchestration-first façade, но остался в allowlist, потому что после cut всё ещё имеет `537` строк и не прошёл порог `<=300`. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `refactor(core): thin session request handler facade`
32. [DONE] Git Commit: `refactor(core): thin session request handler facade` (hash: `18d28ee6`)

### Stream: Final release build after full plan closure
33. [DONE] После закрытия `Phase 81` выполнена финальная сборка релиза `1.1.833` по Release Build Checklist: release-facing docs обновлены, `./scripts/build-all.sh` успешно собрал provider/core/UI/launcher tarball-ы, `./scripts/build-release.sh --use-current-version --allow-dirty` успешно собрал VSIX `codeai-hub-1.1.833.vsix`, а session report оформлен для отдельного полного регрессионного тестирования. Scope: `README.md`, `CHANGELOG.md`, `doc/Sessions/Archive/Session186.md`. Expected commit: `chore: release post-plan verification build`
34. [DONE] Git Commit: `chore: release post-plan verification build` (hash: `TBD`)
