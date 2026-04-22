# Project Manager Settings And Runtime Ownership Architecture

**Status:** Draft (2026-04-22)
**Created:** 2026-04-22
**Updated:** 2026-04-22
**Owner:** Oleksandr + Codex
**Scope:** Перенести ownership product-level `Settings` в связку `Core + Project Manager`, убрать у `VS Code extension` runtime-UI роль и запретить ему запускать `Core Runtime`, сохранив extension как слой `distribution / install / update`.

**Связанные документы:**
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
- `doc/SolidWorks-WorkFlow/Modules/Localization.md`
- `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`

---

## 1. Problem

Текущий product surface split между двумя UI-точками:

1. **Project Manager** уже является фактическим основным клиентом продукта:
   - workflow tree,
   - sessions,
   - artifacts,
   - recovery UX,
   - standalone desktop entrypoint через launcher shortcut.

2. **VS Code extension webview** исторически сохранил последнюю живую продуктовую функцию:
   - `Settings` как отдельный экран,
   - команду `codeaiHub.openSettings`,
   - activity bar container,
   - собственный settings-only host.

Из-за этого пользовательская модель стала нелогичной:

- основной продукт живёт в `Project Manager`, но ключевая продуктовая конфигурация меняется в другом UI;
- для изменения поведения standalone-приложения пользователь должен понимать, что надо открыть именно VS Code extension shell;
- в acceptance/retest это создаёт искусственную путаницу: продукт уже выглядит как desktop app, но настройки у него живут в историческом хвосте distribution shell.

Дополнительно ownership backend части `Settings` сейчас тоже split:

- **Project Manager** умеет читать `settings:load` из `Core`;
- но `save/reset/update-provider/open-user-glossary-file` живут в extension-host `SettingsMessageHandler`;
- `Core` имеет собственный `SettingsRequestHandler`, но только для `load`/normalization/broadcast/bootstrap.

Третья проблема — runtime ownership:

- extension activation в `src/extension.ts` всё ещё имеет право поднимать `Core Runtime`;
- это противоречит целевой продуктовой модели, где runtime должен запускаться через `Project Manager` bootstrap path, а extension должен быть только средством установки и обновления продукта;
- при этом долгоживущий `Core` как single-instance background runtime уже является intentional product invariant и не должен зависеть от закрытия окна `Project Manager`.

Следовательно, нужен отдельный planning scope, который выровняет ownership по трём границам:

- `Settings backend` -> `Core`;
- `Settings UI` -> `Project Manager`;
- `runtime bootstrap authority` -> `Project Manager`, но не `VS Code extension`.

---

## 2. Product Goal

После завершения этого scope продукт должен восприниматься и работать так:

1. Пользователь устанавливает `VSIX`.
2. Extension выполняет только:
   - distribution,
   - install/bootstrap компонентов,
   - update компонентов.
3. Пользователь открывает `Project Manager` как основной UI продукта.
4. Если `Core Runtime` ещё не запущен после reboot, `Project Manager` bootstrap path поднимает его.
5. Если `Core` уже запущен, `Project Manager` просто attach-ится к existing single instance.
6. Все product-level `Settings` открываются и редактируются только в `Project Manager`.
7. Закрытие `Project Manager` не останавливает `Core`; фоновые turns/sessions продолжают жить.
8. VS Code extension больше не выглядит как второй живой UI продукта.

Критерий архитектурной завершённости:

- существует один backend owner для `settings` (`Core`);
- существует один user-facing settings surface (`Project Manager`);
- extension не имеет права стартовать `Core`;
- settings save/update flow больше не требует открытия VS Code webview.

---

## 3. Non-Goals

Этот scope не должен:

- превращать `Core` в short-lived child process `Project Manager`;
- останавливать `Core` при закрытии `Project Manager`;
- переписывать launcher bootstrap path, который уже умеет поднимать `Core` при standalone старте;
- менять продуктовый контракт multi-workspace background execution;
- превращать `Settings` в workflow-stage внутри tree;
- редизайнить сразу весь shell `Project Manager`;
- удалять extension package как механизм distribution;
- убирать handoff в VS Code для открытия файлов из dialog links.

---

## 4. Core Decisions

### 4.1. `Core` становится единственным backend owner для `Settings`

Все доменные операции вокруг `settings` должны жить в `Core`:

- `load`,
- `save`,
- `reset`,
- migration/normalization,
- localization-impact classification,
- selective localization sync,
- provider-config side effects,
- provider update orchestration,
- broadcasting `settings:*` events в UI clients.

`Project Manager` должен отправлять intent и отображать состояние, но не владеть бизнес-логикой `Settings`.

**Следствие:** текущая логика из extension-side `SettingsMessageHandler` должна быть либо перенесена в `Core`, либо разложена на core-owned handlers/services с теми же контрактами сообщений.

### 4.2. `Project Manager` становится единственным product UI для `Settings`

`SettingsView` уже является shared UI, но сейчас хостится в `settings-only` webview shell. Целевая модель:

- `Project Manager` — единственная живая product surface для `Settings`;
- весь текущий UI `Settings` переносится в `Project Manager` **как есть**, без редизайна и без урезания текущего набора controls;
- `Settings` открываются из PM как **отдельное независимое окно**, а не как overlay и не как встроенный workflow panel;
- новое окно `Settings` не должно ломать или перехватывать текущее состояние Sessions/Artifacts основного окна PM;
- `Settings` не должны встраиваться как workflow step, потому что это global app configuration, а не шаг текущего workspace flow.

### 4.3. `VS Code extension` перестаёт быть runtime UI

После миграции `Settings` extension не должен иметь собственного живого продуктового surface. Он остаётся:

- installer,
- updater,
- distributor,
- compat shell для служебных install/update entrypoints.

Activity bar container и команда `Open Settings` не являются частью целевого состояния.

Допустим переходный этап:

- сначала webview превращается в passive notice / redirect surface;
- затем activity bar surface удаляется полностью.

### 4.4. `VS Code extension` теряет право запускать `Core Runtime`

Новый инвариант:

- extension не вызывает `ensureStarted` / `attachToRunningCore` как runtime authority;
- bootstrap single-instance runtime выполняется через `Project Manager` path;
- extension больше не является actor-ом runtime lifecycle.

Это не меняет persistent-runtime модель:

- `Core` остаётся long-lived background process;
- closing PM не завершает `Core`;
- multi-workspace background turns сохраняются.

### 4.5. `Project Manager` owns startup bootstrap, but not shutdown ownership

`Project Manager` является **bootstrap initiator**, а не lifecycle owner в смысле полного start/stop владения:

- при старте PM делает `ensure core started`;
- если `Core` уже запущен, он attach-ится;
- если `Core` не запущен после reboot, PM поднимает его;
- закрытие PM не останавливает `Core`.

Это фиксирует уже существующую desirable product semantics и отделяет её от старого extension-driven startup path.

### 4.6. Host-specific actions остаются вне `Core`, но перестают быть product logic

Не весь код может жить в `Core`. За пределами `Core` остаются только host-specific adapters:

- открыть файл во внешнем VS Code;
- выбрать папку;
- создать desktop shortcut;
- установить/обновить компоненты;
- OS/launcher bridge.

Но это больше не product backend. Это integration shell.

### 4.7. Placement кнопки `Open Settings` фиксируется заранее

Placement больше не является open question для этого scope.

Принятое решение:

- кнопка `Open Settings` размещается в **самом низу sidebar**;
- кнопка ставится **в правом нижнем углу** footer area;
- текущая надпись `Workflow Tree MVP` сохраняется в footer area и сдвигается **левее** от кнопки;
- entrypoint остаётся global и доступен независимо от выбранного workspace/stage;
- `Settings` не становятся узлом workflow tree и не участвуют в stage/navigation semantics.

---

## 5. Current-State Gap

### 5.1. Backend split

Сейчас `Core` умеет:

- читать `settings.json`,
- нормализовать snapshot,
- публиковать `settings:loaded`,
- строить localization bootstrap/runtime payload.

Но не умеет как единый owner:

- `settings:save`,
- `settings:reset`,
- `settings:update-provider`,
- `settings:open-user-glossary-file`.

### 5.2. UI split

Сейчас есть:

- `SettingsOnlyHost` в `src/client/ui/src/app-host/settings-only-host.tsx`;
- команда `codeaiHub.openSettings`;
- activity bar container/view в extension manifest.

Это и есть legacy UI surface, который должен быть выведен из product path.

### 5.3. Runtime-bootstrap split

Сейчас extension activation path в `src/extension.ts` по-прежнему:

- prepares local runtime,
- initializes `CoreProcessManager`,
- attach/start `Core`.

Это противоречит целевому правилу "extension distributes, PM bootstraps runtime".

---

## 6. Target Architecture

### 6.1. Settings transport

Нужен один transport contract для всех settings operations:

- `settings:load`
- `settings:save`
- `settings:reset`
- `settings:update-provider`
- `settings:versions`
- `settings:save-error`
- `settings:saved`
- `settings:localization-sync-status`

Source-of-truth по этим операциям должен быть только в `Core`.

### 6.2. PM settings shell

`Project Manager` получает:

- global settings entrypoint,
- отдельный window host для shared `SettingsView`,
- full request/response wiring к core-owned settings operations.

Shared UI из `src/client/ui/src/components/settings/*` переиспользуется, а не переписывается заново.

Окно `Settings` должно вести себя как dedicated PM-owned auxiliary window:

- открывается отдельно от основного PM окна;
- может жить независимо от текущего artifact/session selection;
- не использует artifact pane как контейнер;
- не требует редизайна самого `SettingsView`.

### 6.3. Extension shell after migration

Extension shell в целевом состоянии:

- не запускает `Core`;
- не открывает product `Settings`;
- не даёт impression, что sessions/settings живут в VS Code UI;
- остаётся только operational shell для install/update/distribution.

### 6.4. Standalone PM and background runtime

Standalone PM path остаётся canonical desktop usage model:

- shortcut / launcher запускает PM;
- PM ensure-ит `Core`;
- `Core` живёт отдельно от окна;
- subsequent PM launches attach к already-running runtime.

---

## 7. Implementation Streams

### Stream A — Core-owned settings write path

Цель:

- довести `Core` settings handler до parity с нынешним extension-side handler;
- перенести save/reset/provider-update orchestration;
- сделать `Project Manager` полноценным клиентом `Settings` без участия extension webview.

Ключевые seam-ы:

- `packages/core/src/remote-bridge/handlers/settings-request-handler.ts`
- new/extracted core helpers for save/reset/update flow
- `packages/core/src/remote-bridge/types.ts`
- `src/client/project-manager/core-stream-message-types.ts`
- `src/client/project-manager/api.ts`

### Stream B — PM settings entry surface

Цель:

- встроить `SettingsView` в `Project Manager`;
- подключить full settings command flow;
- реализовать global entrypoint в нижнем footer sidebar;
- открыть `Settings` как отдельное independent PM window.

Ключевые seam-ы:

- `src/client/project-manager/app.tsx`
- `src/client/project-manager/components/layout/*`
- `src/client/ui/src/components/settings-view.tsx`
- PM-specific settings window host / wrapper

### Stream C — Extension runtime/UI de-scope

Цель:

- убрать у extension право стартовать `Core`;
- обезвредить/удалить legacy settings webview surface;
- оставить only distribution/install/update responsibilities.

Ключевые seam-ы:

- `src/extension.ts`
- `package.json`
- `src/extension-module/home-view-provider.ts`
- `src/client/ui/src/app-host/settings-only-host.tsx`

### Stream D — SSOT sync

После реализации должны быть синхронно обновлены:

- `SystemArchitecture.md`
- `Clusters/Project_Manager.md`
- `Modules/UI_Bundles.md`
- при необходимости `Modules/Localization.md`

---

## 8. Risks And Constraints

### 8.1. Localization strict sync is not optional

Текущий save-path для localization-impacting settings имеет blocking semantics. При переносе ownership в `Core` нельзя потерять:

- impact classification,
- selective sync planner,
- busy status broadcast,
- blocking contract для PM/new session sends.

### 8.2. Provider update side effects must stay explicit

`settings:update-provider` не должен деградировать в скрытый shell hack в PM. Если update flow остаётся host-specific, `Core` должен владеть intent orchestration и status model, а host adapter — только execution boundary.

### 8.3. `open-user-glossary-file` is host-specific

Открытие glossary file во внешнем редакторе не является core-native действием. Нужен отдельный adapter contract:

- `Core` публикует intent/result,
- host boundary выполняет external open.

Этот seam нельзя потерять при переносе settings backend в `Core`.

### 8.4. Do not break standalone first-start flow

При вырезании extension runtime bootstrap path нельзя сломать:

- install after VSIX,
- shortcut launch,
- first PM start after reboot,
- attach to existing runtime.

---

## 9. Acceptance Criteria For This Planning Scope

Planning-doc считается готовым основанием для `todo-plan.md`, когда:

1. Зафиксирован единственный backend owner для `Settings` — `Core`.
2. Зафиксирован единственный UI owner для `Settings` — `Project Manager`.
3. Зафиксировано, что `Settings` в PM используют текущий UI `SettingsView` без redesign.
4. Зафиксировано, что `Settings` открываются как отдельное независимое окно PM.
5. Зафиксировано, что кнопка `Open Settings` живёт в самом низу sidebar справа от надписи `Workflow Tree MVP`.
6. Зафиксировано, что extension больше не стартует `Core`.
7. Зафиксировано, что `Core` остаётся persistent background runtime и не выключается при close PM.
8. Реализация разбивается минимум на три независимых stream-а:
   - core settings backend,
   - PM settings surface,
   - extension de-scope.

---

## 10. Open Questions Before `todo-plan.md`

1. Нужен ли переходный compat этап:
   - passive notice inside VS Code webview,
   - затем полное удаление activity bar surface?

2. Должна ли команда `Open Project Manager` остаться в extension как удобный operational entrypoint после удаления settings webview?
