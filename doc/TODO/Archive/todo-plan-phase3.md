# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules)
- Каждая подзадача затрагивает не более 3 файлов. Перед коммитом прогоняем `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем выполняем таргетную сборку (`npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`). После зелёных гейтов — коммит и обновление плана (дата, статус, хеш).
- Если по факту разработки оказывается, что конкретная задача стрима затрагивает больше 3 файлов — такую задачу дробим и переписываем список задач в стриме.
- Stream (стрим) завершается после того, как все его задачи закрыты таргетными сборками затронутых пакетов/клиентов. Для серийных задач допускается диагностический прогон `npm run build --workspace <package>` по цепочке (например, Claude → Codex → core), чтобы локализовать ошибки без запуска `build-all`.
- Phase (фаза) завершается на чистом дереве: запускаем `./scripts/build-all.sh` (он повышает версии и вызывает `./scripts/build-release.sh --use-current-version`), переносим tarball’ы в `doc/tmp/releases/`, фиксируем результаты в `doc/Sessions/`.
- Любое изменение архитектуры/логики требует синхронного обновления документации и ссылки на соответствующий коммит.
- `doc/TODO/todo-plan.md` необходимо постоянно в реальном времени обновлять: после каждого коммита его номер и наименование заносить, статус задачи тут же менять.

---

## Фаза 3 — Модульный UI (UI Modularization) (owner: Codex, updated: 2025-11-24)

### Stream: UI manifest & types (манифест и типы UI)
1. [DONE] Определить схему UI-манифеста и создать начальный `assets/ui/manifest.json` — scope: `assets/ui/manifest.json`; target commit: `feat: add ui manifest schema` (3346056)
2. [DONE] Ввести общие типы для UI и публичную точку входа модуля — scope: `src/extension-module/ui/ui-types.ts`, `src/extension-module/ui/index.ts`; target commit: `feat: add ui module types and entrypoint` (4741aa3)
3. [DONE] Реализовать `readUIManifest` с базовой валидацией — scope: `src/extension-module/ui/ui-manifest-reader.ts`, `src/extension-module/ui/ui-types.ts`; target commit: `feat: add ui manifest reader` (976dbb4)
4. [DONE] Покрыть `UIManifestReader` модульными тестами — scope: `src/__tests__/ui-manifest-reader.test.ts`; target commit: `test: cover ui manifest reader` (24173b6)

### Stream: UI registry & local state (реестр UI и локальное состояние)
1. [DONE] Реализовать `UIRegistry` для локального `~/.codeai-hub/ui/registry.json` — scope: `src/extension-module/ui/ui-registry.ts`, `src/extension-module/ui/ui-types.ts`; target commit: `feat: add ui registry` (c74c483)
2. [DONE] Добавить вспомогательные функции для атомарной записи файла реестра UI — scope: `src/extension-module/ui/ui-registry.ts`; target commit: `feat: ensure atomic ui registry writes` (5f5c4e5)
3. [DONE] Реализовать семантику `getInstalled`/`registerInstallation`/`unregister` — scope: `src/extension-module/ui/ui-registry.ts`; target commit: `feat: finalize ui registry api` (5f5c4e5)
4. [DONE] Добавить тесты для `UIRegistry` (happy-path и обработка повреждённого состояния) — scope: `src/__tests__/ui-registry.test.ts`; target commit: `test: add ui registry tests` (d12d637)

### Stream: UI bundle installer (one-shot, offline) (установщик UI-бандлов, одноразовый, офлайн)
1. [DONE] Реализовать полный `UIBundleInstaller` (каркас, поиск архивов, SHA-1, распаковка, регистрация) — scope: `src/extension-module/ui/ui-installer.ts`; target commit: `feat: implement ui bundle installer` (d0edd26)
6. [TODO] Добавить тесты для `UIBundleInstaller.ensureUIBundle` и `resolveCurrentUIPath` — scope: `src/__tests__/ui-bundle-installer.test.ts`; target commit: `test: cover ui bundle installer`

### Stream: UI update checker (local-only) (проверка обновлений UI, только локальные кеши)
1. [DONE] Реализовать полный `UIUpdateChecker` (scaffold, checkForUpdates, applyUpdates) — scope: `src/extension-module/ui/ui-update-checker.ts`; target commit: `feat: add ui bundle helpers` (5c4eacc)

### Stream: Build scripts & manifests wiring (сборочные скрипты и связка манифестов)
1. [DONE] Создать универсальный `scripts/build-ui-bundle.sh` для упаковки UI бандлов — scope: `scripts/build-ui-bundle.sh`; target commit: `chore: update ui bundle build pipeline` (dfef274)
2. [DONE] Интегрировать UI builds в `scripts/build-all.sh` — scope: `scripts/build-all.sh`; target commit: `chore: update ui bundle build pipeline` (dfef274)

### Stream: Extension integration (интеграция в расширение)
1. [DONE] Исключить UI bundle из VSIX (.vscodeignore) — scope: `.vscodeignore`; target commit: `chore: exclude ui bundle from vsix` (808d721)
2. [DONE] Добавить helper для резолва UI bundle path с fallback на embedded UI — scope: `src/extension-module/ui/ui-path-resolver.ts`, `src/extension-module/ui/index.ts`; target commit: `feat: add ui bundle helpers` (5c4eacc)
3. [DONE] Обновить `extension.ts` для использования UI path resolver — scope: `src/extension.ts`; target commit: `feat: install ui bundles during activation` (c674990)
4. [DONE] Обновить `HomeViewProvider` для загрузки UI из resolved path — scope: `src/extension-module/home-view-provider.ts`, `src/core/webview-module/webview-html-generator.ts`; target commit: `feat: use resolved ui bundle for webview` (42c43a8)
5. [DONE] Обновить launcher config для использования packages/ui — scope: `src/extension-module/cef/launcher.ts`; target commit: `feat: install ui bundles during activation` (c674990)
6. [DONE] Добавить логирование UI bundle status при активации — scope: `src/extension.ts`; target commit: `feat: install ui bundles during activation` (c674990)

### Stream: Packages layout migration (`~/.codeai-hub/packages/**`) (миграция в layout packages)
1. [DONE] Реализовать первичное зеркалирование из `~/.codeai-hub/ui/**` в `~/.codeai-hub/packages/ui/**` в инсталлере — scope: `src/extension-module/ui/ui-bundle-installer.ts`; target commit: `feat: mirror ui bundles into packages layout` (COMMIT_HASH)
2. [DONE] Обновить установщик/конфиг Launcher CEF для чтения лаунчера из `~/.codeai-hub/packages/launcher/**` (с сохранением совместимости со старым layout) — scope: `src/extension-module/cef/launcher-installer.ts`, `src/extension-module/cef/launcher.ts`; target commit: `feat: support launcher packages layout` (b9cacb1)
3. [DONE] Согласовать `Local_Artifacts_Workflow.md` с семантикой layout  `packages` (core/providers/launcher/ui) — scope: `doc/SolidWorks-Flow/knowledge/Local_Artifacts_Workflow.md`; target commit: `docs: document packages layout migration` (678b997)
4. [DONE] Добавить валидацию в `UIRegistry`/installer для поддержки смешанного layout `ui/` и `packages/ui/` во время миграции — scope: `src/extension-module/ui/ui-registry.ts`, `src/extension-module/ui/ui-bundle-installer.ts`; target commit: `feat: harden ui bundle layout resolution` (f4da74f)

### Stream: Documentation & architecture alignment (документация и синхронизация архитектуры)
1. [DONE] Завершить стек-документ `UI_Modules` для UI-пакетов — scope: `doc/SolidWorks-Flow/Stacks/UI_Modules.md`; target commit: `docs: add ui modules stack`
2. [DONE] Синхронизировать UI-раздел в `Architecture.md` с планом модульного UI и офлайн-ограничениями — scope: `doc/Architecture/Architecture.md`; target commit: `docs: align architecture with ui modularization`
3. [DONE] Синхронизировать `SystemArchitecture.md` с UI-бандлами и layout `packages` (core/providers/launcher/ui) — scope: `doc/SolidWorks-Flow/System/SystemArchitecture.md`; target commit: `docs: describe ui bundles in system architecture`
4. [DONE] Убедиться, что `UI_Modularization_Architecture.md` отражает фактически реализованные installer/update-потоки — scope: `doc/SolidWorks-Flow/System/UI_Modularization_Architecture.md`; target commit: `docs: update ui modularization architecture post-implementation`

### Stream: End-to-end verification & release prep (e2e-проверка и подготовка релиза)
1. [DONE] Запустить таргетные сборки для UI-воркспейсов и webview (`npm run build --workspace <ui packages>`, `npm run build:webview`, `npm run typecheck:webview`) — scope: `package.json`, CI/build notes`; target commit: `chore: verify ui builds and typechecking`
2. [DONE] Провести ручной e2e: свежая установка VSIX при наличии локальных UI-бандлов в `~/.codeai-hub/releases/` — scope: `doc/Sessions/SessionXXX.md`; target commit: `docs: record ui modularization e2e results`
3. [DONE] Проверить, что лаунчер и VS Code webview оба читают UI из `~/.codeai-hub/packages/ui/**`, не опираясь на встроенные ассеты — scope: `doc/Sessions/SessionXXX.md`, `doc/SolidWorks-Flow/Stacks/Launcher_CEF_Module.md`; target commit: `docs: confirm ui shared packages layout`
4. [DONE] Закрыть Фазу 3, выполнив `./scripts/build-all.sh` на чистом дереве, и зафиксировать итоговые версии/tarball’ы — scope: `doc/Sessions/SessionXXX.md`, `doc/tmp/releases/**`; target commit: `chore: ui modularization phase 3 complete`
