# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Project_Docs/SystemArchitecture/SessionUI_SessionKind_And_Settings_Architecture.md`
3. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 72 — Fix SessionTabs label + Project Manager settings source (owner: Oleksandr, updated: 2026-01-22)

### Stream 0: Design approval
**Goal:** Утвердить контракт: runSlug в session:create + settings:load через Core Remote Bridge.

1. [DONE] Docs(arch): review/approve `SessionUI_SessionKind_And_Settings_Architecture.md` — scope: `doc/Project_Docs/SystemArchitecture/SessionUI_SessionKind_And_Settings_Architecture.md`; expected commit message: `docs(arch): approve session metadata + PM settings contract`
2. [DONE] Git Commit: `docs(arch): approve session metadata + PM settings contract` (hash: TBD)

---

### Stream 1: Fix SessionTabs label via runSlug end-to-end
**Goal:** При resume reviewer session вкладка показывает `Reviewer ...` (не `Description ...`).

1. [DONE] Fix(core): принять `runSlug` в `IncomingMessage.session:create` и пробросить в `RemoteBridge.handleIncomingMessage` → `SessionRequestHandler.handleCreate` — scope: `packages/core/src/remote-bridge/types.ts`, `packages/core/src/remote-bridge/index.ts`; expected commit message: `fix(core): accept runSlug in session:create`
2. [DONE] Git Commit: `fix(core): accept runSlug in session:create` (hash: 4e4470bf)

3. [DONE] Fix(core): сериализовать `runSlug` в `serializeSession()` — scope: `packages/core/src/remote-bridge/types.ts`; expected commit message: `fix(core): expose runSlug in serialized sessions`
4. [DONE] Git Commit: `fix(core): expose runSlug in serialized sessions` (hash: 975e9dcf)

5. [DONE] Fix(ui): принять `runSlug` в `ServerSession` и `sanitizeSession` — scope: `src/client/ui/src/core-bridge/types.ts`, `src/client/ui/src/core-bridge/normalizers.ts`; expected commit message: `fix(ui): accept runSlug in session payload`
6. [DONE] Git Commit: `fix(ui): accept runSlug in session payload` (hash: c3f268cf)

7. [DONE] Fix(ui): в `SessionTabs` вычислять agent label из `sessionKind ?? (stage+runSlug fallback)` — scope: `src/client/ui/src/session/session-tabs.tsx`; expected commit message: `fix(ui): derive agent label from runSlug`
8. [DONE] Git Commit: `fix(ui): derive agent label from runSlug` (hash: 73a78468)

---

### Stream 2: Project Manager: load Settings via Core Remote Bridge
**Goal:** PM получает реальные settings и StatusPanel показывает корректные model/reasoning.

1. [DONE] Feat(core): добавить типы сообщений `settings:load`/`settings:loaded` — scope: `packages/core/src/remote-bridge/types.ts`; expected commit message: `feat(core): add settings bridge message types`
2. [DONE] Git Commit: `feat(core): add settings bridge message types` (hash: 35816fa2)

3. [TODO] Feat(core): реализовать handler `SettingsRequestHandler` (читает `config.claudeSettingsPath`) — scope: `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`; expected commit message: `feat(core): add settings request handler`
4. [TODO] Git Commit: `feat(core): add settings request handler` (hash: TBD)

5. [TODO] Feat(core): подключить handler в `RemoteBridge` и обработать `IncomingMessage.settings:load` — scope: `packages/core/src/remote-bridge/index.ts`, `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`; expected commit message: `feat(core): wire settings:load into remote bridge`
6. [TODO] Git Commit: `feat(core): wire settings:load into remote bridge` (hash: TBD)

7. [TODO] Feat(project-manager): добавить `api.loadSettings()` + отправку `settings:load` — scope: `src/client/project-manager/api.ts`; expected commit message: `feat(project-manager): request settings from core`
8. [TODO] Git Commit: `feat(project-manager): request settings from core` (hash: TBD)

9. [TODO] Feat(project-manager): добавить hook/state для settings (слушает `settings:loaded`) — scope: `src/client/project-manager/components/settings/use-project-manager-settings.ts`; expected commit message: `feat(project-manager): store settings from core`
10. [TODO] Git Commit: `feat(project-manager): store settings from core` (hash: TBD)

11. [TODO] Fix(project-manager): использовать PM settings state при `createInitialSnapshot` и `useSettingsModelsSync` — scope: `src/client/project-manager/components/sessions/project-manager-session-view.tsx`, `src/client/project-manager/components/settings/use-project-manager-settings.ts`; expected commit message: `fix(project-manager): use core settings for model info`
12. [TODO] Git Commit: `fix(project-manager): use core settings for model info` (hash: TBD)

---

### Stream 3: Verification + release build
**Goal:** Подтвердить, что обе проблемы решены, и собрать релиз.

1. [TODO] Verify(manual): клик по узлу reviewer session → вкладка `Reviewer Codex`; StatusPanel показывает `gpt-5.2 (high)` — scope: manual; expected commit message: `docs: record session tabs + models verification`
2. [TODO] Git Commit: `docs: record session tabs + models verification` (hash: TBD)

3. [TODO] Build: прогнать гейты + таргетные сборки (`npm run build --workspace @codeai-hub/core`, `npm run build:web-client`, `npm run build:webview`) — scope: scripts; expected commit message: `chore: verify builds for session UI fixes`
4. [TODO] Git Commit: `chore: verify builds for session UI fixes` (hash: TBD)

5. [TODO] Release: `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version` — scope: scripts; expected commit message: `chore(release): build next version`
6. [TODO] Git Commit: `chore(release): build next version` (hash: TBD)
