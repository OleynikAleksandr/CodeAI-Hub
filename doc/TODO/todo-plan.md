# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules)
- Каждая подзадача затрагивает не более 3 файлов. Перед коммитом прогоняем `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем выполняем таргетную сборку (`npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`). После зелёных гейтов — коммит и обновление плана (дата, статус, хеш).
- Если по факту разработки оказывается, что конкретная задача стрима затрагивает больше 3 файлов — такую задачу дробим и переписываем список задач в стриме.
- Stream (стрим) завершается после того, как все его задачи закрыты таргетными сборками затронутых пакетов/клиентов. Для серийных задач допускается диагностический прогон `npm run build --workspace <package>` по цепочке (например, Claude → Codex → core), чтобы локализовать ошибки без запуска `build-all`.
- Phase (фаза) завершается на чистом дереве: запускаем `./scripts/build-all.sh` (он повышает версии и вызывает `./scripts/build-release.sh --use-current-version`), переносим tarball’ы в `doc/tmp/releases/`, фиксируем результаты в `doc/Sessions/`.
- Любое изменение архитектуры/логики требует синхронного обновления документации и ссылки на соответствующий коммит.
- `doc/TODO/todo-plan.md` необходимо постоянно в реальном времени обновлять: после каждого коммита его номер и наименование заносить, статус задачи тут же менять.

---

## Фаза 3 — Модульный UI (UI Modularization) (owner: Codex, updated: 2025-11-23)

### Stream: UI manifest & types (манифест и типы UI)
1. [DONE] Определить схему UI-манифеста и создать начальный `assets/ui/manifest.json` — scope: `assets/ui/manifest.json`; target commit: `feat: add ui manifest schema` (3346056)
2. [DONE] Ввести общие типы для UI и публичную точку входа модуля — scope: `src/extension-module/ui/ui-types.ts`, `src/extension-module/ui/index.ts`; target commit: `feat: add ui module types and entrypoint` (4741aa3)
3. [DONE] Реализовать `readUIManifest` с базовой валидацией — scope: `src/extension-module/ui/ui-manifest-reader.ts`, `src/extension-module/ui/ui-types.ts`; target commit: `feat: add ui manifest reader` (976dbb4)
4. [DONE] Покрыть `UIManifestReader` модульными тестами — scope: `src/__tests__/ui-manifest-reader.test.ts`; target commit: `test: cover ui manifest reader` (24173b6)

### Stream: UI registry & local state (реестр UI и локальное состояние)
1. [TODO] Реализовать `UIRegistry` для локального `~/.codeai-hub/ui/manifest.json` — scope: `src/extension-module/ui/ui-registry.ts`, `src/extension-module/ui/ui-types.ts`; target commit: `feat: add ui registry`
2. [TODO] Добавить вспомогательные функции для атомарной записи файла реестра UI — scope: `src/extension-module/ui/ui-registry.ts`; target commit: `feat: ensure atomic ui registry writes`
3. [TODO] Реализовать семантику `getInstalled`/`registerInstallation`/`unregister` — scope: `src/extension-module/ui/ui-registry.ts`; target commit: `feat: finalize ui registry api`
4. [TODO] Добавить тесты для `UIRegistry` (happy-path и обработка повреждённого состояния) — scope: `src/__tests__/ui-registry.test.ts`; target commit: `test: add ui registry tests`

### Stream: UI bundle installer (one-shot, offline) (установщик UI-бандлов, одноразовый, офлайн)
1. [TODO] Создать каркас класса `UIBundleInstaller` и его публичного API — scope: `src/extension-module/ui/ui-bundle-installer.ts`, `src/extension-module/ui/ui-types.ts`; target commit: `feat: scaffold ui bundle installer`
2. [TODO] Реализовать поиск архивов в `downloads/` и `~/.codeai-hub/releases/` (без сети) — scope: `src/extension-module/ui/ui-bundle-installer.ts`, `src/extension-module/runtime/runtime-files.ts`; target commit: `feat: resolve ui archives from local caches`
3. [TODO] Интегрировать проверку SHA-1 через общие helper’ы — scope: `src/extension-module/ui/ui-bundle-installer.ts`, `src/extension-module/cef/launcher-install-helpers.ts`; target commit: `feat: validate ui bundles sha1`
4. [TODO] Реализовать распаковку в `~/.codeai-hub/ui/{bundleId}/{version}/` и создание symlink `current` — scope: `src/extension-module/ui/ui-bundle-installer.ts`; target commit: `feat: install ui bundles to user home`
5. [TODO] Связать `UIBundleInstaller` с `UIRegistry` (регистрация установок, идемпотентные повторные вызовы) — scope: `src/extension-module/ui/ui-bundle-installer.ts`, `src/extension-module/ui/ui-registry.ts`; target commit: `feat: persist ui installation state`
6. [TODO] Добавить тесты для `UIBundleInstaller.ensureUIBundle` и `resolveCurrentUIPath` — scope: `src/__tests__/ui-bundle-installer.test.ts`; target commit: `test: cover ui bundle installer`

### Stream: UI update checker (local-only) (проверка обновлений UI, только локальные кеши)
1. [TODO] Создать каркас `UIUpdateChecker`, использующий `UIBundleInstaller` — scope: `src/extension-module/ui/ui-update-checker.ts`, `src/extension-module/ui/ui-types.ts`; target commit: `feat: scaffold ui update checker`
2. [TODO] Реализовать `checkForUpdates`, сравнивающий манифест и установленные версии — scope: `src/extension-module/ui/ui-update-checker.ts`, `src/extension-module/ui/ui-manifest-reader.ts`; target commit: `feat: compute ui update info`
3. [TODO] Реализовать `applyUpdates` с поэтапной моделью прогресса — scope: `src/extension-module/ui/ui-update-checker.ts`, `src/extension-module/ui/ui-bundle-installer.ts`; target commit: `feat: apply ui updates with progress`
4. [TODO] Добавить тесты для `UIUpdateChecker` (без сети, только локальные кеши) — scope: `src/__tests__/ui-update-checker.test.ts`; target commit: `test: cover ui update checker`

### Stream: Build scripts & manifests wiring (сборочные скрипты и связка манифестов)
1. [TODO] Добавить `scripts/update-ui-manifest.js` для синхронизации `assets/ui/manifest.json` — scope: `scripts/update-ui-manifest.js`, `assets/ui/manifest.json`; target commit: `chore: add ui manifest update script`
2. [TODO] Добавить универсальный `scripts/build-ui-bundle.sh` для `vscode-webview`/`web-client`/будущих бандлов — scope: `scripts/build-ui-bundle.sh`; target commit: `chore: add ui bundle build script`
3. [TODO] Добавить обёртки `build-ui-vscode-webview.sh` и `build-ui-web-client.sh` — scope: `scripts/build-ui-vscode-webview.sh`, `scripts/build-ui-web-client.sh`; target commit: `chore: add ui bundle wrapper scripts`
4. [TODO] Включить UI build scripts в пайплайн `scripts/build-all.sh` — scope: `scripts/build-all.sh`; target commit: `chore: integrate ui bundles into build-all`
5. [TODO] Добавить npm-скрипты для сборки UI в `package.json` — scope: `package.json`; target commit: `chore: add ui build npm scripts`

### Stream: Extension integration (webview & launcher) (интеграция в расширение и лаунчер)
1. [TODO] Обновить `extension.ts`, чтобы путь к webview UI резолвился через `UIBundleInstaller` (без тяжёлой работы в `activate`) — scope: `src/extension.ts`, `src/extension-module/ui/ui-bundle-installer.ts`; target commit: `feat: resolve webview ui path from installer`
2. [TODO] Рефакторить `HomeViewProvider`, чтобы принимать `uiRootPath` и загружать HTML из UI-бандла — scope: `src/extension-module/home-view-provider.ts`; target commit: `feat: load webview ui from bundle path`
3. [TODO] Изменить генератор конфигурации CEF launcher, чтобы `uiRoot`/`url` указывали на UI-бандл — scope: `src/extension-module/cef/launcher.ts`; target commit: `feat: point cef launcher to packaged ui`
4. [TODO] Добавить минимальную диагностику/логирование отсутствующих UI-бандлов при активации — scope: `src/extension.ts`, `src/extension-module/logging/extension-logger.ts`; target commit: `feat: log missing ui bundles on activation`

### Stream: Packages layout migration (`~/.codeai-hub/packages/**`) (миграция в layout packages)
1. [TODO] Реализовать первичное зеркалирование из `~/.codeai-hub/ui/**` в `~/.codeai-hub/packages/ui/**` в инсталлере — scope: `src/extension-module/ui/ui-bundle-installer.ts`; target commit: `feat: mirror ui bundles into packages layout`
2. [TODO] Обновить установщик/конфиг Launcher CEF для чтения лаунчера из `~/.codeai-hub/packages/launcher/**` (с сохранением совместимости со старым layout) — scope: `src/extension-module/cef/launcher-installer.ts`, `src/extension-module/cef/launcher.ts`; target commit: `feat: support launcher packages layout`
3. [TODO] Согласовать `Local_Artifacts_Workflow.md` с семантикой layout `packages` (core/providers/launcher/ui) — scope: `doc/Project_Docs/knowledge/Local_Artifacts_Workflow.md`; target commit: `docs: document packages layout for artifacts`
4. [TODO] Добавить валидацию в `UIRegistry`/installer для поддержки смешанного layout `ui/` и `packages/ui/` во время миграции — scope: `src/extension-module/ui/ui-registry.ts`, `src/extension-module/ui/ui-bundle-installer.ts`; target commit: `feat: support dual ui layouts during migration`

### Stream: Documentation & architecture alignment (документация и синхронизация архитектуры)
1. [TODO] Завершить стек-документ `UI_Modules` для UI-пакетов — scope: `doc/Project_Docs/Stacks/UI_Modules.md`; target commit: `docs: add ui modules stack`
2. [TODO] Синхронизировать UI-раздел в `Architecture.md` с планом модульного UI и офлайн-ограничениями — scope: `doc/Architecture/Architecture.md`; target commit: `docs: align architecture with ui modularization`
3. [TODO] Синхронизировать `SystemArchitecture.md` с UI-бандлами и layout `packages` (core/providers/launcher/ui) — scope: `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; target commit: `docs: describe ui bundles in system architecture`
4. [TODO] Убедиться, что `UI_Modularization_Architecture.md` отражает фактически реализованные installer/update-потоки — scope: `doc/Project_Docs/UI_Modularization_Architecture.md`; target commit: `docs: update ui modularization architecture post-implementation`

### Stream: End-to-end verification & release prep (e2e-проверка и подготовка релиза)
1. [TODO] Запустить таргетные сборки для UI-воркспейсов и webview (`npm run build --workspace <ui packages>`, `npm run build:webview`, `npm run typecheck:webview`) — scope: `package.json`, CI/build notes`; target commit: `chore: verify ui builds and typechecking`
2. [TODO] Провести ручной e2e: свежая установка VSIX при наличии локальных UI-бандлов в `~/.codeai-hub/releases/` — scope: `doc/Sessions/SessionXXX.md`; target commit: `docs: record ui modularization e2e results`
3. [TODO] Проверить, что лаунчер и VS Code webview оба читают UI из `~/.codeai-hub/packages/ui/**`, не опираясь на встроенные ассеты — scope: `doc/Sessions/SessionXXX.md`, `doc/Project_Docs/Stacks/Launcher_CEF_Module.md`; target commit: `docs: confirm ui shared packages layout`
4. [TODO] Закрыть Фазу 3, выполнив `./scripts/build-all.sh` на чистом дереве, и зафиксировать итоговые версии/tarball’ы — scope: `doc/Sessions/SessionXXX.md`, `doc/tmp/releases/**`; target commit: `chore: ui modularization phase 3 complete`
