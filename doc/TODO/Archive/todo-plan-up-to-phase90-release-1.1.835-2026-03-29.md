# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом каждого stream открыть: `AGENTS.md`, `doc/Sessions/Session188.md`, `doc/Sessions/Session189.md`, `doc/SolidWorks-WorkFlow/Plans/EffectiveModelIdentity_And_SettingsSSOT_Architecture.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Этот `TODO Plan` реализует согласованный scope: `modelId` становится effective model identity, reasoning/thinking входят в состав identity, а `~/.codeai-hub/settings/settings.json` становится единственным source of truth для next-turn model identity для всех провайдеров.
- Текущий baseline `1.1.834` считается входной точкой; scope ограничен identity contract, provider-neutral resolver, Codex runtime adoption, UI/PM sync и regression coverage без расширения продукта до нового session-side model switch UI.
- Каждая микро-задача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново.
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещён).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.
- Перед закрытием каждого stream выполнять таргетные проверки затронутых файлов/пакетов.
- Для Core/bridge stream-ов таргетная проверка по умолчанию: `npm run build --workspace=@codeai-hub/core`.
- Для Codex stream-ов таргетная проверка по умолчанию: `npm run build --workspace=@codeai-hub/codex-module`.
- Для UI/webview/PM stream-ов таргетная проверка по умолчанию: `npm run build:webview`, `npm run typecheck:webview`.
- Новый oversized handwritten source file вне explicit debt allowlist запрещён.
- В конце связанного блока фаз обязателен отдельный release-stream по Release Build Checklist с актуализацией release-facing docs до финальной сборки.

---

## Goal

Критерий завершения этого плана:

- `modelId` по всему transport/runtime/UI контракту означает полную effective model identity;
- одинаковый base model с разным reasoning/thinking считается разными `modelId`;
- `~/.codeai-hub/settings/settings.json` является единственным source of truth для next-turn model identity;
- Core provider-neutral resolver одинаково вычисляет effective identity для Claude/Codex/Gemini;
- Codex на следующем turn применяет изменение reasoning точно так же, как сейчас применяет изменение base model;
- PM и webview показывают ту же effective runtime identity, которую реально применяет provider;
- после закрытия связанных фаз собран новый релиз по полной release checklist с обновлёнными документами.

---

## Phase 86 — Effective Model Identity Contract Reset (owner: Oleksandr, updated: 2026-03-29)

### Stream: Contract reset for model identity semantics
1. [DONE] Синхронизировать SSOT и модульные описания: `modelId` больше не означает только base model, а включает reasoning/thinking как часть effective identity; `~/.codeai-hub/settings/settings.json` фиксируется как единственный source of truth для next-turn model identity. Scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Modules/Gemini.md`. Expected commit: `docs(contract): define effective model identity`
2. [DONE] Git Commit: `docs(contract): define effective model identity` (hash: `d7388df2`)

### Stream: Bridge payload identity contract
3. [DONE] Переписать bridge/session contract так, чтобы applied turn config и `session:model:update` переносили effective `modelId`, а optional base-model данные были только вспомогательными и не использовались как главный runtime identity key. Scope: `packages/core/src/remote-bridge/session-stream-contracts.ts`, `packages/core/src/remote-bridge/types.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `refactor(core): carry effective model identity`
4. [DONE] Git Commit: `refactor(core): carry effective model identity` (hash: `f9db849f`)

## Phase 87 — Provider-Neutral Effective Identity Resolver (owner: Oleksandr, updated: 2026-03-29)

### Stream: Shared resolver from settings SSOT
5. [DONE] Довести Core resolver до provider-neutral effective identity contract: из `settings.json` вычислять `baseModelId`, effective `modelId`, reasoning/thinking payload и единый descriptor для bridge/runtime/UI без branch-per-provider identity logic в потребителях. Scope: `packages/core/src/config/provider-turn-config-resolver.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `refactor(core): resolve effective model identity`
6. [DONE] Git Commit: `refactor(core): resolve effective model identity` (hash: `804fc61e`)

### Stream: Provider capability alignment
7. [DONE] Согласовать provider capability слой с новым identity contract, чтобы все провайдеры подключались к одному effective-model pipeline, а provider-specific код оставался только last-mile adapter path. Scope: `packages/core/src/provider-registry/provider-descriptor-factory.ts`, `packages/core/src/provider-registry/provider-module-loader.types.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `refactor(core): align provider identity capabilities`
8. [DONE] Git Commit: `refactor(core): align provider identity capabilities` (hash: `2e73b9f7`)

## Phase 88 — Codex Runtime Adoption (owner: Oleksandr, updated: 2026-03-29)

### Stream: Codex effective identity apply
9. [DONE] Сделать Codex runtime полностью identity-driven: одинаковый base model с разным reasoning должен приводить к разному applied runtime config и проходить по тому же next-turn path, что и смена самой модели. Scope: `packages/Codex_Module/src/messaging/codex-applied-turn-config.ts`, `packages/Codex_Module/src/sdk/codex-sdk-patches.ts`, `packages/Codex_Module/src/messaging/message-processor.test.ts`. Expected commit: `fix(codex): apply effective model identity`
10. [DONE] Git Commit: `fix(codex): apply effective model identity` (hash: `412f5e07`)

### Stream: Message dispatch send-path extraction
11. [DONE] Вынести общий outbound provider send path из oversized dispatch handler в отдельный микро-класс, чтобы следующий identity-fix stream не нарушал лимит в 300 строк и оставался в рамках микро-архитектуры. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-provider-send.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `refactor(core): extract message dispatch sender`
12. [DONE] Git Commit: `refactor(core): extract message dispatch sender` (hash: `f837b9ce`)

### Stream: Core outbound update for effective identity
13. [DONE] Исправить outbound Core model update path для Codex и shared runtime events так, чтобы следующий turn публиковал именно effective identity, а не только base model id. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`. Expected commit: `fix(core): publish effective model updates`
14. [DONE] Git Commit: `fix(core): publish effective model updates` (hash: `ac0499c5`)

## Phase 89 — UI/PM Sync And Regression Coverage (owner: Oleksandr, updated: 2026-03-29)

### Stream: Runtime sync in PM and webview
15. [DONE] Научить PM и обычный webview одинаково принимать runtime effective model update без локальной реконструкции identity из split fields и без silent ignore path. Scope: `src/client/project-manager/components/sessions/use-runtime-model-sync.ts`, `src/client/ui/src/core-bridge/server-message-handler.ts`, `src/client/ui/src/app-host/session-stream-snapshot-sync.ts`. Expected commit: `fix(ui): consume effective model updates`
16. [DONE] Git Commit: `fix(ui): consume effective model updates` (hash: `e37390b2`)

### Stream: Ready-session settings sync and display parity
17. [DONE] Убрать рассогласование ready-session labels и settings-driven display logic: reasoning/thinking для той же base model не должны теряться или оставаться stale в session status. Scope: `src/client/ui/src/app-host/use-settings-models-sync.ts`, `src/client/ui/src/session/model-info-builder.ts`, `src/client/project-manager/components/sessions/project-manager-session-view.test.tsx`. Expected commit: `fix(ui): sync effective identity labels`
18. [DONE] Git Commit: `fix(ui): sync effective identity labels` (hash: `6fcc97bc`)

## Phase 90 — Release Build After Effective Identity Closure (owner: Oleksandr, updated: 2026-03-29)

### Stream: Pre-build release docs for v1.1.835
19. [DONE] Актуализировать release-facing docs под целевую `v1.1.835` до запуска release-скриптов: обновить `README.md`, `CHANGELOG.md` и release-plan статус так, чтобы `build-all.sh` стартовал уже с согласованным release narrative и чистым деревом. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Expected commit: `docs(release): prepare v1.1.835`
20. [DONE] Git Commit: `docs(release): prepare v1.1.835` (hash: `7b43eefa`)

### Stream: Clean-tree build and packaging for v1.1.835
21. [DONE] На чистом дереве выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, зафиксировать результаты в `doc/Sessions/Session190.md`, проверить артефакты в `doc/tmp/releases/` и завершить release baseline effective model identity. Scope: `doc/Sessions/Session190.md`, version/manifests from build scripts, release artefact report. Expected commit: `chore: release effective model identity contract`
22. [DONE] Git Commit: `chore: release effective model identity contract` (hash: `2215f69f`)
