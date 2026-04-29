# Sidebar Provider Tint — Planning Doc

**Status:** Draft (awaiting user approval)
**Owner:** UI / Project Manager
**Related SSOT:**
- `doc/SolidWorks-WorkFlow/DesignSystem/CorporateDesign.html` — utility tokens (Claude / Codex / Gemini accent + fill + border + soft + selected text + font-weight 300).
- `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md` — chip color contract that already uses provider-tint (per-button, info-card).
- `doc/tmp/prototypes/development-tree-sidebar.html` — visual-validation source.
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §3 Invariants 14 (effective model identity) and §6.4 (Diagram Modules / dev tree parser).

## 1. Problem

В левом сайдбаре `WorkspaceTree` (Workflow Tree) сейчас:

1. Все шаги рисуются единым accent цветом `--pm-accent-strong: #5fe3ba` (зелёный) независимо от того, какой провайдер реально вёл этот шаг. Пользователь не может с одного взгляда понять, чьим провайдером сделан / делается каждый шаг — приходится открывать сессию, чтобы увидеть провайдер в info-card на `InputPanel`.
2. Выбранный шаг имеет одинаковый зелёный fill+border у всех провайдеров.
3. В Development Tree «кубики P / C / M» (`pm-tree__type-marker`) для in-progress шагов имеют единую жёлтую заливку `#d9a441`, для done — зелёную `--pm-accent-strong`, а outline для контейнеров с детьми — зелёный `--pm-accent-strong`. Все три цвета не привязаны к провайдеру.

В то же время info-card под `InputPanel` уже tinted per-provider (через `session-status-button--claude/codex/gemini` в `media/session-view.css`). Это создаёт визуальную асимметрию: правый край шапки сессии «знает» провайдера, левый край сайдбара — нет.

## 2. Goal

Привязать визуальную тональность каждой строки сайдбара к её провайдеру, используя утверждённые corporate-design токены:

- **Невыбранный шаг** → label рендерится в `--<provider>-accent` (Claude/Codex/Gemini); никакого fill, никакого border.
- **Выбранный шаг** → fill `--<provider>-fill` + border `--<provider>-border`, текст `#cfcfcf`, `font-weight: 300`.
- **Hover невыбранного** → лёгкая нейтральная подсветка (как сейчас, не provider-bound).
- **Hover выбранного** → `--<provider>-fill-hover`.
- **Type marker (P/C/M):**
    - `idle` → нейтральный gray (без provider-tint).
    - `in_progress` → fill в `--<provider>-soft` (то место, где раньше был `#d9a441`).
    - `done` → fill в `--<provider>-soft` поплотнее (или `--<provider>-border`-эквивалент, нужна визуальная валидация).
    - `--has-children` → outline в `--<provider>-accent` или `--<provider>-border` (вместо зелёного).
- **PP frame (`pm-tree__pp-wrapper--open`)** → border в `--<provider>-border` (вместо зелёного).
- **Cluster connector lines** (`::before` / `::after` под `pm-tree__cluster-children`) → fill в `--<provider>-soft` (вместо зелёного).
- **Open cluster row label** (`pm-tree__cluster-wrapper--open > pm-tree__item--type-cl .pm-tree__label`) → `--<provider>-accent` (вместо зелёного).

## 3. Non-goals

- НЕ переписываем `session-status-button--*` чипы info-card; они остаются sub-contract в `media/session-view.css`. Возможная унификация alpha-каналов с corporate tokens — open question в `CorporateDesign.html` §5, отдельный scope.
- НЕ меняем status-dot цвета на trunk шагах (`pm-tree__item--idle/in-progress/done .pm-tree__status::before`) — точечные status-индикаторы остаются нейтральной trichromatic схемой gray/orange/green. User feedback пока про `type-marker` кубики, а не про trunk dots.
- НЕ меняем глобальный `--pm-accent-strong` — он используется широко за пределами sidebar tree (TabActive, status-bar accents, etc.); его перевод на provider-aware систему — отдельный scope.

## 4. Architecture

### 4.1 Provider resolver per step

Источник правды: `WorkflowStateSnapshot.continuity.chains[]`. Каждый chain имеет `stage` и `segments[]` с `providerId` (`packages/.../workflow-state-client.ts:18-32`). Latest segment chain'а = провайдер последней live или historical session шага.

Helper (новый файл, ≤80 lines):

```ts
// src/client/project-manager/components/layout/use-step-provider-resolver.ts
export type SidebarProviderId = "claude" | "codex" | "gemini";

export interface UseStepProviderResolverParams {
  readonly snapshot: WorkflowStateSnapshot | null;
  readonly defaultProviderId: SidebarProviderId;
}

export interface StepProviderResolver {
  readonly forStage: (stage: WorkflowStageId) => SidebarProviderId;
  readonly forBranchPart: (partId: string) => SidebarProviderId;
  readonly forBranchCluster: (clusterId: string) => SidebarProviderId;
  readonly forBranchModule: (moduleId: string) => SidebarProviderId;
}
```

Resolution chain:

1. Trunk stage → `chains.find(c => c.stage === stage)?.segments.at(-1)?.providerId`; mapped to `"claude" | "codex" | "gemini"` через известное соответствие `claudeCodeCli → claude`, `codexCli → codex`, `geminiCli → gemini`.
2. Branch (PP/Cluster/Module) — v1: каждый branch-узел наследует провайдера от latest Diagram Modules chain (поскольку Development Tree материализуется из `diagram_modules` artifact). Когда появятся per-branch sessions (`Cluster Design`, `Module Design`), resolver расширяется без breaking-change для callsite'ов.
3. Fallback (idle stage / no chain / unmappable provider id) → `defaultProviderId` из текущих Settings (resolved через существующий `useSettingsModelsSync` или прямой read из settings snapshot — точное API уточняется на этапе реализации).

Hook потребляет уже-mounted `useWorkflowStateSnapshot()` и `useLocalization()` — никаких новых transport-походов в Core. PM остаётся консьюмером continuity, не источником.

### 4.2 Per-row data attribute

`workspace-tree.tsx` рендерит каждый `<li className="pm-tree__item ...">` с дополнительным `data-provider={resolver.forStage(...)}` (или `forBranchPart(...)` etc). CSS-scope срабатывает по селектору `.pm-tree__item[data-provider="claude"]`, `[data-provider="codex"]`, `[data-provider="gemini"]`.

Это локальный per-row scope (не sidebar-wide), что отличается от прототипа (там был sidebar-wide picker). В живом UI разные шаги в одном сайдбаре могут принадлежать разным провайдерам одновременно — например, Description сделан Claude, Virtual Simulation сделан Codex.

### 4.3 CSS provider-tint scheme

Новый блок в `packages/ui/project-manager/styles.css` (в конец файла, ≤120 lines), импортирует corporate tokens. Для прозрачности и совместимости с предыдущими стилями:

```css
.pm-tree__item[data-provider="claude"] {
  --row-accent: rgba(240, 188, 132, 0.62);
  --row-fill: rgba(255, 145, 5, 0.10);
  --row-fill-hover: rgba(255, 145, 5, 0.16);
  --row-border: rgba(255, 145, 5, 0.40);
  --row-soft: rgba(255, 145, 5, 0.30);
}
.pm-tree__item[data-provider="codex"]  { ... }
.pm-tree__item[data-provider="gemini"] { ... }

.pm-tree__item[data-provider] .pm-tree__label { color: var(--row-accent); font-weight: 300; }
.pm-tree__item[data-provider].pm-tree__item--selected {
  color: #cfcfcf;
  background: var(--row-fill);
  border-color: var(--row-border);
}
.pm-tree__item[data-provider].pm-tree__item--selected .pm-tree__label {
  color: #cfcfcf;
}
.pm-tree__item[data-provider].pm-tree__item--selected:hover {
  background: var(--row-fill-hover);
}
```

Type marker rules (override existing yellow/green hardcodes):

```css
.pm-tree__item[data-provider].pm-tree__item--in-progress .pm-tree__type-marker {
  color: #1a1207;
  background: var(--row-soft);
}
.pm-tree__item[data-provider].pm-tree__item--done .pm-tree__type-marker {
  color: #cfcfcf;
  background: var(--row-border);
}
.pm-tree__item[data-provider] .pm-tree__type-marker--has-children {
  outline-color: var(--row-accent);
}
```

PP frame + cluster connectors:

```css
.pm-tree__pp-wrapper--open[data-provider] { border-color: var(--row-border); }
.pm-tree__cluster-children > .pm-tree__item[data-provider]::before,
.pm-tree__cluster-children > .pm-tree__item[data-provider]::after {
  background: var(--row-soft);
}
.pm-tree__cluster-wrapper--open
  > .pm-tree__item.pm-tree__item--type-cl[data-provider]
  .pm-tree__label {
  color: var(--row-accent);
}
```

`pm-tree__pp-wrapper` сейчас рендерится как `<li>` без provider-attribute — нужно добавить и туда `data-provider` чтобы border открытой рамки тоже tinted.

### 4.4 Backward compatibility

Если по какой-то причине resolver возвращает unsupported provider id или у строки нет `data-provider` атрибута (defensive default), fallback ветка — это существующие `--pm-accent-strong` правила из `styles.css`. То есть если новые правила не сработают, старая зелёная схема остаётся видимой (а не пустой). Это не должно случаться в нормальном пути, но защищает регрессии.

## 5. Files affected (per micro-task)

Каждая микро-задача затрагивает ≤3 файлов. Полный список (groupped by stream):

**Resolver hook (Stream B):**
- `src/client/project-manager/components/layout/use-step-provider-resolver.ts` — new file, ≤80 lines.
- `src/client/project-manager/components/layout/workspace-tree-model.ts` — расширение `TreeNode` типом `providerId?: SidebarProviderId` если потребуется (опционально; `data-provider` можно резолвить inline).

**CSS provider-tint scheme (Stream C):**
- `packages/ui/project-manager/styles.css` — новый блок в конце файла.

**Trunk row wiring (Stream D):**
- `src/client/project-manager/components/layout/workspace-tree.tsx` — добавление `data-provider` к trunk `<li>`.

**Branch row wiring (Stream E):**
- `src/client/project-manager/components/layout/workspace-tree.tsx` (renderPartNode / renderClusterNode / renderModuleRow).
- `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts` — если требуется проброс providerId через node-builder.

**Type marker provider-tint (Stream F):**
- `packages/ui/project-manager/styles.css` — overrides для in-progress / done / has-children outline.

**Connector lines + PP frame (Stream G):**
- `packages/ui/project-manager/styles.css` — pp-wrapper--open + cluster-children connector overrides.
- `src/client/project-manager/components/layout/workspace-tree.tsx` — добавление `data-provider` к `pm-tree__pp-wrapper` `<li>`.

**Tests (Stream H):**
- `src/client/project-manager/components/layout/use-step-provider-resolver.test.ts` — new file.
- `src/client/project-manager/components/layout/workspace-tree.test.tsx` — extend (or new) — проверка rendering data-provider attribute.

**SSOT docs (Stream I):**
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` — добавить инвариант (или расширить §3) про sidebar provider-tint contract.
- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md` — sidebar tree section.
- `doc/SolidWorks-WorkFlow/DesignSystem/CorporateDesign.html` — отметить §4 Применение чек-боксом для Workflow Tree sidebar.

## 6. Test plan

- **Unit / hook:** mock `WorkflowStateSnapshot` с разными chain состояниями (claude/codex/gemini done; mixed; idle); verify resolver returns expected id per stage; verify fallback to defaultProviderId when no chain.
- **Component:** render `WorkspaceTree` с mocked snapshot; assert каждая `<li.pm-tree__item>` имеет правильный `data-provider`; assert selected row carries provider class via fill/border.
- **Visual regression:** ручной retest на трёх workspace'ах (Claude / Codex / Gemini default) — все три варианта sidebar читаются без жёлтого; in-progress кубики окрашены в provider-soft; PP frame и connectors в provider-soft; selected step показывает provider fill+border с белёсым (#cfcfcf) текстом.

## 7. Risks

1. **Continuity chain пустой для свежесозданного workspace** → resolver падает в fallback `defaultProviderId`. Нормально, но требует test coverage.
2. **Provider id mapping** — `claudeCodeCli → claude`, `codexCli → codex`, `geminiCli → gemini` — должен жить в одном месте; повторное определение в нескольких файлах = drift risk. План: вынести `PROVIDER_STACK_TO_DESIGN_ID` константу либо в resolver hook, либо в shared types.
3. **CSS specificity** — новые правила `[data-provider]` должны перебивать существующие правила без `!important` (которое уже было в прототипе как expedient). Использовать `[data-provider="..."]` attribute selector для нативного boost. Если перебить не выходит — narrowly применять `!important` для конкретных свойств с inline-комментом «overrides legacy --pm-accent-strong rule».
4. **`workspace-tree.tsx` 492/500 строк** — близко к limit. Любые non-trivial добавления требуют splitting (вынести rendering helpers в `workspace-tree-renderers.ts` или подобное). Если bare `data-provider` attribute хватит без разрастания — оставить в одном файле.

## 8. Definition of done

1. Каждый шаг сайдбара (trunk + branch) рисуется в провайдерской палитре, основанной на continuity chain или Settings default.
2. Type markers (P/C/M) в Development Tree больше не имеют ни жёлтого `#d9a441`, ни зелёного `--pm-accent-strong` — все эти места берут provider-soft / provider-border / provider-accent через CSS variables.
3. Существующие тесты PM зелёные; новые unit-тесты для resolver и component добавлены.
4. SSOT обновлён: `SystemArchitecture.md`, `Project_Manager.md`, `CorporateDesign.html`.
5. Phase 2 release `1.2.106` собран через `build-all.sh` + `build-release.sh --use-current-version`, tarballs скопированы в `doc/tmp/releases/`, session report Type B/A создан.

## 9. Open questions

1. **Done marker color** — в прототипе done был зелёный `--pm-accent-strong` (заметная подсветка). При переходе на provider-soft/border визуально может стать слишком ровным с in_progress. Решить эмпирически: либо два разных alpha (`soft` для in_progress, `border` для done), либо разный hue на done (например full provider hex без alpha). Этот выбор фиксируется в реализации Stream F с скриншотом-комментарием.
2. **Idle marker** — оставляем нейтральный gray независимо от provider, или провайдеро-окрашиваем самым тусклым tint'ом (`var(--row-soft)` с alpha 0.10)? V1: оставляем нейтральный gray, чтобы чётко отличать «никто ещё не работал» от «провайдер X начал работу».
3. **Branch-node provider attribution до появления per-branch sessions** — наследование от Diagram Modules trunk OK для v1, но потенциально путает пользователя если он переключит провайдера в Settings и начнёт новую work-сессию для cluster/module. План: задокументировать в SSOT, что branch-node tint = «провайдер последнего Diagram Modules chain», и пересмотреть когда появятся реальные per-branch sessions.
