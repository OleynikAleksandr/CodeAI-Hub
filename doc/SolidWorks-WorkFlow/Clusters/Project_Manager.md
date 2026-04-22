# Project Manager — Cluster (SSOT)

## 0) Start here (контекст + контракты)

- System: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Workflow steps: `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
- Description step contract: `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
- Description UI copy contract: `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_DescriptionEntry_CopyRefactor.md`
- Workspace Runtime (wire + lock): `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
- Session UI laws (lock/unlock): `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
- Input lock SSOT/state machine: `doc/SolidWorks-WorkFlow/Contracts/SessionInputLock_SSOT_StateMachine.md`
- Dialog routing (messages vs status): `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- Workflow navigation SSOT (stage selection): `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkflowNavigation_SSOT.md`
- Session Continuity: `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
- Session UI panel inventory: `doc/SolidWorks-WorkFlow/Modules/Session_UI/README.md`
- UI bundles: `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
- Launcher: `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`

## 1) Назначение

Project Manager — основной UI‑клиент CodeAI Hub (CEF bundle), который:
- показывает Workflow Tree;
- открывает Sessions/Artifacts;
- является единственным живым Settings UI через in-shell takeover правой панели;
- управляет выбором/открытием диалогов через intent `pm:dialog:open`;
- гидратирует историю (cold start) и live tail (WS);
- отображает lock/continuity/usage и обеспечивает recovery UX;
- является единственной user-facing runtime bootstrap authority для живого Core workflow.

## 2) Где живёт код

- PM bundle: `src/client/project-manager/`
- Shared Session UI: `src/client/ui/src/`

## 3) Ключевой UX контракт (коротко)

- Input lock — snapshot-first (не вычисляется из stream сообщений).
- До `Submit questionnaire` в стадии `Description` runtime-сессии нет:
  - левая панель показывает Description Help,
  - правая панель показывает редактор `questionnaire.md`.
- После `Submit questionnaire` создаётся runtime-сессия Description:
  - левая панель возвращается к Session UI,
  - правая панель имеет переключатель `Artifacts/Help`.
- Для idle trunk stages `Virtual Simulation` и `Diagram Modules`, у которых ещё нет continuity session:
  - левая панель `Sessions` показывает confirmation card вместо session view;
  - card показывает upstream artifact, helper warning, inline provider selector и `Start step`;
  - default provider наследуется от предыдущего trunk step (`Description -> Virtual Simulation`, `Virtual Simulation -> Diagram Modules`);
  - пользователь может оставить inherited provider и запустить шаг одним кликом или явно переключить provider до старта;
  - как только continuity session уже существует, selector исчезает вместе с confirmation card и PM возвращается к обычному resume/open-session поведению.
- В Description UI не допускаются термины/ветвления `description.md` и auto-reviewer.
- Для `Diagram Modules` правая панель использует контракт `Artifacts/Help` (Source mode убран):
  - `Artifacts` по умолчанию открывает визуальный Module Graph, построенный из staged product-part файлов через nested CSS Grid (React Flow удалён в релизе `1.1.921`);
  - `*.flow.json` не показывается пользователю как артефакт; с релиза `1.1.922` sidecar v2 хранит также declarative CSS Grid layout params;
  - кнопка `Detach` в artifact header (слева от `Artifacts`) открывает граф в отдельном CEF popup; оба окна используют один sidecar файл и синхронизируются через `BroadcastChannel("pm:diagram:sidecar-sync")` после write.
- Settings surface belongs to PM:
  - footer status bar action `Open Settings` переключает правую панель PM в отдельный in-shell settings mode без второго окна;
  - settings mode reuses shared `SettingsView`, but runs through PM-owned transport/state hooks and sends write intents directly into Core remote bridge;
  - закрытие Settings возвращает предыдущий right-panel context вместо закрытия PM window;
  - PM settings general tab снова показывает shared `Core Controls`, а `Restart Core` routed through PM host bridge for both VS Code-host and standalone launcher-host;
  - blocking localization overlay inside Settings показывается только при реальном strict localization sync busy-state, а provider-only saves не должны отображаться как localization rebuild.
- Видимая diagram surface в PM больше не показывает `Auto-layout`, profile chooser, inline semantic editors, zoom/fit controls или bottom-right minimap. Пользователь композирует диаграмму через:
  - right-click context menu на ProductPart: `columns` (`auto` | 2..5), `targetAspectRatio` (`landscape` | `wide` | `square`);
  - right-click context menu на Cluster: `moduleColumns` (`auto` | 1..3);
  - CSS transform zoom: Cmd/Ctrl+scroll (25–200%, шаг 1%); reset — Cmd/Ctrl+0 или clickable badge в bottom-left при scale ≠ 100%.
- Выбранные layout params сразу уходят в `module-map.flow.json` v2 через `onNodesChange` и переживают reload: read-path применяет их поверх projection defaults через `applyFlowSidecarLayoutParams`. Backwards compat с v1 sidecar (без секции `layoutParams`) сохраняется — такой sidecar трактуется как «defaults повсюду».
- CSS Grid контейнеры (Product Part, Cluster) сами рассчитывают размер и расположение card'ов браузером; нет `containerConstraints` / `resizeContainersToFit` / collision avoidance в JS.
- При открытии workspace/switch/reconnect PM временно всегда стартует в `Description`:
  - toolbar highlight = `Description`,
  - левая workflow tree branch = highlighted `Description`, раскрыта только ветка `Description`,
  - правая панель открывает `Final_Description.md`, если он существует, иначе `questionnaire.md`,
  - левая Session panel автоматически показывает только Description-scoped session state или Description Help.
- В PM agent dialog markdown local file links работают как editor-aware route только для dialog surface:
  - абсолютные local file targets (`/abs/path.md`, `...:line:column`, `#LlineCcolumn`) перехватываются только в Session UI dialog bubbles;
  - если PM работает внутри VS Code webview, открытие файла идёт через standard editor API (`workspace.openTextDocument` + `window.showTextDocument`) на стороне extension host;
  - если PM работает как standalone CEF client без VS Code webview bridge, dialog surface сначала декодирует percent-encoded absolute paths обратно в filesystem path, затем использует launcher-host handoff `codeai://open-in-vscode?...`, а launcher уже открывает итоговый `vscode://file/...` URI во внешнем Visual Studio Code;
  - launcher при таком handoff обязан сохранить реальные path separators (`/`, Windows drive `:`) в финальном `vscode://file/...`, иначе Visual Studio Code получает несуществующий путь вида `/%2FUsers/...%2520...`;
  - platform-level confirmation prompt from Visual Studio Code may still appear for external local-path opens; это допустимый safeguard и не считается PM regression, пока подтверждение открывает реальный файл;
  - raw `vscode://file/...` handoff остаётся только как последний резервный fallback вне launcher/webview bridge-сред;
  - artifact/help markdown не входят в этот контракт, пока не объявлен отдельный scope.
- Semantic changes для diagram steps ожидаются через agent-run или прямое редактирование canonical Markdown, а не через visible inline UI.
- Для нового trunk-step bootstrap provider, выбранный на confirmation card, считается authoritative уже на PM intent path:
  - `pm:dialog:open` / startup intent обязаны нести explicit `providerId` выбранного шага;
  - dialog bootstrap snapshot должен seed-ить provider/model labels из этого intent, даже если dialog index payload ещё не дал нормализованный provider;
  - нижняя status/model panel затем converge-ится через обычный `useRuntimeModelSync()` / `session:model:update`;
  - Session header (`SessionIdBar`) остаётся display-only поверх уже доставленного snapshot/replay telemetry и не владеет automatic `usageLimits` refresh на mount/rebind; ownership refresh trigger'ов принадлежит Core/provider lifecycle.
- Для idle completed dialogs PM не должен сам поднимать новый restore/bootstrap cycle только из-за повторного `dialog:list:result`, `dialog:message` или remount панели:
  - если latest workspace snapshot подтверждает, что live runtime session для dialog сейчас отсутствует, PM может держать bootstrap-ready session record и existing history, но не должен форсировать synthetic restore;
  - reread `dialog:history` остаётся допустимым для initial open, explicit send tail refresh и `core:state` recovery после restart.
- PM background observers обязаны соблюдать visibility-aware polling budget:
  - `workflow-state-store` — singleton внутри browser runtime, чтобы `MainArea` и соседние subscribers не плодили независимые workflow polling loops;
  - для workflow state/events normal cadence разрешена только в `foreground`, `background` замедляется до `30s`, `hidden` паркует polling до возврата окна и делает immediate catch-up при возврате в `foreground`;
  - artifact availability и diagram progress probes используют тот же `foreground/background/hidden` режим и не должны продолжать frequent polling у скрытого окна.

Канон: `DescriptionStep_SingleAgent.md`, `ProjectManager_DescriptionEntry_CopyRefactor.md`.

Дополнительный инвариант навигации:
- любой route на workflow stage (Toolbar/Tree/auto-select) обязан сначала синхронизировать `activeStage`, чтобы Toolbar, Session route и правая панель не расходились.
- левое workflow tree обязано читать тот же `activeStage`: highlighted row и единственная раскрытая stage-ветка всегда должны соответствовать активному шагу.
- канон: `ProjectManager_WorkflowNavigation_SSOT.md`.

## 4) Recovery UX (обязательно)

В PM должны существовать user-facing действия восстановления при сбоях Core/Provider:
- `Restart Core` (hard)
- `Retry/Reconnect`
- (опционально) `Retry last message` для явных provider auth failures
