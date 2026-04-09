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
- UI bundles: `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
- Launcher: `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`

## 1) Назначение

Project Manager — основной UI‑клиент CodeAI Hub (CEF bundle), который:
- показывает Workflow Tree;
- открывает Sessions/Artifacts;
- управляет выбором/открытием диалогов через intent `pm:dialog:open`;
- гидратирует историю (cold start) и live tail (WS);
- отображает lock/continuity/usage и обеспечивает recovery UX.

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
- В Description UI не допускаются термины/ветвления `description.md` и auto-reviewer.
- Для `Diagram Modules` правая панель использует контракт `Artifacts/Help` (Source mode убран):
  - `Artifacts` по умолчанию открывает визуальный Module Graph, построенный из staged product-part файлов через nested CSS Grid (React Flow удалён в релизе `1.1.921`);
  - `*.flow.json` не показывается пользователю как артефакт; с релиза `1.1.922` sidecar v2 хранит также declarative CSS Grid layout params;
  - кнопка `Detach` в artifact header (слева от `Artifacts`) открывает граф в отдельном CEF popup; оба окна используют один sidecar файл и синхронизируются через `BroadcastChannel("pm:diagram:sidecar-sync")` после write.
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
