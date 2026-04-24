# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE
**Scope:** Provider Native Request Capture
**Planning source:** `doc/SolidWorks-WorkFlow/Plans/Provider_Native_Request_Capture_Architecture.md`
**Target release:** next release after `1.2.61`

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Provider_Native_Request_Capture_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Provider_Native_Request_Capture_Architecture.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- TODO Plan состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стрим), в каждом Stream — микрозадачи.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Если по факту разработки конкретная подзадача затрагивает больше 3 файлов, задача должна быть разбита и список задач в этом плане должен быть обновлён до продолжения.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- Таргетные сборки выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- Commit: после зелёных гейтов — Git Commit с релевантным описанием; после каждого коммита фиксировать hash и статус в этом плане.
- Real-time документация: любое изменение архитектуры/логики требует синхронного обновления связанных docs до коммита.
- Phase завершается на чистом дереве: выполняем release checklist из AGENTS.md, включая `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`.

Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.

---

## Phase 1 — Native Request Capture Architecture and Core Proxy (owner: Codex, updated: 2026-04-24)

### Stream: Planning Baseline
1. [DONE] Зафиксировать planning baseline и активный TODO для Provider Native Request Capture; scope: `doc/SolidWorks-WorkFlow/Plans/Provider_Native_Request_Capture_Architecture.md`, `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit message: `docs: plan provider native request capture`
2. [DONE] Git Commit: `docs: plan provider native request capture` (hash: `2c3562be3`)

### Stream: Core Capture Proxy
3. [DONE] Реализовать Core capture proxy skeleton: локальный `127.0.0.1` CONNECT proxy, capture lifecycle, timeout; scope: `packages/core/src/provider-network-capture/native-request-capture-proxy.ts`, `packages/core/src/provider-network-capture/native-request-capture-types.ts`, `packages/core/src/provider-network-capture/index.ts`, `packages/core/src/provider-network-capture/native-request-capture-proxy.test.ts` (knip discoverability smoke test); expected commit message: `feat: add native request capture proxy`
4. [DONE] Git Commit: `feat: add native request capture proxy` (hash: `9d9867363`)
5. [DONE] Добавить writer/redaction слой для `.jsonl` и `.md`; scope: `packages/core/src/provider-network-capture/native-request-capture-writer.ts`, `packages/core/src/provider-network-capture/native-request-capture-redaction.ts`, `packages/core/src/provider-network-capture/native-request-capture-writer.test.ts`; expected commit message: `feat: persist native request capture artifacts`
6. [DONE] Git Commit: `feat: persist native request capture artifacts` (hash: `7ed9e708b`)
7. [DONE] Добавить certificate store/preflight: local CA, host cert generation, env hints, trust failure codes; scope: `packages/core/src/provider-network-capture/native-request-capture-certificates.ts`, `packages/core/src/provider-network-capture/native-request-capture-preflight.ts`, `packages/core/src/provider-network-capture/native-request-capture-certificates.test.ts`; expected commit message: `feat: prepare diagnostic capture certificates`
8. [DONE] Git Commit: `feat: prepare diagnostic capture certificates` (hash: `bf9e56834`)

### Stream: Core Bridge Command
9. [DONE] Расширить provider adapter contract и Core facade для capture command; scope: `packages/core/src/provider-registry/provider-module-loader.types.ts`, `packages/core/src/provider-network-capture/native-request-capture-facade.ts`, `packages/core/src/provider-network-capture/native-request-capture-facade.test.ts`; expected commit message: `feat: add native request capture core command`
10. [DONE] Git Commit: `feat: add native request capture core command` (hash: `fb0177e3b`)
11. [DONE] Протянуть bridge message/result через Remote Bridge; scope: `packages/core/src/remote-bridge/types.ts`, `packages/core/src/remote-bridge/remote-bridge-message-router.ts`, `packages/core/src/remote-bridge/index.ts`, `packages/core/src/remote-bridge/remote-bridge-message-router.test.ts`; expected commit message: `feat: expose native request capture bridge event`
12. [DONE] Git Commit: `feat: expose native request capture bridge event` (hash: `db1feaac2`)

---

## Phase 2 — Provider Capture Paths (owner: Codex, updated: 2026-04-24)

### Stream: Claude Native Capture
13. [DONE] Добавить Claude capture service, который запускает SDK query через capture proxy и не отправляет upstream; scope: `packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.ts`, `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`, `packages/Claude_Module/src/provider/claude-provider-adapter.ts`; expected commit message: `feat: capture claude native requests`
14. [DONE] Git Commit: `feat: capture claude native requests` (hash: `162b23f41`)
15. [DONE] Покрыть Claude capture env injection/synthetic failure tests; scope: `packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.test.ts`, `packages/Claude_Module/src/provider/claude-provider-adapter.test.ts`; expected commit message: `test: cover claude native request capture`
16. [DONE] Git Commit: `test: cover claude native request capture` (hash: `eea89115c`)

### Stream: Codex Native Capture
17. [DONE] Добавить Codex capture service на временном app-server runtime с capture proxy env; scope: `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.ts`, `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.ts`, `packages/Codex_AppServer_Module/src/provider/codex-provider-adapter.ts`; expected commit message: `feat: capture codex native requests`
18. [DONE] Git Commit: `feat: capture codex native requests` (hash: `c4ed612ba`)
19. [DONE] Покрыть Codex capture target filtering/temp process shutdown tests; scope: `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.test.ts`, `packages/Codex_AppServer_Module/src/provider/codex-provider-adapter.test.ts`; expected commit message: `test: cover codex native request capture`
20. [DONE] Git Commit: `test: cover codex native request capture` (hash: `524266fb7`)

### Stream: Provider Build Gate
21. [DONE] Прогнать provider builds и исправить локальные compile issues; scope: `packages/Claude_Module`, `packages/Codex_AppServer_Module`; expected commit message: `chore: stabilize provider capture builds`
22. [DONE] Git Commit: `chore: stabilize provider capture builds` (hash: `9a5e0bc0f`)

---

## Phase 3 — Settings General UI (owner: Codex, updated: 2026-04-24)

### Stream: UI Command State
23. [DONE] Добавить UI state/handler для `settings:native-request-capture`; scope: `src/client/ui/src/components/settings/use-settings-state-support.ts`, `src/client/ui/src/components/settings/use-settings-state.ts`, `src/client/ui/src/components/settings/settings-state-model.ts`; expected commit message: `feat: add native request capture settings state`
24. [DONE] Git Commit: `feat: add native request capture settings state` (hash: `d1c7e6d28`)
25. [DONE] Добавить bridge result handling и host message wiring; scope: `src/client/ui/src/components/settings-view.tsx`, `src/client/project-manager/components/settings/use-project-manager-settings-state.ts`, `packages/core/src/remote-bridge/types.ts`; expected commit message: `feat: wire native request capture settings events`
26. [DONE] Git Commit: `feat: wire native request capture settings events` (hash: `0a38f4c10`)

### Stream: General Settings Card
27. [DONE] Создать нижнюю card в General Settings с двумя кнопками и status/path rendering; scope: `src/client/ui/src/components/settings/native-request-capture-card.tsx`, `src/client/ui/src/components/settings/general-settings.tsx`, `src/client/ui/src/components/settings/style-tokens.ts`; expected commit message: `feat: add native request capture buttons`
28. [DONE] Git Commit: `feat: add native request capture buttons` (hash: `32ea7dbe6`)
29. [DONE] Добавить localization copy для card/buttons/status/error; scope: `packages/localization/src/approved-english-dictionary.ts`, `packages/localization/src/generated/approved-english-dictionary.json`, `src/client/ui/src/components/settings/native-request-capture-card.tsx`; expected commit message: `feat: localize native request capture settings copy`
30. [DONE] Git Commit: `feat: localize native request capture settings copy` (hash: `0b6f50f5a`)

### Stream: UI Build Gate
31. [DONE] Прогнать `npm run build:webview` и `npm run typecheck:webview`, исправить UI issues; scope: `src/client/ui`, `src/client/project-manager`; expected commit message: `chore: stabilize native capture UI build`
32. [DONE] Git Commit: `chore: stabilize native capture UI build` (hash: `c00795b4a`)

---

## Phase 4 — Documentation, Verification, and Release (owner: Codex, updated: 2026-04-24)

### Stream: SSOT Documentation
33. [DONE] Обновить SSOT по диагностике provider-native request capture; scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`; expected commit message: `docs: document provider native request capture`
34. [DONE] Git Commit: `docs: document provider native request capture` (hash: `4b7490697`)
35. [DONE] Обновить UI/Settings docs и Docs Index; scope: `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/Plans/Provider_Native_Request_Capture_Architecture.md`; expected commit message: `docs: update native capture settings documentation`
36. [DONE] Git Commit: `docs: update native capture settings documentation` (hash: `6acea76b1`)

### Stream: Full Verification
37. [DONE] Прогнать targeted builds: `npm run build --workspace @codeai-hub/claude-module`, `npm run build --workspace @codeai-hub/codex-app-server-module`, `npm run build --workspace @codeai-hub/core`, `npm run build:webview`, `npm run typecheck:webview`; scope: provider packages + Core + Webview; expected commit message: `chore: verify native request capture`
38. [DONE] Git Commit: `chore: verify native request capture` (hash: `9c35fe4ef`)

### Stream: Release Build
39. [DONE] Подготовить release docs на будущую версию: обновить `README.md` Current Release и `CHANGELOG.md` entry до следующей версии после `1.2.61`; scope: `README.md`, `CHANGELOG.md`; expected commit message: `docs: prepare native request capture release notes`
40. [DONE] Git Commit: `docs: prepare native request capture release notes` (hash: `045f9ae07`)
41. [TODO] Выполнить `./scripts/build-all.sh`, перенести/проверить tarball artifacts в `doc/tmp/releases/`; scope: release artifacts and version bumps generated by build scripts; expected commit message: `chore: build native request capture release`
42. [TODO] Git Commit: `chore: build native request capture release` (hash: TBD)
43. [TODO] Выполнить `./scripts/build-release.sh --use-current-version` и проверить VSIX/package output; scope: release package verification; expected commit message: `chore: package native request capture release`
44. [TODO] Git Commit: `chore: package native request capture release` (hash: TBD)

### Stream: Closeout
45. [TODO] Заархивировать completed TODO и planning-doc после release, обновить Docs Index/links; scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Plans/Provider_Native_Request_Capture_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Archive/`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit message: `docs: archive native request capture plan`
46. [TODO] Git Commit: `docs: archive native request capture plan` (hash: TBD)
47. [TODO] Создать новый session report с release artifacts и итоговыми commit hashes; scope: `doc/Sessions/SessionXXX.md`; expected commit message: not required, session report remains final uncommitted closeout artifact unless user asks otherwise
