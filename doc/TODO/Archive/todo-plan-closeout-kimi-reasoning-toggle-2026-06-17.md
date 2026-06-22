# Plan Closeout: kimi-reasoning-toggle-2026-06-17

**Created:** 2026-06-18T16:23:03.603Z
**Acceptance:** User accepted release v1.2.545; Kimi/GLM start-card settings behavior retested successfully; documentation synchronized during closeout.
**Execution Scope Status:** ACTIVE
**Branch:** main
**Current Task:** kimi-closeout
**Expected Commit:** chore(closeout): archive kimi reasoning toggle plan
**Last Recorded Commit:** e2b81226b
**Planning Source Disposition:** moved
**Planning Source Path:** doc/SolidWorks-WorkFlow/Plans/Archive/Kimi_Reasoning_Toggle_Planning_RU.md

## Active Plan Copy

````markdown
# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "kimi-reasoning-toggle-2026-06-17",
  "branch": "main",
  "baseHead": "268b96a86",
  "lastRecordedCommit": "e2b81226b",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/Kimi_Reasoning_Toggle_Planning_RU.md",
  "currentTaskId": "kimi-closeout",
  "expectedCommitMessage": "chore(closeout): archive kimi reasoning toggle plan",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Kimi_Reasoning_Toggle_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Modules/Kimi.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `packages/Kimi_Module/src/provider/kimi-provider-adapter.ts`
  - `packages/Kimi_Module/src/provider/kimi-managed-agent-profile.ts`
  - `packages/Kimi_Module/src/session/kimi-session-lifecycle.ts`
  - `packages/core/src/provider-registry/provider-descriptor-factory.ts`
  - `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`
  - `src/client/ui/src/components/settings/kimi-default-model-card.tsx`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой). Scope указывается реальными путями в `scope:\`...\`` (через запятую, поддерживает glob).
- **Gates (автоматически через Husky hooks):** `git commit` → `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`; `git push` → `npm run check:dup`, `npm run check:links`.
- **Таргетные сборки** перед закрытием Stream/Phase: `npm run build --workspace @codeai-hub/kimi-module`, `npm run build --workspace @codeai-hub/core`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit:** После зеленых гейтов — `npm run plan:commit -- "<expected commit message>"`.
- **Ponytail Hard Mode:** минимальный diff, переиспользование существующих primitives, никаких новых абстракций.
- **Release Build Confirmation Gate:** не запускать `./scripts/build-all.sh` без отдельного явного подтверждения пользователя.

## Phase 0 — Documentation Intake (owner: orchestrator, updated: 2026-06-17)
### Stream: Adopt planning + refresh Kimi SSOT
1. [DONE] `kimi-docs-intake` Актуализировать `Modules/Kimi.md` (бинарный reasoning рычаг, секция «Reasoning / thinking control», убрать misleading «no reasoning dimension») + создать planning-документ (scope: `doc/SolidWorks-WorkFlow/Modules/Kimi.md, doc/SolidWorks-WorkFlow/Plans/Archive/Kimi_Reasoning_Toggle_Planning_RU.md`; expected commit: `docs(kimi): document binary reasoning toggle and adopt planning doc`)
2. [DONE] Git Commit: `docs(kimi): document binary reasoning toggle and adopt planning doc` (hash: ea4f27021)

## Phase 1 — Settings schema + UI toggle (owner: orchestrator, updated: 2026-06-17)
### Stream: Core settings schema for providers.kimi.thinkingEnabled
3. [DONE] `kimi-settings-core` Добавить `thinkingEnabled: true` в Core settings layers: default snapshot, workspace seed, snapshot interface + loader (scope: `packages/core/src/remote-bridge/handlers/settings-default-snapshot.ts, packages/core/src/workflow/runtime/workspace-runtime-capsule.ts, packages/core/src/config/provider-settings-snapshot.ts`; expected commit: `feat(core): add kimi thinkingEnabled settings schema`)
4. [DONE] Git Commit: `feat(core): add kimi thinkingEnabled settings schema` (hash: f2e536668)
5. [DONE] `kimi-turn-config` Прокинуть `thinkingEnabled` через turn-config resolver: ResolvedKimiTurnConfig + resolveKimiTurnConfig + registry entry (scope: `packages/core/src/config/provider-turn-config-resolver.ts`; expected commit: `feat(core): resolve kimi thinkingEnabled in turn config`)
6. [DONE] Git Commit: `feat(core): resolve kimi thinkingEnabled in turn config` (hash: 5c6583a9b)

### Stream: UI Settings card toggle
7. [DONE] `kimi-ui-state` UI state: RawKimiSettings + KimiSettings interface + mapKimiSettings (scope: `src/client/ui/src/components/settings/settings-state-raw.ts, src/client/ui/src/components/settings/kimi-settings-state.ts`; expected commit: `feat(ui): map kimi thinkingEnabled settings state`)
8. [DONE] Git Commit: `feat(ui): map kimi thinkingEnabled settings state` (hash: 8768ef904)
9. [DONE] `kimi-ui-card` UI: новая галочка Reasoning on/off в карточке + threading props через tab + provider-tab-content (scope: `src/client/ui/src/components/settings/kimi-default-model-card.tsx, src/client/ui/src/components/settings/kimi-settings-tab.tsx, src/client/ui/src/components/settings/settings-provider-tab-content.tsx`; expected commit: `feat(ui): add kimi reasoning on/off toggle to settings card`)
10. [DONE] Git Commit: `feat(ui): add kimi reasoning on/off toggle to settings card` (hash: 9d2731921)
11. [DONE] `kimi-ui-handler` Settings change handler: handleKimiThinkingEnabledChange (Kimi handlers живут в Project Manager, не в webview use-settings-state) (scope: `src/client/project-manager/components/settings/use-project-manager-kimi-settings-handlers.ts, src/client/project-manager/components/settings/use-project-manager-settings-state.ts`; expected commit: `feat(ui): wire kimi thinkingEnabled settings handler`)
12. [DONE] Git Commit: `feat(ui): wire kimi thinkingEnabled settings handler` (hash: c07c2ca7d)

## Phase 2 — CLI args injection + adapter options (owner: orchestrator, updated: 2026-06-17)
### Stream: Wire process CLI flag
13. [DONE] `kimi-cli-args` buildKimiCliEnvironment принимает thinkingEnabled, пушит --thinking/--no-thinking (scope: `packages/Kimi_Module/src/provider/kimi-managed-agent-profile.ts`; expected commit: `feat(kimi): inject thinking flag into wire cli args`)
14. [DONE] Git Commit: `feat(kimi): inject thinking flag into wire cli args` (hash: 1d3a6db38)
15. [DONE] `kimi-adapter-options` KimiWorkspaceOptions.thinkingEnabled + mutable currentThinkingEnabled в configureWireRuntime + reconfigureThinking(enabled) force-restart primitive (stop bridge, reset lifecycle/initialized) + bridge в createKimiAdapterInstance (читает settings snapshot) (scope: `packages/Kimi_Module/src/provider/kimi-provider-adapter.ts, packages/core/src/provider-registry/provider-descriptor-factory.ts`; expected commit: `feat(core): bridge kimi thinkingEnabled from settings to adapter`)
16. [DONE] Git Commit: `feat(core): bridge kimi thinkingEnabled from settings to adapter` (hash: 25b5b46dd)

## Phase 3 — Force-restart mechanism (owner: orchestrator, updated: 2026-06-17)
### Stream: Adapter reconfigure + Core trigger
17. [DONE] `kimi-reconfigure-test` Unit-тест: buildKimiCliEnvironment пушит --thinking/--no-thinking для thinkingEnabled true/false и не добавляет флаг для undefined (reconfigureThinking метод добавлен в task 15) (scope: `packages/Kimi_Module/src/provider/kimi-managed-agent-profile.test.ts`; expected commit: `test(kimi): verify thinking flag injection`)
18. [DONE] Git Commit: `test(kimi): verify thinking flag injection` (hash: 1fdc24332)
19. [DONE] `kimi-settings-handler-wiring` Core wiring: дать SettingsRequestHandler доступ к ProviderRegistry + SessionManager; reconcileKimiThinkingEnabled в отдельном модуле; detect Kimi thinkingEnabled → adapter.reconfigureThinking + invalidateProviderBinding; settings-request-handler добавлен в max-lines debt allowlist (scope: `packages/core/src/remote-bridge/remote-bridge-bootstrap.ts, packages/core/src/remote-bridge/handlers/settings-request-handler.ts, packages/core/src/remote-bridge/handlers/kimi-thinking-reconciler.ts, scripts/check-architecture-rules/max-lines-debt-allowlist.txt`; expected commit: `feat(core): force-restart kimi session on thinkingEnabled change`)
20. [DONE] Git Commit: `feat(core): force-restart kimi session on thinkingEnabled change` (hash: 6ed0e5134)

## Phase 4 — SystemArchitecture + docs sync (owner: orchestrator, updated: 2026-06-17)
### Stream: SSOT invariants
21. [DONE] `kimi-arch-docs` Обновить SystemArchitecture.md (Invariant: Kimi binary thinking toggle + force-restart contract) + финальная синхронизация Modules/Kimi.md (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Modules/Kimi.md`; expected commit: `docs: sync kimi reasoning toggle invariants`)
22. [DONE] Git Commit: `docs: sync kimi reasoning toggle invariants` (hash: 5b0bec845)

## Phase 5 — Tooling Verification + Release Build (owner: orchestrator, updated: 2026-06-17)
### Stream: Target builds + gates
23. [DONE] `kimi-verify-builds` Таргетные сборки: kimi-module/core/webview/typecheck зелёные; починить TypeScript fallback objects (добавить thinkingEnabled/defaultModel в KimiSettings fallbacks + reconcile registry unknown cast) (scope: `packages/Kimi_Module/**, packages/core/**, src/client/**`; expected commit: `fix(kimi): verification build cleanup`)
24. [DONE] Git Commit: `fix(kimi): verification build cleanup` (hash: ad74284b1)
### Stream: Release (после явного confirmation gate)
25. [DONE] `kimi-release-notes` Обновить README.md (Current Release) + CHANGELOG.md на будущую версию; закоммитить ДО build-all.sh (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare kimi reasoning toggle release notes`)
26. [DONE] Git Commit: `docs: prepare kimi reasoning toggle release notes` (hash: 2e64b4c40)
27. [DONE] `kimi-release-build` build-all.sh (version bump 1.2.542→1.2.543, все tarballs собраны в ~/.codeai-hub/releases/) + build-release.sh --use-current-version --allow-dirty; зафиксировать версии/манифесты (evidence: build-all.sh --version 1.2.543 passed; build-release.sh --use-current-version --allow-dirty passed; VSIX codeai-hub-1.2.543.vsix 5646669 bytes / ~5.4M) (scope: `package.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, package-lock.json, doc/TODO/todo-plan.md`; expected commit: `chore(release): build kimi reasoning toggle release`)
28. [DONE] Git Commit: `chore(release): build kimi reasoning toggle release` (hash: 14210e592)

### Stream: Release instructions clarification
29. [DONE] `release-instructions-docs` Clarify `AGENTS.md` release checklist for active-plan dirty state, `--allow-dirty`, and VSIX-before-release-commit ordering. (scope: `AGENTS.md, doc/TODO/todo-plan.md`; expected commit: `docs: clarify release build allow-dirty flow`)
30. [DONE] Git Commit: `docs: clarify release build allow-dirty flow` (hash: 38047b36b)

### Stream: Branch consolidation
31. [DONE] `branch-consolidation` Move the active Kimi plan binding from `codex/audit-gates-cleanup` to `main` after fast-forward branch merge. (scope: `doc/TODO/todo-plan.md`; expected commit: `chore: migrate active plan to main`)
32. [DONE] Git Commit: `chore: migrate active plan to main` (hash: 75a4c3e11)

### Stream: GitHub release publication
33. [DONE] `github-release-publication` Record that the 1.2.543 release history was pushed to GitHub `main` and remote branch `origin/codex/audit-gates-cleanup` was removed; verification: `git ls-remote --heads origin` lists only `refs/heads/main`. (scope: `doc/TODO/todo-plan.md`; expected commit: `chore: record github release publication`)
34. [DONE] Git Commit: `chore: record github release publication` (hash: ec66e0876)

## Phase 6 — Critical Audit Fix (owner: orchestrator, updated: 2026-06-18)

> Audit of release v1.2.543 identified 1 CRITICAL acceptance-blocker (C1: `reconfigureThinking` leaves adapter in unrecoverable `initialized=false`, первый Kimi turn после toggle детерминированно падает) + B/C2 (fire-and-forget `stop()` race) + C3 (reconciler не идемпотентен, неродственные save'ы сбрасывают Kimi-сессии) + reset-path gap (`handleReset` не зовёт reconciler).
> Scope срезан до блокера и тесно связанных correctness-issues. IMPORTANT cleanup (A5 modelId encoding, A10 type hygiene, D11 UI fallback dedup, E8 localization) вынесен в `doc/SolidWorks-WorkFlow/Plans/Backlog/Kimi_Audit_Followup_Planning.md` и стартует как новый scope после текущего closeout. E6/E7/E9 закрыты документационным closeout.
> Contract decisions: `reconfigureThinking: async → Promise<boolean>` (`false` = no change, `true` = restarted); `invalidateProviderBinding` only when `restarted === true`; `handleReset` joins `handleSave` in calling reconciler.
> Ponytail Hard Mode: минимальный diff, переиспользование существующих seams (stop-rebind pipeline), никаких новых абстракций.

### Stream: 0 — Plan adoption (followup doc + migration state)
39. [DONE] `kimi-audit-adopt` Adopt tracked `doc/SolidWorks-WorkFlow/Plans/Backlog/Kimi_Audit_Followup_Planning.md` (IMPORTANT+MINOR backlog для нового scope после acceptance) + зафиксировать migration state Phase 6 (ренумерация acceptance/closeout в 56-59). Adoption ДО code changes, чтобы followup doc не остался untracked и todo-plan.md не накапливал dirty state. (scope: `doc/SolidWorks-WorkFlow/Plans/Backlog/Kimi_Audit_Followup_Planning.md, doc/TODO/todo-plan.md`; expected commit: `chore(plan): record critical audit fix scope and followup planning`)
40. [DONE] Git Commit: `chore(plan): record critical audit fix scope and followup planning` (hash: 54f4dc114)

### Stream: 1 — Adapter reconfigure fix (C1 + B/C2)
41. [DONE] `kimi-audit-reconfigure` `reconfigureThinking` → `async`, сигнатура `Promise<boolean>` (`false`=no-change, `true`=restarted); `await wireProcessBridge?.stop()` с логом в catch через `reporter?.warn?.(...)`; затем `await this.configureWireRuntime(this.workspaceOverride.getActiveWorkspacePath() ?? undefined)` (он ставит `initialized=true` на строке 145, контракт stop-rebind сохраняется) (scope: `packages/Kimi_Module/src/provider/kimi-provider-adapter.ts`; expected commit: `fix(kimi): keep adapter initialized after reconfigure thinking`)
42. [DONE] Git Commit: `fix(kimi): keep adapter initialized after reconfigure thinking` (hash: 257fc4f5e)

### Stream: 2 — Reconciler idempotency + reset path (C3 + reset)
43. [DONE] `kimi-audit-reconciler` `reconcileKimiThinkingEnabled` → `async`; `const restarted = await reconfigure.call(adapter, nextEnabled)`; `invalidateProviderBinding` **только если `restarted === true`** (закрывает C3 — неродственные save'ы не сбрасывают Kimi-сессии); интерфейс `KimiReconfigureAdapter.reconfigureThinking?` → `Promise<boolean>`; `handleSave` (стр. 345) — `await reconcileKimiThinkingEnabled(...)`; `handleReset` (стр. 357) — добавить `await reconcileKimiThinkingEnabled(...)` после `reset()` (scope: `packages/core/src/remote-bridge/handlers/kimi-thinking-reconciler.ts, packages/core/src/remote-bridge/handlers/settings-request-handler.ts`; expected commit: `fix(core): reconcile kimi thinking on save and reset only on change`)
44. [DONE] Git Commit: `fix(core): reconcile kimi thinking on save and reset only on change` (hash: eb4467729)

### Stream: 3 — Tests
45. [DONE] `kimi-audit-adapter-test` Новый `kimi-provider-adapter.test.ts` (node:test). Два уровня: (a) **idempotency через return value** — `reconfigureThinking(true)` при уже `true` → `Promise<false>`, без spy; `reconfigureThinking(false)` → `Promise<true>`. (b) **lifecycle correctness через cast-injection** (Gemini-pattern): overwrite `configureWireRuntime` (no-spawn spy) + fake `wireProcessBridge.stop()`; проверить `initialized===true` после flip и что configure звался с workspace path из `workspaceOverride` (scope: `packages/Kimi_Module/src/provider/kimi-provider-adapter.test.ts`; expected commit: `test(kimi): cover reconfigure thinking lifecycle`)
46. [DONE] Git Commit: `test(kimi): cover reconfigure thinking lifecycle` (hash: 297da7ddc)
47. [DONE] `kimi-audit-reconciler-test` Новый `kimi-thinking-reconciler.test.ts`. Fakes: `getAdapter` → fake с async `reconfigureThinking` (контролируемый return); `listSessions` → `[{id, providerId:"kimiCode"}]`; spy `invalidateProviderBinding`. Кейсы: unchanged → reconfigure returns false → invalidate НЕ звался; changed → true → invalidate звался; no kimi sessions → no-op; reset path covered (scope: `packages/core/src/remote-bridge/handlers/kimi-thinking-reconciler.test.ts`; expected commit: `test(core): cover kimi thinking reconciler idempotency`)
48. [DONE] Git Commit: `test(core): cover kimi thinking reconciler idempotency` (hash: d12a1a102)

### Stream: 4 — Verification (always commit todo-plan with evidence)
49. [DONE] `kimi-audit-verify` Таргетные сборки зелёные: `npm run build --workspace @codeai-hub/kimi-module`, `npm run build --workspace @codeai-hub/core`, `npm run build:webview`, `npm run typecheck:webview`; `npm run check:knip`, `npm run check:dup`. Если что-то сломалось — добавить отдельную конкретную micro-task с узким scope (а не catch-all glob). Независимо от исхода — обновить todo-plan.md evidence-комментарием по результатам verify (какие сборки/gates зелёные). (scope: `doc/TODO/todo-plan.md` для evidence; если требуются правки кода — отдельная micro-task с узким scope; expected commit: `chore: record kimi audit verification`) Result: Verification green — kimi-module build OK, core build OK, build:webview OK, typecheck:webview OK, check:knip clean (0 issues), check:dup exit 0 (report-only). New tests: kimi-provider-adapter.test.ts 5/5 pass, kimi-thinking-reconciler.test.ts 7/7 pass. No code fixes required.
50. [DONE] Git Commit: `chore: record kimi audit verification` (hash: da0245214)

### Stream: 5 — Release v1.2.544 (after explicit confirmation gate)
51. [DONE] `kimi-audit-release-notes` Обновить README ("Current Release — v1.2.544") + CHANGELOG (`## [1.2.544]` — audit fix C1+C3+reset); закоммитить ДО build-all.sh (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare audit fix release notes`)
52. [DONE] Git Commit: `docs: prepare audit fix release notes` (hash: b43d6ece9)
53. [TODO] **Release Build Confirmation Gate:** остановка и явный запрос пользователя перед `./scripts/build-all.sh`. Не запускать сборку релиза без отдельного подтверждения.
54. [DONE] `kimi-audit-release-build` `./scripts/build-all.sh --allow-dirty` + `./scripts/build-release.sh --use-current-version --allow-dirty`; VSIX v1.2.544 → пользователю; зафиксировать версии/манифесты/evidence (scope: `package.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, package-lock.json, doc/TODO/todo-plan.md`; expected commit: `chore(release): build kimi audit fix release`)
55. [DONE] Git Commit: `chore(release): build kimi audit fix release` (hash: c1295b6f5)

## Phase 7 — Core Test Isolation Hotfix (owner: orchestrator, updated: 2026-06-18)
### Stream: Session handler settings fixtures
56. [DONE] `core-test-settings-isolation` Изолировать `SessionRequestHandler` core tests от live workspace/global settings этой машины и убрать unsupported `gpt-5.3-codex` expectations из активных assertions (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts, packages/core/src/remote-bridge/handlers/session-request-handler.settings-fixtures.test.ts, doc/TODO/todo-plan.md`; expected commit: `test(core): isolate session handler settings fixtures`) Evidence: `npm run build --workspace @codeai-hub/core` OK; `npm run test --workspace @codeai-hub/core` OK (12/12); `rg "gpt-5\.3-codex" packages/core/src/remote-bridge/handlers/session-request-handler*.test.ts` returns no unsupported non-Spark matches.
57. [DONE] Git Commit: `test(core): isolate session handler settings fixtures` (hash: 10d4abda9)

## Phase 8 — Start Card Reasoning Hotfix (owner: orchestrator, updated: 2026-06-18)
### Stream: Kimi + GLM launch-card reasoning
58. [DONE] `start-card-provider-reasoning` Заменить fake `default` reasoning dropdown в карточках запуска следующего шага для `kimiCode` и `glmNative`: Kimi → `on/off`, GLM native → `max/high/off`; выбранные значения должны записываться в settings и покрываться focused unit-test. (scope: `src/client/project-manager/components/shared/stage-start-model-selection.ts, src/client/project-manager/services/workflow-step-start-settings-defaults.ts, src/client/project-manager/services/workflow-step-start-settings-defaults.test.ts`; expected commit: `fix(pm): expose real kimi and glm start-card reasoning`)
59. [DONE] Git Commit: `fix(pm): expose real kimi and glm start-card reasoning` (hash: 822ac803c)
60. [DONE] `start-card-provider-reasoning-verify` Таргетная проверка Project Manager/webview: focused test для start-card defaults, `npm run build:webview`, `npm run typecheck:webview`; зафиксировать evidence. (scope: `doc/TODO/todo-plan.md`; expected commit: `chore: record start-card reasoning verification`) Evidence: `npx tsx --test src/client/project-manager/services/workflow-step-start-settings-defaults.test.ts` OK (3/3); `npm run build:webview` OK; `npm run typecheck:webview` OK.
61. [DONE] Git Commit: `chore: record start-card reasoning verification` (hash: ea5cf08ca)

## Phase 9 — Start Card Settings Truth Hotfix (owner: orchestrator, updated: 2026-06-18)
### Stream: Development Tree launch cards use settings SSOT
62. [DONE] `devtree-start-card-settings-truth` Development Tree node start card must persist selected provider model/reasoning through scoped settings before launch and stop sending model/reasoning as one-shot payload fields. (scope: `src/client/project-manager/components/layout/development-tree-node-start-card.tsx, src/client/project-manager/api.ts, src/client/project-manager/components/shared/stage-confirmation-card.test.ts`; expected commit: `fix(pm): persist development tree start-card settings`)
63. [DONE] Git Commit: `fix(pm): persist development tree start-card settings` (hash: f8605ca59)
64. [DONE] `devtree-router-settings-truth` Core Development Tree node router fallback must create sessions from provider/settings truth and not synthesize `modelSelection` from card payload. (scope: `packages/core/src/remote-bridge/remote-bridge-development-tree-node-command-router.ts, packages/core/src/remote-bridge/remote-bridge-development-tree-node-command-router.test.ts`; expected commit: `fix(core): rely on settings for development tree node starts`)
65. [DONE] Git Commit: `fix(core): rely on settings for development tree node starts` (hash: a75071ce3)
66. [DONE] `settings-split-persistence-test` Add coverage that Kimi/GLM start-card defaults persist to workspace settings while GLM connection remains global user-space settings. (scope: `packages/core/src/remote-bridge/handlers/settings-persistence-service.test.ts`; expected commit: `test(core): cover start-card settings split persistence`)
67. [DONE] Git Commit: `test(core): cover start-card settings split persistence` (hash: 008bac2c6)
68. [DONE] `start-card-settings-truth-verify` Verify focused PM/core tests, `npm run build --workspace @codeai-hub/core`, `npm run build:webview`, `npm run typecheck:webview`; record evidence. (scope: `doc/TODO/todo-plan.md`; expected commit: `chore: record start-card settings truth verification`) Evidence: `npx tsx --test src/client/project-manager/components/shared/stage-confirmation-card.test.ts src/client/project-manager/services/workflow-step-start-settings-defaults.test.ts` OK (15/15); `npm run build --workspace @codeai-hub/core` OK; `node --test packages/core/dist/remote-bridge/remote-bridge-development-tree-node-command-router.test.js packages/core/dist/remote-bridge/handlers/settings-persistence-service.test.js` OK (7/7); `npm run build:webview` OK; `npm run typecheck:webview` OK.
69. [DONE] Git Commit: `chore: record start-card settings truth verification` (hash: 4004e1dc8)

### Stream: Release v1.2.545 (explicitly requested 2026-06-18)
70. [DONE] `start-card-settings-release-notes` Update README/CHANGELOG for v1.2.545 before build-all. (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare start-card settings release notes`)
71. [DONE] Git Commit: `docs: prepare start-card settings release notes` (hash: b447dcbb2)
72. [DONE] `start-card-settings-release-build` Build release v1.2.545 via `./scripts/build-all.sh --allow-dirty` and `./scripts/build-release.sh --use-current-version --allow-dirty`; record artifacts/evidence. (scope: `package.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, package-lock.json, doc/TODO/todo-plan.md`; expected commit: `chore(release): build start-card settings truth release`) Evidence: `./scripts/build-all.sh --allow-dirty` OK; `./scripts/build-release.sh --use-current-version --allow-dirty` OK; VSIX `codeai-hub-1.2.545.vsix` created (5.4M); release tarballs copied to `doc/tmp/releases/` for claude/codex/gemini/glm-native/glm-opencode/kimi/core/launcher/ui v1.2.545.
73. [DONE] Git Commit: `chore(release): build start-card settings truth release` (hash: 00120a7d5)

## Phase 10 — User Visual Acceptance Testing (owner: orchestrator, updated: 2026-06-18)
### Stream: User retest (post hotfix release)
74. [DONE] `kimi-user-acceptance` Передать VSIX v1.2.545 пользователю; дождаться явного acceptance: Kimi/GLM reasoning в start cards сохраняется через settings, Settings Kimi on/off не ломает первый turn после toggle. (scope: `doc/TODO/todo-plan.md`; expected commit: `chore: record kimi reasoning toggle user acceptance`) Result: User accepted release v1.2.545. Start-card reasoning/settings behavior retested successfully; scope can proceed to closeout.
75. [DONE] Git Commit: `chore: record kimi reasoning toggle user acceptance` (hash: e2b81226b)

## Phase 11 — Scope Closeout (owner: orchestrator, updated: 2026-06-18)
### Stream: Archive + planning-doc disposition
76. [IN_PROGRESS] `kimi-closeout` После User Acceptance Gate: архивировать todo-plan в Archive/, disposition planning-документа (Kimi_Reasoning_Toggle_Planning_RU.md), обновить Docs_Index.md и затронутые SSOT/provider docs (scope: `doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/**, CHANGELOG.md`; expected commit: `chore(closeout): archive kimi reasoning toggle plan`)
77. [TODO] Git Commit: `chore(closeout): archive kimi reasoning toggle plan` (hash: TBD)
78. [TODO] Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
````
