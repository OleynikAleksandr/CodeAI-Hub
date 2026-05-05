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
  - кнопка `Detach` в artifact header (слева от `Artifacts`) открывает граф в отдельном CEF popup; оба окна используют один sidecar файл и синхронизируются через `BroadcastChannel("pm:diagram:sidecar-sync")` после write;
  - detached diagram popup не является owner-window приложения: его закрытие не должно завершать main PM window;
  - detached diagram popup не должен наследовать autosaved frame главного PM окна; PM отправляет popup-sized open hint, а launcher не применяет main-window restore/persist path к popup browser.
- Settings surface belongs to PM:
  - footer status bar больше не дублирует workspace identity: левая часть футера пустая, workspace selector остаётся единственной visible surface в левом sidebar;
  - footer status bar action `Open Settings` использует выделенный CSS-класс `pm-status-open-settings` (accent-colored default/hover/active фазы + focus-visible outline) и переключает правую панель PM в отдельный in-shell settings mode без второго окна;
  - settings mode reuses shared `SettingsView`, but runs through PM-owned transport/state hooks and sends write intents directly into Core remote bridge;
  - закрытие Settings возвращает предыдущий right-panel context вместо закрытия PM window;
  - PM settings general tab снова показывает shared `Core Controls`, а `Restart Core` routed through PM host bridge for both VS Code-host and standalone launcher-host;
  - PM settings general tab exposes provider native request diagnostics only as `Open Capture Workbench`; `src/client/project-manager/services/capture-workbench-launcher.ts` opens the detached `?mode=detached-capture&workspaceSlug=...&workspacePath=...` popup, while shared Settings UI receives only a thin callback and does not import PM services;
  - detached Capture Workbench is PM-owned diagnostic UI over existing Core transports: managed capture still uses `settings:native-request-capture`, sticky selection/index use Core-owned `workbench:state:*`, artifact records use Core-owned `workbench:artifact:read`, and file-open buttons reuse the host-side `openProjectManagerFileLink()` bridge instead of adding a Core file-open intent;
  - detached Capture Workbench selector controls are DOM-owned button/listbox components (`dom-listbox-selector.tsx`) and must not use native HTML `<select>`, because standalone CEF/macOS native popup branches are unsafe for this surface;
  - blocking localization overlay inside Settings показывается только при реальном strict localization sync busy-state, а provider-only saves не должны отображаться как localization rebuild.
- Видимая diagram surface в PM больше не показывает `Auto-layout`, profile chooser, inline semantic editors, zoom/fit controls или bottom-right minimap. Пользователь композирует диаграмму через:
  - right-click context menu на ProductPart: `columns` (`auto` | 2..5), `targetAspectRatio` (`landscape` | `wide` | `square`);
  - right-click context menu на Cluster: `moduleColumns` (`auto` | 1..3);
  - CSS transform zoom: Cmd/Ctrl+scroll (25–200%, шаг 1%); reset — Cmd/Ctrl+0 или clickable badge в bottom-left при scale ≠ 100%.
- Выбранные layout params сразу уходят в `module-map.flow.json` v2 через `onNodesChange` и переживают reload: read-path применяет их поверх projection defaults через `applyFlowSidecarLayoutParams`. Backwards compat с v1 sidecar (без секции `layoutParams`) сохраняется — такой sidecar трактуется как «defaults повсюду».
- CSS Grid контейнеры (Product Part, Cluster) сами рассчитывают размер и расположение card'ов браузером; нет `containerConstraints` / `resizeContainersToFit` / collision avoidance в JS.
- При открытии workspace/switch/reconnect PM auto-select-ит последний non-idle trunk stage (`diagram_modules` → `virtual_simulation` → `description`) на основе `resolveLastActiveStage` и `resolveStartupTool` (см. SystemArchitecture §3.20). Workflow Tree является единственной навигационной поверхностью; верхний stage toolbar удалён в `v1.1.924`.
- **Workflow Tree provider tint** (1.2.106, idle-neutral 1.2.107, branch-neutral 1.2.108, neutral selected idle + tinted stage card pills 1.2.109, strict per-step attribution 1.2.110): каждая строка sidebar-дерева (trunk Documentation Tree + Development Tree branch nodes) получает `data-provider="claude" | "codex" | "gemini"` атрибут от `useStepProviderResolver`. **Strict per-step own-chain attribution**: tint отражает ТОЛЬКО кто реально работал над этим шагом. VS/DM не наследуют upstream-провайдера — `StageConfirmationCard` показывает inherited badge как preselect hint, а не как binding, так что sidebar tint не должен опережать пользовательский выбор. Единственный legitimate fallback для description — `description.primarySession.providerId` (это own session, не upstream). Все остальные idle stages возвращают `null` и рендерятся нейтрально. **Branch nodes (P/C/M) v1 всегда возвращают `null`** — `forBranchPart/forBranchCluster/forBranchModule` не наследуют провайдера от `diagram_modules` chain; они остаются нейтральными до тех пор, пока для конкретного P/C/M не появится своя per-branch session (`Cluster Design` / `Module Design`). **Selected step без `[data-provider]` тоже нейтральный**: legacy `.pm-tree__item--selected { background: rgba(66,201,162,0.16); border-color: rgba(66,201,162,0.45); color: --pm-accent-strong; }` правило перекрывается через `:not([data-provider]).pm-tree__item--selected` overrides → нейтральные `rgba(255,255,255,0.04)` fill + `rgba(255,255,255,0.18)` border + `var(--pm-text-primary)` text. **`StageConfirmationCard` radio pills** для выбора провайдера тоже используют corporate-tokens: `stage-confirmation-card-provider-tint.ts` экспортирует Claude/Codex/Gemini fill+border+accent для selected state pill и inherited-badge — вместо legacy зелёного. CSS-схема в `packages/ui/project-manager/styles.css` блок `.pm-tree__item[data-provider]` определяет `--row-accent`/`--row-fill`/`--row-fill-hover`/`--row-border`/`--row-soft` per provider; значения зеркалят `doc/SolidWorks-WorkFlow/DesignSystem/CorporateDesign.html`. Замены legacy hardcodes: in-progress `pm-tree__type-marker` (`#d9a441` → `var(--row-soft)`), done marker (`--pm-accent-strong` → `var(--row-border)`), has-children outline (`--pm-accent-strong` → `var(--row-accent)`), PP frame border (`--pm-accent-strong` → `var(--row-border)`), cluster connector lines (`--pm-accent-strong` → `var(--row-soft)`). Selected row: `--row-fill` + `--row-border` + текст `#cfcfcf`. Sidebar font-weight: `300` (light). См. SystemArchitecture §3 Invariant 36.
- **Development Tree readiness rendering**: PM parser accepts optional `developmentTree.parts[].readiness`, `clusters[].readiness`, and `modules[].readiness` without rejecting older Core payloads. Sidebar maps readiness to the existing row status palette: `idle -> todo` (gray), `in_progress -> progress` (orange), `ready -> active` (green). If readiness is absent, legacy fallback remains: materialized Product Part rows render as `draft`, skeleton rows and child nodes render as `todo`. Provider tint remains independent: readiness color does not imply provider attribution, and branch nodes stay neutral until their own per-branch session attribution exists.
- **Development Tree live artifact/readiness refresh**: branch-node selection is a real working surface, not a placeholder. PM binds the left pane to the node session and the right pane to the node draft artifact set. When Core broadcasts refreshed workflow/development-tree state after agent writes, PM must re-read the selected node metadata/artifact mtimes and update both the right artifact panel and sidebar readiness/color in place. A user who remains on the active node must see filled drafts and green/ready readiness without switching to another step and back.
- Если все trunk stages idle, fallback — `Description`:
  - sidebar workflow tree branch = highlighted активный stage, раскрыта только эта ветка,
  - правая панель открывает canonical артефакт активного stage (например `Final_Description.md` для `description`, `virtual-simulation.md` для `virtual_simulation`, `product-parts.index.md` / part artifact для `diagram_modules`); для idle `description` без `Final_Description.md` открывается `questionnaire.md`,
  - левая Session panel автоматически показывает session state активного stage или его Help.
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
- PM WebSocket runtime boundary:
  - `ProjectManagerApi.connect()` обязан быть idempotent для уже `OPEN`/`CONNECTING` socket state, чтобы React remount/recovery path не плодил параллельные Core stream sockets;
  - `ProjectManagerApi.disconnect()` — intentional lifecycle cleanup для unmount/window teardown; он закрывает socket, сбрасывает reconnect timer, снимает window-message listener и не должен планировать новый reconnect после intentional disconnect;
  - incoming Core stream frames проходят через `src/client/project-manager/services/core-stream-message-validator.ts` до dispatch в PM handlers. Invalid JSON, malformed known payloads and non-object envelopes reject at the boundary; unknown structurally valid event names remain forward-compatible and do not crash the runtime.

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
