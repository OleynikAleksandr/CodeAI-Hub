# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- TODO Plan состоит из Phase (Фаз). В каждой Phase несколько Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md` (THIS FILE)
3. `doc/Sessions/Session033.md`

---

## Phase 65 — Decommission web-client + vscode-webview Settings-only (owner: Oleksandr, updated: 2026-01-21)

### Stream: Design — контракт отключения UI клиентов
1. [DONE] Docs: зафиксировать контракт: единственный активный UI-клиент Core во время разработки FLOW = Project Manager; `vscode-webview` работает только как Settings UI (без сессий/чатов/подключения к Core); `web-client` удаляем полностью — scope: `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`, `doc/Project_Docs/SystemArchitecture/ProjectStructureMap.md`; expected commit message: `docs(arch): align docs with web-client deprecation`
2. [DONE] Git Commit: `docs(arch): align docs with web-client deprecation` (hash: 834f865d)
3. [DONE] Docs: выровнять SolidWorks-Flow docs под Project Manager-only режим — scope: `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`, `doc/SolidWorks-Flow/README.md`; expected commit message: `docs(solidworks-flow): reflect project-manager-only mode`
4. [DONE] Git Commit: `docs(solidworks-flow): reflect project-manager-only mode` (hash: 02a3e466)
5. [DONE] Docs: зафиксировать deprecate `web-client` в UI/CEF документации — scope: `doc/Project_Docs/Stacks/Launcher_CEF_Module.md`, `doc/Project_Docs/Stacks/UI_Modules.md`, `doc/Project_Docs/knowledge/guides/Local_Artifacts_Workflow.md`; expected commit message: `docs(ui): deprecate web-client in docs`
6. [DONE] Git Commit: `docs(ui): deprecate web-client in docs` (hash: f5dd78c1)

### Stream: Remove — web-client (полная зачистка)
1. [DONE] Remove: убрать `scripts/build-web-client.js` и npm script `build:web-client`/упоминания — scope: `scripts/build-web-client.js`, `package.json`; expected commit message: `chore(build): remove web-client build script`
2. [DONE] Git Commit: `chore(build): remove web-client build script` (hash: be9f0df1)

3. [DONE] Remove: вычистить `build-all`/`build-release` от сборки/установки web-client (и артефактов/manifest записей) — scope: `scripts/build-all.sh`, `scripts/build-release.sh`, `assets/ui/manifest.json`; expected commit message: `chore(release): remove web-client from build pipelines`
4. [DONE] Git Commit: `chore(release): remove web-client from build pipelines` (hash: 2449f6c1)

5. [DONE] Remove: убрать web-client bundle id из UI registry/activation и тестов — scope: `src/extension-module/ui/ui-types.ts`, `src/extension-module/ui/ui-activation.ts`, `src/__tests__/ui-registry.test.ts`; expected commit message: `chore(web-client): remove bundle id from ui registry`
6. [DONE] Git Commit: `chore(web-client): remove bundle id from ui registry` (hash: 98d8c3ac)

7. [DONE] Remove: убрать `launchWebClient` команду и роутинг в extension/handler — scope: `src/extension.ts`, `src/extension-module/home-view-message-router/command-handler.ts`, `src/extension-module/home-view-message-router/message-types.ts`; expected commit message: `chore(web-client): drop launch command wiring`
8. [DONE] Git Commit: `chore(web-client): drop launch command wiring` (hash: 91615862)

9. [DONE] Remove: убрать `launchWebClient` contribution из `package.json` — scope: `package.json`; expected commit message: `chore(web-client): remove command contribution`
10. [DONE] Git Commit: `chore(web-client): remove command contribution` (hash: 2d8c9e32)

11. [DONE] Remove: удалить extension-module web-client shortcut manager и его использование — scope: `src/extension-module/web-client/`, `src/extension-module/cef/launcher-setup.ts`; expected commit message: `chore(web-client): remove launcher shortcut integration`
12. [DONE] Git Commit: `chore(web-client): remove launcher shortcut integration` (hash: 00c2f9f3)

13. [DONE] Remove: удалить web-client UI исходники и tsconfig ссылки — scope: `src/client/web-client/`, `tsconfig.json`, `tsconfig.webview.json`; expected commit message: `chore(web-client): delete ui sources and tsconfig refs`
14. [DONE] Git Commit: `chore(web-client): delete ui sources and tsconfig refs` (hash: 8b87b426)

15. [DONE] Remove: вычистить build-ui-bundle/release-utils от web-client — scope: `scripts/build-ui-bundle.sh`, `scripts/release-utils.sh`; expected commit message: `chore(web-client): remove build bundle wiring`
16. [DONE] Git Commit: `chore(web-client): remove build bundle wiring` (hash: 71af889a)

17. [DONE] Remove: удалить web-client media assets и biome ignore — scope: `media/web-client/`, `biome.jsonc`; expected commit message: `chore(web-client): remove media assets`
18. [DONE] Git Commit: `chore(web-client): remove media assets` (hash: 3911f50f)

19. [TODO] Gates: убедиться, что `ts-prune`/typecheck не находят мёртвых ссылок на web-client; сборки `build:webview` и `build:project-manager` зелёные — scope: no files; expected commit message: `docs: record web-client removal gates`
20. [TODO] Git Commit: `docs: record web-client removal gates` (hash: TBD)

### Stream: Change — vscode-webview Settings-only
1. [TODO] Change: отключить подключение к Core и сессионный UI в `vscode-webview`; оставить только Settings (и безопасный экран-заглушку) — scope: `src/client/ui/src/app-host.tsx`, `src/client/ui/src/app-host/session-store.ts`, `src/client/ui/src/components/settings/settings-view.tsx`; expected commit message: `fix(vscode-webview): run settings-only mode`
2. [TODO] Git Commit: `fix(vscode-webview): run settings-only mode` (hash: TBD)

3. [TODO] Change: обновить роутинг/extension-message router так, чтобы команды/сообщения, связанные с чатами/сессиями, не активировали UI, а возвращали подсказку “Use Project Manager” — scope: `src/extension-module/home-view-message-router/`, `src/client/ui/src/app-host/webview-message-handler.ts`, `src/client/ui/src/app-host/webview-message-types.ts`; expected commit message: `fix(vscode-webview): route sessions to project-manager`
4. [TODO] Git Commit: `fix(vscode-webview): route sessions to project-manager` (hash: TBD)

5. [TODO] Rebuild: пересобрать webview bundle и обновить артефакты/manifest — scope: `media/react-chat.js`, `assets/ui/manifest.json`; expected commit message: `chore(webview): rebuild settings-only bundle`
6. [TODO] Git Commit: `chore(webview): rebuild settings-only bundle` (hash: TBD)

### Stream: Release build — next verification
1. [TODO] Release(build): собрать verification build после удаления web-client и Settings-only webview — scope: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`; expected commit message: `chore(release): build verification (no web-client)`
2. [TODO] Git Commit: `chore(release): build verification (no web-client)` (hash: TBD)

3. [TODO] Docs(release): обновить `README.md` + `CHANGELOG.md` (описать removal web-client и Settings-only webview) — scope: `README.md`, `CHANGELOG.md`; expected commit message: `docs(release): note web-client removal`
4. [TODO] Git Commit: `docs(release): note web-client removal` (hash: TBD)

5. [TODO] Docs(todo): зафиксировать выполнение Phase 65 задач и хеши коммитов — scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record phase65 web-client removal`
6. [TODO] Git Commit: `docs(todo): record phase65 web-client removal` (hash: TBD)
